import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AppContext } from "../../context/AppContextDefinition.js";
import { setSpareKey } from "../../Service/AuthService.js";
import { triggerSplash } from "../../components/Splash/SplashScreen.jsx";
import "./CreateSpareKey.css";

const CONFETTI_PARTICLES = [
    { tx: "-140px", ty: "-160px", bg: "#34d399" },
    { tx: "150px", ty: "-150px", bg: "#fbbf24" },
    { tx: "-180px", ty: "-40px", bg: "#60a5fa" },
    { tx: "170px", ty: "-30px", bg: "#f472b6" },
    { tx: "-90px", ty: "-190px", bg: "#ffffff" },
    { tx: "95px", ty: "-185px", bg: "#a7f3d0" },
    { tx: "-130px", ty: "90px", bg: "#fbbf24" },
    { tx: "135px", ty: "95px", bg: "#34d399" },
    { tx: "-45px", ty: "-130px", bg: "#38bdf8" },
    { tx: "50px", ty: "-125px", bg: "#fde68a" },
];

const getStrength = (rulesCount, password) => {
    if (!password) return { label: "Weak", pct: 10, color: "#ef4444" };
    if (rulesCount <= 1) return { label: "Weak", pct: 25, color: "#ef4444" };
    if (rulesCount === 2) return { label: "Okay", pct: 50, color: "#f59e0b" };
    if (rulesCount === 3) return { label: "Strong", pct: 75, color: "#10b981" };
    return { label: "Unbreakable 💪", pct: 100, color: "#16a34a" };
};

