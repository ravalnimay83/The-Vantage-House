import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const PRESET_AVATARS = [
    { id: "olive", label: "Olive", bg: "#2d4c24", emoji: "🧥" },
    { id: "street", label: "Street", bg: "#111827", emoji: "🕶️" },
    { id: "urban", label: "Urban", bg: "#1e3a5f", emoji: "🧢" },
    { id: "royal", label: "Royal", bg: "#5b21b6", emoji: "👑" },
    { id: "minimal", label: "Minimal", bg: "#374151", emoji: "👕" },
    { id: "gold", label: "Luxe", bg: "#92400e", emoji: "✨" },
];

const useCountUp = (target, duration = 600) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const end = Number(target || 0);
        if (end === 0) {
            setCount(0);
            return;
        }
        let start = 0;
        const stepTime = Math.max(16, Math.floor(duration / Math.min(end, 25)));
        const step = Math.max(1, Math.ceil(end / 25));
        const timer = setInterval(() => {
            start += step;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(start);
            }
        }, stepTime);
        return () => clearInterval(timer);
    }, [target, duration]);
    return count;
};

const getStylePersona = (ordersCount, xp) => {
    if (ordersCount >= 5 || xp >= 600) return { title: "Drip Lord", icon: "👑" };
    if (ordersCount >= 2 || xp >= 250) return { title: "Street Royalty", icon: "⚡" };
    if (ordersCount >= 1 || xp >= 100) return { title: "Trend Explorer", icon: "🧭" };
    return { title: "Newbie Drifter", icon: "🌱" };
};

const ProfileHero = ({
    auth,
    isAdmin,
    ordersCount,
    wishlistCount,
    cartCount,
    totalSaved,
    xp,
    customAvatar,
    onSelectAvatar,
    onStatClick,
}) => {
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [imgError, setImgError] = useState(false);
    const fileInputRef = useRef(null);

    const animatedOrders = useCountUp(ordersCount);
    const animatedWishlist = useCountUp(wishlistCount);
    const animatedCart = useCountUp(cartCount);

    const persona = getStylePersona(ordersCount, xp);
    const initials = (auth?.name || auth?.email || "U").charAt(0).toUpperCase();

    const handlePhotoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 1024 * 1024 * 2) {
            toast.error("Please choose an image under 2 MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            onSelectAvatar({ type: "image", value: reader.result });
            setShowAvatarModal(false);
            toast.success("Profile photo updated!");
        };
        reader.readAsDataURL(file);
    };

    const renderAvatarInner = () => {
        if (customAvatar?.type === "image" && customAvatar.value) {
            return <img src={customAvatar.value} alt={auth?.name || "Avatar"} />;
        }
        if (customAvatar?.type === "preset" && customAvatar.emoji) {
            return (
                <span style={{ background: customAvatar.bg, color: "#fff", fontSize: "2.1rem" }}>
                    {customAvatar.emoji}
                </span>
            );
        }
        if (auth?.avatarUrl && !imgError) {
            return (
                <img
                    src={auth.avatarUrl}
                    alt={auth?.name || "Avatar"}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                />
            );
        }
        return <span>{initials}</span>;
    };

    return (
        <>
            <div className="profile-hero-banner">
                <div className="profile-hero-left">
                    <div className="profile-avatar-ring-container">
                        <div className={`profile-hero-avatar ${isAdmin ? "admin-ring" : "animated-ring"}`}>
                            {renderAvatarInner()}
                        </div>
                        <button
                            type="button"
                            className="profile-avatar-edit-btn"
                            title="Change Avatar or Upload Photo"
                            onClick={() => setShowAvatarModal(true)}
                        >
                            <i className="bi bi-camera-fill"></i>
                        </button>
                        {isAdmin && (
                            <span className="profile-admin-ring-badge">
                                <i className="bi bi-shield-fill-check"></i>
                                ADMIN
                            </span>
                        )}
                    </div>

                    <div className="profile-hero-identity">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <h2 className="profile-hero-name">{auth?.name || "BizBill Member"}</h2>
                            <span className="profile-persona-pill">
                                <span>{persona.icon}</span>
                                <span>{persona.title}</span>
                            </span>
                        </div>
                        <p className="profile-hero-email">
                            {auth?.email || auth?.phoneNumber}
                            {auth?.email && auth?.phoneNumber ? ` • ${auth.phoneNumber}` : ""}
                        </p>
                        {totalSaved > 0 && (
                            <div className="profile-saved-pill">
                                <i className="bi bi-piggy-bank-fill"></i>
                                <span>Total saved with us: <strong>&#8377;{totalSaved.toFixed(0)}</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Live Interactive Counters */}
                <div className="profile-hero-counters">
                    <button
                        type="button"
                        className="hero-counter-card"
                        onClick={() => onStatClick("orders")}
                    >
                        <span className="hero-counter-val">{animatedOrders}</span>
                        <span className="hero-counter-lbl">
                            <i className="bi bi-receipt me-1"></i>
                            {isAdmin ? "Store Orders" : "Orders"}
                        </span>
                    </button>

                    <button
                        type="button"
                        className="hero-counter-card"
                        onClick={() => onStatClick("wishlist")}
                    >
                        <span className="hero-counter-val">{animatedWishlist}</span>
                        <span className="hero-counter-lbl">
                            <i className="bi bi-heart-fill me-1"></i>
                            Wishlist
                        </span>
                    </button>

                    <button
                        type="button"
                        className="hero-counter-card"
                        onClick={() => onStatClick("cart")}
                    >
                        <span className="hero-counter-val">{animatedCart}</span>
                        <span className="hero-counter-lbl">
                            <i className="bi bi-bag-fill me-1"></i>
                            Cart
                        </span>
                    </button>
                </div>
            </div>

            {/* Avatar Chooser Modal */}
            {showAvatarModal && (
                <div className="profile-modal-backdrop" onClick={() => setShowAvatarModal(false)}>
                    <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="m-0 fw-bold">Choose Your Avatar</h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setShowAvatarModal(false)}
                            ></button>
                        </div>

                        <div className="avatar-presets-grid mb-3">
                            {PRESET_AVATARS.map((av) => (
                                <button
                                    key={av.id}
                                    type="button"
                                    className="avatar-preset-option"
                                    onClick={() => {
                                        onSelectAvatar({ type: "preset", bg: av.bg, emoji: av.emoji });
                                        setShowAvatarModal(false);
                                        toast.success(`Avatar updated to ${av.label}!`);
                                    }}
                                >
                                    <span className="avatar-preset-circle" style={{ background: av.bg }}>
                                        {av.emoji}
                                    </span>
                                    <small>{av.label}</small>
                                </button>
                            ))}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="d-none"
                            onChange={handlePhotoUpload}
                        />
                        <button
                            type="button"
                            className="btn btn-dark w-100 rounded-pill fw-bold"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <i className="bi bi-upload me-2"></i>
                            Upload Photo
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProfileHero;
