import './ManageItems.css';
import ItemForm from "../../components/ItemForm/ItemForm.jsx";
import ItemList from "../../components/ItemList/ItemList.jsx";
import { useEffect, useState } from "react";
import { fetchItems } from "../../Service/ItemService.js";
import toast from "react-hot-toast";

const ManageItems = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function loadItems() {
            try {
                setLoading(true);
                const response = await fetchItems();
                if (Array.isArray(response.data)) {
                    setItems(response.data);
                } else {
                    setItems([]);
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
    }, []);

    return (
        <div className="items-container text-light">
            <div className="left-column">
                <ItemForm setItems={setItems} />
            </div>
            <div className="right-column">
                <ItemList items={items} setItems={setItems} loading={loading} />
            </div>
        </div>
    );
};

export default ManageItems;
