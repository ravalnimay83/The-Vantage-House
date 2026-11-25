import { useContext, useState } from "react";
import { AppContext } from "../../context/AppContextDefinition.js";
import { deleteCategory } from "../../Service/CategoryService.js";
import { assets } from "../../assets/assets.js";
import toast from "react-hot-toast";

const CategoryList = ({ onEditCategory, onAddClick }) => {
    const { categories, setCategories } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState("");

    const safeCategories = Array.isArray(categories) ? categories : [];
    const filterCategories = safeCategories.filter((category) =>
        (category?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const deleteByCategoryId = async (categoryId) => {
        try {
            const response = await deleteCategory(categoryId);
            if (response.status === 204 || response.status === 200) {
                setCategories(safeCategories.filter((c) => c.categoryId !== categoryId));
                toast.success("Category deleted successfully.");
            } else {
                toast.error("Category not found / Unable to delete.");
            }
        } catch (error) {
            console.error("Unable to delete category", error);
            const msg = error.response?.data?.message || "Unable to delete category.";
            toast.error(msg);
        }
    };

    return (
        <div>
            <div className="admin-panel-heading">
                <div className="d-flex align-items-center gap-2">
                    <h4>Clothing Categories</h4>
                    <span className="admin-count-pill">{safeCategories.length} total</span>
                </div>
                {onAddClick && (
                    <button type="button" className="admin-add-mobile-btn" onClick={onAddClick}>
                        <i className="bi bi-plus-lg"></i>
                        Add Category
                    </button>
                )}
            </div>

            <div className="admin-list-toolbar">
                <div className="admin-search-input-wrap">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Search categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filterCategories.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-tags fs-1 d-block mb-2"></i>
                    <p className="mb-0">No categories found.</p>
                </div>
            ) : (
                <div className="admin-cards-grid">
                    {filterCategories.map((category, index) => (
                        <div key={category.categoryId || index} className="admin-item-card">
                            <div className="admin-card-img-box">
                                <img
                                    src={category.imageUrl || assets.upload}
                                    alt={category.name || "Category"}
                                    className="admin-card-img"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = assets.upload;
                                    }}
                                />
                                <span
                                    className="admin-card-badge"
                                    style={{ backgroundColor: category.bgColor || "#2d4c24" }}
                                >
                                    {category.items ?? 0} Items
                                </span>
                            </div>

                            <div className="admin-card-body">
                                <h5 className="admin-card-title" title={category.name}>
                                    {category.name}
                                </h5>
                                <div className="admin-card-meta text-truncate">
                                    {category.description || "Clothing category"}
                                </div>

                                <div className="admin-card-footer">
                                    <span className="small fw-bold text-muted">
                                        {category.items ?? 0} products
                                    </span>
                                    <div className="d-flex gap-2">
                                        {onEditCategory && (
                                            <button
                                                type="button"
                                                className="admin-icon-action"
                                                title="Edit Category"
                                                onClick={() => onEditCategory(category)}
                                            >
                                                <i className="bi bi-pencil-square"></i>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="admin-icon-action delete"
                                            title="Delete Category"
                                            onClick={() => deleteByCategoryId(category.categoryId)}
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

export default CategoryList;
