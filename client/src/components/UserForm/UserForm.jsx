import { useState } from "react";
import { addUser } from "../../Service/UserService.js";
import toast from "react-hot-toast";

const UserForm = ({ setUsers, onSuccess, onBackToList }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        password: "",
    });

    const onChangeHandler = (e) => {
        const { name, value } = e.target;
        setData((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await addUser({
                name: data.name.trim(),
                email: data.email.trim() || null,
                phoneNumber: data.phoneNumber.trim() || null,
                password: data.password,
                role: "ROLE_USER",
            });
            setUsers((prevUsers) => [...prevUsers, response.data]);
            toast.success("User added successfully");
            setData({
                name: "",
                email: "",
                phoneNumber: "",
                password: "",
            });
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Error adding user:", error);
            const message = error.response?.data?.message || error.message || "Failed to add user";
            toast.error("Error adding user: " + message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="admin-panel-heading">
                <h5>Add New User</h5>
                {onBackToList && (
                    <button
                        type="button"
                        className="admin-back-list-btn"
                        onClick={onBackToList}
                    >
                        <i className="bi bi-arrow-left"></i>
                        List
                    </button>
                )}
            </div>

            <form onSubmit={onSubmitHandler}>
                <div className="mb-3">
                    <label htmlFor="name" className="form-label">
                        Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        className="form-control"
                        placeholder="John Doe"
                        onChange={onChangeHandler}
                        value={data.name}
                        required
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                        Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        className="form-control"
                        placeholder="yourname@example.com"
                        onChange={onChangeHandler}
                        value={data.email}
                        required
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="phoneNumber" className="form-label">
                        Mobile Number
                    </label>
                    <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        className="form-control"
                        placeholder="+919876543210"
                        onChange={onChangeHandler}
                        value={data.phoneNumber}
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="password" className="form-label">
                        Password <span className="text-danger">*</span>
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        className="form-control"
                        placeholder="••••••••"
                        onChange={onChangeHandler}
                        value={data.password}
                        required
                    />
                </div>

                <button type="submit" className="admin-submit-btn" disabled={loading}>
                    {loading ? "Saving..." : "Save User"}
                </button>
            </form>
        </div>
    );
};

export default UserForm;
