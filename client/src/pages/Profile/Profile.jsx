import './Profile.css';
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContextDefinition.js";
import { updateProfile } from "../../Service/AuthService.js";
import { fetchMyOrders, fetchOrders } from "../../Service/OrderService.js";
import { assets } from "../../assets/assets.js";
import ProfileHero from "../../components/Profile/ProfileHero.jsx";
import ProfileGamification from "../../components/Profile/ProfileGamification.jsx";
import ProfilePersonalization from "../../components/Profile/ProfilePersonalization.jsx";
import {
    NewUserChecklist,
    OrderTimelineList,
    ReferralCard,
    SavedAddressesAndPayments,
} from "../../components/Profile/ProfileEssentials.jsx";
import toast from "react-hot-toast";

const readLocal = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const Profile = () => {
    const {
        auth,
        updateUserProfile,
        logout,
        items,
        wishlist,
        toggleWishlist,
        addToCart,
        cartCount,
    } = useContext(AppContext);
    const navigate = useNavigate();
    const workspaceRef = useRef(null);

    const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'style' | 'wishlist' | 'details'
    const [saving, setSaving] = useState(false);
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    const isAdmin = auth?.role === "ROLE_ADMIN";
    const userScope = auth?.userId || auth?.email || "guest";

    // Personalization & Gamification state persisted per user
    const [customAvatar, setCustomAvatar] = useState(() => readLocal(`bizbill_avatar_${userScope}`, null));
    const [bonusXp, setBonusXp] = useState(() => readLocal(`bizbill_xp_${userScope}`, 0));
    const [streak, setStreak] = useState(() => readLocal(`bizbill_streak_${userScope}`, 1));
    const [lastCheckIn, setLastCheckIn] = useState(() => readLocal(`bizbill_checkin_${userScope}`, ""));
    const [lastSpinDate, setLastSpinDate] = useState(() => readLocal(`bizbill_spin_${userScope}`, ""));
    const [wonCoupon, setWonCoupon] = useState(() => readLocal(`bizbill_coupon_${userScope}`, null));
    const [sizeProfile, setSizeProfile] = useState(() =>
        readLocal(`bizbill_size_${userScope}`, { height: "", size: "M", fit: "Regular" })
    );
    const [addresses, setAddresses] = useState(() => readLocal(`bizbill_addrs_${userScope}`, []));
    const [preferredPayment, setPreferredPayment] = useState(() =>
        readLocal(`bizbill_pay_${userScope}`, "UPI")
    );

    const [form, setForm] = useState({
        name: auth?.name || "",
        email: auth?.email || "",
        phoneNumber: auth?.phoneNumber || "",
    });

    useEffect(() => {
        setForm({
            name: auth?.name || "",
            email: auth?.email || "",
            phoneNumber: auth?.phoneNumber || "",
        });
    }, [auth]);

    useEffect(() => {
        if (!auth?.token) return;
        setLoadingOrders(true);
        const loader = isAdmin ? fetchOrders : fetchMyOrders;
        loader()
            .then((res) => {
                if (Array.isArray(res.data)) {
                    setOrders(res.data);
                }
            })
            .catch((err) => console.error("Failed to fetch orders:", err))
            .finally(() => setLoadingOrders(false));
    }, [auth?.token, isAdmin]);

    const safeItems = Array.isArray(items) ? items : [];
    const wishlistedItems = safeItems.filter((i) => wishlist.includes(i.itemId));

    // Calculate total saved from MRP vs selling price across placed orders
    const totalSaved = useMemo(() => {
        let saved = 0;
        for (const order of orders) {
            for (const ci of order.cartItems || []) {
                const catalogItem = safeItems.find((it) => it.itemId === ci.itemId);
                if (catalogItem?.originalPrice && Number(catalogItem.originalPrice) > Number(ci.price)) {
                    saved += (Number(catalogItem.originalPrice) - Number(ci.price)) * (ci.quantity || 1);
                }
            }
        }
        return saved;
    }, [orders, safeItems]);

    if (!auth?.token) {
        return (
            <div className="profile-page">
                <div className="profile-guest-box">
                    <i className="bi bi-person-circle fs-1 text-secondary d-block mb-2"></i>
                    <h3 className="fw-bold mb-2">Sign in to view your Profile</h3>
                    <p className="text-muted mb-4">
                        Access your personal space, XP rewards, orders, and saved looks.
                    </p>
                    <div className="d-flex justify-content-center gap-2">
                        <Link to="/login" className="btn btn-dark rounded-pill px-4 fw-bold">
                            Sign In
                        </Link>
                        <Link to="/signup" className="btn btn-outline-dark rounded-pill px-4 fw-bold">
                            Create Account
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const checkedInToday = lastCheckIn === todayStr;
    const profileCompleted = Boolean(
        auth?.name?.trim() && (auth?.email || auth?.phoneNumber) && sizeProfile?.height && wishlist.length >= 1
    );
    const totalXp =
        (auth?.xp || 0) +
        orders.length * 80 +
        wishlist.length * 15 +
        (profileCompleted ? 100 : 25) +
        bonusXp;

    const handleSelectAvatar = (av) => {
        setCustomAvatar(av);
        localStorage.setItem(`bizbill_avatar_${userScope}`, JSON.stringify(av));
    };

    const handleDailyCheckIn = () => {
        if (checkedInToday) return;
        const nextXp = bonusXp + 25;
        const nextStreak = streak + 1;
        setBonusXp(nextXp);
        setStreak(nextStreak);
        setLastCheckIn(todayStr);
        localStorage.setItem(`bizbill_xp_${userScope}`, JSON.stringify(nextXp));
        localStorage.setItem(`bizbill_streak_${userScope}`, JSON.stringify(nextStreak));
        localStorage.setItem(`bizbill_checkin_${userScope}`, JSON.stringify(todayStr));
        toast.success("Daily check-in claimed! +25 XP 🔥");
    };

    const handleSpinWin = (reward, dateStr) => {
        setLastSpinDate(dateStr);
        setWonCoupon(reward);
        localStorage.setItem(`bizbill_spin_${userScope}`, JSON.stringify(dateStr));
        localStorage.setItem(`bizbill_coupon_${userScope}`, JSON.stringify(reward));
        if (reward.code.startsWith("XP")) {
            const extra = parseInt(reward.code.replace("XP", ""), 10) || 25;
            const nextXp = bonusXp + extra;
            setBonusXp(nextXp);
            localStorage.setItem(`bizbill_xp_${userScope}`, JSON.stringify(nextXp));
        }
    };

    const handleSaveSizeProfile = (nextSize) => {
        setSizeProfile(nextSize);
        localStorage.setItem(`bizbill_size_${userScope}`, JSON.stringify(nextSize));
    };

    const handleAddAddress = (addr) => {
        const next = [...addresses, addr];
        setAddresses(next);
        localStorage.setItem(`bizbill_addrs_${userScope}`, JSON.stringify(next));
    };

    const handleDeleteAddress = (id) => {
        const next = addresses.filter((a) => a.id !== id);
        setAddresses(next);
        localStorage.setItem(`bizbill_addrs_${userScope}`, JSON.stringify(next));
    };

    const handleSelectPayment = (pm) => {
        setPreferredPayment(pm);
        localStorage.setItem(`bizbill_pay_${userScope}`, JSON.stringify(pm));
    };

    const handleStatClick = (target) => {
        if (target === "cart") {
            navigate("/explore");
            return;
        }
        setActiveTab(target);
        workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error("Name cannot be empty.");
            return;
        }
        setSaving(true);
        try {
            const res = await updateProfile({
                name: form.name.trim(),
                email: form.email.trim() || null,
                phoneNumber: form.phoneNumber.trim() || null,
            });
            if (res.data) {
                updateUserProfile(res.data);
                toast.success("Profile updated successfully!");
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to update profile.";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="profile-page">
            <div className="profile-container">
                {/* 1. Hero Header */}
                <ProfileHero
                    auth={auth}
                    isAdmin={isAdmin}
                    ordersCount={orders.length}
                    wishlistCount={wishlistedItems.length}
                    cartCount={cartCount}
                    totalSaved={totalSaved}
                    xp={totalXp}
                    customAvatar={customAvatar}
                    onSelectAvatar={handleSelectAvatar}
                    onStatClick={handleStatClick}
                />

                {/* 2. Gamification: XP Bar, Badges, Streak & Spin Wheel */}
                <ProfileGamification
                    xp={totalXp}
                    streak={streak}
                    checkedInToday={checkedInToday}
                    onDailyCheckIn={handleDailyCheckIn}
                    ordersCount={orders.length}
                    wishlistCount={wishlistedItems.length}
                    profileCompleted={profileCompleted}
                    lastSpinDate={lastSpinDate}
                    wonCoupon={wonCoupon}
                    onSpinWin={handleSpinWin}
                />

                {/* 3. New-User Checklist */}
                <NewUserChecklist
                    auth={auth}
                    sizeProfile={sizeProfile}
                    wishlistCount={wishlistedItems.length}
                    onJumpToTab={handleStatClick}
                />

                {/* 4. Main Personal Space Tabs */}
                <main ref={workspaceRef} className="profile-main-card">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom pb-3 mb-3">
                        <div className="profile-tabs border-0 p-0 m-0">
                            <button
                                type="button"
                                className={`profile-tab-btn ${activeTab === "orders" ? "active" : ""}`}
                                onClick={() => setActiveTab("orders")}
                            >
                                <i className="bi bi-receipt me-2"></i>
                                {isAdmin ? `All Store Orders (${orders.length})` : `My Orders (${orders.length})`}
                            </button>
                            <button
                                type="button"
                                className={`profile-tab-btn ${activeTab === "style" ? "active" : ""}`}
                                onClick={() => setActiveTab("style")}
                            >
                                <i className="bi bi-stars me-2"></i>
                                Style DNA &amp; For You
                            </button>
                            <button
                                type="button"
                                className={`profile-tab-btn ${activeTab === "wishlist" ? "active" : ""}`}
                                onClick={() => setActiveTab("wishlist")}
                            >
                                <i className="bi bi-heart-fill me-2"></i>
                                Wishlist ({wishlistedItems.length})
                            </button>
                            <button
                                type="button"
                                className={`profile-tab-btn ${activeTab === "details" ? "active" : ""}`}
                                onClick={() => setActiveTab("details")}
                            >
                                <i className="bi bi-gear-fill me-2"></i>
                                Account &amp; Essentials
                            </button>
                        </div>

                        {isAdmin && (
                            <Link to="/items" className="btn btn-sm btn-warning rounded-pill px-3 fw-bold">
                                <i className="bi bi-shield-lock-fill me-1"></i>
                                Open Admin Panel
                            </Link>
                        )}
                    </div>

                    {activeTab === "orders" && (
                        <OrderTimelineList orders={orders} loadingOrders={loadingOrders} />
                    )}

                    {activeTab === "style" && (
                        <ProfilePersonalization
                            items={safeItems}
                            wishlistItems={wishlistedItems}
                            sizeProfile={sizeProfile}
                            onSaveSizeProfile={handleSaveSizeProfile}
                            onAddToCart={addToCart}
                        />
                    )}

                    {activeTab === "wishlist" && (
                        wishlistedItems.length === 0 ? (
                            <div className="friendly-empty-state">
                                <div className="friendly-empty-emoji">💚</div>
                                <h5 className="fw-bold text-dark mb-1">
                                    Heart something you like, we&apos;ll watch the price for you
                                </h5>
                                <p className="text-muted small mb-3">
                                    Tap the heart on any clothing item to save it to your wishlist &amp; moodboard.
                                </p>
                                <Link to="/products" className="btn btn-dark rounded-pill px-4 fw-bold">
                                    Explore Catalog
                                </Link>
                            </div>
                        ) : (
                            <div className="row g-3">
                                {wishlistedItems.map((item) => {
                                    const price = Number(item.price || 0);
                                    const mrp = Number(item.originalPrice || 0);
                                    const savings = mrp > price ? mrp - price : 0;
                                    return (
                                        <div key={item.itemId} className="col-md-6">
                                            <div className="d-flex align-items-center gap-3 p-3 border rounded-4 bg-light">
                                                <img
                                                    src={item.imageUrl || assets.upload}
                                                    alt={item.name}
                                                    style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 14 }}
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = assets.upload;
                                                    }}
                                                />
                                                <div className="flex-grow-1 min-width-0">
                                                    <div className="fw-bold text-truncate">{item.name}</div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="text-success fw-bold small">
                                                            &#8377;{price.toFixed(0)}
                                                        </span>
                                                        {savings > 0 && (
                                                            <span className="badge bg-success-subtle text-success rounded-pill" style={{ fontSize: "10px" }}>
                                                                Price drop! Save &#8377;{savings.toFixed(0)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="d-flex gap-1">
                                                    <button
                                                        type="button"
                                                        className="btn btn-dark btn-sm rounded-pill"
                                                        onClick={() => {
                                                            addToCart(item, 1);
                                                            toast.success(`${item.name} added to cart`);
                                                        }}
                                                    >
                                                        Add
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm rounded-circle"
                                                        onClick={() => toggleWishlist(item.itemId)}
                                                        title="Remove"
                                                    >
                                                        <i className="bi bi-x"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {activeTab === "details" && (
                        <div>
                            <form onSubmit={handleSaveProfile} className="mb-4">
                                <div className="row g-3">
                                    <div className="col-md-12">
                                        <label htmlFor="prof-name" className="profile-field-label">
                                            Full Name
                                        </label>
                                        <input
                                            id="prof-name"
                                            type="text"
                                            className="profile-input"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="prof-email" className="profile-field-label">
                                            Email Address
                                        </label>
                                        <input
                                            id="prof-email"
                                            type="email"
                                            className="profile-input"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            placeholder="Add email address"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="prof-phone" className="profile-field-label">
                                            Mobile Number
                                        </label>
                                        <input
                                            id="prof-phone"
                                            type="tel"
                                            className="profile-input"
                                            value={form.phoneNumber}
                                            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                                            placeholder="Add mobile number"
                                        />
                                    </div>
                                    <div className="col-12 mt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                        <button type="submit" className="profile-save-btn" disabled={saving}>
                                            {saving ? "Saving..." : "Save Changes"}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger rounded-pill px-4 fw-bold"
                                            onClick={() => {
                                                logout();
                                                toast.success("Signed out");
                                                navigate("/dashboard");
                                            }}
                                        >
                                            <i className="bi bi-box-arrow-right me-2"></i>
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            </form>

                            <SavedAddressesAndPayments
                                addresses={addresses}
                                onAddAddress={handleAddAddress}
                                onDeleteAddress={handleDeleteAddress}
                                preferredPayment={preferredPayment}
                                onSelectPayment={handleSelectPayment}
                            />

                            <ReferralCard auth={auth} />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Profile;
