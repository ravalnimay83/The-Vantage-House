import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContextDefinition.js";
import { assets } from "../../assets/assets.js";
import toast from "react-hot-toast";
import "./ProductQuickView.css";

const ProductQuickView = ({ item, onClose }) => {
    const { addToCart, wishlist, toggleWishlist } = useContext(AppContext);
    const [qty, setQty] = useState(1);
    const sizeOptions = (item?.sizes || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || "");
    const navigate = useNavigate();

    if (!item) return null;

    const isWishlisted = wishlist.includes(item.itemId);
    const unitPrice = Number(item.price || 0);
    const mrp = Number(item.originalPrice || 0);
    const discountPct = mrp > unitPrice ? Math.round(((mrp - unitPrice) / mrp) * 100) : 0;
    const totalPrice = (unitPrice * qty).toFixed(2);

    const handleAddToCart = () => {
        const displayName = selectedSize ? `${item.name} (${selectedSize})` : item.name;
        addToCart({ ...item, name: displayName }, qty);
        toast.success(`Added ${qty} × ${displayName} to cart`);
        onClose();
    };

    const handleBuyNow = () => {
        const displayName = selectedSize ? `${item.name} (${selectedSize})` : item.name;
        addToCart({ ...item, name: displayName }, qty);
        onClose();
        navigate("/explore");
    };

    return (
        <div className="pqv-backdrop" onClick={onClose}>
            <div className="pqv-card" onClick={(e) => e.stopPropagation()}>
                <div className="pqv-image-side">
                    <div className="pqv-top-actions">
                        <button type="button" className="pqv-circle-btn" onClick={onClose} title="Close">
                            <i className="bi bi-arrow-left"></i>
                        </button>
                        <button
                            type="button"
                            className={`pqv-circle-btn ${isWishlisted ? "wishlisted" : ""}`}
                            onClick={() => toggleWishlist(item.itemId)}
                            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        >
                            <i className={`bi ${isWishlisted ? "bi-heart-fill" : "bi-heart"}`}></i>
                        </button>
                    </div>
                    <img
                        src={item.imageUrl || assets.upload}
                        alt={item.name}
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = assets.upload;
                        }}
                    />
                </div>

                <div className="pqv-info-side">
                    <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                            <span className="pqv-category-pill m-0">
                                {item.categoryName || "Clothing"}
                            </span>
                            {item.brand && (
                                <span className="badge bg-light text-dark border rounded-pill px-2 py-1">
                                    {item.brand}
                                </span>
                            )}
                        </div>
                        <h2 className="pqv-title">{item.name}</h2>
                        <p className="pqv-desc mb-3">
                            {item.description || "Carefully crafted garment available for immediate checkout and fast delivery."}
                        </p>

                        {(item.color || item.fabric) && (
                            <div className="small text-muted mb-3">
                                {item.color && <span className="me-3"><strong>Color:</strong> {item.color}</span>}
                                {item.fabric && <span><strong>Fabric:</strong> {item.fabric}</span>}
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
        </div>
    );
};

export default ProductQuickView;
