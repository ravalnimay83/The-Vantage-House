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
    const [quickViewItem, setQuickViewItem] = useState(null);
    const navigate = useNavigate();

    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeItems = Array.isArray(items) ? items : [];
    const firstName = auth?.name ? auth.name.split(" ")[0] : null;

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
        navigate(`/products?category=${encodeURIComponent(categoryId)}`);
    };

    const handleQuickAdd = (e, item) => {
        e.stopPropagation();
        addToCart(item, 1);
        toast.success(`${item.name} added to cart`);
    };

    const handleWishlistClick = (e, itemId) => {
        e.stopPropagation();
        toggleWishlist(itemId);
    };

    return (
        <div className="store-dashboard">
            <div className="store-container">
                {/* Brand Heritage Banner */}
                <div
                    className="mb-3 rounded-4 overflow-hidden d-flex align-items-center justify-content-between px-3 py-2 flex-wrap gap-2"
                    style={{
                        background: "#1a3d29",
                        border: "1px solid rgba(200, 146, 58, 0.45)",
                        boxShadow: "0 10px 26px rgba(26, 61, 41, 0.16)",
                    }}
                >
                    <img
                        src={assets.primaryLogo}
                        alt="The Vantage House"
                        style={{ height: 64, maxWidth: "100%", objectFit: "contain" }}
                    />
                    <div className="d-flex align-items-center gap-2 ms-auto">
                        <img
                            src={assets.monogram}
                            alt="Vantage Monogram"
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "1.5px solid #c8923a",
                            }}
                        />
                    </div>
                </div>

                {/* Top Header & Search Bar */}
                <div className="store-top-bar">
                    <div className="store-heading-group">
                        <h1>{firstName ? `Welcome to the crew, ${firstName}.` : "Catalog"}</h1>
                        <p>{firstName ? "Your closet is waiting 👀" : "Discover curated clothing & shop by category"}</p>
                    </div>

                    <form className="store-search-form" onSubmit={handleSearchSubmit}>
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            className="store-search-input"
                            placeholder="Search products, categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button
                            type="button"
                            className="store-filter-shortcut"
                            title="Open Full Catalog & Filters"
                            onClick={() => navigate("/products")}
                        >
                            <i className="bi bi-sliders"></i>
                        </button>
                        <button type="submit" className="store-search-submit">
                            Search
                        </button>
                    </form>
                </div>

                {/* Olive Green Hero Banner */}
                <div className="store-hero-banner">
                    <div>
                        <div className="hero-exclusive-tag">
                            <i className="bi bi-stars"></i>
                            <span>Exclusive Collection</span>
                        </div>
                        <h2 className="hero-headline">
                            Make Space For Something Better
                        </h2>
                        <p className="hero-subtext">
                            Explore our latest arrivals across every category. Browse freely, filter by price, and check out seamlessly.
                        </p>
                        <div className="hero-cta-row">
                            <Link to="/products" className="hero-shop-btn">
                                <span>Shop More</span>
                                <i className="bi bi-arrow-right"></i>
                            </Link>
                            <Link to="/explore" className="hero-secondary-btn">
                                Open Billing POS
                            </Link>
                        </div>
                    </div>

                    {featuredItem && (
                        <div
                            className="hero-featured-card"
                            onClick={() => setQuickViewItem(featuredItem)}
                        >
                            <span className="hero-featured-badge">Featured</span>
                            <img
                                src={featuredItem.imageUrl || assets.upload}
                                alt={featuredItem.name}
                                className="hero-featured-img"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = assets.upload;
                                }}
                            />
                            <h5 className="hero-featured-title">{featuredItem.name}</h5>
                            <div className="hero-featured-price">
                                &#8377;{Number(featuredItem.price || 0).toFixed(2)}
                            </div>
                            <button
                                type="button"
                                className="hero-featured-bag-btn"
                                title="Add to cart"
                                onClick={(e) => handleQuickAdd(e, featuredItem)}
                            >
                                <i className="bi bi-bag-plus-fill"></i>
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick Category Pills */}
                <div className="category-pills-row">
                    <button
                        type="button"
                        className="store-cat-pill active"
                        onClick={() => navigate("/products")}
                    >
                        All Products
                    </button>
                    {safeCategories.map((cat) => (
                        <button
                            key={cat.categoryId}
                            type="button"
                            className="store-cat-pill"
                            onClick={() => handleCategoryClick(cat.categoryId)}
                        >
                            {cat.name || cat.categoryName}
                        </button>
                    ))}
                </div>

                {/* Categories Cards Section */}
                <div className="store-section-header">
                    <h3 className="store-section-title">Shop by Category</h3>
                    <Link to="/products" className="store-view-all-link">
                        View All <i className="bi bi-chevron-right"></i>
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

                {/* For You / Products Grid */}
                <div className="store-section-header">
                    <h3 className="store-section-title">For You</h3>
                    <Link to="/products" className="store-view-all-link">
                        Filter &amp; Sort <i className="bi bi-sliders"></i>
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
                                        <span className="catalog-card-badge">New</span>
                                        <span className="catalog-card-fast-badge">
                                            <i className="bi bi-lightning-fill"></i> Fast delivery
                                        </span>
                                    </div>

                                    <div className="catalog-card-body">
                                        <span className="catalog-card-cat">
                                            {item.categoryName || "General"}
                                        </span>
                                        <h5 className="catalog-card-title" title={item.name}>
                                            {item.name}
                                        </h5>
                                        <div className="catalog-card-footer">
                                            <span className="catalog-card-price">
                                                &#8377;{Number(item.price || 0).toFixed(2)}
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
                                                    title="Add to cart"
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
