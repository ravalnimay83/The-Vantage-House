import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export const NewUserChecklist = ({ auth, sizeProfile, wishlistCount, onJumpToTab }) => {
    const steps = [
        { label: "Add your name", done: Boolean(auth?.name?.trim()) },
        { label: "Verify email or mobile", done: Boolean(auth?.email || auth?.phoneNumber) },
        { label: "Set your size profile", done: Boolean(sizeProfile?.height) },
        { label: "Heart 1 item you like", done: wishlistCount >= 1 },
    ];
    const completedCount = steps.filter((s) => s.done).length;
    if (completedCount === steps.length) return null;

    return (
        <div className="checklist-banner mb-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                <div>
                    <h6 className="m-0 fw-bold text-dark">
                        🎯 Complete your profile, get 100 XP
                    </h6>
                    <small className="text-muted">{completedCount} of {steps.length} steps completed</small>
                </div>
                <button
                    type="button"
                    className="btn btn-dark btn-sm rounded-pill px-3 fw-bold"
                    onClick={() => onJumpToTab("details")}
                >
                    Complete Now
                </button>
            </div>
            <div className="d-flex flex-wrap gap-2">
                {steps.map((s) => (
                    <span key={s.label} className={`checklist-chip ${s.done ? "done" : ""}`}>
                        <i className={`bi ${s.done ? "bi-check-circle-fill" : "bi-circle"} me-1`}></i>
                        {s.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

const TRACKER_STAGES = [
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "PACKED", label: "Packed" },
    { key: "SHIPPED", label: "Shipped" },
    { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
    { key: "DELIVERED", label: "Delivered" },
];

export const OrderTimelineList = ({ orders, loadingOrders }) => {
    if (loadingOrders) {
        return <p className="text-muted py-3">Loading your orders...</p>;
    }

    if (!orders || orders.length === 0) {
        return (
            <div className="friendly-empty-state">
                <div className="friendly-empty-emoji">👀</div>
                <h5 className="fw-bold text-dark mb-1">Your closet is waiting</h5>
                <p className="text-muted small mb-3">
                    No orders yet. Explore our clothing collection and place your first order!
                </p>
                <Link to="/products" className="btn btn-dark rounded-pill px-4 fw-bold">
                    Start Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="order-timeline-list">
            {orders.map((order) => {
                const statusKey = (order.orderStatus || "CONFIRMED").toUpperCase();
                const activeIdx = Math.max(
                    0,
                    TRACKER_STAGES.findIndex((s) => s.key === statusKey)
                );
                return (
                    <div key={order.orderId} className="timeline-order-card">
                        <div className="timeline-dot" />
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                            <div>
                                <div className="fw-bold text-dark">
                                    {order.orderNumber || `Order #${order.orderId?.slice(0, 8).toUpperCase()}`}
                                </div>
                                <small className="text-muted d-block">
                                    {order.customerName} ({order.phoneNumber}) •{" "}
                                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
                                </small>
                                {order.addressLine && (
                                    <small className="text-muted d-block">
                                        Delivering to: {order.addressLine}
                                        {order.city ? `, ${order.city}` : ""}
                                        {order.pincode ? ` - ${order.pincode}` : ""}
                                    </small>
                                )}
                                {order.estimatedDelivery && (
                                    <small className="text-success fw-semibold d-block">
                                        Arriving by {order.estimatedDelivery}
                                    </small>
                                )}
                            </div>
                            <div className="text-end">
                                <div className="fw-bold text-success">
                                    &#8377;{Number(order.grandTotal || 0).toLocaleString("en-IN")}
                                </div>
                                <span className="badge bg-dark rounded-pill">
                                    {order.paymentChannel || order.paymentMethod}
                                </span>
                                {order.paymentStatus && (
                                    <div className="small text-muted mt-1">
                                        Payment: {order.paymentStatus}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="small text-muted mb-2">
                            {(order.cartItems || [])
                                .map((ci) => `${ci.name}${ci.size ? ` (${ci.size})` : ""} × ${ci.quantity}`)
                                .join(", ")}
                        </div>

                        <div className="timeline-steps-bar">
                            {TRACKER_STAGES.map((stage, idx) => (
                                <span
                                    key={stage.key}
                                    className={`t-step ${idx <= activeIdx ? "done" : ""}`}
                                >
                                    {idx <= activeIdx ? "✓" : "○"} {stage.label}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const SavedAddressesAndPayments = ({
    addresses,
    onAddAddress,
    onDeleteAddress,
    preferredPayment,
    onSelectPayment,
}) => {
    const [newAddr, setNewAddr] = useState({ label: "Home", line: "" });

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newAddr.line.trim()) {
            toast.error("Enter an address line.");
            return;
        }
        onAddAddress({ id: Date.now(), label: newAddr.label, line: newAddr.line.trim() });
        setNewAddr({ label: "Home", line: "" });
        toast.success("Address saved!");
    };

    return (
        <div className="row g-3 mt-2">
            <div className="col-md-7">
                <div className="gami-card">
                    <h6 className="fw-bold mb-3">
                        <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                        Saved Addresses
                    </h6>
                    {addresses.length === 0 ? (
                        <p className="small text-muted mb-3">No saved addresses yet.</p>
                    ) : (
                        <div className="d-flex flex-column gap-2 mb-3">
                            {addresses.map((addr) => (
                                <div key={addr.id} className="d-flex justify-content-between align-items-center p-2 border rounded-3 bg-light">
                                    <div>
                                        <span className="badge bg-dark me-2">{addr.label}</span>
                                        <small className="text-dark fw-semibold">{addr.line}</small>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-sm text-danger p-0 px-1"
                                        onClick={() => onDeleteAddress(addr.id)}
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <form onSubmit={handleAdd} className="d-flex gap-2">
                        <select
                            className="profile-input py-1 px-2"
                            style={{ maxWidth: "95px" }}
                            value={newAddr.label}
                            onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                        >
                            <option value="Home">Home</option>
                            <option value="Work">Work</option>
                            <option value="Other">Other</option>
                        </select>
                        <input
                            type="text"
                            className="profile-input py-1 px-2"
                            placeholder="Add delivery address..."
                            value={newAddr.line}
                            onChange={(e) => setNewAddr({ ...newAddr, line: e.target.value })}
                        />
                        <button type="submit" className="btn btn-dark btn-sm rounded-pill px-3 fw-bold">
                            Add
                        </button>
                    </form>
                </div>
            </div>

            <div className="col-md-5">
                <div className="gami-card h-100">
                    <h6 className="fw-bold mb-3">
                        <i className="bi bi-credit-card-fill text-primary me-2"></i>
                        Payment Methods
                    </h6>
                    <div className="d-flex flex-column gap-2">
                        {[
                            { id: "UPI", label: "UPI (GPay / PhonePe)", icon: "bi-qr-code-scan" },
                            { id: "CASH", label: "Cash on Delivery / POS", icon: "bi-cash-stack" },
                            { id: "CARD", label: "Credit / Debit Card", icon: "bi-credit-card" },
                        ].map((pm) => (
                            <button
                                key={pm.id}
                                type="button"
                                className={`payment-pref-btn ${preferredPayment === pm.id ? "active" : ""}`}
                                onClick={() => {
                                    onSelectPayment(pm.id);
                                    toast.success(`Default payment set to ${pm.id}`);
                                }}
                            >
                                <span>
                                    <i className={`bi ${pm.icon} me-2`}></i>
                                    {pm.label}
                                </span>
                                {preferredPayment === pm.id && <i className="bi bi-check-circle-fill text-success"></i>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ReferralCard = ({ auth }) => {
    const prefix = (auth?.name || "BIZ").replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase() || "BIZ";
    const referralCode = `${prefix}100`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralCode);
            toast.success(`Referral code ${referralCode} copied!`);
        } catch {
            toast.success(`Share code: ${referralCode}`);
        }
    };

    return (
        <div className="referral-banner mt-3">
            <div>
                <h6 className="m-0 fw-bold text-white">
                    🎁 Invite a friend, both get &#8377;100
                </h6>
                <small style={{ color: "rgba(255,255,255,0.8)" }}>
                    Share your code <strong>{referralCode}</strong> for &#8377;100 off their first order.
                </small>
            </div>
            <button type="button" className="btn btn-light btn-sm rounded-pill px-3 fw-bold" onClick={handleCopy}>
                <i className="bi bi-copy me-1"></i>
                Copy {referralCode}
            </button>
        </div>
    );
};
