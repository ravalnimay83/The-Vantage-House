import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContextDefinition.js";
import { addCategory, updateCategory } from "../../Service/CategoryService.js";
import { assets } from "../../assets/assets.js";
import toast from "react-hot-toast";

const initialData = { name: "", description: "", bgColor: "#2d4c24" };

const CategoryForm = ({ editingCategory, onCancelEdit, onSuccess, onBackToList }) => {
    const { setCategories } = useContext(AppContext);
    const [data, setData] = useState(initialData);
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (editingCategory) {
            setData({
                name: editingCategory.name || "",
                description: editingCategory.description || "",
                bgColor: editingCategory.bgColor || "#2d4c24",
            });
            setImage(null);
            setError("");
        } else {
            setData(initialData);
            setImage(null);
        }
    }, [editingCategory]);

    const onChangeHandler = (event) => {
        const { name, value } = event.target;
        setData((current) => ({ ...current, [name]: value }));
    };

    const onImageChangeHandler = (event) => {
        setImage(event.target.files?.[0] || null);
    };

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        setError("");

        if (!data.name.trim()) {
            setError("Please enter a category name.");
            return;
        }
        if (!editingCategory && !image) {
            setError("Please choose a category image.");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append(
            "category",
            JSON.stringify({
                name: data.name.trim(),
                description: data.description.trim(),
                bgColor: data.bgColor,
            })
        );
        if (image) {
            formData.append("file", image);
        }

        try {
            if (editingCategory) {
                const response = await updateCategory(editingCategory.categoryId, formData);
                setCategories((current) =>
                    current.map((c) =>
                        c.categoryId === editingCategory.categoryId ? response.data : c
                    )
                );
                toast.success("Category updated successfully!");
            } else {
                const response = await addCategory(formData);
                setCategories((current) => [...current, response.data]);
                toast.success("Category added successfully!");
            }
            setData(initialData);
            setImage(null);
            event.target.reset();
            if (onSuccess) onSuccess();
        } catch (submitError) {
            const msg = submitError.response?.data?.message || "Unable to save the category.";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const previewSrc = image
        ? URL.createObjectURL(image)
        : editingCategory?.imageUrl || assets.upload;

    return (
        <div>
            <div className="admin-panel-heading">
                <h5>{editingCategory ? "Edit Category" : "Add Clothing Category"}</h5>
                <div className="d-flex gap-2">
                    {editingCategory && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                            onClick={onCancelEdit}
                        >
                            Cancel
                        </button>
                    )}
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
            </div>

            <form onSubmit={onSubmitHandler}>
                <div className="mb-3">
                    <label htmlFor="category-image" className="form-label">
                        Category Image
                    </label>
                    <label htmlFor="category-image" className="admin-upload-box">
                        <img
                            src={previewSrc}
                            alt="Category preview"
                            className="admin-upload-preview"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = assets.upload;
                            }}
                        />
                        <span>
                            {image
                                ? image.name
                                : editingCategory
                                ? "Click to replace image (optional)"
                                : "Click to choose image"}
                        </span>
                    </label>
                    <input
                        id="category-image"
                        type="file"
                        accept="image/*"
                        className="d-none"
                        onChange={onImageChangeHandler}
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="category-name" className="form-label">
                        Category Name <span className="text-danger">*</span>
                    </label>
                    <input
                        id="category-name"
                        name="name"
                        className="form-control"
                        placeholder="e.g. T-Shirts, Shirts, Pants"
                        value={data.name}
                        onChange={onChangeHandler}
                        required
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="category-description" className="form-label">
                        Description
                    </label>
                    <textarea
                        id="category-description"
                        name="description"
                        rows="3"
                        className="form-control"
                        placeholder="Describe this clothing category..."
                        value={data.description}
                        onChange={onChangeHandler}
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="category-color" className="form-label">
                        Accent Color
                    </label>
                    <input
                        id="category-color"
                        name="bgColor"
                        type="color"
                        className="form-control form-control-color"
                        value={data.bgColor}
                        onChange={onChangeHandler}
                    />
                </div>

                {error && <p className="text-danger small fw-semibold mb-2">{error}</p>}

                <button type="submit" className="admin-submit-btn" disabled={loading}>
                    {loading
                        ? "Saving..."
                        : editingCategory
                        ? "Update Category"
                        : "Save Category"}
                </button>
            </form>
        </div>
    );
};

export default CategoryForm;
