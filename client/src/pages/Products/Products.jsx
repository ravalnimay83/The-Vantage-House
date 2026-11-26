import './Products.css';
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppContext } from "../../context/AppContextDefinition.js";
import { assets } from "../../assets/assets.js";
import ProductQuickView from "../../components/ProductQuickView/ProductQuickView.jsx";
import toast from "react-hot-toast";

const PRICE_PRESETS = [
    { id: "all", label: "All Prices", min: null, max: null },
    { id: "under250", label: "Under ₹250", min: 0, max: 250 },
    { id: "250to500", label: "₹250 – ₹500", min: 250, max: 500 },
    { id: "500to1000", label: "₹500 – ₹1,000", min: 500, max: 1000 },
    { id: "over1000", label: "Over ₹1,000", min: 1000, max: null },
];

const Products = () => {
    const { categories, items, addToCart, wishlist, toggleWishlist } = useContext(AppContext);
    const [searchParams, setSearchParams] = useSearchParams();

    const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [pricePreset, setPricePreset] = useState("all");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [wishlistOnly, setWishlistOnly] = useState(false);
    const [sortBy, setSortBy] = useState("featured");
    const [quickViewItem, setQuickViewItem] = useState(null);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    // Sync state when URL query params change (e.g. clicking category or searching from Dashboard)
    useEffect(() => {
        setSelectedCategory(searchParams.get("category") || "all");
        setSearchQuery(searchParams.get("search") || "");
    }, [searchParams]);

    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeItems = Array.isArray(items) ? items : [];

    const handleCategorySelect = (catId) => {
        setSelectedCategory(catId);
        const next = new URLSearchParams(searchParams);
        if (catId === "all") {
            next.delete("category");
        } else {
            next.set("category", catId);
        }
        setSearchParams(next, { replace: true });
    };

    const handleSearchChange = (val) => {
        setSearchQuery(val);
        const next = new URLSearchParams(searchParams);
        if (val.trim()) {
            next.set("search", val.trim());
        } else {
            next.delete("search");
        }
        setSearchParams(next, { replace: true });
    };

    const handlePresetChange = (preset) => {
        setPricePreset(preset.id);
        setMinPrice(preset.min !== null ? String(preset.min) : "");
        setMaxPrice(preset.max !== null ? String(preset.max) : "");
    };

    const clearAllFilters = () => {
        setSelectedCategory("all");
        setSearchQuery("");
        setPricePreset("all");
        setMinPrice("");
        setMaxPrice("");
        setWishlistOnly(false);
        setSortBy("featured");
        setSearchParams({}, { replace: true });
    };

    const filteredAndSortedItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const minVal = minPrice !== "" && !isNaN(Number(minPrice)) ? Number(minPrice) : null;
        const maxVal = maxPrice !== "" && !isNaN(Number(maxPrice)) ? Number(maxPrice) : null;

        const filtered = safeItems.filter((item) => {
            if (selectedCategory !== "all" && item.categoryId !== selectedCategory) {
                return false;
            }
            if (q) {
                const nameMatch = (item.name || "").toLowerCase().includes(q);
                const descMatch = (item.description || "").toLowerCase().includes(q);
                const catMatch = (item.categoryName || "").toLowerCase().includes(q);
                if (!nameMatch && !descMatch && !catMatch) return false;
            }
            const price = Number(item.price || 0);
            if (minVal !== null && price < minVal) return false;
            if (maxVal !== null && price > maxVal) return false;
            if (wishlistOnly && !wishlist.includes(item.itemId)) return false;
            return true;
        });

        const sorted = [...filtered];
        switch (sortBy) {
            case "price-asc":
                sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
                break;
            case "price-desc":
                sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
                break;
            case "name-asc":
                sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                break;
            case "name-desc":
                sorted.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
                break;
            case "newest":
                sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                break;
            default:
                break;
        }
        return sorted;
    }, [safeItems, selectedCategory, searchQuery, minPrice, maxPrice, wishlistOnly, wishlist, sortBy]);

    const activeCategoryObj = safeCategories.find((c) => c.categoryId === selectedCategory);

    const handleQuickAdd = (e, item) => {
        e.stopPropagation();
        addToCart(item, 1);
        toast.success(`${item.name} added to cart`);
    };

    return (
        <div className="products-page">
            <div className="products-shell">
                {/* Breadcrumb + Mobile Filter Toggle */}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                    <div className="products-breadcrumb mb-0">
                        <Link to="/dashboard">Home</Link>
                        <i className="bi bi-chevron-right" style={{ fontSize: "10px" }}></i>
                        <span>{activeCategoryObj ? (activeCategoryObj.name || activeCategoryObj.categoryName) : "All Products"}</span>
                    </div>
                    <button
                        type="button"
                        className="products-mobile-filter-toggle"
                        onClick={() => setMobileFiltersOpen((v) => !v)}
                    >
                        <i className="bi bi-sliders"></i>
                        <span>{mobileFiltersOpen ? "Hide Filters" : "Filters"}</span>
                    </button>
                </div>

                <div className="products-layout">
                    {mobileFiltersOpen && (
                        <div
                            className="products-filter-backdrop"
                            onClick={() => setMobileFiltersOpen(false)}
                        />
                    )}
                    {/* Left Filters Sidebar (Slide-in drawer on mobile) */}
                    <aside className={`filters-sidebar ${mobileFiltersOpen ? "mobile-open" : ""}`}>
                        <div className="filters-header">
                            <h5>
                                <i className="bi bi-funnel-fill"></i>
                                Filters
                            </h5>
                            <div className="d-flex align-items-center gap-3">
                                <button type="button" className="filters-clear-btn" onClick={clearAllFilters}>
                                    Clear All
                                </button>
                                <button
                                    type="button"
                                    className="filters-mobile-close-btn"
                                    onClick={() => setMobileFiltersOpen(false)}
                                    aria-label="Close filters"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="filter-group">
                            <div className="filter-group-title">Category</div>
                            <div className="filter-category-list">
                                <button
                                    type="button"
                                    className={`filter-category-item ${selectedCategory === "all" ? "active" : ""}`}
                                    onClick={() => handleCategorySelect("all")}
                                >
                                    <span>All Categories</span>
                                    <span className="filter-cat-count">{safeItems.length}</span>
                                </button>
                                {safeCategories.map((cat) => {
                                    const count = safeItems.filter((i) => i.categoryId === cat.categoryId).length;
                                    return (
                                        <button
                                            key={cat.categoryId}
                                            type="button"
                                            className={`filter-category-item ${selectedCategory === cat.categoryId ? "active" : ""}`}
                                            onClick={() => handleCategorySelect(cat.categoryId)}
                                        >
                                            <span>{cat.name || cat.categoryName}</span>
                                            <span className="filter-cat-count">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Price Range Filter */}
                        <div className="filter-group">
                            <div className="filter-group-title">Price</div>
                            <div className="filter-price-options">
                                {PRICE_PRESETS.map((preset) => (
                                    <label key={preset.id} className="filter-radio-label">
                                        <input
                                            type="radio"
                                            name="pricePreset"
                                            checked={pricePreset === preset.id}
                                            onChange={() => handlePresetChange(preset)}
                                        />
                                        <span>{preset.label}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="custom-price-inputs">
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Min ₹"
                                    value={minPrice}
                                    onChange={(e) => {
                                        setPricePreset("custom");
                                        setMinPrice(e.target.value);
                                    }}
                                />
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Max ₹"
                                    value={maxPrice}
                                    onChange={(e) => {
                                        setPricePreset("custom");
                                        setMaxPrice(e.target.value);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Additional Filters */}
                        <div className="filter-group">
                            <div className="filter-group-title">Preferences</div>
                            <label className="filter-radio-label">
                                <input
                                    type="checkbox"
                                    checked={wishlistOnly}
                                    onChange={(e) => setWishlistOnly(e.target.checked)}
                                />
                                <span>Saved / Wishlist Only</span>
                            </label>
                        </div>
                    </aside>

                    {/* Right Main Product Area */}
                    <main className="products-main">
                        {/* Sort Toolbar */}
                        <div className="products-toolbar">
                            <div className="products-sort-group w-100 justify-content-between">
                                <span className="products-result-count">
                                    Showing {filteredAndSortedItems.length} of {safeItems.length}
                                </span>
                                <select
                                    className="products-sort-select"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    aria-label="Sort products"
                                >
                                    <option value="featured">Sort: Featured</option>
                                    <option value="price-asc">Price: Low to High</option>
                                    <option value="price-desc">Price: High to Low</option>
                                    <option value="name-asc">Name: A to Z</option>
                                    <option value="name-desc">Name: Z to A</option>
                                    <option value="newest">Newest Arrivals</option>
                                </select>
                            </div>
                        </div>

                        {/* Active Filter Chips */}
                        {(selectedCategory !== "all" || searchQuery.trim() || minPrice || maxPrice || wishlistOnly) && (
                            <div className="active-filters-bar">
                                {activeCategoryObj && (
                                    <span className="active-filter-chip">
                                        Category: {activeCategoryObj.name || activeCategoryObj.categoryName}
                                        <button type="button" onClick={() => handleCategorySelect("all")}>×</button>
                                    </span>
                                )}
                                {searchQuery.trim() && (
                                    <span className="active-filter-chip">
                                        Search: "{searchQuery.trim()}"
                                        <button type="button" onClick={() => handleSearchChange("")}>×</button>
                                    </span>
                                )}
                                {(minPrice || maxPrice) && (
                                    <span className="active-filter-chip">
                                        Price: ₹{minPrice || 0} – {maxPrice ? `₹${maxPrice}` : "Any"}
                                        <button
                                            type="button"
                                            onClick={() => handlePresetChange(PRICE_PRESETS[0])}
                                        >
                                            ×
                                        </button>
                                    </span>
                                )}
                                {wishlistOnly && (
                                    <span className="active-filter-chip">
                                        Wishlist Only
                                        <button type="button" onClick={() => setWishlistOnly(false)}>×</button>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Product Grid */}
                        {filteredAndSortedItems.length === 0 ? (
                            <div className="products-empty-card">
                                <i className="bi bi-search fs-1 d-block mb-2"></i>
                                <h5 className="text-dark fw-bold">No matching products found</h5>
                                <p className="mb-3">Try adjusting your search or clearing some filters.</p>
                                <button
                                    type="button"
                                    className="btn btn-dark rounded-pill px-4"
                                    onClick={clearAllFilters}
                                >
                                    Reset All Filters
                                </button>
                            </div>
                        ) : (
                            <div className="amazon-products-grid">
                                {filteredAndSortedItems.map((item) => {
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
                                                <span className="catalog-card-badge">In Stock</span>
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
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleWishlist(item.itemId);
                                                            }}
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
                    </main>
                </div>
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

export default Products;
