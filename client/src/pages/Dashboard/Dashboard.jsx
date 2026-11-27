import './Dashboard.css';
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContextDefinition.js";
import { assets } from "../../assets/assets.js";
import ProductQuickView from "../../components/ProductQuickView/ProductQuickView.jsx";
import PixieIntroPopup from "../../components/Pixie/PixieIntroPopup.jsx";
import { openVantageAi } from "../../components/VantageAi/VantageAiDrawer.jsx";
import {
    ServerWarmupNote,
    WatermarkSkeletonBox,
    WatermarkSkeletonGrid,
} from "../../components/ItemLoader/ItemLoadingSkeleton.jsx";
import toast from "react-hot-toast";

const Dashboard = () => {
    const { auth, categories, items, wishlist, toggleWishlist } = useContext(AppContext);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeChip, setActiveChip] = useState("all");
    const [quickViewItem, setQuickViewItem] = useState(null);
    const [heroSlideIdx, setHeroSlideIdx] = useState(0);

    // Quiet Vantage AI strip state
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiReply, setAiReply] = useState("");
    const [newsletterEmail, setNewsletterEmail] = useState("");
    const navigate = useNavigate();

    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeItems = Array.isArray(items) ? items : [];
    const firstName = auth?.name ? auth.name.split(" ")[0] : null;

    // 1. Hero slowly cross-fades between 2-3 drops
    const heroDrops = useMemo(() => safeItems.slice(0, 3), [safeItems]);
    useEffect(() => {
        if (heroDrops.length <= 1) return;
        const timer = setInterval(() => {
            setHeroSlideIdx((prev) => (prev + 1) % heroDrops.length);
        }, 4500);
        return () => clearInterval(timer);
    }, [heroDrops.length]);

    // 3. The Vantage Special (4 featured items) & 4. New Arrivals (latest 8 items)
    const vantageSpecialItems = useMemo(() => {
        const featured = safeItems.filter((it) => it.featured);
        return (featured.length >= 4 ? featured : safeItems).slice(0, 4);
    }, [safeItems]);

    const newArrivalItems = useMemo(() => {
        const markedNew = safeItems.filter((it) => it.isNew || it.newArrival);
        return (markedNew.length > 0 ? markedNew : safeItems).slice(0, 8);
    }, [safeItems]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        navigate(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products");
    };

    const handleCategoryClick = (categoryId) => {
        setActiveChip(categoryId);
        if (categoryId !== "all" && categoryId !== "new") {
            navigate(`/products?category=${encodeURIComponent(categoryId)}`);
        }
    };

    const handleWishlistClick = (e, itemId) => {
        e.stopPropagation();
        toggleWishlist(itemId);
    };

    const handleAskVantageAi = (e) => {
        e.preventDefault();
        const q = aiPrompt.trim();
        if (!q) {
            openVantageAi();
            return;
        }
        openVantageAi(q);
        setAiPrompt("");
    };

    const handleNewsletterSubmit = (e) => {
        e.preventDefault();
        if (!newsletterEmail.trim() || !newsletterEmail.includes("@")) {
            toast.error("Please enter a valid email address.");
            return;
        }
        toast.success("Welcome to The Vantage House dispatch.");
        setNewsletterEmail("");
    };

    const renderUniformCard = (item, showNewLabel = false) => {
        const isWishlisted = wishlist.includes(item.itemId);
        return (
            <div
                key={item.itemId}
                className="vantage-uniform-card"
                onClick={() => setQuickViewItem(item)}
            >
                <div className="vantage-uniform-media">
                    <img
                        src={item.imageUrl || assets.upload}
                        alt={item.name}
                        className="vantage-img-primary"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = assets.upload;
                        }}
                    />
                    {showNewLabel && <span className="vantage-new-label">New</span>}
                    <button
                        type="button"
                        className={`vantage-card-heart ${isWishlisted ? "wishlisted" : ""}`}
                        title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        onClick={(e) => handleWishlistClick(e, item.itemId)}
                    >
                        <i className={`bi ${isWishlisted ? "bi-heart-fill" : "bi-heart"}`}></i>
                    </button>
                </div>

                <div className="vantage-uniform-body">
                    <h5 className="vantage-uniform-title" title={item.name}>
                        {item.name}
                    </h5>
                    <div className="vantage-uniform-price">
                        &#8377;{Number(item.price || 0).toLocaleString("en-IN")}
                    </div>
                </div>
            </div>
        );
    };

    const renderSkeletonRow = (count, showBanner = true) => (
        <WatermarkSkeletonGrid count={count} showBanner={showBanner} />
    );

    return (
        <div className="store-dashboard">
            <PixieIntroPopup />
            <div className="store-container">
                {/* 1. HERO */}
                <section className="vantage-hero-card">
                    <div className="vantage-hero-split">
                        <div className="vantage-hero-frame">
                            <p className="vantage-hero-calm-greeting">
                                {firstName ? `Welcome back, ${firstName}.` : "Welcome to The Vantage House."}
                            </p>
                            <h1 className="vantage-hero-title">YOUR NEXT CLUB FIT IS READY</h1>

                            <div className="vantage-hero-cta-row">
                                <Link to="/products" className="vantage-cta-cream">
                                    Shop Collection
                                </Link>
                                <Link to="/explore" className="vantage-cta-outline">
                                    Open Bag
                                </Link>
                            </div>

                            <form className="vantage-hero-search" onSubmit={handleSearchSubmit}>
                                <i className="bi bi-search text-muted"></i>
                                <input
                                    type="text"
                                    placeholder="Search tees, shirts, trousers..."
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

                        <div className="vantage-hero-visual">
                            {heroDrops.length > 0 ? (
                                heroDrops.map((drop, idx) => (
                                    <img
                                        key={drop.itemId}
                                        src={drop.imageUrl || assets.upload}
                                        alt={drop.name}
                                        className={`vantage-hero-slide ${idx === heroSlideIdx ? "active" : ""}`}
                                        onClick={() => setQuickViewItem(drop)}
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = assets.upload;
                                        }}
                                    />
                                ))
                            ) : (
                                <WatermarkSkeletonBox className="w-100 h-100" />
                            )}
                        </div>
                    </div>
                </section>

                {/* 2. CATEGORY CHIPS */}
                <section className="vantage-pills-row">
                    <button
                        type="button"
                        className={`vantage-pill ${activeChip === "all" ? "active" : ""}`}
                        onClick={() => handleCategoryClick("all")}
                    >
                        All Drops
                    </button>
                    <button
                        type="button"
                        className={`vantage-pill ${activeChip === "new" ? "active" : ""}`}
                        onClick={() => navigate("/products")}
                    >
                        New Arrivals
                    </button>
                    {safeCategories.map((cat) => (
                        <button
                            key={cat.categoryId}
                            type="button"
                            className={`vantage-pill ${activeChip === cat.categoryId ? "active" : ""}`}
                            onClick={() => handleCategoryClick(cat.categoryId)}
                        >
                            {cat.name || cat.categoryName}
                        </button>
                    ))}
                </section>

                <ServerWarmupNote active={safeItems.length === 0} />

                {/* 3. THE VANTAGE SPECIAL (Row of 4) */}
                <section className="vantage-home-section">
                    <div className="vantage-section-head">
                        <h3>The Vantage Special</h3>
                        <Link to="/products" className="vantage-view-link">
                            View all
                        </Link>
                    </div>
                    <div className="vantage-row-4">
                        {vantageSpecialItems.length > 0
                            ? vantageSpecialItems.map((item) => renderUniformCard(item, false))
                            : renderSkeletonRow(4, true)}
                    </div>
                </section>

                {/* 4. NEW ARRIVALS (Horizontal row of latest 8) */}
                <section className="vantage-home-section">
                    <div className="vantage-section-head">
                        <h3>New Arrivals</h3>
                        <Link to="/products" className="vantage-view-link">
                            View all
                        </Link>
                    </div>
                    <div className="vantage-horizontal-row">
                        {newArrivalItems.length > 0
                            ? newArrivalItems.map((item) => renderUniformCard(item, true))
                            : renderSkeletonRow(4, false)}
                    </div>
                </section>

                {/* 5. VANTAGE AI (Quiet Strip) */}
                <section className="vantage-home-section">
                    <div className="vantage-ai-strip">
                        <div className="vantage-ai-strip-text">
                            <h4>Not sure what to wear? Ask Vantage AI.</h4>
                            <p>Describe the occasion or weather for an instant club pairing.</p>
                        </div>
                        <form className="vantage-ai-strip-form" onSubmit={handleAskVantageAi}>
                            <input
                                type="text"
                                placeholder="e.g. Weekend coffee run in 24°C..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                            />
                            <button type="submit">Ask</button>
                        </form>
                        {aiReply && <div className="vantage-ai-reply">{aiReply}</div>}
                    </div>
                </section>

                {/* 6. OUR STORY */}
                <section className="vantage-home-section">
                    <div className="vantage-story-block">
                        <div className="vantage-story-media">
                            <img src={assets.primaryLogo} alt="The Vantage House Crest" />
                        </div>
                        <div className="vantage-story-copy">
                            <span className="vantage-story-kicker">Our Story</span>
                            <h3>Quality clothing, made to last.</h3>
                            <p>
                                Rooted in timeless club tailoring and heavyweight fabrics, every piece at The Vantage House is crafted for everyday wear that ages with character.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 7. FOOTER */}
                <footer className="vantage-footer">
                    <div className="vantage-footer-grid">
                        <div>
                            <div className="vantage-footer-brand">THE VANTAGE HOUSE</div>
                            <p className="vantage-footer-note">
                                Established 2024. Authentic &amp; original apparel designed for longevity.
                            </p>
                        </div>

                        <div className="vantage-footer-links">
                            <h6>House</h6>
                            <Link to="/products">About</Link>
                            <Link to="/explore">Delivery &amp; Returns</Link>
                            <Link to="/profile">Size Guide</Link>
                            <Link to="/profile">Contact</Link>
                        </div>

                        <div className="vantage-footer-links">
                            <h6>Connect</h6>
                            <a href="#instagram" onClick={(e) => e.preventDefault()}>Instagram</a>
                            <a href="#x" onClick={(e) => e.preventDefault()}>X / Twitter</a>
                        </div>

                        <div>
                            <h6 className="vantage-footer-news-title">Dispatch</h6>
                            <form className="vantage-footer-news-form" onSubmit={handleNewsletterSubmit}>
                                <input
                                    type="email"
                                    placeholder="Email for new drops"
                                    value={newsletterEmail}
                                    onChange={(e) => setNewsletterEmail(e.target.value)}
                                />
                                <button type="submit">Join</button>
                            </form>
                        </div>
                    </div>

                    <div className="vantage-footer-bottom">
                        <span>© 2024–2026 The Vantage House. All rights reserved.</span>
                        <span className="vantage-footer-credit">
                            Designed &amp; Built by <strong>Nmy</strong> · Crafted with Heritage
                        </span>
                    </div>
                </footer>
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
