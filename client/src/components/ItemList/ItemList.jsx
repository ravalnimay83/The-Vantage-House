import { useState } from "react";
import { deleteItem } from "../../Service/ItemService.js";
import { assets } from "../../assets/assets.js";
import toast from "react-hot-toast";
import "./ItemList.css";

const ItemList = ({ items, setItems, loading }) => {
    const [searchTerm, setSearchTerm] = useState("");

    const safeItems = Array.isArray(items) ? items : [];
    const filteredItems = safeItems.filter((item) => {
        const q = searchTerm.toLowerCase();
        const nameMatch = (item?.name || "").toLowerCase().includes(q);
        const categoryMatch = (item?.categoryName || "").toLowerCase().includes(q);
        const descriptionMatch = (item?.description || "").toLowerCase().includes(q);
        return nameMatch || categoryMatch || descriptionMatch;
    });

    const deleteByItemId = async (itemId) => {
        try {
            await deleteItem(itemId);
            setItems((prevItems) => prevItems.filter((item) => item.itemId !== itemId));
            toast.success("Item deleted successfully.");
        } catch (error) {
            console.error("Error deleting item:", error);
            const msg = error.response?.data?.message || error.message || "Failed to delete item.";
            toast.error(msg);
        }
    };

    return (
        <div className="item-list-container">
            {/* Header */}
            <div className="item-list-heading">
                <h4>Items</h4>
                <span className="badge-count">{safeItems.length} total</span>
            </div>

            {/* Search Input */}
            <div className="item-search-wrapper">
                <div className="input-group">
                    <input
                        type="text"
                        name="keyword"
                        id="item-search-input"
                        placeholder="Search by item name, category, description..."
                        className="form-control"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="input-group-text">
                        <i className="bi bi-search"></i>
                    </span>
                </div>
            </div>

            {/* Content Area */}
            <div className="items-cards-scroll">
                {loading ? (
                    <div className="d-flex justify-content-center align-items-center py-5">
                        <div className="spinner-border text-success" role="status">
                            <span className="visually-hidden">Loading items...</span>
                        </div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="items-empty-state">
                        <i className="bi bi-basket3"></i>
                        {searchTerm ? (
                            <p>No items found matching "{searchTerm}"</p>
                        ) : (
                            <p>No items added yet. Use the form to add your first item!</p>
                        )}
                    </div>
                ) : (
                    <div className="items-grid">
                        {filteredItems.map((item, index) => (
                            <div key={item.itemId || index} className="item-card">
                                {/* Image Frame */}
                                <div className="item-card-image-box">
                                    <img
                                        src={item.imageUrl || assets.upload}
                                        alt={item.name || "Item image"}
                                        className="item-card-img"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = assets.upload;
                                        }}
                                    />
                                    {item.categoryName && (
                                        <span className="item-card-badge">
                                            {item.categoryName}
                                        </span>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="item-card-body">
                                    <h5 className="item-card-title" title={item.name}>
                                        {item.name}
                                    </h5>
                                    <p className="item-card-desc" title={item.description || "No description"}>
                                        {item.description || "No description provided."}
                                    </p>

                                    {/* Footer */}
                                    <div className="item-card-footer">
                                        <span className="item-card-price">
                                            &#8377;{Number(item.price || 0).toFixed(2)}
                                        </span>
                                        <button
                                            type="button"
                                            className="item-delete-btn"
                                            title="Delete Item"
                                            onClick={() => deleteByItemId(item.itemId)}
                                        >
                                            <i className="bi bi-trash3-fill"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemList;
