import { useState } from "react";
import CategoryForm from "../../components/CatrgoryForm/CategoryForm.jsx";
import CategoryList from "../../components/CategoryList/CategoryList.jsx";
import AdminPanelHeader from "../../components/Auth/AdminPanelHeader.jsx";
import "../../components/Auth/AdminShared.css";

const ManageCategory = () => {
    const [editingCategory, setEditingCategory] = useState(null);
    const [mobileShowForm, setMobileShowForm] = useState(false);

    const handleEditCategory = (cat) => {
        setEditingCategory(cat);
        setMobileShowForm(true);
    };

    const handleCloseForm = () => {
        setEditingCategory(null);
        setMobileShowForm(false);
    };

    return (
        <div className="admin-page-shell">
            <div className="admin-inner-container">
                <AdminPanelHeader
                    title="Category Management"
                    subtitle="Create, edit, and organize clothing wear categories"
                />

                <div className="admin-split-layout">
                    <div className={`admin-form-panel ${mobileShowForm ? "" : "mobile-hidden"}`}>
                        <CategoryForm
                            editingCategory={editingCategory}
                            onCancelEdit={handleCloseForm}
                            onSuccess={handleCloseForm}
                            onBackToList={handleCloseForm}
                        />
                    </div>

                    <div className={`admin-list-panel ${mobileShowForm ? "mobile-hidden" : ""}`}>
                        <CategoryList
                            onEditCategory={handleEditCategory}
                            onAddClick={() => {
                                setEditingCategory(null);
                                setMobileShowForm(true);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageCategory;
