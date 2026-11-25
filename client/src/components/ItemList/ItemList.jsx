import { useContext, useState } from "react";
import { AppContext } from "../../context/AppContextDefinition.js";
import { deleteItem } from "../../Service/ItemService.js";
import { fetchCategory } from "../../Service/CategoryService.js";
import { assets } from "../../assets/assets.js";
import toast from "react-hot-toast";

const ItemList = ({ items, setItems, loading, onEditItem, onAddClick }) => {
    const { categories, setCategories } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    const safeItems = Array.isArray(items) ? items : [];
    const filteredItems = safeItems.filter((item) => {
        if (categoryFilter !== "all" && item.categoryId !== categoryFilter) {
            return false;
        }
        const q = searchTerm.toLowerCase();
        const nameMatch = (item?.name || "").toLowerCase().includes(q);
        const categoryMatch = (item?.categoryName || "").toLowerCase().includes(q);
        const brandMatch = (item?.brand || "").toLowerCase().includes(q);
        const descMatch = (item?.description || "").toLowerCase().includes(q);
        return nameMatch || categoryMatch || brandMatch || descMatch;
    });

    const deleteByItemId = async (itemId) => {
        try {
            await deleteItem(itemId);
            setItems((prevItems) => prevItems.filter((item) => item.itemId !== itemId));
            toast.success("Item deleted successfully.");
            if (setCategories) {
                fetchCategory()
                    .then((res) => Array.isArray(res.data) && setCategories(res.data))
                    .catch(() => {});
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            const msg = error.response?.data?.message || error.message || "Failed to delete item.";
            toast.error(msg);
        }
    };

    return (
        <div>
            <div className="admin-panel-heading">
                <div className="d-flex align-items-center gap-2">
                    <h4>Clothing Catalog Items</h4>
                    <span className="admin-count-pill">{filteredItems.length} / {safeItems.length}</span>
                </div>
                {onAddClick && (
                    <button type="button" className="admin-add-mobile-btn" onClick={onAddClick}>
                        <i className="bi bi-plus-lg"></i>
                        Add Item
                    </button>
                )}
            </div>

            <div className="admin-list-toolbar">
                <div className="admin-search-input-wrap">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Search by name, brand, category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="admin-filter-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="all">All Categories</option>
                    {Array.isArray(categories) && categories.map((cat) => (
                        <option key={cat.categoryId} value={cat.categoryId}>
                            {cat.name || cat.categoryName}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="d-flex justify-content-center align-items-center py-5">
                    <div className="spinner-border text-success" role="status">
                        <span className="visually-hidden">Loading items...</span>
                    </div>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-basket3 fs-1 d-block mb-2"></i>
                    <p className="mb-0">No clothing items found matching your filter.</p>
                </div>
            ) : (
                <div className="admin-cards-grid">
                    {filteredItems.map((item, index) => (
                        <div key={item.itemId || index} className="admin-item-card">
                            <div className="admin-card-img-box">
                                <img
                                    src={item.imageUrl || assets.upload}
                                    alt={item.name || "Item image"}
                                    className="admin-card-img"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = assets.upload;
                                    }}
                                />
                                {item.categoryName && (
                                    <span className="admin-card-badge">
                                        {item.categoryName}
                                    </span>
                                )}
                            </div>

                            <div className="admin-card-body">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <small className="fw-bold" style={{ fontSize: "11px", color: "#526d42" }}>
                                        {item.brand || "BizBill"}
                                    </small>
                                    <small className="text-muted" style={{ fontSize: "11px" }}>
                                        Stock: {item.stock ?? 25}
                                    </small>
                                </div>
                                <h5 className="admin-card-title" title={item.name}>
                                    {item.name}
                                </h5>
                                <div className="admin-card-meta text-truncate">
                                    {item.sizes ? `Sizes: ${item.sizes}` : "Free Size"}
                                    {item.color ? ` • ${item.color}` : ""}
                                </div>

                                <div className="admin-card-footer">
                                    <div>
                                        <span className="admin-card-price">
                                            &#8377;{Number(item.price || 0).toFixed(0)}
                                        </span>
                                        {item.originalPrice && Number(item.originalPrice) > Number(item.price) && (
                                            <small className="text-muted text-decoration-line-through ms-2">
                                                &#8377;{Number(item.originalPrice).toFixed(0)}
                                            </small>
                                        )}
                                    </div>
                                    <div className="d-flex gap-2">
                                        {onEditItem && (
                                            <button
                                                type="button"
                                                className="admin-icon-action"
                                                title="Edit Item"
                                                onClick={() => onEditItem(item)}
                                            >
                                                <i className="bi bi-pencil-square"></i>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="admin-icon-action delete"
                                            title="Delete Item"
                                            onClick={() => deleteByItemId(item.itemId)}
                                        >
                                            <i className="bi bi-trash3-fill"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ItemList;
