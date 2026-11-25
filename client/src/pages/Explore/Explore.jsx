import "./Explore.css";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AppContext } from "../../context/AppContextDefinition.js";
import { fetchCategory } from "../../Service/CategoryService.js";
import { fetchItems } from "../../Service/ItemService.js";
import {
    createOrder,
    createRazorpayOrder,
    verifyRazorpayPayment,
} from "../../Service/OrderService.js";
import OrderPackingCeremony from "../../components/OrderCelebration/OrderPackingCeremony.jsx";
import { assets } from "../../assets/assets.js";

const FREE_DELIVERY_THRESHOLD = 1999;
const STANDARD_DELIVERY_FEE = 99;
const DEFAULT_SIZES = ["S", "M", "L", "XL"];

const getEstimatedDeliveryDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
};

const parseItemSizes = (item) => {
    if (Array.isArray(item?.sizes) && item.sizes.length > 0) return item.sizes;
    if (typeof item?.sizes === "string" && item.sizes.trim()) {
        const list = item.sizes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        if (list.length > 0) return list;
    }
    return DEFAULT_SIZES;
};

const formatInr = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

const Explore = () => {
    const navigate = useNavigate();
    const {
        auth,
        categories,
        setCategories,
        items: contextItems,
        reloadCatalog,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        restoreCartItem,
        clearCart,
        cartCount,
    } = useContext(AppContext);

    const [items, setItems] = useState(contextItems || []);
    const [loadingItems, setLoadingItems] = useState(false);

    // Left panel filters & size selection per item
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [itemSearch, setItemSearch] = useState("");
    const [selectedSizes, setSelectedSizes] = useState({});
    const searchInputRef = useRef(null);

    // Right panel checkout flow: 'cart' | 'delivery' | 'payment' | 'confirmed'
    const [checkoutStep, setCheckoutStep] = useState("cart");
    const [mobileCartOpen, setMobileCartOpen] = useState(false);

    // Undo removed cart item banner (5 seconds)
    const [undoEntry, setUndoEntry] = useState(null);
    const undoTimerRef = useRef(null);

    // Delivery details (Step 2)
    const userScope = auth?.email || auth?.userId || "guest";
    const [savedAddresses, setSavedAddresses] = useState(() => {
        try {
            const raw = localStorage.getItem(`bizbill_addrs_${userScope}`);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [selectedAddressMode, setSelectedAddressMode] = useState("new");
    const [addressLabel, setAddressLabel] = useState("Home");
    const [customerName, setCustomerName] = useState(auth?.name || "");
    const [phoneNumber, setPhoneNumber] = useState(auth?.phoneNumber || "");
    const [addressLine, setAddressLine] = useState("");
    const [pincode, setPincode] = useState("");
    const [city, setCity] = useState("");
    const [stateName, setStateName] = useState("");
    const [lookingUpPin, setLookingUpPin] = useState(false);

    // Payment (Step 3) & Order Confirmation (Step 4)
    const [paymentMethod, setPaymentMethod] = useState("RAZORPAY"); // 'RAZORPAY' | 'COD'
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [confirmedOrder, setConfirmedOrder] = useState(null);
    const [showPackingCeremony, setShowPackingCeremony] = useState(false);
    const idempotencyKeyRef = useRef(null);

    const estimatedDelivery = useMemo(() => getEstimatedDeliveryDate(), []);

    // Auto-fill from logged-in profile
    useEffect(() => {
        if (auth?.name && !customerName) setCustomerName(auth.name);
        if (auth?.phoneNumber && !phoneNumber) setPhoneNumber(auth.phoneNumber);
    }, [auth?.name, auth?.phoneNumber]);

    // Load categories & items
    useEffect(() => {
        if (!categories || categories.length === 0) {
            fetchCategory()
                .then((res) => {
                    if (Array.isArray(res.data) && setCategories) setCategories(res.data);
                })
                .catch(() => {});
        }
    }, [categories, setCategories]);

    useEffect(() => {
        async function loadItems() {
            try {
                setLoadingItems(true);
                const res = await fetchItems();
                if (Array.isArray(res.data)) setItems(res.data);
            } catch {
                toast.error("Failed to load items");
            } finally {
                setLoadingItems(false);
            }
        }
        loadItems();
    }, []);

    // Lookup City & State from 6-digit Indian pincode
    useEffect(() => {
        const cleanPin = pincode.replace(/\D/g, "");
        if (cleanPin.length !== 6) return;
        let cancelled = false;
        setLookingUpPin(true);
        fetch(`https://api.postalpincode.in/pincode/${cleanPin}`)
            .then((r) => r.json())
            .then((data) => {
                if (cancelled) return;
                const po = data?.[0]?.PostOffice?.[0];
                if (po) {
                    setCity(po.District || po.Block || "");
                    setStateName(po.State || "");
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLookingUpPin(false);
            });
        return () => {
            cancelled = true;
        };
    }, [pincode]);

    // Reset idempotency key whenever cart or checkout step changes back from payment
    useEffect(() => {
        if (checkoutStep !== "payment") {
            idempotencyKeyRef.current = null;
            setPaymentError("");
        }
    }, [checkoutStep, cart]);

    // Category chips: All · T-Shirts · Shirts · Pants & Trousers + any extra backend categories
    const categoryChips = useMemo(() => {
        const base = [
            { id: "all", label: "All" },
            { id: "t-shirts", label: "T-Shirts", match: ["t-shirt", "tee", "tees", "tshirt"] },
            { id: "shirts", label: "Shirts", match: ["shirt"] },
            { id: "pants", label: "Pants & Trousers", match: ["pant", "trouser", "jeans", "bottom"] },
        ];
        return base;
    }, []);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const catName = (item.categoryName || "").toLowerCase();
            let matchesCategory = selectedCategory === "all";
            if (!matchesCategory) {
                const chip = categoryChips.find((c) => c.id === selectedCategory);
                if (chip?.match) {
                    if (selectedCategory === "shirts") {
                        matchesCategory =
                            catName.includes("shirt") &&
                            !catName.includes("t-shirt") &&
                            !catName.includes("tshirt");
                    } else {
                        matchesCategory = chip.match.some((kw) => catName.includes(kw));
                    }
                } else {
                    matchesCategory = item.categoryId === selectedCategory;
                }
            }
            const q = itemSearch.trim().toLowerCase();
            const matchesSearch =
                !q ||
                (item.name || "").toLowerCase().includes(q) ||
                catName.includes(q) ||
                (item.color || "").toLowerCase().includes(q);
            return matchesCategory && matchesSearch;
        });
    }, [items, selectedCategory, itemSearch, categoryChips]);

    // Cart calculations
    const subtotal = useMemo(
        () => cart.reduce((sum, ci) => sum + Number(ci.price || 0) * (ci.quantity || 0), 0),
        [cart]
    );
    const deliveryFee =
        cart.length === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
    const grandTotal = subtotal + deliveryFee;
    const amountForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
    const freeDeliveryPct = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));

    const getTotalInCartForItem = (itemId) =>
        cart
            .filter((ci) => ci.itemId === itemId)
            .reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    const getQtyInCartForItemSize = (itemId, size) => {
        const found = cart.find((ci) => ci.itemId === itemId && (ci.size || "M") === size);
        return found ? found.quantity : 0;
    };

    const handleAddProduct = (item) => {
        const stock = item.stock != null ? Number(item.stock) : 99;
        if (stock <= 0) return;
        const totalInCart = getTotalInCartForItem(item.itemId);
        if (totalInCart >= stock) {
            toast.error(`Only ${stock} available`);
            return;
        }
        const sizes = parseItemSizes(item);
        const chosenSize = selectedSizes[item.itemId] || sizes[0] || "M";
        addToCart(item, 1, chosenSize);
    };

    const handleProductStepper = (item, delta) => {
        const sizes = parseItemSizes(item);
        const chosenSize = selectedSizes[item.itemId] || sizes[0] || "M";
        const stock = item.stock != null ? Number(item.stock) : 99;
        if (delta > 0 && getTotalInCartForItem(item.itemId) >= stock) {
            toast.error(`Only ${stock} available`);
            return;
        }
        updateCartQuantity(item.itemId, delta, chosenSize);
    };

    const handleRemoveWithUndo = (cartItem) => {
        removeFromCart(cartItem.itemId, cartItem.size);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setUndoEntry(cartItem);
        undoTimerRef.current = setTimeout(() => {
            setUndoEntry(null);
        }, 5000);
    };

    const handleUndoRemove = () => {
        if (!undoEntry) return;
        restoreCartItem(undoEntry);
        setUndoEntry(null);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };

    const handleSelectSavedAddress = (addr) => {
        setSelectedAddressMode(addr.id);
        setAddressLabel(addr.label || "Home");
        setAddressLine(addr.line || "");
        if (addr.pincode) setPincode(addr.pincode);
        if (addr.city) setCity(addr.city);
        if (addr.state) setStateName(addr.state);
    };

    const handleProceedToPayment = (e) => {
        e.preventDefault();
        if (!customerName.trim()) {
            toast.error("Please enter your full name.");
            return;
        }
        if (!phoneNumber.trim() || phoneNumber.replace(/\D/g, "").length < 10) {
            toast.error("Please enter a valid 10-digit mobile number.");
            return;
        }
        if (!addressLine.trim()) {
            toast.error("Please enter your delivery address.");
            return;
        }
        if (pincode.replace(/\D/g, "").length !== 6) {
            toast.error("Please enter a valid 6-digit pincode.");
            return;
        }

        // Save new address if user typed one
        if (selectedAddressMode === "new" && addressLine.trim()) {
            const exists = savedAddresses.some(
                (a) => a.line?.toLowerCase() === addressLine.trim().toLowerCase()
            );
            if (!exists) {
                const newAddr = {
                    id: Date.now(),
                    label: addressLabel || "Home",
                    line: addressLine.trim(),
                    pincode: pincode.trim(),
                    city: city.trim(),
                    state: stateName.trim(),
                };
                const next = [...savedAddresses, newAddr];
                setSavedAddresses(next);
                try {
                    localStorage.setItem(`bizbill_addrs_${userScope}`, JSON.stringify(next));
                } catch {
                    // ignore
                }
            }
        }
        setCheckoutStep("payment");
    };

    const buildOrderPayload = () => {
        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        }
        return {
            customerName: customerName.trim(),
            phoneNumber: phoneNumber.trim(),
            addressLine: addressLine.trim(),
            pincode: pincode.trim(),
            city: city.trim(),
            state: stateName.trim(),
            addressLabel: addressLabel || "Home",
            estimatedDelivery,
            cartItems: cart.map((ci) => ({
                itemId: ci.itemId,
                name: ci.name,
                size: ci.size || "M",
                color: ci.color || "Classic",
                imgUrl: ci.imageUrl,
                price: ci.price,
                quantity: ci.quantity,
            })),
            paymentMethod,
            idempotencyKey: idempotencyKeyRef.current,
        };
    };

    const finishConfirmedOrder = (orderData) => {
        setConfirmedOrder(orderData);
        setCheckoutStep("confirmed");
        setShowPackingCeremony(true);
        clearCart();
        idempotencyKeyRef.current = null;
        if (reloadCatalog) reloadCatalog();
        fetchItems()
            .then((res) => {
                if (Array.isArray(res.data)) setItems(res.data);
            })
            .catch(() => {});
    };

    const handlePayNow = async () => {
        if (isProcessing || cart.length === 0) return;
        setPaymentError("");
        setIsProcessing(true);
        const payload = buildOrderPayload();

        try {
            if (paymentMethod === "COD") {
                const res = await createOrder({ ...payload, paymentMethod: "COD" });
                if (res.status === 201 || res.status === 200) {
                    finishConfirmedOrder(res.data);
                }
                return;
            }

            // Razorpay online payment flow
            const rzpRes = await createRazorpayOrder(payload);
            const rzpData = rzpRes.data;

            if (!window.Razorpay) {
                setPaymentError("Razorpay checkout failed to load. Please refresh or use Cash on delivery.");
                setIsProcessing(false);
                return;
            }

            const options = {
                key: rzpData.razorpayKeyId,
                amount: rzpData.amountPaise,
                currency: rzpData.currency || "INR",
                name: "BizBill",
                description: `Order ${rzpData.orderNumber}`,
                order_id: rzpData.razorpayOrderId,
                prefill: {
                    name: rzpData.customerName || customerName,
                    contact: rzpData.phoneNumber || phoneNumber,
                    email: rzpData.userEmail || auth?.email || "",
                },
                theme: { color: "#2d4c24" },
                handler: async (response) => {
                    try {
                        const verifyRes = await verifyRazorpayPayment({
                            orderId: rzpData.orderId,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            paymentChannel: "UPI / Online",
                        });
                        finishConfirmedOrder(verifyRes.data);
                    } catch (verifyErr) {
                        const msg =
                            verifyErr.response?.data?.message ||
                            "Payment didn't go through. Your cart is safe. Try again.";
                        setPaymentError(msg);
                    } finally {
                        setIsProcessing(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setPaymentError("Payment didn't go through. Your cart is safe. Try again.");
                        setIsProcessing(false);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", () => {
                setPaymentError("Payment didn't go through. Your cart is safe. Try again.");
                setIsProcessing(false);
            });
            rzp.open();
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                "Payment didn't go through. Your cart is safe. Try again.";
            setPaymentError(msg);
            toast.error(msg);
            setIsProcessing(false);
        }
    };

    const handleDownloadInvoice = () => {
        if (!confirmedOrder) return;
        const win = window.open("", "_blank", "width=720,height=800");
        if (!win) {
            toast.error("Please allow popups to download the invoice.");
            return;
        }
        const itemsHtml = (confirmedOrder.cartItems || [])
            .map(
                (ci) => `
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${ci.name} (${ci.size || "M"})</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${ci.quantity}</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${Number(ci.price).toLocaleString("en-IN")}</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${(Number(ci.price) * ci.quantity).toLocaleString("en-IN")}</td>
                </tr>`
            )
            .join("");
        win.document.write(`
            <html>
                <head><title>Invoice ${confirmedOrder.orderNumber}</title></head>
                <body style="font-family:system-ui,-apple-system,sans-serif;padding:32px;color:#111827;">
                    <h2 style="margin:0;color:#2d4c24;">BizBill Tax Invoice</h2>
                    <p style="color:#6b7280;margin:4px 0 20px;">Order ID: <strong>${confirmedOrder.orderNumber}</strong> • ${new Date().toLocaleDateString("en-IN")}</p>
                    <p><strong>Billed & Shipped To:</strong><br/>${confirmedOrder.customerName} (${confirmedOrder.phoneNumber})<br/>${confirmedOrder.addressLine || ""}${confirmedOrder.city ? `, ${confirmedOrder.city}` : ""}${confirmedOrder.state ? `, ${confirmedOrder.state}` : ""} ${confirmedOrder.pincode || ""}</p>
                    <table style="width:100%;border-collapse:collapse;margin-top:20px;">
                        <thead>
                            <tr style="background:#f3f4f6;">
                                <th style="padding:8px;text-align:left;">Item</th>
                                <th style="padding:8px;text-align:center;">Qty</th>
                                <th style="padding:8px;text-align:right;">Price</th>
                                <th style="padding:8px;text-align:right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                    <div style="margin-top:20px;text-align:right;">
                        <div>Subtotal: ₹${Number(confirmedOrder.subtotal || 0).toLocaleString("en-IN")}</div>
                        <div>Delivery: ${Number(confirmedOrder.deliveryFee || 0) === 0 ? "Free" : `₹${confirmedOrder.deliveryFee}`}</div>
                        <div>Tax (GST): Included</div>
                        <h3 style="margin-top:8px;">Grand Total: ₹${Number(confirmedOrder.grandTotal || 0).toLocaleString("en-IN")}</h3>
                        <p style="color:#6b7280;font-size:13px;">Payment: ${confirmedOrder.paymentChannel || confirmedOrder.paymentMethod} (${confirmedOrder.paymentStatus})</p>
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        win.document.close();
    };

    const firstName = (confirmedOrder?.customerName || customerName || "Friend").split(" ")[0];
    const checkoutStepIndex =
        checkoutStep === "cart"
            ? 0
            : checkoutStep === "delivery"
            ? 1
            : checkoutStep === "payment"
            ? 2
            : 3;

    return (
        <div className="explore-shell">
            {showPackingCeremony && (
                <OrderPackingCeremony
                    orderNumber={confirmedOrder?.orderNumber}
                    onComplete={() => setShowPackingCeremony(false)}
                />
            )}
            {/* LEFT PANEL: ITEMS */}
            <section className="explore-left-panel">
                <div className="explore-toolbar">
                    <div className="explore-search-box">
                        <i className="bi bi-search"></i>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search tees, shirts, trousers…"
                            value={itemSearch}
                            onChange={(e) => setItemSearch(e.target.value)}
                        />
                        {itemSearch && (
                            <button
                                type="button"
                                className="explore-search-clear"
                                onClick={() => setItemSearch("")}
                                aria-label="Clear search"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        )}
                    </div>

                    <div className="explore-category-chips">
                        {categoryChips.map((chip) => (
                            <button
                                key={chip.id}
                                type="button"
                                className={`explore-chip ${selectedCategory === chip.id ? "active" : ""}`}
                                onClick={() => setSelectedCategory(chip.id)}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loadingItems && items.length === 0 ? (
                    <div className="explore-empty-search">Loading collection...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="explore-empty-search">
                        <div className="fs-2 mb-2">🔍</div>
                        <div className="fw-bold text-dark">Nothing matched. Try a different word.</div>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-dark rounded-pill mt-3 px-3"
                            onClick={() => {
                                setItemSearch("");
                                setSelectedCategory("all");
                            }}
                        >
                            Reset filters
                        </button>
                    </div>
                ) : (
                    <div className="explore-products-grid">
                        {filteredItems.map((item) => {
                            const sizes = parseItemSizes(item);
                            const activeSize = selectedSizes[item.itemId] || sizes[0] || "M";
                            const stock = item.stock != null ? Number(item.stock) : 99;
                            const isSoldOut = stock <= 0;
                            const isLowStock = stock > 0 && stock <= 5;
                            const totalInCart = getTotalInCartForItem(item.itemId);
                            const sizeQtyInCart = getQtyInCartForItemSize(item.itemId, activeSize);

                            return (
                                <div key={item.itemId} className={`explore-product-card ${isSoldOut ? "sold-out" : ""}`}>
                                    <div className="explore-card-media">
                                        <img
                                            src={item.imageUrl || item.imgUrl || assets.upload}
                                            alt={item.name}
                                        />
                                        <div className="explore-badges-stack">
                                            {totalInCart > 0 && (
                                                <span className="explore-badge badge-in-cart">
                                                    {totalInCart} in cart
                                                </span>
                                            )}
                                            {isSoldOut ? (
                                                <span className="explore-badge badge-sold-out">Sold out</span>
                                            ) : isLowStock ? (
                                                <span className="explore-badge badge-low-stock">
                                                    Only {stock} left
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="explore-card-body">
                                        <div className="explore-card-cat">
                                            {item.categoryName || "Apparel"}
                                        </div>
                                        <h6 className="explore-card-title" title={item.name}>
                                            {item.name}
                                        </h6>
                                        <div className="explore-card-price">{formatInr(item.price)}</div>

                                        {/* Size Picker */}
                                        <div className="explore-size-picker">
                                            {sizes.slice(0, 4).map((sz) => (
                                                <button
                                                    key={sz}
                                                    type="button"
                                                    disabled={isSoldOut}
                                                    className={`explore-size-btn ${activeSize === sz ? "active" : ""}`}
                                                    onClick={() =>
                                                        setSelectedSizes((prev) => ({
                                                            ...prev,
                                                            [item.itemId]: sz,
                                                        }))
                                                    }
                                                >
                                                    {sz}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Add or Stepper */}
                                        {sizeQtyInCart > 0 ? (
                                            <div className="explore-card-stepper">
                                                <button
                                                    type="button"
                                                    onClick={() => handleProductStepper(item, -1)}
                                                    aria-label="Decrease quantity"
                                                >
                                                    −
                                                </button>
                                                <span>{sizeQtyInCart}</span>
                                                <button
                                                    type="button"
                                                    disabled={totalInCart >= stock}
                                                    onClick={() => handleProductStepper(item, 1)}
                                                    aria-label="Increase quantity"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="explore-add-btn"
                                                disabled={isSoldOut}
                                                onClick={() => handleAddProduct(item)}
                                            >
                                                {isSoldOut ? "Sold out" : "Add"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* RIGHT PANEL: CART & BILLING */}
            <aside className={`explore-right-panel ${mobileCartOpen ? "mobile-open" : ""}`}>
                <div className="explore-mobile-drawer-head">
                    <span className="fw-bold">Checkout</span>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setMobileCartOpen(false)}
                        aria-label="Close cart"
                    />
                </div>

                {/* Slick 4-Step Checkout Progress Bar */}
                <div className="checkout-progress-wrap" aria-label="Order progress">
                    <div className="checkout-progress-track">
                        <div
                            className="checkout-progress-fill"
                            style={{ width: `${(checkoutStepIndex / 3) * 100}%` }}
                        />
                    </div>
                    <div className="checkout-progress-steps">
                        {["Bag", "Delivery", "Payment", "Confirmed"].map((label, idx) => (
                            <div
                                key={label}
                                className={`cp-step ${
                                    idx < checkoutStepIndex
                                        ? "done"
                                        : idx === checkoutStepIndex
                                        ? "active"
                                        : ""
                                }`}
                            >
                                <span className="cp-dot">{idx < checkoutStepIndex ? "✓" : idx + 1}</span>
                                <span className="cp-label">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* STEP 4: ORDER CONFIRMED */}
                {checkoutStep === "confirmed" && confirmedOrder ? (
                    <div className="explore-confirmed-card">
                        <div className="confirmed-check-icon">✓</div>
                        <h4 className="fw-bold mb-1">Order confirmed. 🎉</h4>
                        <p className="text-muted small mb-3">
                            Thanks, {firstName}. We&apos;re packing it with care.
                        </p>

                        <div className="confirmed-meta-box">
                            <div className="confirmed-meta-row">
                                <span>Order ID</span>
                                <strong>{confirmedOrder.orderNumber}</strong>
                            </div>
                            <div className="confirmed-meta-row">
                                <span>Arriving by</span>
                                <strong className="text-success">{confirmedOrder.estimatedDelivery}</strong>
                            </div>
                            <div className="confirmed-meta-row">
                                <span>Delivering to</span>
                                <span className="text-end">
                                    {confirmedOrder.addressLine}
                                    {confirmedOrder.city ? `, ${confirmedOrder.city}` : ""}
                                    {confirmedOrder.pincode ? ` - ${confirmedOrder.pincode}` : ""}
                                </span>
                            </div>
                            <div className="confirmed-meta-row">
                                <span>Paid</span>
                                <strong>
                                    {formatInr(confirmedOrder.grandTotal)} •{" "}
                                    {confirmedOrder.paymentChannel || confirmedOrder.paymentMethod}
                                </strong>
                            </div>
                        </div>

                        <div className="confirmed-items-list">
                            {(confirmedOrder.cartItems || []).map((ci, idx) => (
                                <div key={idx} className="confirmed-item-line">
                                    <span>
                                        {ci.name} ({ci.size || "M"}) × {ci.quantity}
                                    </span>
                                    <strong>{formatInr(Number(ci.price) * ci.quantity)}</strong>
                                </div>
                            ))}
                        </div>

                        <div className="confirmed-tracker-mini mb-3">
                            <div className="confirmed-tracker-bar">
                                <div className="confirmed-tracker-fill" style={{ width: "20%" }} />
                            </div>
                            <div className="confirmed-tracker-labels">
                                <span className="active">✓ Confirmed</span>
                                <span>Packed</span>
                                <span>Shipped</span>
                                <span>Delivered</span>
                            </div>
                        </div>

                        <div className="confirmed-actions">
                            <button
                                type="button"
                                className="btn btn-dark w-100 rounded-pill fw-bold"
                                onClick={() => navigate("/profile")}
                            >
                                Track order
                            </button>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-dark flex-fill rounded-pill fw-semibold btn-sm"
                                    onClick={() => {
                                        setConfirmedOrder(null);
                                        setCheckoutStep("cart");
                                        setMobileCartOpen(false);
                                    }}
                                >
                                    Continue shopping
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-success flex-fill rounded-pill fw-semibold btn-sm"
                                    onClick={handleDownloadInvoice}
                                >
                                    Download invoice
                                </button>
                            </div>
                        </div>
                    </div>
                ) : checkoutStep === "delivery" ? (
                    /* STEP 2: DELIVERY DETAILS */
                    <form className="explore-step-card" onSubmit={handleProceedToPayment}>
                        <div className="explore-panel-header">
                            <button
                                type="button"
                                className="explore-back-link"
                                onClick={() => setCheckoutStep("cart")}
                            >
                                ‹ Back to bag
                            </button>
                            <span className="explore-step-pill">Step 2 of 3</span>
                        </div>

                        <h5 className="fw-bold mb-3">Delivery details</h5>

                        {/* Saved Addresses */}
                        <div className="saved-addr-chips mb-3">
                            {savedAddresses.slice(0, 3).map((addr) => (
                                <button
                                    key={addr.id}
                                    type="button"
                                    className={`saved-addr-card ${selectedAddressMode === addr.id ? "active" : ""}`}
                                    onClick={() => handleSelectSavedAddress(addr)}
                                >
                                    <div className="fw-bold small">{addr.label || "Saved"}</div>
                                    <div className="text-muted text-truncate" style={{ maxWidth: 120, fontSize: 11 }}>
                                        {addr.line}
                                    </div>
                                </button>
                            ))}
                            <button
                                type="button"
                                className={`saved-addr-card ${selectedAddressMode === "new" ? "active" : ""}`}
                                onClick={() => {
                                    setSelectedAddressMode("new");
                                    setAddressLine("");
                                    setPincode("");
                                    setCity("");
                                    setStateName("");
                                }}
                            >
                                <div className="fw-bold small">+ Add new</div>
                                <div className="text-muted" style={{ fontSize: 11 }}>
                                    Home · Work
                                </div>
                            </button>
                        </div>

                        <div className="mb-2">
                            <label className="form-label small fw-semibold mb-1">Full name</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Your full name"
                                required
                            />
                        </div>

                        <div className="mb-2">
                            <label className="form-label small fw-semibold mb-1">Mobile number</label>
                            <input
                                type="tel"
                                className="form-control form-control-sm"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="10-digit mobile number"
                                required
                            />
                        </div>

                        <div className="row g-2 mb-2">
                            <div className="col-6">
                                <label className="form-label small fw-semibold mb-1">
                                    Pincode {lookingUpPin && <span className="text-muted">(checking…)</span>}
                                </label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    className="form-control form-control-sm"
                                    value={pincode}
                                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                                    placeholder="e.g. 380001"
                                    required
                                />
                            </div>
                            <div className="col-6">
                                <label className="form-label small fw-semibold mb-1">Save as</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={addressLabel}
                                    onChange={(e) => setAddressLabel(e.target.value)}
                                >
                                    <option value="Home">Home</option>
                                    <option value="Work">Work</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="row g-2 mb-2">
                            <div className="col-6">
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="City"
                                />
                            </div>
                            <div className="col-6">
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={stateName}
                                    onChange={(e) => setStateName(e.target.value)}
                                    placeholder="State"
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label small fw-semibold mb-1">Address</label>
                            <textarea
                                rows={2}
                                className="form-control form-control-sm"
                                value={addressLine}
                                onChange={(e) => setAddressLine(e.target.value)}
                                placeholder="House no, street, landmark..."
                                required
                            />
                        </div>

                        <div className="delivery-eta-banner mb-3">
                            🚚 Arrives by <strong>{estimatedDelivery}</strong>
                        </div>

                        <button type="submit" className="btn-place-order">
                            Continue to payment ›
                        </button>
                    </form>
                ) : checkoutStep === "payment" ? (
                    /* STEP 3: PAYMENT */
                    <div className="explore-step-card">
                        <div className="explore-panel-header">
                            <button
                                type="button"
                                className="explore-back-link"
                                disabled={isProcessing}
                                onClick={() => setCheckoutStep("delivery")}
                            >
                                ‹ Back to delivery
                            </button>
                            <span className="explore-step-pill">Step 3 of 3</span>
                        </div>

                        <h5 className="fw-bold mb-1">Payment</h5>
                        <p className="text-muted small mb-3">
                            Arriving by <strong>{estimatedDelivery}</strong> • {city || addressLabel}
                        </p>

                        <div className="payment-choice-list mb-3">
                            <label
                                className={`payment-choice-card ${paymentMethod === "RAZORPAY" ? "active" : ""}`}
                                onClick={() => setPaymentMethod("RAZORPAY")}
                            >
                                <input
                                    type="radio"
                                    name="payMethod"
                                    checked={paymentMethod === "RAZORPAY"}
                                    onChange={() => setPaymentMethod("RAZORPAY")}
                                />
                                <div>
                                    <div className="fw-bold small">
                                        Pay online (Razorpay)
                                    </div>
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                        UPI, cards, netbanking, wallets
                                    </div>
                                </div>
                            </label>

                            <label
                                className={`payment-choice-card ${paymentMethod === "COD" ? "active" : ""}`}
                                onClick={() => setPaymentMethod("COD")}
                            >
                                <input
                                    type="radio"
                                    name="payMethod"
                                    checked={paymentMethod === "COD"}
                                    onChange={() => setPaymentMethod("COD")}
                                />
                                <div>
                                    <div className="fw-bold small">Cash on delivery</div>
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                        Pay when your order arrives.
                                    </div>
                                </div>
                            </label>
                        </div>

                        {paymentError && (
                            <div className="alert alert-danger py-2 px-3 small mb-3">
                                {paymentError}
                            </div>
                        )}

                        <div className="cart-summary-mini mb-3">
                            <div className="summary-row">
                                <span>Items subtotal</span>
                                <span>{formatInr(subtotal)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Delivery</span>
                                <span className={deliveryFee === 0 ? "text-success fw-semibold" : ""}>
                                    {deliveryFee === 0 ? "Free" : formatInr(deliveryFee)}
                                </span>
                            </div>
                            <div className="summary-row">
                                <span>Tax (GST)</span>
                                <span>Included</span>
                            </div>
                            <div className="summary-row total-row">
                                <span>Grand total</span>
                                <span>{formatInr(grandTotal)}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn-place-order"
                            disabled={isProcessing || cart.length === 0}
                            onClick={handlePayNow}
                        >
                            {isProcessing
                                ? "Processing…"
                                : paymentMethod === "RAZORPAY"
                                ? `Pay ${formatInr(grandTotal)} securely`
                                : "Place order · Pay on delivery"}
                        </button>

                        <div className="text-center text-muted small mt-2">
                            🔒 100% secure payment
                        </div>
                    </div>
                ) : (
                    /* STEP 1: CART */
                    <div className="explore-step-card">
                        <div className="explore-panel-header">
                            <h5 className="fw-bold m-0">Your bag ({cartCount})</h5>
                            {cart.length > 0 && (
                                <button
                                    type="button"
                                    className="explore-clear-btn"
                                    onClick={clearCart}
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {undoEntry && (
                            <div className="explore-undo-banner">
                                <span>Removed {undoEntry.name}.</span>
                                <button type="button" onClick={handleUndoRemove}>
                                    Undo
                                </button>
                            </div>
                        )}

                        {cart.length === 0 ? (
                            <div className="explore-empty-cart">
                                <div className="fs-1 mb-2">🛍️</div>
                                <div className="fw-bold text-dark mb-1">
                                    Your bag is empty. Let&apos;s fix that 👀
                                </div>
                                <p className="text-muted small mb-3">
                                    Pick a size on any tee, shirt, or trouser to start your bag.
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-dark rounded-pill px-4 fw-bold btn-sm"
                                    onClick={() => {
                                        setMobileCartOpen(false);
                                        searchInputRef.current?.focus();
                                    }}
                                >
                                    Start shopping
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Free delivery bar */}
                                <div className="free-delivery-box">
                                    <div className="small fw-semibold mb-1">
                                        {amountForFreeDelivery > 0
                                            ? `Add ${formatInr(amountForFreeDelivery)} more for free delivery 🚚`
                                            : "Free delivery unlocked ✔"}
                                    </div>
                                    <div className="free-delivery-track">
                                        <div
                                            className="free-delivery-fill"
                                            style={{ width: `${freeDeliveryPct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Cart items */}
                                <div className="explore-cart-list">
                                    {cart.map((ci) => {
                                        const liveItem = items.find((i) => i.itemId === ci.itemId);
                                        const maxStock =
                                            liveItem?.stock != null
                                                ? Number(liveItem.stock)
                                                : ci.stock != null
                                                ? Number(ci.stock)
                                                : 99;
                                        const atStockLimit = ci.quantity >= maxStock;

                                        return (
                                            <div
                                                key={`${ci.itemId}_${ci.size || "M"}`}
                                                className="explore-cart-row"
                                            >
                                                <img
                                                    src={ci.imageUrl || assets.upload}
                                                    alt={ci.name}
                                                    className="cart-row-img"
                                                />
                                                <div className="cart-row-info">
                                                    <div className="fw-bold small text-dark">{ci.name}</div>
                                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                                        Size {ci.size || "M"} • {ci.color || "Classic"}
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                                        {formatInr(ci.price)} each
                                                    </div>
                                                    <div className="cart-row-controls">
                                                        <div className="cart-mini-stepper">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateCartQuantity(ci.itemId, -1, ci.size)
                                                                }
                                                            >
                                                                −
                                                            </button>
                                                            <span>{ci.quantity}</span>
                                                            <button
                                                                type="button"
                                                                disabled={atStockLimit}
                                                                onClick={() =>
                                                                    updateCartQuantity(ci.itemId, 1, ci.size)
                                                                }
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="cart-remove-link"
                                                            onClick={() => handleRemoveWithUndo(ci)}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                    {atStockLimit && maxStock < 99 && (
                                                        <div className="text-warning fw-semibold" style={{ fontSize: 11 }}>
                                                            Only {maxStock} available
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="cart-row-total fw-bold small">
                                                    {formatInr(Number(ci.price) * ci.quantity)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Price summary */}
                                <div className="cart-summary-mini">
                                    <div className="summary-row">
                                        <span>Items subtotal</span>
                                        <span>{formatInr(subtotal)}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span>Delivery</span>
                                        <span className={deliveryFee === 0 ? "text-success fw-semibold" : ""}>
                                            {deliveryFee === 0 ? "Free" : formatInr(deliveryFee)}
                                        </span>
                                    </div>
                                    <div className="summary-row">
                                        <span>Tax (GST)</span>
                                        <span>Included</span>
                                    </div>
                                    <div className="summary-row total-row">
                                        <span>Grand total</span>
                                        <span>{formatInr(grandTotal)}</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="btn-place-order mt-2"
                                    onClick={() => setCheckoutStep("delivery")}
                                >
                                    Continue to delivery ›
                                </button>
                            </>
                        )}
                    </div>
                )}
            </aside>

            {/* MOBILE BOTTOM CART BAR */}
            {cartCount > 0 && !mobileCartOpen && (
                <button
                    type="button"
                    className="explore-mobile-cart-bar"
                    onClick={() => setMobileCartOpen(true)}
                >
                    <span>
                        {cartCount} {cartCount === 1 ? "item" : "items"} · {formatInr(grandTotal)}
                    </span>
                    <span className="fw-bold">View cart ›</span>
                </button>
            )}
        </div>
    );
};

export default Explore;
