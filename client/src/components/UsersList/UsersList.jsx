import { useState } from "react";
import { deleteUser } from "../../Service/UserService.js";
import toast from "react-hot-toast";

const UsersList = ({ users, setUsers, onAddClick }) => {
    const [searchTerm, setSearchTerm] = useState("");

    const safeUsers = Array.isArray(users) ? users : [];
    const filteredUsers = safeUsers.filter((user) => {
        const query = searchTerm.toLowerCase();
        const nameMatch = (user?.name || "").toLowerCase().includes(query);
        const emailMatch = (user?.email || "").toLowerCase().includes(query);
        const phoneMatch = (user?.phoneNumber || "").toLowerCase().includes(query);
        return nameMatch || emailMatch || phoneMatch;
    });

    const deleteByUserId = async (id) => {
        try {
            await deleteUser(id);
            setUsers((prevUsers) => prevUsers.filter((user) => user.userId !== id));
            toast.success("User deleted successfully.");
        } catch (error) {
            console.error("Error while deleting user:", error);
            const message = error.response?.data?.message || error.message || "Error while deleting user.";
            toast.error(message);
        }
    };

    return (
        <div>
            <div className="admin-panel-heading">
                <div className="d-flex align-items-center gap-2">
                    <h4>Registered Users</h4>
                    <span className="admin-count-pill">{safeUsers.length} total</span>
                </div>
                {onAddClick && (
                    <button type="button" className="admin-add-mobile-btn" onClick={onAddClick}>
                        <i className="bi bi-plus-lg"></i>
                        Add User
                    </button>
                )}
            </div>

            <div className="admin-list-toolbar">
                <div className="admin-search-input-wrap">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredUsers.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-people fs-1 d-block mb-2"></i>
                    <p className="mb-0">No users found.</p>
                </div>
            ) : (
                <div className="admin-users-list">
                    {filteredUsers.map((user, index) => {
                        const isAdminUser = user.role === "ROLE_ADMIN";
                        return (
                            <div key={user.userId || index} className="admin-user-row">
                                <div className="d-flex align-items-center gap-3 min-width-0">
                                    <div className={`admin-user-avatar ${isAdminUser ? "is-admin" : ""}`}>
                                        {(user?.name || "U").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-width-0">
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <span className="fw-bold text-dark">{user.name}</span>
                                            {isAdminUser && (
                                                <span className="badge rounded-pill text-bg-warning fw-bold" style={{ fontSize: "10px" }}>
                                                    <i className="bi bi-shield-fill-check me-1"></i>
                                                    ADMIN
                                                </span>
                                            )}
                                        </div>
                                        <div className="small text-muted text-truncate">
                                            {user.email || user.phoneNumber}
                                            {user.email && user.phoneNumber ? ` • ${user.phoneNumber}` : ""}
                                        </div>
                                    </div>
                                </div>

                                {!isAdminUser && (
                                    <button
                                        type="button"
                                        className="admin-icon-action delete"
                                        title="Delete User"
                                        onClick={() => deleteByUserId(user.userId)}
                                    >
                                        <i className="bi bi-trash3-fill"></i>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default UsersList;
