import './Menubar.css';
import { assets } from "../../assets/assets.js";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../../context/AppContextDefinition.js";
import toast from "react-hot-toast";

const Menubar = () => {
    const { auth, cartCount, wishlist } = useContext(AppContext);
    const location = useLocation();
    const navigate = useNavigate();
    const isLoggedIn = Boolean(auth?.token);
    const isAdmin = auth?.role === "ROLE_ADMIN";
    const wishlistCount = Array.isArray(wishlist) ? wishlist.length : 0;

    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [navSearch, setNavSearch] = useState("");
    const [isScrolled, setIsScrolled] = useState(false);
    const [dockMinimized, setDockMinimized] = useState(false);
    const lastScrollY = useRef(0);

    useEffect(() => {
        setMenuOpen(false);
        setSearchOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const onScroll = () => {
            const currentY = window.scrollY || 0;
            setIsScrolled(currentY > 12);

            if (currentY > 70 && currentY > lastScrollY.current + 6) {
                setDockMinimized(true);
            } else if (currentY < lastScrollY.current - 6 || currentY <= 40) {
                setDockMinimized(false);
            }
            lastScrollY.current = currentY;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const handleAiClick = () => {
        toast("Vantage AI Assistant is coming soon!", { icon: "✨" });
    };

    const handleNavSearchSubmit = (e) => {
        e.preventDefault();
        const q = navSearch.trim();
        setSearchOpen(false);
        navigate(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
    };

    return (
        <>
            {/* Sticky Heritage Top Bar */}
            <header className={`vantage-topbar ${isScrolled ? "scrolled" : ""}`}>
                <div className="vantage-topbar-inner">
                    {/* Left: 3-Line Menu Trigger */}
                    <div className="vantage-topbar-left">
                        <button
                            type="button"
                            className="vantage-icon-btn"
                            onClick={() => setMenuOpen((v) => !v)}
                            aria-label="Open navigation menu"
                        >
                            <i className={`bi ${menuOpen ? "bi-x-lg" : "bi-list"}`}></i>
                        </button>
                    </div>

                    {/* Center: Heritage Wordmark */}
                    <Link className="vantage-center-brand" to="/dashboard">
                        <span className="vantage-brand-main">THE VANTAGE HOUSE</span>
                        <span className="vantage-brand-script">House</span>
                    </Link>

                    {/* Right: Search & Wishlist (No Bag on top) */}
                    <div className="vantage-topbar-right">
                        <button
                            type="button"
                            className="vantage-icon-btn"
                            onClick={() => setSearchOpen((v) => !v)}
                            aria-label="Search gear"
                            title="Search"
                        >
                            <i className="bi bi-search"></i>
                        </button>

                        <Link
                            to={isLoggedIn ? "/profile" : "/login"}
                            className="vantage-icon-btn position-relative"
                            aria-label="Wishlist"
                            title="Wishlist"
                        >
                            <i className={`bi ${wishlistCount > 0 ? "bi-heart-fill" : "bi-heart"}`}></i>
                            {wishlistCount > 0 && (
                                <span className="vantage-wishlist-dot">{wishlistCount}</span>
                            )}
                        </Link>
                    </div>
                </div>

                {/* Expandable Top Search Bar */}
                {searchOpen && (
                    <form className="vantage-topbar-search-drawer" onSubmit={handleNavSearchSubmit}>
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Search vintage tees, jackets, trousers..."
                            value={navSearch}
                            onChange={(e) => setNavSearch(e.target.value)}
                            autoFocus
                        />
                        <button type="submit">Go</button>
                    </form>
                )}

                {/* Slide-Down Navigation Drawer (3-line menu) */}
                {menuOpen && (
                    <div className="vantage-drawer-menu">
                        <div className="vantage-drawer-links">
                            <NavLink to="/dashboard" className="vantage-drawer-link">
                                <i className="bi bi-house-door"></i> Home
                            </NavLink>
                            <NavLink to="/products" className="vantage-drawer-link">
                                <i className="bi bi-handbag"></i> Shop Drops
                            </NavLink>
                            <NavLink to="/explore" className="vantage-drawer-link">
                                <i className="bi bi-basket2"></i> Bag &amp; Billing ({cartCount})
                            </NavLink>
                            <NavLink to={isLoggedIn ? "/profile" : "/login"} className="vantage-drawer-link">
                                <i className="bi bi-person"></i> {isLoggedIn ? "My Account & Orders" : "Sign In / Join"}
                            </NavLink>
                        </div>

                        {isAdmin && (
                            <div className="vantage-drawer-admin">
                                <div className="vantage-drawer-admin-title">
                                    <i className="bi bi-shield-fill-check me-1"></i> Admin Access
                                </div>
                                <div className="vantage-drawer-links">
                                    <NavLink to="/items" className="vantage-drawer-link">
                                        Manage Items
                                    </NavLink>
                                    <NavLink to="/category" className="vantage-drawer-link">
                                        Manage Categories
                                    </NavLink>
                                    <NavLink to="/users" className="vantage-drawer-link">
                                        Manage Users
                                    </NavLink>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Mobile Bottom Navigation: Cream Pill (No golden outer border) + Scroll-Dock Effect */}
            <div className={`mobile-bottom-nav ${dockMinimized ? "dock-minimized" : ""}`}>
                <Link
                    to="/dashboard"
                    className={`mobile-nav-item ${location.pathname === "/dashboard" ? "active" : ""}`}
                >
                    <i className="bi bi-house-door-fill"></i>
                    <span>HOME</span>
                    {location.pathname === "/dashboard" && <span className="mobile-nav-star">★</span>}
                </Link>

                <Link
                    to="/products"
                    className={`mobile-nav-item ${location.pathname === "/products" ? "active" : ""}`}
                >
                    <i className="bi bi-handbag-fill"></i>
                    <span>SHOP</span>
                    {location.pathname === "/products" && <span className="mobile-nav-star">★</span>}
                </Link>

                <button
                    type="button"
                    className="mobile-nav-center-v"
                    onClick={handleAiClick}
                    aria-label="Vantage AI (Coming Soon)"
                >
                    <span className="mobile-v-crest">
                        <img src={assets.favicon} alt="Vantage AI" />
                    </span>
                    <span className="mobile-v-label">VANTAGE</span>
                </button>

                <Link
                    to="/explore"
                    className={`mobile-nav-item ${location.pathname === "/explore" ? "active" : ""}`}
                >
                    <i className="bi bi-basket2-fill"></i>
                    {cartCount > 0 && <span className="mobile-nav-badge">{cartCount}</span>}
                    <span>BAG</span>
                    {location.pathname === "/explore" && <span className="mobile-nav-star">★</span>}
                </Link>

                <Link
                    to={isLoggedIn ? "/profile" : "/login"}
                    className={`mobile-nav-item ${location.pathname === "/profile" || location.pathname === "/login" ? "active" : ""}`}
                >
                    {isLoggedIn && auth.avatarUrl ? (
                        <img
                            src={auth.avatarUrl}
                            alt="Profile"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = "none";
                            }}
                            className={`mobile-profile-avatar ${isAdmin ? "admin-ring" : ""}`}
                        />
                    ) : (
                        <i className={`bi ${isAdmin ? "bi-shield-fill-check" : "bi-shield-fill"}`}></i>
                    )}
                    <span>{isLoggedIn ? (isAdmin ? "ADMIN" : "ACCOUNT") : "SIGN IN"}</span>
                    {(location.pathname === "/profile" || location.pathname === "/login") && (
                        <span className="mobile-nav-star">★</span>
                    )}
                </Link>
            </div>
        </>
    );
};

export default Menubar;
