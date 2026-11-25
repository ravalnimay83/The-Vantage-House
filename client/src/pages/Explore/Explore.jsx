import './Explore.css';
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContextDefinition.js";
import { fetchCategory } from "../../Service/CategoryService.js";
import { fetchItems } from "../../Service/ItemService.js";
import { createOrder } from "../../Service/OrderService.js";
import CartSummary from "../../components/CartSummary/CartSummary.jsx";
import { assets } from "../../assets/assets.js";
import toast from "react-hot-toast";

const Explore = () => {
    const { categories, setCategories } = useContext(AppContext);
    const [items, setItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);

    // Filters
    const [selectedCategoryId, setSelectedCategoryId] = useState("all");
    const [itemSearch, setItemSearch] = useState("");

    // Customer Form
    const [customerName, setCustomerName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");

    // Cart
    const [cart, setCart] = useState([]);

    // Payment Method: 'CASH' or 'UPI'
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    // Success Order Receipt Modal
    const [placedOrder, setPlacedOrder] = useState(null);

    // Load categories if not loaded
    useEffect(() => {
        if (!categories || categories.length === 0) {
            fetchCategory()
                .then((res) => {
                    if (Array.isArray(res.data) && setCategories) {
                        setCategories(res.data);
                    }
                })
                .catch((err) => console.error("Error fetching categories:", err));
        }
    }, [categories, setCategories]);

    // Load items
    useEffect(() => {
        async function loadItems() {
            try {
                setLoadingItems(true);
                const res = await fetchItems();
                if (Array.isArray(res.data)) {
                    setItems(res.data);
                }
            } catch (err) {
                console.error("Error fetching items:", err);
                toast.error("Failed to load items");
            } finally {
                setLoadingItems(false);
            }
        }
        loadItems();
    }, []);

    // Filter items based on category and search query
    const filteredItems = items.filter((item) => {
        const matchesCategory =
            selectedCategoryId === "all" ||
            item.categoryId === selectedCategoryId;
        const matchesSearch =
            !itemSearch.trim() ||
            (item?.name || "").toLowerCase().includes(itemSearch.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Cart operations
    const addToCart = (item) => {
        setCart((prevCart) => {
            const existingIndex = prevCart.findIndex((ci) => ci.itemId === item.itemId);
            if (existingIndex > -1) {
                const updated = [...prevCart];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: updated[existingIndex].quantity + 1
                };
                return updated;
            } else {
                return [
                    ...prevCart,
                    {
                        itemId: item.itemId,
                        name: item.name,
                        price: Number(item.price || 0),
                        quantity: 1,
                        imageUrl: item.imageUrl,
                        categoryName: item.categoryName
                    }
                ];
            }
        });
    };

    const updateQuantity = (itemId, delta) => {
        setCart((prevCart) => {
            return prevCart
                .map((item) => {
                    if (item.itemId === itemId) {
                        const newQty = item.quantity + delta;
                        return newQty > 0 ? { ...item, quantity: newQty } : null;
                    }
                    return item;
                })
                .filter(Boolean);
        });
    };

    const removeFromCart = (itemId) => {
        setCart((prevCart) => prevCart.filter((item) => item.itemId !== itemId));
    };

    const clearCart = () => {
        setCart([]);
    };

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = 0; // Tax is 0 as required
    const grandTotal = subtotal + tax;

    // Handle Order Submission
    const handlePlaceOrder = async () => {
        if (!customerName.trim()) {
            toast.error("Please enter the customer name.");
            return;
        }

        if (!phoneNumber.trim()) {
            toast.error("Please enter the customer phone number.");
            return;
        }

        if (cart.length === 0) {
            toast.error("Cart is empty! Please add items to place an order.");
            return;
        }

        const orderPayload = {
            customerName: customerName.trim(),
            phoneNumber: phoneNumber.trim(),
            cartItems: cart.map((item) => ({
                itemId: item.itemId,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            subtotal: subtotal,
            tax: tax,
            grandTotal: grandTotal,
            paymentMethod: paymentMethod
        };

        try {
            setIsPlacingOrder(true);
            const response = await createOrder(orderPayload);
            if (response.data) {
                toast.success("Order placed successfully!");
                setPlacedOrder(response.data);
                // Clear customer form and cart
                setCustomerName("");
                setPhoneNumber("");
                setCart([]);
            }
        } catch (error) {
            console.error("Error creating order:", error);
            const msg = error.response?.data?.message || error.message || "Failed to place order.";
            toast.error("Order failed: " + msg);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    return (
        <div className="explore-container">
            {/* Left Column: Categories & Items */}
            <div className="explore-left-column">
                {/* Categories Row */}
                <div className="categories-section">
                    <div className="categories-section-header">
                        <h5>
                            <i className="bi bi-grid-fill text-primary"></i>
                            Categories
                        </h5>
                    </div>
                    <div className="categories-scroll-wrapper">
                        <div
                            className={`category-chip ${selectedCategoryId === "all" ? "active" : ""}`}
                            onClick={() => setSelectedCategoryId("all")}
                        >
                            <i className="bi bi-collection"></i>
                            <span>All</span>
                        </div>
                        {Array.isArray(categories) && categories.map((cat) => (
                            <div
                                key={cat.categoryId}
                                className={`category-chip ${selectedCategoryId === cat.categoryId ? "active" : ""}`}
                                onClick={() => setSelectedCategoryId(cat.categoryId)}
                            >
                                <span
                                    className="category-chip-dot"
                                    style={{ backgroundColor: cat.bgColor || "#38bdf8" }}
                                />
                                <span>{cat.name || cat.categoryName}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="my-2 border-secondary" style={{ opacity: 0.2 }} />

                {/* Items Row */}
                <div className="items-section">
                    <div className="items-section-header">
                        <h5>
                            <i className="bi bi-basket-fill text-warning me-2"></i>
                            Items ({filteredItems.length})
                        </h5>
                        <div className="items-search-wrapper">
                            <i className="bi bi-search"></i>
                            <input
                                type="text"
                                placeholder="Search items..."
                                className="items-search-input"
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="explore-items-grid-scroll">
                        {loadingItems ? (
                            <div className="d-flex justify-content-center align-items-center py-5">
                                <div className="spinner-border text-info" role="status">
                                    <span className="visually-hidden">Loading items...</span>
                                </div>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="text-center py-5 text-secondary">
                                <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                                <p>No items found in this category.</p>
                            </div>
                        ) : (
                            <div className="explore-items-grid">
                                {filteredItems.map((item) => {
                                    const cartItem = cart.find((ci) => ci.itemId === item.itemId);
                                    return (
                                        <div
                                            key={item.itemId}
                                            className="explore-item-card"
                                            onClick={() => addToCart(item)}
                                            title="Click to add to cart"
                                        >
                                            <div className="explore-item-image-wrapper">
                                                <img
                                                    src={item.imageUrl || assets.upload}
                                                    alt={item.name}
                                                    className="explore-item-img"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = assets.upload;
                                                    }}
                                                />
                                                {cartItem && (
                                                    <span className="explore-item-in-cart-badge">
                                                        {cartItem.quantity} in cart
                                                    </span>
                                                )}
                                            </div>
                                            <div className="explore-item-details">
                                                <h6 className="explore-item-title">{item.name}</h6>
                                                <span className="explore-item-category">
                                                    {item.categoryName || "General"}
                                                </span>
                                                <div className="explore-item-footer">
                                                    <span className="explore-item-price">
                                                        &#8377;{Number(item.price || 0).toFixed(2)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="explore-item-add-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart(item);
                                                        }}
                                                        title="Add to cart"
                                                    >
                                                        <i className="bi bi-plus-lg"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Customer Form & Cart Summary */}
            <div className="explore-right-column">
                {/* Customer Form */}
                <div className="customer-form-box">
                    <div className="customer-form-title">
                        <i className="bi bi-person-circle text-info"></i>
                        <span>Customer Details</span>
                    </div>
                    <div className="customer-inputs-grid">
                        <input
                            type="text"
                            placeholder="Customer Name *"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            required
                        />
                        <input
                            type="tel"
                            placeholder="Phone Number *"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="cart-items-box">
                    <div className="cart-items-header">
                        <h6>
                            <i className="bi bi-cart3 text-warning"></i>
                            Cart Items ({cart.reduce((total, i) => total + i.quantity, 0)})
                        </h6>
                        {cart.length > 0 && (
                            <button
                                type="button"
                                className="cart-clear-btn"
                                onClick={clearCart}
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className="cart-items-scroll">
                        {cart.length === 0 ? (
                            <div className="cart-empty-state">
                                <i className="bi bi-cart-x"></i>
                                <p>Your cart is empty.</p>
                                <small className="text-secondary">Click on items to add them.</small>
                            </div>
                        ) : (
                            cart.map((cartItem) => (
                                <div key={cartItem.itemId} className="cart-item-row">
                                    <img
                                        src={cartItem.imageUrl || assets.upload}
                                        alt={cartItem.name}
                                        className="cart-item-thumb"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = assets.upload;
                                        }}
                                    />
                                    <div className="cart-item-info">
                                        <div className="cart-item-name" title={cartItem.name}>
                                            {cartItem.name}
                                        </div>
                                        <div className="cart-item-unit-price">
                                            &#8377;{cartItem.price.toFixed(2)} each
                                        </div>
                                    </div>
                                    <div className="cart-item-qty-controls">
                                        <button
                                            type="button"
                                            className="qty-btn"
                                            onClick={() => updateQuantity(cartItem.itemId, -1)}
                                            title="Decrease"
                                        >
                                            -
                                        </button>
                                        <span className="qty-value">{cartItem.quantity}</span>
                                        <button
                                            type="button"
                                            className="qty-btn"
                                            onClick={() => updateQuantity(cartItem.itemId, 1)}
                                            title="Increase"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="cart-item-total">
                                        &#8377;{(cartItem.price * cartItem.quantity).toFixed(2)}
                                    </div>
                                    <button
                                        type="button"
                                        className="cart-item-remove-btn"
                                        onClick={() => removeFromCart(cartItem.itemId)}
                                        title="Remove item"
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Cart Summary */}
                <CartSummary
                    subtotal={subtotal}
                    tax={tax}
                    grandTotal={grandTotal}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    handlePlaceOrder={handlePlaceOrder}
                    isPlacingOrder={isPlacingOrder}
                    cartLength={cart.length}
                />
            </div>

            {/* Order Confirmation Receipt Modal */}
            {placedOrder && (
                <div className="order-modal-backdrop" onClick={() => setPlacedOrder(null)}>
                    <div className="order-receipt-card" onClick={(e) => e.stopPropagation()}>
                        <div className="receipt-header">
                            <div className="receipt-icon-success">
                                <i className="bi bi-check-lg"></i>
                            </div>
                            <h4>Order Placed Successfully!</h4>
                            <div className="receipt-order-id">
                                Order ID: <strong>{placedOrder.orderId}</strong>
                            </div>
                            <small className="text-muted">
                                {new Date(placedOrder.createdAt || Date.now()).toLocaleString()}
                            </small>
                        </div>

                        <div className="receipt-customer-details">
                            <div>
                                <span className="text-muted">Customer Name:</span>
                                <strong>{placedOrder.customerName}</strong>
                            </div>
                            <div>
                                <span className="text-muted">Phone Number:</span>
                                <strong>{placedOrder.phoneNumber}</strong>
                            </div>
                            <div>
                                <span className="text-muted">Payment Method:</span>
                                <span className="badge bg-primary text-uppercase">{placedOrder.paymentMethod}</span>
                            </div>
                        </div>

                        <table className="receipt-items-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {placedOrder.cartItems && placedOrder.cartItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>&#8377;{Number(item.price).toFixed(2)}</td>
                                        <td>&#8377;{(Number(item.price) * item.quantity).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="receipt-totals">
                            <div className="receipt-totals-row">
                                <span className="text-muted">Subtotal:</span>
                                <span>&#8377;{Number(placedOrder.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div className="receipt-totals-row">
                                <span className="text-muted">Tax (0%):</span>
                                <span>&#8377;{Number(placedOrder.tax || 0).toFixed(2)}</span>
                            </div>
                            <div className="receipt-totals-row receipt-grand-total">
                                <span>Grand Total:</span>
                                <span>&#8377;{Number(placedOrder.grandTotal || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="receipt-actions">
                            <button
                                type="button"
                                className="receipt-btn-print"
                                onClick={() => window.print()}
                            >
                                <i className="bi bi-printer"></i>
                                Print
                            </button>
                            <button
                                type="button"
                                className="receipt-btn-close"
                                onClick={() => setPlacedOrder(null)}
                            >
                                Close / New Order
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Explore;
