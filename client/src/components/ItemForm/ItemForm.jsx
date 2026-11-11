import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContextDefinition.js";
import { addItem } from "../../Service/ItemService.js";
import { fetchCategory } from "../../Service/CategoryService.js";
import { assets } from "../../assets/assets.js";
import toast from "react-hot-toast";
import "./ItemForm.css";

const initialData = {
    name: "",
    categoryId: "",
    price: "",
    description: ""
};

const ItemForm = ({ setItems }) => {
    const { categories, setCategories } = useContext(AppContext);
    const [data, setData] = useState(initialData);
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);

    // Ensure categories are loaded if not already in context
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
            toast.error("Please enter a valid price (greater than or equal to 0).");
            return;
        }

        setLoading(true);

        const formData = new FormData();
        const itemPayload = {
            name: data.name.trim(),
            description: data.description.trim(),
            price: numericPrice,
            categoryId: data.categoryId
        };

        formData.append("item", JSON.stringify(itemPayload));
        formData.append("name", itemPayload.name);
        formData.append("description", itemPayload.description);
        formData.append("price", String(numericPrice));
        formData.append("categoryId", itemPayload.categoryId);

        if (image) {
            formData.append("file", image);
        }

        try {
            const response = await addItem(formData);
            if (response.data) {
                if (setItems) {
                    setItems((prevItems) => [response.data, ...prevItems]);
                }
                toast.success("Item saved successfully!");
                setData(initialData);
                setImage(null);

                // Refresh categories in background to update item counts
                if (setCategories) {
                    fetchCategory()
                        .then((res) => Array.isArray(res.data) && setCategories(res.data))
                        .catch(() => {});
                }
            }
        } catch (error) {
            console.error("Error saving item:", error);
            const msg = error.response?.data?.message || error.message || "Failed to save item.";
            toast.error("Error saving item: " + msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="item-form-container">
            <div className="item-form-heading">
                <h4>Add Item</h4>
            </div>

            <form onSubmit={onSubmitHandler}>
                {/* Image Upload */}
                <div className="mb-3">
                    <label htmlFor="item-image-input" className="form-label">
                        Item Image
                    </label>
                    <label htmlFor="item-image-input" className="item-image-upload">
                        <img
                            src={image ? URL.createObjectURL(image) : assets.upload}
                            alt="Item preview"
                            className="item-image-preview"
                        />
                        <span>{image ? image.name : "Click to choose item image"}</span>
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

                {/* Item Name */}
                <div className="mb-3">
                    <label htmlFor="item-name" className="form-label">
                        Item Name <span className="text-danger">*</span>
                    </label>
                    <input
                        type="text"
                        id="item-name"
                        name="name"
                        className="form-control"
                        placeholder="e.g. Margherita Pizza, Cappuccino"
                        value={data.name}
                        onChange={onChangeHandler}
                        required
                    />
                </div>

                {/* Category Selection */}
                <div className="mb-3">
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
                        <option value="">-- Select a Category --</option>
                        {Array.isArray(categories) && categories.map((cat) => (
                            <option key={cat.categoryId} value={cat.categoryId}>
                                {cat.name || cat.categoryName}
                            </option>
                        ))}
                    </select>
                    {(!categories || categories.length === 0) && (
                        <small className="text-warning mt-1 d-block">
                            No categories found. Please add a category first.
                        </small>
                    )}
                </div>

                {/* Price */}
                <div className="mb-3">
                    <label htmlFor="item-price" className="form-label">
                        Price (&#8377;) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                        <span className="input-group-text bg-dark text-white border-secondary">
                            &#8377;
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            id="item-price"
                            name="price"
                            className="form-control"
                            placeholder="250.00"
                            value={data.price}
                            onChange={onChangeHandler}
                            required
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                    <label htmlFor="item-description" className="form-label">
                        Description
                    </label>
                    <textarea
                        id="item-description"
                        name="description"
                        rows="3"
                        className="form-control"
                        placeholder="Write short description about the item..."
                        value={data.description}
                        onChange={onChangeHandler}
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="btn btn-save-item w-100"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Saving Item...
                        </>
                    ) : (
                        "Save Item"
                    )}
                </button>
            </form>
        </div>
    );
};

export default ItemForm;
