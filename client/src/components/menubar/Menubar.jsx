import './Menubar.css';
import { assets } from "../../assets/assets.js";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../../context/AppContextDefinition.js";
import toast from "react-hot-toast";

const Menubar = () => {
    const { auth, cartCount } = useContext(AppContext);
    const location = useLocation();
    const isLoggedIn = Boolean(auth?.token);
    const isAdmin = auth?.role === "ROLE_ADMIN";

    const handleAiClick = () => {
        toast("AI Assistant is coming soon!", { icon: "✨" });
    };

    const isAdminRouteActive =
        location.pathname === "/items" ||
        location.pathname === "/category" ||
        location.pathname === "/users";

    return (
        <>
            <nav className="navbar navbar-expand-lg bizbill-navbar">
                <div className="container-fluid px-1">
                    <Link className="bizbill-brand me-lg-4" to="/dashboard">
                        <img src={assets.logo} alt="BizBill Logo" height="34" />
                        <span>BizBill</span>
                    </Link>

                    {/* Quick Auth / Menu Toggle on Mobile */}
                    <div className="d-flex align-items-center gap-2 d-lg-none">
                        {!isLoggedIn ? (
                            <Link to="/login" className="bizbill-signup-btn py-1 px-3" style={{ fontSize: "12px" }}>
                                Sign In
                            </Link>
                        ) : (
                            <Link
                                to="/profile"
                                className={`bizbill-user-pill text-decoration-none py-1 px-2 ${isAdmin ? "admin-nav-ring" : ""}`}
                            >
                                <i className={`bi ${isAdmin ? "bi-shield-fill-check text-warning" : "bi-person-check-fill"}`}></i>
                                <span className="text-truncate" style={{ maxWidth: "85px" }}>
                                    {auth.name || "Profile"}
                                </span>
                                {isAdmin && <span className="nav-admin-tag">ADMIN</span>}
                            </Link>
                        )}
                        <button
                            className="navbar-toggler border-0"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#navbarNav"
                            aria-controls="navbarNav"
                            aria-expanded="false"
                            aria-label="Toggle navigation"
                        >
                            <span className="navbar-toggler-icon"></span>
                        </button>
                    </div>

                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-1 align-items-lg-center mt-2 mt-lg-0">
                            <li className="nav-item">
                                <NavLink className={({ isActive }) => `nav-link bizbill-nav-link ${isActive ? "active" : ""}`} to="/dashboard">
                                    Home
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink className={({ isActive }) => `nav-link bizbill-nav-link ${isActive ? "active" : ""}`} to="/products">
                                    Catalog
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink className={({ isActive }) => `nav-link bizbill-nav-link ${isActive ? "active" : ""}`} to="/explore">
                                    Billing &amp; Cart
                                </NavLink>
                            </li>
                            {isLoggedIn && (
                                <li className="nav-item">
                                    <NavLink className={({ isActive }) => `nav-link bizbill-nav-link ${isActive ? "active" : ""}`} to="/profile">
                                        Profile
                                    </NavLink>
                                </li>
                            )}
                            {isAdmin && (
                                <li className="nav-item dropdown">
                                    <button
                                        type="button"
                                        className={`nav-link dropdown-toggle bizbill-admin-dropdown-btn ${isAdminRouteActive ? "active" : ""}`}
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        <i className="bi bi-shield-lock-fill me-1"></i>
                                        Admin Panel
                                    </button>
                                    <ul className="dropdown-menu bizbill-admin-menu shadow border-0 rounded-4 p-2">
                                        <li className="px-3 py-1">
                                            <small className="text-uppercase fw-bold text-muted" style={{ fontSize: "10px", letterSpacing: "0.6px" }}>
                                                Admin Access Only
                                            </small>
                                        </li>
                                        <li>
                                            <Link className="dropdown-item rounded-3 py-2 fw-semibold" to="/items">
                                                <i className="bi bi-box-seam me-2 text-success"></i>
                                                Inventory Management
                                            </Link>
                                        </li>
                                        <li>
                                            <Link className="dropdown-item rounded-3 py-2 fw-semibold" to="/category">
                                                <i className="bi bi-tags me-2 text-primary"></i>
                                                Category Management
                                            </Link>
                                        </li>
                                        <li>
                                            <Link className="dropdown-item rounded-3 py-2 fw-semibold" to="/users">
                                                <i className="bi bi-people me-2 text-warning"></i>
                                                User Management
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                            )}
                        </ul>

                        <div className="bizbill-nav-actions mt-2 mt-lg-0 d-none d-lg-flex">
                            <button type="button" className="bizbill-ai-btn" onClick={handleAiClick} title="AI Assistant (Coming Soon)">
                                <i className="bi bi-stars"></i>
                                <span>AI</span>
                            </button>

                            <Link to="/explore" className="bizbill-cart-pill" title="View Cart & Checkout">
                                <i className="bi bi-bag-fill"></i>
                                <span>Cart</span>
                                <span className="bizbill-cart-count">{cartCount}</span>
                            </Link>

                            {isLoggedIn ? (
                                <Link
                                    to="/profile"
                                    className={`bizbill-user-pill text-decoration-none ${isAdmin ? "admin-nav-ring" : ""}`}
                                    title="View Profile"
                                >
                                    <i className={`bi ${isAdmin ? "bi-shield-fill-check text-warning" : "bi-person-check-fill"}`}></i>
                                    <span>{auth.name || auth.email || auth.phoneNumber || "Profile"}</span>
                                    {isAdmin && <span className="nav-admin-tag">ADMIN</span>}
                                </Link>
                            ) : (
                                <>
                                    <Link to="/login" className="bizbill-signin-btn">
                                        Sign In
                                    </Link>
                                    <Link to="/signup" className="bizbill-signup-btn">
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation: Home -> AI -> Cart -> Profile */}
            <div className="mobile-bottom-nav">
                <Link
                    to="/dashboard"
                    className={`mobile-nav-item ${location.pathname === "/dashboard" ? "active" : ""}`}
                >
                    <i className="bi bi-house-door-fill"></i>
                    <span>Home</span>
                </Link>

                <button
                    type="button"
                    className="mobile-nav-item"
                    onClick={handleAiClick}
                >
                    <span className="mobile-nav-ai-icon">
                        <i className="bi bi-stars"></i>
                    </span>
                    <span>AI</span>
                </button>

                <Link
                    to="/explore"
                    className={`mobile-nav-item ${location.pathname === "/explore" ? "active" : ""}`}
                >
                    <i className="bi bi-bag-fill"></i>
                    {cartCount > 0 && <span className="mobile-nav-badge">{cartCount}</span>}
                    <span>Cart</span>
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
                        <i className={`bi ${isAdmin ? "bi-shield-fill-check text-warning" : "bi-person-fill"}`}></i>
                    )}
                    <span>{isLoggedIn ? (isAdmin ? "Admin" : "Profile") : "Sign In"}</span>
                </Link>
            </div>
        </>
    );
};

export default Menubar;
