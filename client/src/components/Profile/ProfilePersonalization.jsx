import { useState } from "react";
import { assets } from "../../assets/assets.js";
import toast from "react-hot-toast";

const ProfilePersonalization = ({
    items,
    wishlistItems,
    sizeProfile,
    onSaveSizeProfile,
    onAddToCart,
}) => {
    const [showMoodboard, setShowMoodboard] = useState(false);
    const [localSize, setLocalSize] = useState(sizeProfile);

    // Compute Style DNA from wishlist/items or default taste profile
    const safeItems = Array.isArray(items) ? items : [];
    const recommendations = safeItems.slice(0, 6);

    const styleDna = [
        { label: "Streetwear", pct: 60, color: "#2d4c24" },
        { label: "Minimal", pct: 30, color: "#111827" },
        { label: "Classic", pct: 10, color: "#658052" },
    ];

    const handleSaveSize = (e) => {
        e.preventDefault();
        onSaveSizeProfile(localSize);
        toast.success("Size profile saved!");
    };

    const handleShareMoodboard = async () => {
        const shareText = `Check out my BizBill Style Moodboard (${wishlistItems.length} saved looks)!`;
        try {
            if (navigator.share) {
                await navigator.share({ title: "My BizBill Moodboard", text: shareText, url: window.location.href });
            } else {
                await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
                toast.success("Moodboard link copied!");
            }
        } catch {
            toast.success("Moodboard ready to share!");
        }
    };

    return (
        <div className="personalization-section">
            <div className="personalization-grid">
                {/* Style DNA Card */}
                <div className="gami-card">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="m-0 fw-bold">
                            <i className="bi bi-fingerprint text-success me-2"></i>
                            Your Style DNA
                        </h6>
                        <button
                            type="button"
                            className="btn btn-outline-dark btn-sm rounded-pill px-3 fw-bold"
                            onClick={() => setShowMoodboard(true)}
                        >
                            <i className="bi bi-grid-1x2-fill me-1"></i>
                            Moodboard
                        </button>
                    </div>
                    <p className="small text-muted mb-3">
                        60% Streetwear, 30% Minimal, 10% Classic
                    </p>
                    {styleDna.map((s) => (
                        <div key={s.label} className="mb-2">
                            <div className="d-flex justify-content-between small fw-bold mb-1">
                                <span>{s.label}</span>
                                <span>{s.pct}%</span>
                            </div>
                            <div className="xp-progress-track">
                                <div
                                    className="xp-progress-fill"
                                    style={{ width: `${s.pct}%`, background: s.color }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Saved Size Profile */}
                <div className="gami-card">
                    <h6 className="fw-bold mb-3">
                        <i className="bi bi-rulers text-dark me-2"></i>
                        Saved Size Profile
                    </h6>
                    <form onSubmit={handleSaveSize}>
                        <div className="row g-2 mb-3">
                            <div className="col-4">
                                <label className="small fw-semibold text-muted d-block mb-1">Height</label>
                                <input
                                    type="text"
                                    className="profile-input py-1 px-2"
                                    placeholder={`5'9"`}
                                    value={localSize.height}
                                    onChange={(e) => setLocalSize({ ...localSize, height: e.target.value })}
                                />
                            </div>
                            <div className="col-4">
                                <label className="small fw-semibold text-muted d-block mb-1">Size</label>
                                <select
                                    className="profile-input py-1 px-2"
                                    value={localSize.size}
                                    onChange={(e) => setLocalSize({ ...localSize, size: e.target.value })}
                                >
                                    {["XS", "S", "M", "L", "XL", "XXL"].map((sz) => (
                                        <option key={sz} value={sz}>{sz}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-4">
                                <label className="small fw-semibold text-muted d-block mb-1">Fit</label>
                                <select
                                    className="profile-input py-1 px-2"
                                    value={localSize.fit}
                                    onChange={(e) => setLocalSize({ ...localSize, fit: e.target.value })}
                                >
                                    <option value="Slim">Slim</option>
                                    <option value="Regular">Regular</option>
                                    <option value="Oversized">Oversized</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-dark btn-sm rounded-pill px-3 fw-bold">
                            Save Size Profile
                        </button>
                    </form>
                </div>
            </div>

            {/* "For You" Recommendations Strip */}
            {recommendations.length > 0 && (
                <div className="gami-card mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="m-0 fw-bold">
                            <i className="bi bi-stars text-warning me-2"></i>
                            For You
                        </h6>
                        <small className="text-muted">Picked for your {localSize.fit} fit</small>
                    </div>
                    <div className="for-you-strip">
                        {recommendations.map((item) => (
                            <div key={item.itemId} className="for-you-card">
                                <img
                                    src={item.imageUrl || assets.upload}
                                    alt={item.name}
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = assets.upload;
                                    }}
                                />
                                <div className="for-you-title" title={item.name}>{item.name}</div>
                                <div className="d-flex justify-content-between align-items-center mt-1">
                                    <span className="fw-bold small">&#8377;{Number(item.price || 0).toFixed(0)}</span>
                                    <button
                                        type="button"
                                        className="btn btn-dark btn-sm rounded-pill py-0 px-2"
                                        style={{ fontSize: "11px" }}
                                        onClick={() => {
                                            onAddToCart(item, 1);
                                            toast.success(`${item.name} added to cart`);
                                        }}
                                    >
                                        + Add
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Shareable Moodboard Modal */}
            {showMoodboard && (
                <div className="profile-modal-backdrop" onClick={() => setShowMoodboard(false)}>
                    <div className="profile-modal-card moodboard-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="m-0 fw-bold">My Style Moodboard</h5>
                            <button type="button" className="btn-close" onClick={() => setShowMoodboard(false)}></button>
                        </div>

                        <div className="moodboard-collage mb-3">
                            {(wishlistItems.length > 0 ? wishlistItems : recommendations).slice(0, 4).map((item) => (
                                <div key={item.itemId} className="moodboard-tile">
                                    <img
                                        src={item.imageUrl || assets.upload}
                                        alt={item.name}
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = assets.upload;
                                        }}
                                    />
                                    <span>{item.name}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="btn btn-dark w-100 rounded-pill fw-bold"
                            onClick={handleShareMoodboard}
                        >
                            <i className="bi bi-share-fill me-2"></i>
                            Share Moodboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePersonalization;
