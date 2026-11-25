import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AppContext } from "../../context/AppContextDefinition.js";
import { sendSignupOtp, verifySignupOtp } from "../../Service/AuthService.js";
import { COUNTRY_CODES, getEmailTypoSuggestion, isValidEmail, validatePhoneDigits } from "../../components/Auth/authValidation.js";
import GoogleLoginButton from "../../components/Auth/GoogleLoginButton.jsx";
import { assets } from "../../assets/assets.js";
import { triggerSplash } from "../../components/Splash/SplashScreen.jsx";
import "./CreateAccount.css";
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
];

const getStrength = (rulesCount, password) => {
    if (!password) return { label: "Weak", pct: 10, color: "#ef4444" };
    if (rulesCount <= 1) return { label: "Weak", pct: 25, color: "#ef4444" };
    if (rulesCount === 2) return { label: "Okay", pct: 50, color: "#f59e0b" };
    if (rulesCount === 3) return { label: "Strong", pct: 75, color: "#10b981" };
    return { label: "Unbreakable 💪", pct: 100, color: "#16a34a" };
};

const CreateAccount = () => {
    const { setAuthData } = useContext(AppContext);
    const navigate = useNavigate();
    const location = useLocation();

    // step: 'form' | 'otp' | 'success'
    const [step, setStep] = useState("form");
    const [loading, setLoading] = useState(false);

    // Form fields (pre-filled if redirected from Sign In Continue)
    const [name, setName] = useState("");
    const [email, setEmail] = useState(location.state?.prefillEmail || "");
    const [countryCode, setCountryCode] = useState("+91");
    const [phoneDigits, setPhoneDigits] = useState(location.state?.prefillPhone || "");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [serverFriendlyError, setServerFriendlyError] = useState("");

    // OTP state (6 separate boxes)
    const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
    const [resendSeconds, setResendSeconds] = useState(30);
    const otpRefs = useRef([]);

    // Success flash XP counter
    const [xpCounter, setXpCounter] = useState(0);

    // Resend timer countdown
    useEffect(() => {
        if (step !== "otp" || resendSeconds <= 0) return;
        const t = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [step, resendSeconds]);

    // Auto-focus first OTP box when entering OTP step
    useEffect(() => {
        if (step === "otp") {
            setTimeout(() => otpRefs.current[0]?.focus(), 80);
        }
    }, [step]);

    // Success flash +100 XP count-up & redirect to Home
    useEffect(() => {
        if (step !== "success") return;
        let current = 0;
        const interval = setInterval(() => {
            current += 4;
            if (current >= 100) {
                setXpCounter(100);
                clearInterval(interval);
            } else {
                setXpCounter(current);
            }
        }, 24);

        const navTimer = setTimeout(() => {
            triggerSplash("Setting up your closet...");
            navigate("/dashboard", { replace: true });
        }, 2100);

        return () => {
            clearInterval(interval);
            clearTimeout(navTimer);
        };
    }, [step, navigate]);

    const handleGoogleSuccess = useCallback(
        (authResponse) => {
            setAuthData(authResponse);
            triggerSplash(
                authResponse?.passwordSet === false
                    ? "Opening your styling studio..."
                    : "Welcome to the crew..."
            );
            if (authResponse?.passwordSet === false) {
                navigate("/create-spare-key", { replace: true });
            } else {
                navigate("/dashboard", { replace: true });
            }
        },
        [setAuthData, navigate]
    );

    // Live validations
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const emailValid = isValidEmail(cleanEmail);
    const emailSuggestion = getEmailTypoSuggestion(cleanEmail);
    const phoneValidation = validatePhoneDigits(phoneDigits, countryCode);

    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const passwordsMatch = password.length > 0 && password === confirmPassword;
    const passedRules = [hasMinLength, hasNumber, hasUpper, passwordsMatch].filter(Boolean).length;
    const strength = getStrength(passedRules, password);

    const allFieldsValid =
        cleanName.length >= 2 &&
        emailValid &&
        phoneValidation.valid &&
        passedRules === 4;

    const firstName = cleanName ? cleanName.split(" ")[0] : "";

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!allFieldsValid) return;

        setServerFriendlyError("");
        setLoading(true);
        try {
            await sendSignupOtp({
                email: cleanEmail,
                phoneNumber: phoneValidation.formatted,
            });
            toast.success(`6-digit code sent to ${cleanEmail}`);
            setOtpDigits(["", "", "", "", "", ""]);
            setResendSeconds(30);
            setStep("otp");
        } catch (err) {
            const msg = err.response?.data?.message || "Unable to send verification code.";
            if (err.response?.status === 409) {
                setServerFriendlyError("You're already here! Sign in instead.");
            } else {
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        const cleanVal = value.replace(/\D/g, "");
        if (cleanVal.length > 1) {
            // Handle paste of multi-digit code
            const chars = cleanVal.slice(0, 6).split("");
            const next = ["", "", "", "", "", ""];
            chars.forEach((ch, i) => {
                next[i] = ch;
            });
            setOtpDigits(next);
            const focusIdx = Math.min(chars.length, 5);
            otpRefs.current[focusIdx]?.focus();
            return;
        }

        const next = [...otpDigits];
        next[index] = cleanVal;
        setOtpDigits(next);

        if (cleanVal && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const fullCode = otpDigits.join("");
        if (fullCode.length !== 6) {
            toast("Please enter all 6 digits.", { icon: "🔢" });
            return;
        }

        setLoading(true);
        try {
            const res = await verifySignupOtp({
                name: cleanName,
                email: cleanEmail,
                phoneNumber: phoneValidation.formatted,
                password,
                code: fullCode,
            });
            if (res.data?.token) {
                setAuthData(res.data);
                setStep("success");
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Invalid or expired code.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendSeconds > 0 || loading) return;
        setLoading(true);
        try {
            await sendSignupOtp({
                email: cleanEmail,
                phoneNumber: phoneValidation.formatted,
            });
            toast.success("New 6-digit code sent!");
            setResendSeconds(30);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to resend code.");
        } finally {
            setLoading(false);
        }
    };

    // Success Flash Screen
    if (step === "success") {
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

                <h1 className="fw-bold mb-2">You&apos;re in, {firstName || "Friend"}. 🔥</h1>
                <p className="fs-5 opacity-75 mb-1">Welcome to the crew.</p>
                <div className="success-xp-pill">+{xpCounter} XP</div>
                <small className="mt-2 opacity-75 fw-semibold">Welcome bonus unlocked.</small>
            </div>
        );
    }

    return (
        <div className="signup-page-wrapper">
            <div className="signup-card">
                {/* Logo & Back to Home */}
                <div className="signup-top-bar">
                    <img src={assets.logo} alt="BizBill" height="36" />
                    <Link to="/dashboard" className="auth-back-home">
                        <i className="bi bi-arrow-left"></i>
                        Continue as Guest
                    </Link>
                </div>

                {/* Progress Indicator */}
                <div className="signup-progress-wrap">
                    <div className="signup-progress-labels">
                        <span>{step === "form" ? "Step 1 of 2" : "Step 2 of 2"}</span>
                        <span>{step === "form" ? "Your details" : "Verify email"}</span>
                    </div>
                    <div className="signup-progress-track">
                        <div
                            className="signup-progress-fill"
                            style={{ width: step === "form" ? "50%" : "100%" }}
                        />
                    </div>
                </div>

                {step === "form" && (
                    <div className="signup-step-animate">
                        <div className="signup-gift-pill">
                            Sign up today and unlock your first-order reward 🎁
                        </div>

                        <h1 className="signup-heading">
                            {firstName ? `Nice to meet you, ${firstName}.` : "Join the crew."}
                        </h1>
                        <p className="signup-subheading">Your style starts here.</p>

                        {/* Quick Google Option at Top */}
                        <GoogleLoginButton onSuccess={handleGoogleSuccess} disabled={loading} />
                        <div className="signup-google-caption">One tap. Nothing to remember.</div>

                        <div className="auth-divider">or sign up with your details</div>

                        <form onSubmit={handleFormSubmit} noValidate>
                            {/* Full Name */}
                            <div className="mb-3">
                                <label htmlFor="signup-name" className="auth-form-label">
                                    Full name
                                </label>
                                <input
                                    id="signup-name"
                                    type="text"
                                    className="auth-input"
                                    placeholder="What should we call you?"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>

                            {/* Email Address */}
                            <div className="mb-3">
                                <label htmlFor="signup-email" className="auth-form-label">
                                    Email address
                                </label>
                                <input
                                    id="signup-email"
                                    type="email"
                                    className="auth-input"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setServerFriendlyError("");
                                        setEmail(e.target.value);
                                    }}
                                    required
                                />
                                <div className="signup-helper-line">
                                    We&apos;ll send your order updates here.
                                </div>
                                {cleanEmail.length > 0 && !emailValid && (
                                    <div className="signup-friendly-msg">
                                        That email looks a bit off.
                                    </div>
                                )}
                                {emailSuggestion && (
                                    <div className="signup-friendly-msg">
                                        <span>
                                            Did you mean <strong>{emailSuggestion.suggestedDomain}</strong>?
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-dark rounded-pill px-2 py-0 fw-bold"
                                            style={{ fontSize: "11px" }}
                                            onClick={() => setEmail(emailSuggestion.correctedEmail)}
                                        >
                                            Fix it
                                        </button>
                                    </div>
                                )}
                                {serverFriendlyError && (
                                    <div className="signup-friendly-msg">
                                        <span>{serverFriendlyError}</span>
                                        <Link to="/login" className="fw-bold text-dark">
                                            Sign in
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Number (+91) */}
                            <div className="mb-3">
                                <label htmlFor="signup-phone" className="auth-form-label">
                                    Mobile number
                                </label>
                                <div className="auth-input-group">
                                    <select
                                        className="auth-country-select"
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        aria-label="Country code"
                                    >
                                        {COUNTRY_CODES.map((c) => (
                                            <option key={c.code} value={c.code}>
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        id="signup-phone"
                                        type="tel"
                                        className="auth-input"
                                        placeholder="10-digit number"
                                        value={phoneDigits}
                                        onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ""))}
                                        maxLength={15}
                                        required
                                    />
                                </div>
                                <div className="signup-helper-line">
                                    For delivery updates only. No spam, ever.
                                </div>
                                {phoneDigits.length > 0 && !phoneValidation.valid && (
                                    <div className="signup-friendly-msg">
                                        {countryCode === "+91"
                                            ? "We need all 10 digits."
                                            : phoneValidation.message}
                                    </div>
                                )}
                            </div>

                            {/* Password */}
                            <div className="mb-3">
                                <label htmlFor="signup-pass" className="auth-form-label">
                                    Password
                                </label>
                                <div className="spare-input-wrap">
                                    <input
                                        id="signup-pass"
                                        type={showPass ? "text" : "password"}
                                        className="spare-input"
                                        placeholder="Create a password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
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
                            </div>

                            {/* Confirm Password */}
                            <div className="mb-2">
                                <label htmlFor="signup-confirm" className="auth-form-label">
                                    Confirm password
                                </label>
                                <div className="spare-input-wrap">
                                    <input
                                        id="signup-confirm"
                                        type={showConfirm ? "text" : "password"}
                                        className="spare-input"
                                        placeholder="Re-enter password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <div className="spare-input-icons">
                                        {passwordsMatch && (
                                            <span className="spare-match-check" title="Matches">
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
                                    <div className="signup-friendly-msg">
                                        These two don&apos;t match yet.
                                    </div>
                                )}
                            </div>

                            {/* Strength Meter */}
                            <div className="spare-strength-wrap">
                                <div className="spare-strength-header">
                                    <span className="text-muted">Password strength</span>
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
                                disabled={!allFieldsValid || loading}
                            >
                                {loading ? "Sending verification code..." : "Create my BizBill account"}
                            </button>
                        </form>

                        <p className="signup-legal-line">
                            By joining, you agree to our Terms and Privacy Policy.
                        </p>

                        <div className="auth-create-small-row">
                            <span>Already part of the crew?</span>
                            <Link to="/login" className="auth-create-small-btn">
                                Sign in
                            </Link>
                        </div>

                        <div className="signup-trust-line">
                            Your details stay safe with us 🔒
                        </div>
                    </div>
                )}

                {step === "otp" && (
                    <div className="signup-step-animate">
                        <h1 className="signup-heading">Let&apos;s make sure it&apos;s really you.</h1>
                        <p className="signup-subheading">
                            We sent a 6-digit code to <strong>{cleanEmail}</strong>.
                            <br />
                            <small className="text-muted">
                                Check your Spam folder, or change your email if there&apos;s a typo.
                            </small>
                        </p>

                        <form onSubmit={handleVerifyOtp}>
                            <div className="otp-boxes-row">
                                {otpDigits.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={(el) => (otpRefs.current[idx] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        className="otp-single-box"
                                        value={digit}
                                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                        aria-label={`Digit ${idx + 1}`}
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                className="spare-submit-btn"
                                disabled={otpDigits.join("").length !== 6 || loading}
                            >
                                {loading ? "Verifying..." : "Verify & Join"}
                            </button>
                        </form>

                        <div className="auth-create-small-row mt-3">
                            <span>Didn&apos;t get it?</span>
                            {resendSeconds > 0 ? (
                                <span className="fw-bold text-muted">
                                    Resend in {resendSeconds}s
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    className="auth-create-small-btn"
                                    onClick={handleResend}
                                    disabled={loading}
                                >
                                    Resend code
                                </button>
                            )}
                        </div>

                        <div className="auth-create-small-row">
                            <button
                                type="button"
                                className="auth-create-small-btn"
                                onClick={() => setStep("form")}
                            >
                                ← Wrong email? Change it
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateAccount;
