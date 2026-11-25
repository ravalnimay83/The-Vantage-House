import UserForm from "../../components/UserForm/UserForm.jsx";
import UsersList from "../../components/UsersList/UsersList.jsx";
import AdminPanelHeader from "../../components/Auth/AdminPanelHeader.jsx";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchUsers } from "../../Service/UserService.js";
import "../../components/Auth/AdminShared.css";

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [mobileShowForm, setMobileShowForm] = useState(false);

    useEffect(() => {
        async function loadUsers() {
            try {
                setLoading(true);
                const response = await fetchUsers();
                setUsers(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error("Unable to fetch users:", error);
                const message = error.response?.data?.message || error.message || "Unable to fetch users";
                toast.error("Error fetching users: " + message);
            } finally {
                setLoading(false);
            }
        }
        loadUsers();
    }, []);

    return (
        <div className="admin-page-shell">
            <div className="admin-inner-container">
                <AdminPanelHeader
                    title="User Management"
                    subtitle="View registered customers and manage user accounts"
                />

                <div className="admin-split-layout">
                    <div className={`admin-form-panel ${mobileShowForm ? "" : "mobile-hidden"}`}>
                        <UserForm
                            setUsers={setUsers}
                            onSuccess={() => setMobileShowForm(false)}
                            onBackToList={() => setMobileShowForm(false)}
                        />
                    </div>

                    <div className={`admin-list-panel ${mobileShowForm ? "mobile-hidden" : ""}`}>
                        {loading ? (
                            <div className="d-flex justify-content-center align-items-center py-5">
                                <div className="spinner-border text-success" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : (
                            <UsersList
                                users={users}
                                setUsers={setUsers}
                                onAddClick={() => setMobileShowForm(true)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageUsers;