const CreateSpareKey = () => {
    const { auth, setAuthData, logout } = useContext(AppContext);
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSuccessFlash, setShowSuccessFlash] = useState(false);
    const [xpCounter, setXpCounter] = useState(0);
    const [imgError, setImgError] = useState(false);

    // Count-up +50 XP animation on Screen 4
    useEffect(() => {
        if (!showSuccessFlash) return;
        let current = 0;
        const interval = setInterval(() => {
            current += 2;
            if (current >= 50) {
                setXpCounter(50);
                clearInterval(interval);
            } else {
                setXpCounter(current);
            }
        }, 25);

        const navTimer = setTimeout(() => {
            triggerSplash("Unlocking your wardrobe...");
            navigate("/dashboard?welcome=1", { replace: true });
        }, 2100);

        return () => {
            clearInterval(interval);
            clearTimeout(navTimer);
        };
    }, [showSuccessFlash, navigate]);

    if (!auth?.token) {
        return <Navigate to="/login" replace />;
    }

    if (auth.passwordSet !== false && !showSuccessFlash) {
        return <Navigate to="/dashboard" replace />;
    }

    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const passwordsMatch = password.length > 0 && password === confirmPassword;

    const passedCount = [hasMinLength, hasNumber, hasUpper, passwordsMatch].filter(Boolean).length;
    const allRulesPassed = passedCount === 4;
    const strength = getStrength(passedCount, password);

    const firstName = (auth.name || "Friend").split(" ")[0];
    const initials = firstName.charAt(0).toUpperCase();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!allRulesPassed) return;

        setLoading(true);
        try {
            const res = await setSpareKey({ password, confirmPassword });
            if (res.status === 200 && res.data) {
                setAuthData(res.data);
                setShowSuccessFlash(true);
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Unable to save spare key.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (showSuccessFlash) {
        return (
            <div className="spare-success-screen">
                {CONFETTI_PARTICLES.map((p, idx) => (
                    <span
                        key={idx}
                        className="confetti-piece"
                        style={{ "--tx": p.tx, "--ty": p.ty, backgroundColor: p.bg }}
                    />
                ))}

                <svg className="success-check-svg" viewBox="0 0 100 100">
                    <circle className="success-check-circle" cx="50" cy="50" r="45" />
                    <path className="success-check-path" d="M30 52 L44 66 L70 36" />
                </svg>

                <h1 className="fw-bold mb-2">Spare key saved. &#10004;</h1>
                <p className="fs-5 opacity-75 mb-1">You can now enter either way.</p>
                <div className="success-xp-pill">+{xpCounter} XP</div>
            </div>
        );
    }

    return (
        <div className="spare-key-page">
            <div className="spare-key-card">
                {/* Progress Indicator */}
                <div className="spare-step-bar">
                    <div className="spare-step-label">
                        <span>Step 2 of 2: Secure your account</span>
                        <span>100%</span>
                    </div>
                    <div className="spare-step-track">
                        <div className="spare-step-fill" />
                    </div>
                </div>

                {/* User Google Photo & Name */}
                <div className="spare-user-header">
                    <div className="spare-avatar-circle">
                        {auth.avatarUrl && !imgError ? (
                            <img
                                src={auth.avatarUrl}
                                alt={auth.name || "User"}
                                referrerPolicy="no-referrer"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </div>
                    {auth.email && (
                        <div className="spare-email-pill">{auth.email}</div>
                    )}
                    <h1 className="spare-title">You&apos;re in, {firstName}. 🔥</h1>
                    <p className="spare-subtitle">
                        Google is your front door. Every door needs a spare key.
                    </p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    {/* Password */}
                    <div className="mb-3">
                        <label htmlFor="spare-password" className="form-label fw-semibold small">
                            Password
                        </label>
                        <div className="spare-input-wrap">
                            <input
                                id="spare-password"
                                type={showPass ? "text" : "password"}
                                className="spare-input"
                                placeholder="Create a strong spare key"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                            />
                            <div className="spare-input-icons">
                                <button
                                    type="button"
                                    className="spare-eye-btn"
                                    onClick={() => setShowPass((v) => !v)}
                                    aria-label="Toggle password visibility"
                                >
                                    <i className={`bi ${showPass ? "bi-eye-slash" : "bi-eye"}`}></i>
                                </button>
                            </div>
                        </div>
                        {password.length > 0 && !hasMinLength && (
                            <div className="spare-error-line">
                                A little longer and it&apos;s a good key.
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-2">
                        <label htmlFor="spare-confirm" className="form-label fw-semibold small">
                            Confirm password
                        </label>
                        <div className="spare-input-wrap">
                            <input
                                id="spare-confirm"
                                type={showConfirm ? "text" : "password"}
                                className="spare-input"
                                placeholder="Re-enter your spare key"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <div className="spare-input-icons">
                                {passwordsMatch && (
                                    <span className="spare-match-check" title="Passwords match">
                                        &#10004;
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className="spare-eye-btn"
                                    onClick={() => setShowConfirm((v) => !v)}
                                    aria-label="Toggle confirm password visibility"
                                >
                                    <i className={`bi ${showConfirm ? "bi-eye-slash" : "bi-eye"}`}></i>
                                </button>
                            </div>
                        </div>
                        {confirmPassword.length > 0 && password !== confirmPassword && (
                            <div className="spare-error-line">
                                These two don&apos;t match yet.
                            </div>
                        )}
                    </div>

                    {/* Strength Meter */}
                    <div className="spare-strength-wrap">
                        <div className="spare-strength-header">
                            <span className="text-muted">Key Strength</span>
                            <span style={{ color: strength.color }}>{strength.label}</span>
                        </div>
                        <div className="spare-strength-track">
                            <div
                                className="spare-strength-fill"
                                style={{ width: `${strength.pct}%`, backgroundColor: strength.color }}
                            />
                        </div>
                    </div>

                    {/* Live Checklist */}
                    <div className="spare-checklist">
                        <div className={`spare-check-item ${hasMinLength ? "passed" : ""}`}>
                            <span>{hasMinLength ? "✔" : "○"}</span>
                            <span>At least 8 characters</span>
                        </div>
                        <div className={`spare-check-item ${hasNumber ? "passed" : ""}`}>
                            <span>{hasNumber ? "✔" : "○"}</span>
                            <span>One number</span>
                        </div>
                        <div className={`spare-check-item ${hasUpper ? "passed" : ""}`}>
                            <span>{hasUpper ? "✔" : "○"}</span>
                            <span>One uppercase letter</span>
                        </div>
                        <div className={`spare-check-item ${passwordsMatch ? "passed" : ""}`}>
                            <span>{passwordsMatch ? "✔" : "○"}</span>
                            <span>Both passwords match</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="spare-submit-btn"
                        disabled={!allRulesPassed || loading}
                    >
                        {loading ? "Securing account..." : "Set my spare key"}
                    </button>
                </form>

                <div className="spare-switch-account">
                    <button
                        type="button"
                        className="spare-switch-btn"
                        onClick={() => {
                            logout();
                            navigate("/login", { replace: true });
                        }}
                    >
                        <i className="bi bi-arrow-left me-1"></i>
                        Wrong account? Change email or switch Google account
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateSpareKey;
