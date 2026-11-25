import { useContext } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../../context/AppContextDefinition.js";

const AdminRoute = ({ children }) => {
    const { auth } = useContext(AppContext);
    const isAdmin = Boolean(auth?.token && auth?.role === "ROLE_ADMIN");

    if (!isAdmin) {
        return (
            <div className="container py-5">
                <div
                    className="mx-auto text-center bg-white p-5 rounded-4 border shadow-sm"
                    style={{ maxWidth: "480px" }}
                >
                    <i className="bi bi-shield-lock-fill fs-1 text-danger d-block mb-3"></i>
                    <h4 className="fw-bold text-dark mb-2">Admin Access Required</h4>
                    <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
                        Only the store administrator (<strong>ravalnimay83@gmail.com</strong>) can manage categories, items, and users.
                    </p>
                    <div className="d-flex justify-content-center gap-2 flex-wrap">
                        <Link to="/dashboard" className="btn btn-outline-dark rounded-pill px-4 fw-bold">
                            Back to Home
                        </Link>
                        {!auth?.token && (
                            <Link to="/login" className="btn btn-dark rounded-pill px-4 fw-bold">
                                Sign In as Admin
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return children;
};

export default AdminRoute;
