import { NavLink } from "react-router-dom";
import "./AdminPanelHeader.css";

const AdminPanelHeader = ({ title, subtitle }) => {
    return (
        <div className="admin-panel-banner">
            <div>
                <div className="admin-panel-title-group">
                    <h5>
                        <i className="bi bi-shield-lock-fill text-warning me-2"></i>
                        Admin Panel — {title}
                    </h5>
                    <span className="admin-access-pill">
                        <i className="bi bi-lock-fill"></i>
                        Admin Access Only
                    </span>
                </div>
                {subtitle && (
                    <small style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px" }}>
                        {subtitle}
                    </small>
                )}
            </div>

            <div className="admin-panel-nav-pills">
                <NavLink
                    to="/items"
                    className={({ isActive }) => `admin-panel-pill-link ${isActive ? "active" : ""}`}
                >
                    Inventory
                </NavLink>
                <NavLink
                    to="/category"
                    className={({ isActive }) => `admin-panel-pill-link ${isActive ? "active" : ""}`}
                >
                    Categories
                </NavLink>
                <NavLink
                    to="/users"
                    className={({ isActive }) => `admin-panel-pill-link ${isActive ? "active" : ""}`}
                >
                    Users
                </NavLink>
            </div>
        </div>
    );
};

export default AdminPanelHeader;
