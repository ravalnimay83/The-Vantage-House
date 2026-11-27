import { useEffect, useMemo, useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContextDefinition.js";
import { assets } from "../../assets/assets.js";
import { RotatingLoadingLine, WatermarkSkeletonBox } from "../ItemLoader/ItemLoadingSkeleton.jsx";
import toast from "react-hot-toast";
import "./ProductQuickView.css";

const ProductQuickView = ({ item, onClose }) => {
    const { items, addToCart, wishlist, toggleWishlist } = useContext(AppContext);
    const [activeItem, setActiveItem] = useState(item);
    const [qty, setQty] = useState(1);
    const [imgLoaded, setImgLoaded] = useState(false);
    const cardRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        setActiveItem(item);
        setQty(1);
        setImgLoaded(false);
        cardRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, [item]);

    const sizeOptions = (activeItem?.sizes || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || "");

    useEffect(() => {
        const opts = (activeItem?.sizes || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        setSelectedSize(opts[0] || "");
    }, [activeItem]);

    const relatedItems = useMemo(() => {
        const list = Array.isArray(items) ? items : [];
        const others = list.filter((it) => it.itemId && it.itemId !== activeItem?.itemId);
        const sameCategory = others.filter(
            (it) =>
                it.categoryName &&
                activeItem?.categoryName &&
                it.categoryName === activeItem.categoryName
        );
        const rest = others.filter(
            (it) => !sameCategory.some((sc) => sc.itemId === it.itemId)
        );
        return [...sameCategory, ...rest].slice(0, 4);
    }, [items, activeItem]);

    if (!activeItem) return null;

    const isWishlisted = wishlist.includes(activeItem.itemId);
    const unitPrice = Number(activeItem.price || 0);
    const mrp = Number(activeItem.originalPrice || 0);
    const discountPct = mrp > unitPrice ? Math.round(((mrp - unitPrice) / mrp) * 100) : 0;
    const totalPrice = (unitPrice * qty).toFixed(2);

    const handleAddToCart = () => {
        const displayName = selectedSize ? `${activeItem.name} (${selectedSize})` : activeItem.name;
        addToCart({ ...activeItem, name: displayName }, qty);
        toast.success(`Added ${qty} × ${displayName} to cart`);
        onClose();
    };

    const handleBuyNow = () => {
        const displayName = selectedSize ? `${activeItem.name} (${selectedSize})` : activeItem.name;
        addToCart({ ...activeItem, name: displayName }, qty);
        onClose();
        navigate("/explore");
    };

    const handleSwitchItem = (nextItem) => {
        setActiveItem(nextItem);
        setQty(1);
        setImgLoaded(false);
        cardRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div className="pqv-backdrop" onClick={onClose}>
            <div className="pqv-card" ref={cardRef} onClick={(e) => e.stopPropagation()}>
                <div className="pqv-main-grid">
                    <div className="pqv-image-side">
                        <div className="pqv-top-actions">
                            <button type="button" className="pqv-circle-btn" onClick={onClose} title="Close">
                                <i className="bi bi-arrow-left"></i>
                            </button>
                            <button
                                type="button"
                                className={`pqv-circle-btn ${isWishlisted ? "wishlisted" : ""}`}
                                onClick={() => toggleWishlist(activeItem.itemId)}
                                title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                            >
                                <i className={`bi ${isWishlisted ? "bi-heart-fill" : "bi-heart"}`}></i>
                            </button>
                        </div>
                        {!imgLoaded && (
                            <div className="pqv-img-loader">
                                <WatermarkSkeletonBox className="w-100 h-100" />
                                <div className="pqv-img-loader-line">
                                    <RotatingLoadingLine compact />
                                </div>
                            </div>
                        )}
                        <img
                            src={activeItem.imageUrl || assets.upload}
                            alt={activeItem.name}
                            onLoad={() => setImgLoaded(true)}
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = assets.upload;
                                setImgLoaded(true);
                            }}
                        />
                    </div>

                    <div className="pqv-info-side">
                        <div>
                            <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                                <span className="pqv-category-pill m-0">
                                    {activeItem.categoryName || "Clothing"}
                                </span>
                                {activeItem.brand && (
                                    <span className="badge bg-light text-dark border rounded-pill px-2 py-1">
                                        {activeItem.brand}
                                    </span>
                                )}
                            </div>
                            <h2 className="pqv-title">{activeItem.name}</h2>
                            <p className="pqv-desc mb-3">
                                {activeItem.description || "Carefully crafted garment available for immediate checkout and fast delivery."}
                            </p>

                            {(activeItem.color || activeItem.fabric) && (
                                <div className="small text-muted mb-3">
                                    {activeItem.color && <span className="me-3"><strong>Color:</strong> {activeItem.color}</span>}
                                    {activeItem.fabric && <span><strong>Fabric:</strong> {activeItem.fabric}</span>}
                                </div>
                            )}

                            {sizeOptions.length > 0 && (
                                <div className="mb-3">
                                    <div className="small fw-bold text-dark mb-1">Select Size</div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {sizeOptions.map((sz) => (
                                            <button
                                                key={sz}
                                                type="button"
                                                className={`btn btn-sm rounded-pill px-3 fw-bold ${
                                                    selectedSize === sz ? "btn-dark" : "btn-outline-secondary"
                                                }`}
                                                onClick={() => setSelectedSize(sz)}
                                            >
                                                {sz}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="pqv-price-qty-row">
                                <div className="pqv-price-group">
                                    <span className="pqv-price">&#8377;{totalPrice}</span>
                                    {discountPct > 0 && (
                                        <span className="pqv-badge-off">-{discountPct}%</span>
                                    )}
                                </div>
                                <div className="pqv-qty-control">
                                    <button
                                        type="button"
                                        className="pqv-qty-btn"
                                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                                    >
                                        -
                                    </button>
                                    <span className="pqv-qty-val">{qty}</span>
                                    <button
                                        type="button"
                                        className="pqv-qty-btn"
                                        onClick={() => setQty((q) => q + 1)}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="pqv-actions">
                                <button type="button" className="pqv-buy-btn" onClick={handleBuyNow}>
                                    Buy for &#8377;{totalPrice}
                                </button>
                                <button type="button" className="pqv-cart-btn" onClick={handleAddToCart}>
                                    <i className="bi bi-bag-plus me-2"></i>
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {relatedItems.length > 0 && (
                    <div className="pqv-explore-section">
                        <div className="pqv-explore-head">
                            <span>Explore More</span>
                            <button
                                type="button"
                                className="pqv-explore-all-btn"
                                onClick={() => {
                                    onClose();
                                    navigate("/products");
                                }}
                            >
                                View Shop →
                            </button>
                        </div>
                        <div className="pqv-explore-grid">
                            {relatedItems.map((rel) => (
                                <button
                                    key={rel.itemId}
                                    type="button"
                                    className="pqv-explore-card"
                                    onClick={() => handleSwitchItem(rel)}
                                >
                                    <div className="pqv-explore-img-wrap">
                                        <img
                                            src={rel.imageUrl || assets.upload}
                                            alt={rel.name}
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = assets.upload;
                                            }}
                                        />
                                    </div>
                                    <div className="pqv-explore-meta">
                                        <div className="pqv-explore-name">{rel.name}</div>
                                        <div className="pqv-explore-price">
                                            &#8377;{Number(rel.price || 0).toLocaleString("en-IN")}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductQuickView;
