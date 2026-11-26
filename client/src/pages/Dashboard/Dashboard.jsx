import './Dashboard.css';
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContextDefinition.js";
import { assets } from "../../assets/assets.js";
import ProductQuickView from "../../components/ProductQuickView/ProductQuickView.jsx";
import toast from "react-hot-toast";

const Dashboard = () => {
    const { auth, categories, items, addToCart, wishlist, toggleWishlist } = useContext(AppContext);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeChip, setActiveChip] = useState("all");
    const [quickViewItem, setQuickViewItem] = useState(null);
    const navigate = useNavigate();

    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeItems = Array.isArray(items) ? items : [];
    const firstName = auth?.name ? auth.name.split(" ")[0].toUpperCase() : null;

    const featuredItem = safeItems[0] || null;

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        if (trimmed) {
            navigate(`/products?search=${encodeURIComponent(trimmed)}`);
        } else {
            navigate("/products");
        }
    };

    const handleCategoryClick = (categoryId) => {
        setActiveChip(categoryId);
        if (categoryId !== "all" && categoryId !== "new") {
            navigate(`/products?category=${encodeURIComponent(categoryId)}`);
        }
    };

    const handleQuickAdd = (e, item) => {
        e.stopPropagation();
        addToCart(item, 1, "M");
        toast.success(`${item.name} added to bag`);
    };

    const handleWishlistClick = (e, itemId) => {
        e.stopPropagation();
        toggleWishlist(itemId);
    };

    return (
        <div className="store-dashboard">
            <div className="store-container">
                {/* Heritage Welcome Hero Card */}
                <div className="vantage-hero-card">
                    <div className="vantage-hero-frame">
                        <h1 className="vantage-hero-title">
                            {firstName ? `WELCOME BACK, ${firstName}` : "WELCOME TO THE HOUSE"}
                        </h1>
                        <p className="vantage-hero-sub">YOUR NEXT CLUB FIT IS READY.</p>

                        <form className="vantage-hero-search" onSubmit={handleSearchSubmit}>
                            <input
                                type="text"
                                placeholder="SEARCH FOR VINTAGE GEAR..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button
                                type="button"
                                className="vantage-hero-filter-btn"
                                title="Open Full Catalog & Filters"
                                onClick={() => navigate("/products")}
                            >
                                <i className="bi bi-sliders"></i>
                            </button>
                        </form>
                    </div>
                    <div className="vantage-pennant-badge" aria-hidden="true">
                        <span>ESTD 2024</span>
                    </div>
                </div>

                {/* Category Filter Pills */}
                <div className="vantage-pills-row">
                    <button
                        type="button"
                        className={`vantage-pill ${activeChip === "all" ? "active" : ""}`}
                        onClick={() => handleCategoryClick("all")}
                    >
                        ALL DROPS <span className="pill-star">✦</span>
                    </button>
                    <button
                        type="button"
                        className={`vantage-pill ${activeChip === "new" ? "active" : ""}`}
                        onClick={() => navigate("/products")}
                    >
                        NEW ARRIVALS
                    </button>
                    {safeCategories.map((cat) => (
                        <button
                            key={cat.categoryId}
                            type="button"
                            className={`vantage-pill ${activeChip === cat.categoryId ? "active" : ""}`}
                            onClick={() => handleCategoryClick(cat.categoryId)}
                        >
                            {(cat.name || cat.categoryName || "").toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* THE VANTAGE SPECIAL Featured Card */}
                {featuredItem && (
                    <div className="vantage-special-section">
                        <div className="vantage-section-head">
                            <h3>THE VANTAGE SPECIAL</h3>
                            <Link to="/products" className="vantage-view-link">
                                VIEW ALL ›
                            </Link>
                        </div>

                        <div
                            className="vantage-special-card"
                            onClick={() => setQuickViewItem(featuredItem)}
                        >
                            <div className="vantage-special-media">
                                <img
                                    src={featuredItem.imageUrl || assets.upload}
                                    alt={featuredItem.name}
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = assets.upload;
                                    }}
                                />
                                <span className="vantage-new-drop-badge">NEW DROP</span>
                            </div>

                            <div className="vantage-special-overlay">
                                <div className="vantage-special-info">
                                    <h4>{featuredItem.name}</h4>
                                    <div className="vantage-special-price">
                                        &#8377;{Number(featuredItem.price || 0).toLocaleString("en-IN")} /{" "}
                                        <span className="exclusive-tag">✦ EXCLUSIVE ✦</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="vantage-add-bag-btn"
                                    onClick={(e) => handleQuickAdd(e, featuredItem)}
                                >
                                    ADD TO BAG
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Shop by Category */}
                <div className="vantage-section-head mt-4">
                    <h3>SHOP BY CATEGORY</h3>
                    <Link to="/products" className="vantage-view-link">
                        FILTER &amp; SORT ›
                    </Link>
                </div>

                <div className="store-categories-grid">
                    {safeCategories.map((cat) => (
                        <div
                            key={cat.categoryId}
                            className="store-category-card"
                            onClick={() => handleCategoryClick(cat.categoryId)}
                        >
                            <img
                                src={cat.imageUrl || assets.upload}
                                alt={cat.name || cat.categoryName}
                                className="store-category-thumb"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = assets.upload;
                                }}
                            />
                            <div className="store-category-meta">
                                <h6>{cat.name || cat.categoryName}</h6>
                                <span>{cat.items ?? 0} Products</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Curated Drops Grid */}
                <div className="vantage-section-head mt-4">
                    <h3>CURATED DROPS</h3>
                    <Link to="/explore" className="vantage-view-link">
                        OPEN BAG ›
                    </Link>
                </div>

                {safeItems.length === 0 ? (
                    <div className="text-center py-5 bg-white rounded-4 border">
                        <i className="bi bi-box-seam fs-1 text-muted d-block mb-2"></i>
                        <p className="text-muted mb-0">No products available yet.</p>
                    </div>
                ) : (
                    <div className="store-products-grid">
                        {safeItems.map((item) => {
                            const isWishlisted = wishlist.includes(item.itemId);
                            return (
                                <div
                                    key={item.itemId}
                                    className="catalog-product-card"
                                    onClick={() => setQuickViewItem(item)}
                                >
                                    <div className="catalog-card-img-box">
                                        <img
                                            src={item.imageUrl || assets.upload}
                                            alt={item.name}
                                            className="catalog-card-img"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = assets.upload;
                                            }}
                                        />
                                        <span className="catalog-card-badge">DROP</span>
                                    </div>

                                    <div className="catalog-card-body">
                                        <span className="catalog-card-cat">
                                            {item.categoryName || "Apparel"}
                                        </span>
                                        <h5 className="catalog-card-title" title={item.name}>
                                            {item.name}
                                        </h5>
                                        <div className="catalog-card-footer">
                                            <span className="catalog-card-price">
                                                &#8377;{Number(item.price || 0).toLocaleString("en-IN")}
                                            </span>
                                            <div className="catalog-card-actions">
                                                <button
                                                    type="button"
                                                    className={`catalog-icon-btn ${isWishlisted ? "wishlisted" : ""}`}
                                                    title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                                                    onClick={(e) => handleWishlistClick(e, item.itemId)}
                                                >
                                                    <i className={`bi ${isWishlisted ? "bi-heart-fill" : "bi-heart"}`}></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="catalog-add-btn"
                                                    title="Add to bag"
                                                    onClick={(e) => handleQuickAdd(e, item)}
                                                >
                                                    <i className="bi bi-bag-plus-fill"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {quickViewItem && (
                <ProductQuickView
                    item={quickViewItem}
                    onClose={() => setQuickViewItem(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
