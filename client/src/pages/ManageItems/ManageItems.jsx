import ItemForm from "../../components/ItemForm/ItemForm.jsx";
import ItemList from "../../components/ItemList/ItemList.jsx";
import AdminPanelHeader from "../../components/Auth/AdminPanelHeader.jsx";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContextDefinition.js";
import { fetchItems } from "../../Service/ItemService.js";
import toast from "react-hot-toast";
import "../../components/Auth/AdminShared.css";

const ManageItems = () => {
    const { items, setItems } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [mobileShowForm, setMobileShowForm] = useState(false);

    useEffect(() => {
        async function loadItems() {
            try {
                setLoading(true);
                const response = await fetchItems();
                if (Array.isArray(response.data)) {
                    setItems(response.data);
                }
            } catch (error) {
                console.error("Failed to load items:", error);
                const msg = error.response?.data?.message || error.message || "Failed to load items.";
                toast.error("Error loading items: " + msg);
            } finally {
                setLoading(false);
            }
        }

        loadItems();
    }, [setItems]);

    const handleEditItem = (item) => {
        setEditingItem(item);
        setMobileShowForm(true);
    };

    const handleCloseForm = () => {
        setEditingItem(null);
        setMobileShowForm(false);
    };

    return (
        <div className="admin-page-shell">
            <div className="admin-inner-container">
                <AdminPanelHeader
                    title="Inventory Management"
                    subtitle="Add, edit, price, and organize clothing wear products"
                />

                <div className="admin-split-layout">
                    <div className={`admin-form-panel ${mobileShowForm ? "" : "mobile-hidden"}`}>
                        <ItemForm
                            setItems={setItems}
                            editingItem={editingItem}
                            onCancelEdit={handleCloseForm}
                            onSuccess={handleCloseForm}
                            onBackToList={handleCloseForm}
                        />
                    </div>

                    <div className={`admin-list-panel ${mobileShowForm ? "mobile-hidden" : ""}`}>
                        <ItemList
                            items={items}
                            setItems={setItems}
                            loading={loading}
                            onEditItem={handleEditItem}
                            onAddClick={() => {
                                setEditingItem(null);
                                setMobileShowForm(true);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageItems;
