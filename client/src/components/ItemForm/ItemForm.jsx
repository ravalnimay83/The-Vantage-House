import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContextDefinition.js";
import { addItem, updateItem } from "../../Service/ItemService.js";
import { fetchCategory } from "../../Service/CategoryService.js";
import { assets } from "../../assets/assets.js";
import toast from "react-hot-toast";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36"];

const initialData = {
    name: "",
    categoryId: "",
    brand: "",
    color: "",
    fabric: "",
    sizes: "S, M, L, XL",
    price: "",
    originalPrice: "",
    stock: "25",
    description: "",
};

const ItemForm = ({ setItems, editingItem, onCancelEdit, onSuccess, onBackToList }) => {
    const { categories, setCategories } = useContext(AppContext);
    const [data, setData] = useState(initialData);
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!categories || categories.length === 0) {
            fetchCategory()
                .then((res) => {
                    if (Array.isArray(res.data) && setCategories) {
                        setCategories(res.data);
                    }
                })
                .catch((err) => console.error("Error loading categories:", err));
        }
    }, [categories, setCategories]);

    useEffect(() => {
        if (editingItem) {
            setData({
                name: editingItem.name || "",
                categoryId: editingItem.categoryId || "",
                brand: editingItem.brand || "",
                color: editingItem.color || "",
                fabric: editingItem.fabric || "",
                sizes: editingItem.sizes || "S, M, L, XL",
                price: editingItem.price != null ? String(editingItem.price) : "",
                originalPrice: editingItem.originalPrice != null ? String(editingItem.originalPrice) : "",
                stock: editingItem.stock != null ? String(editingItem.stock) : "25",
                description: editingItem.description || "",
            });
            setImage(null);
        } else {
            setData(initialData);
            setImage(null);
        }
    }, [editingItem]);

    const selectedSizeList = data.sizes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const toggleSize = (size) => {
        const next = selectedSizeList.includes(size)
            ? selectedSizeList.filter((s) => s !== size)
            : [...selectedSizeList, size];
        setData((prev) => ({ ...prev, sizes: next.join(", ") }));
    };

    const onChangeHandler = (e) => {
        const { name, value } = e.target;
        setData((prev) => ({ ...prev, [name]: value }));
    };

    const onImageChangeHandler = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
        }
    };

    const onSubmitHandler = async (e) => {
        e.preventDefault();

        if (!data.name.trim()) {
            toast.error("Please enter an item name.");
            return;
        }
        if (!data.categoryId) {
            toast.error("Please select a category.");
            return;
        }
        const numericPrice = parseFloat(data.price);
        if (isNaN(numericPrice) || numericPrice < 0) {
            toast.error("Please enter a valid selling price.");
            return;
        }
        const numericMrp = data.originalPrice ? parseFloat(data.originalPrice) : null;
        const numericStock = data.stock ? parseInt(data.stock, 10) : 25;

        setLoading(true);
        const formData = new FormData();
        const itemPayload = {
            name: data.name.trim(),
            description: data.description.trim(),
            price: numericPrice,
            originalPrice: numericMrp && !isNaN(numericMrp) ? numericMrp : null,
            categoryId: data.categoryId,
            brand: data.brand.trim(),
            color: data.color.trim(),
            fabric: data.fabric.trim(),
            sizes: data.sizes.trim(),
            stock: isNaN(numericStock) ? 25 : numericStock,
        };

        formData.append("item", JSON.stringify(itemPayload));
        if (image) {
            formData.append("file", image);
        }

        try {
            if (editingItem) {
                const response = await updateItem(editingItem.itemId, formData);
                if (response.data && setItems) {
                    setItems((prevItems) =>
                        prevItems.map((it) =>
                            it.itemId === editingItem.itemId ? response.data : it
                        )
                    );
                }
                toast.success("Clothing item updated!");
            } else {
                const response = await addItem(formData);
                if (response.data && setItems) {
                    setItems((prevItems) => [response.data, ...prevItems]);
                }
                toast.success("Clothing item saved!");
            }

            setData(initialData);
            setImage(null);

            if (setCategories) {
                fetchCategory()
                    .then((res) => Array.isArray(res.data) && setCategories(res.data))
                    .catch(() => {});
            }
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Error saving item:", error);
            const msg = error.response?.data?.message || error.message || "Failed to save item.";
            toast.error("Error saving item: " + msg);
        } finally {
            setLoading(false);
        }
    };

    const previewSrc = image
        ? URL.createObjectURL(image)
        : editingItem?.imageUrl || assets.upload;

    return (
        <div>
            <div className="admin-panel-heading">
                <h5>{editingItem ? "Edit Clothing Item" : "Add Clothing Item"}</h5>
                <div className="d-flex gap-2">
                    {editingItem && (
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
                    <label htmlFor="item-image-input" className="form-label">
                        Product Image
                    </label>
                    <label htmlFor="item-image-input" className="admin-upload-box">
                        <img
                            src={previewSrc}
                            alt="Item preview"
                            className="admin-upload-preview"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = assets.upload;
                            }}
                        />
                        <span>
                            {image
                                ? image.name
                                : editingItem
                                ? "Click to replace image (optional)"
                                : "Click to upload clothing image"}
                        </span>
                    </label>
                    <input
                        type="file"
                        id="item-image-input"
                        name="file"
                        accept="image/*"
                        className="d-none"
                        onChange={onImageChangeHandler}
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="item-name" className="form-label">
                        Item Name <span className="text-danger">*</span>
                    </label>
                    <input
                        type="text"
                        id="item-name"
                        name="name"
                        className="form-control"
                        placeholder="e.g. Olive Oversized Heavyweight Tee"
                        value={data.name}
                        onChange={onChangeHandler}
                        required
                    />
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-sm-6">
                        <label htmlFor="item-category" className="form-label">
                            Category <span className="text-danger">*</span>
                        </label>
                        <select
                            id="item-category"
                            name="categoryId"
                            className="form-select"
                            value={data.categoryId}
                            onChange={onChangeHandler}
                            required
                        >
                            <option value="">-- Select --</option>
                            {Array.isArray(categories) && categories.map((cat) => (
                                <option key={cat.categoryId} value={cat.categoryId}>
                                    {cat.name || cat.categoryName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-sm-6">
                        <label htmlFor="item-brand" className="form-label">
                            Brand
                        </label>
                        <input
                            type="text"
                            id="item-brand"
                            name="brand"
                            className="form-control"
                            placeholder="e.g. UrbanWeave"
                            value={data.brand}
                            onChange={onChangeHandler}
                        />
                    </div>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-sm-6">
                        <label htmlFor="item-color" className="form-label">
                            Color
                        </label>
                        <input
                            type="text"
                            id="item-color"
                            name="color"
                            className="form-control"
                            placeholder="e.g. Olive Green"
                            value={data.color}
                            onChange={onChangeHandler}
                        />
                    </div>
                    <div className="col-sm-6">
                        <label htmlFor="item-fabric" className="form-label">
                            Fabric / Material
                        </label>
                        <input
                            type="text"
                            id="item-fabric"
                            name="fabric"
                            className="form-control"
                            placeholder="e.g. 100% Cotton"
                            value={data.fabric}
                            onChange={onChangeHandler}
                        />
                    </div>
                </div>

                <div className="mb-3">
                    <label className="form-label">Available Sizes</label>
                    <div className="d-flex flex-wrap gap-1 mb-2">
                        {STANDARD_SIZES.map((sz) => {
                            const active = selectedSizeList.includes(sz);
                            return (
                                <button
                                    key={sz}
                                    type="button"
                                    className={`admin-size-pill ${active ? "active" : ""}`}
                                    onClick={() => toggleSize(sz)}
                                >
                                    {sz}
                                </button>
                            );
                        })}
                    </div>
                    <input
                        type="text"
                        name="sizes"
                        className="form-control"
                        placeholder="e.g. S, M, L, XL"
                        value={data.sizes}
                        onChange={onChangeHandler}
                    />
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-4">
                        <label htmlFor="item-price" className="form-label">
                            Price (&#8377;) <span className="text-danger">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            id="item-price"
                            name="price"
                            className="form-control"
                            placeholder="799"
                            value={data.price}
                            onChange={onChangeHandler}
                            required
                        />
                    </div>
                    <div className="col-4">
                        <label htmlFor="item-mrp" className="form-label">
                            MRP (&#8377;)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            id="item-mrp"
                            name="originalPrice"
                            className="form-control"
                            placeholder="1199"
                            value={data.originalPrice}
                            onChange={onChangeHandler}
                        />
                    </div>
                    <div className="col-4">
                        <label htmlFor="item-stock" className="form-label">
                            Stock
                        </label>
                        <input
                            type="number"
                            min="0"
                            id="item-stock"
                            name="stock"
                            className="form-control"
                            placeholder="25"
                            value={data.stock}
                            onChange={onChangeHandler}
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label htmlFor="item-description" className="form-label">
                        Description
                    </label>
                    <textarea
                        id="item-description"
                        name="description"
                        rows="3"
                        className="form-control"
                        placeholder="Fit, wash care, and styling details..."
                        value={data.description}
                        onChange={onChangeHandler}
                    />
                </div>

                <button
                    type="submit"
                    className="admin-submit-btn"
                    disabled={loading}
                >
                    {loading
                        ? "Saving..."
                        : editingItem
                        ? "Update Clothing Item"
                        : "Save Clothing Item"}
                </button>
            </form>
        </div>
    );
};

export default ItemForm;
