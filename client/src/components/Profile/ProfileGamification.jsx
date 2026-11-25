import { useState } from "react";
import toast from "react-hot-toast";

const SPIN_REWARDS = [
    { label: "10% OFF", code: "DRIP10", color: "#2d4c24" },
    { label: "+50 XP", code: "XP50", color: "#111827" },
    { label: "₹100 OFF", code: "SAVE100", color: "#526d42" },
    { label: "Free Ship", code: "FREESHIP", color: "#374151" },
    { label: "15% OFF", code: "VIP15", color: "#1b2c19" },
    { label: "+25 XP", code: "XP25", color: "#4b5563" },
];

const getTierInfo = (xp) => {
    if (xp >= 500) return { name: "Black", next: null, progress: 100, badgeColor: "#111827", perk: "Priority styling + 15% member drops" };
    if (xp >= 200) return { name: "Gold", next: "Black (500 XP)", progress: Math.min(100, ((xp - 200) / 300) * 100), badgeColor: "#d97706", perk: "Early access + Free express shipping" };
    return { name: "Silver", next: "Gold (200 XP)", progress: Math.min(100, (xp / 200) * 100), badgeColor: "#64748b", perk: "Earn XP on every order & daily check-in" };
};

const ProfileGamification = ({
    xp,
    streak,
    checkedInToday,
    onDailyCheckIn,
    ordersCount,
    wishlistCount,
    profileCompleted,
    lastSpinDate,
    wonCoupon,
    onSpinWin,
}) => {
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);

    const level = Math.floor(xp / 100) + 1;
    const xpInLevel = xp % 100;
    const tier = getTierInfo(xp);
    const todayStr = new Date().toISOString().slice(0, 10);
    const canSpinToday = lastSpinDate !== todayStr;

    const currentHour = new Date().getHours();
    const badges = [
        {
            id: "first-order",
            title: "First Order",
            desc: "Placed your first order",
            icon: "🛍️",
            unlocked: ordersCount >= 1,
        },
        {
            id: "wishlist-hoarder",
            title: "Wishlist Hoarder",
            desc: "Saved 3+ items",
            icon: "💖",
            unlocked: wishlistCount >= 3,
        },
        {
            id: "night-owl",
            title: "Night Owl Shopper",
            desc: "Active after 8 PM",
            icon: "🦉",
            unlocked: currentHour >= 20 || currentHour < 5,
        },
        {
            id: "profile-pro",
            title: "Profile Pro",
            desc: "Completed profile",
            icon: "✅",
            unlocked: profileCompleted,
        },
    ];

    const handleSpin = () => {
        if (!canSpinToday || spinning) return;
        setSpinning(true);
        const rewardIdx = Math.floor(Math.random() * SPIN_REWARDS.length);
        const extraDeg = 360 * 4 + rewardIdx * (360 / SPIN_REWARDS.length);
        setRotation((r) => r + extraDeg);

        setTimeout(() => {
            setSpinning(false);
            const reward = SPIN_REWARDS[rewardIdx];
            onSpinWin(reward, todayStr);
            toast.success(`You won: ${reward.label} (Code: ${reward.code})!`);
        }, 1800);
    };

    return (
        <div className="gamification-grid">
            {/* XP, Level & Loyalty Tier */}
            <div className="gami-card">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <span className="gami-eyebrow">Level {level}</span>
                        <h5 className="m-0 fw-bold">{xp} XP</h5>
                    </div>
                    <span
                        className="loyalty-tier-badge"
                        style={{ backgroundColor: tier.badgeColor }}
                    >
                        <i className="bi bi-gem me-1"></i>
                        {tier.name} Tier
                    </span>
                </div>

                <div className="xp-progress-track mb-2">
                    <div className="xp-progress-fill" style={{ width: `${xpInLevel}%` }} />
                </div>
                <div className="d-flex justify-content-between small text-muted mb-3">
                    <span>{xpInLevel}/100 XP to Level {level + 1}</span>
                    {tier.next && <span>Next: {tier.next}</span>}
                </div>

                <div className="streak-row">
                    <div>
                        <div className="fw-bold small">
                            🔥 {streak}-Day Check-in Streak
                        </div>
                        <small className="text-muted">{tier.perk}</small>
                    </div>
                    <button
                        type="button"
                        className={`btn btn-sm rounded-pill px-3 fw-bold ${
                            checkedInToday ? "btn-outline-secondary" : "btn-dark"
                        }`}
                        disabled={checkedInToday}
                        onClick={onDailyCheckIn}
                    >
                        {checkedInToday ? "Checked In ✓" : "Check In (+25 XP)"}
                    </button>
                </div>
            </div>

            {/* Badges Wall */}
            <div className="gami-card">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="m-0 fw-bold">
                        <i className="bi bi-award-fill text-warning me-2"></i>
                        Badges Wall
                    </h6>
                    <small className="text-muted fw-semibold">
                        {badges.filter((b) => b.unlocked).length}/{badges.length} unlocked
                    </small>
                </div>

                <div className="badges-wall-grid">
                    {badges.map((b) => (
                        <div key={b.id} className={`badge-tile ${b.unlocked ? "unlocked" : "locked"}`}>
                            <span className="badge-tile-icon">{b.icon}</span>
                            <div className="badge-tile-title">{b.title}</div>
                            <small className="badge-tile-desc">{b.desc}</small>
                        </div>
                    ))}
                </div>
            </div>

            {/* Once-a-Day Spin Wheel */}
            <div className="gami-card gami-spin-card">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="m-0 fw-bold">
                        <i className="bi bi-disc-fill text-success me-2"></i>
                        Daily Coupon Spin
                    </h6>
                    <span className="badge bg-light text-dark border rounded-pill">
                        {canSpinToday ? "1 Spin Ready" : "Come back tomorrow"}
                    </span>
                </div>

                <div className="spin-wheel-row">
                    <div className="spin-wheel-wrap">
                        <div className="spin-pointer">▼</div>
                        <div
                            className="spin-wheel-circle"
                            style={{ transform: `rotate(${rotation}deg)` }}
                        >
                            <span>🎁</span>
                        </div>
                    </div>

                    <div className="flex-grow-1">
                        {wonCoupon ? (
                            <div className="won-coupon-box mb-2">
                                <small className="text-muted d-block">Active Reward:</small>
                                <strong>{wonCoupon.label}</strong> • Code: <code>{wonCoupon.code}</code>
                            </div>
                        ) : (
                            <p className="small text-muted mb-2">
                                Spin once a day to unlock instant discounts or bonus XP!
                            </p>
                        )}
                        <button
                            type="button"
                            className="btn btn-dark btn-sm rounded-pill px-4 fw-bold"
                            disabled={!canSpinToday || spinning}
                            onClick={handleSpin}
                        >
                            {spinning ? "Spinning..." : canSpinToday ? "Spin Now" : "Spun Today ✓"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileGamification;
