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

    const isAdminRouteActive =
        location.pathname === "/items" ||
        location.pathname === "/category" ||
        location.pathname === "/users";

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
                {/* DESKTOP NAVBAR (>= 992px): Links Left | Center Text Logo | Search + Heart + Profile Right */}
                <div className="vantage-desktop-nav">
                    <nav className="vantage-desktop-links">
                        <NavLink to="/dashboard" className="vantage-nav-link-item">
                            HOME
                        </NavLink>
                        <NavLink to="/products" className="vantage-nav-link-item">
                            SHOP
                        </NavLink>
                        <NavLink to="/explore" className="vantage-nav-link-item">
                            BAG {cartCount > 0 ? `(${cartCount})` : ""}
                        </NavLink>
                        <button
                            type="button"
                            className="vantage-nav-link-item"
                            onClick={handleAiClick}
                        >
                            VANTAGE AI
                        </button>

                        {isAdmin && (
                            <div className="dropdown">
                                <button
                                    type="button"
                                    className={`vantage-nav-link-item dropdown-toggle ${isAdminRouteActive ? "active" : ""}`}
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    ADMIN ACCESS
                                </button>
                                <ul className="dropdown-menu shadow-sm border-0 rounded-4 mt-2">
                                    <li>
                                        <NavLink className="dropdown-item py-2" to="/items">
                                            <i className="bi bi-box-seam me-2"></i>Manage Items
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink className="dropdown-item py-2" to="/category">
                                            <i className="bi bi-tags me-2"></i>Manage Categories
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink className="dropdown-item py-2" to="/users">
                                            <i className="bi bi-people me-2"></i>Manage Users
                                        </NavLink>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </nav>

                    {/* Center Brand Text Logo */}
                    <Link className="vantage-desktop-center-logo" to="/dashboard">
                        <img
                            src={assets.homeTopTextLogo}
                            alt="The Vantage House"
                        />
                    </Link>

                    {/* Right: Inline Search + Wishlist + Desktop Profile Pill */}
                    <div className="vantage-desktop-actions">
                        <form className="vantage-desktop-search" onSubmit={handleNavSearchSubmit}>
                            <i className="bi bi-search"></i>
                            <input
                                type="text"
                                placeholder="Search for vintage gear..."
                                value={navSearch}
                                onChange={(e) => setNavSearch(e.target.value)}
                            />
                        </form>

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

                        {isLoggedIn ? (
                            <Link
                                to="/profile"
                                className={`vantage-account-pill ${isAdmin ? "is-admin" : ""}`}
                            >
                                <span className="text-truncate" style={{ maxWidth: 115 }}>
                                    {auth.name || "Account"}
                                </span>
                                {auth.avatarUrl ? (
                                    <img
                                        src={auth.avatarUrl}
                                        alt={auth.name || "Account"}
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <i className={`bi ${isAdmin ? "bi-shield-fill-check" : "bi-person-circle"}`}></i>
                                )}
                            </Link>
                        ) : (
                            <div className="d-flex align-items-center gap-2">
                                <Link to="/login" className="vantage-signin-pill">
                                    Sign In
                                </Link>
                                <Link to="/signup" className="vantage-signup-pill">
                                    Join
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* MOBILE TOP BAR (< 992px): 3-Line Menu | Centered Text Logo | Search + Heart (No profile on mobile top) */}
                <div className="vantage-topbar-inner">
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

                    <Link className="vantage-center-brand" to="/dashboard">
                        <img
                            src={assets.homeTopTextLogo}
                            alt="The Vantage House"
                            className="vantage-mobile-text-logo"
                        />
                    </Link>

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

                {/* Expandable Mobile Top Search Bar */}
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

                {/* Slide-Down Navigation Drawer (Mobile 3-line menu) */}
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
