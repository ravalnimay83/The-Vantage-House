import './Login.css';
import { useCallback, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContextDefinition.js";
import { triggerSplash } from "../../components/Splash/SplashScreen.jsx";
import {
    checkIdentifier,
    login,
    register,
    sendForgotPasswordCode,
    verifyResetCode,
    resetPassword,
} from "../../Service/AuthService.js";
import {
    COUNTRY_CODES,
    getEmailTypoSuggestion,
    isPhoneLike,
    isValidEmail,
    validatePhoneDigits,
} from "../../components/Auth/authValidation.js";
import GoogleLoginButton from "../../components/Auth/GoogleLoginButton.jsx";
import { assets } from "../../assets/assets.js";

const Login = ({ initialMode = "identifier" }) => {
    const { setAuthData } = useContext(AppContext);
    const navigate = useNavigate();

    // step: 'identifier' | 'signin' | 'signup' | 'forgot-email' | 'forgot-otp' | 'forgot-reset'
    const [step, setStep] = useState(initialMode === "signup" ? "signup" : "identifier");
    const [loading, setLoading] = useState(false);

    // Step 1 identifier & country code
    const [identifierInput, setIdentifierInput] = useState("");
    const [countryCode, setCountryCode] = useState("+91");
    const [resolvedLoginId, setResolvedLoginId] = useState("");
    const [pendingPrefill, setPendingPrefill] = useState({ email: "", phone: "" });
    const [fieldError, setFieldError] = useState("");

    const emailSuggestion = !isPhoneLike(identifierInput)
        ? getEmailTypoSuggestion(identifierInput)
        : null;

    // Sign In / Sign Up form state
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        password: "",
        role: "ROLE_USER",
    });

    // Forgot Password state
    const [resetEmail, setResetEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        setStep(initialMode === "signup" ? "signup" : "identifier");
        setFieldError("");
    }, [initialMode]);

    const showCountrySelector = isPhoneLike(identifierInput);

    const onChangeHandler = (e) => {
        const { name, value } = e.target;
        setFieldError("");
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAuthSuccess = useCallback(
        (authResponse) => {
            setAuthData(authResponse);
            triggerSplash(
                authResponse?.passwordSet === false
                    ? "Opening your styling studio..."
                    : "Signing you in..."
            );
            if (authResponse?.passwordSet === false) {
                navigate("/create-spare-key", { replace: true });
            } else {
                navigate("/dashboard");
            }
        },
        [setAuthData, navigate]
    );

    // Step 1: Validate email or phone with country code, then check existence
    const handleContinue = async (e) => {
        e.preventDefault();
        const raw = identifierInput.trim();
        if (!raw) {
            setFieldError("Please enter your email or mobile number.");
            return;
        }

        let finalIdentifier = raw;
        let detectedPhone = "";
        let detectedEmail = "";

        if (isPhoneLike(raw)) {
            const digitsOnly = raw.startsWith("+")
                ? raw.replace(countryCode, "").replace(/\D/g, "")
                : raw.replace(/\D/g, "");
            const check = validatePhoneDigits(digitsOnly, countryCode);
            if (!check.valid) {
                setFieldError(check.message);
                return;
            }
            finalIdentifier = check.formatted;
            detectedPhone = digitsOnly;
        } else {
            if (!isValidEmail(raw)) {
                setFieldError("Please enter a valid email address (e.g. name@example.com).");
                return;
            }
            detectedEmail = raw;
        }

        setFieldError("");
        setLoading(true);
        try {
            const res = await checkIdentifier(finalIdentifier);
            setResolvedLoginId(finalIdentifier);
            setPendingPrefill({ email: detectedEmail, phone: detectedPhone });
            if (res.data?.exists) {
                setStep("signin");
            } else {
                setStep("not-found");
            }
        } catch (error) {
            const msg = error.response?.data?.message || "Unable to verify account.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Step 2a: Sign In with password
    const handleSignIn = async (e) => {
        e.preventDefault();
        const loginId = resolvedLoginId || identifierInput.trim();
        if (!formData.password) {
            setFieldError("Please enter your password.");
            return;
        }
        setLoading(true);
        try {
            const response = await login({
                identifier: loginId,
                password: formData.password,
            });
            if (response.status === 200) {
                toast.success(`Welcome back, ${response.data.name || response.data.email || loginId}!`);
                handleAuthSuccess(response.data);
            }
        } catch (error) {
            const msg = error.response?.data?.message || "Incorrect password. Please try again.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Step 2b: Create Account with strict email & phone validation
    const handleSignUp = async (e) => {
        e.preventDefault();
        const cleanName = formData.name.trim();
        const cleanEmail = formData.email.trim();
        const cleanPhoneDigits = formData.phoneNumber.replace(/\D/g, "");

        if (!cleanName) {
            setFieldError("Please enter your full name.");
            return;
        }
        if (!cleanEmail && !cleanPhoneDigits) {
            setFieldError("Please enter an email address or a mobile number.");
            return;
        }
        if (cleanEmail && !isValidEmail(cleanEmail)) {
            setFieldError("Please enter a valid email address.");
            return;
        }
        let formattedPhone = null;
        if (cleanPhoneDigits) {
            const phoneCheck = validatePhoneDigits(cleanPhoneDigits, countryCode);
            if (!phoneCheck.valid) {
                setFieldError(phoneCheck.message);
                return;
            }
            formattedPhone = phoneCheck.formatted;
        }
        if (!formData.password || formData.password.length < 4) {
            setFieldError("Password must be at least 4 characters.");
            return;
        }

        setFieldError("");
        setLoading(true);
        try {
            await register({
                name: cleanName,
                email: cleanEmail || null,
                phoneNumber: formattedPhone,
                password: formData.password,
                role: formData.role,
            });

            const loginIdentifier = cleanEmail || formattedPhone;
            const loginRes = await login({
                identifier: loginIdentifier,
                password: formData.password,
            });
            if (loginRes.status === 200) {
                toast.success("Account created! Welcome to BizBill.");
                handleAuthSuccess(loginRes.data);
            } else {
                toast.success("Account created! Please sign in.");
                setResolvedLoginId(loginIdentifier);
                setStep("signin");
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.message || "Unable to create account.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Forgot Password Step 1: Send verification code to email
    const handleOpenForgotPassword = () => {
        setFieldError("");
        const currentId = resolvedLoginId || identifierInput.trim();
        setResetEmail(isValidEmail(currentId) ? currentId : "");
        setOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
        setStep("forgot-email");
    };

    const handleSendResetCode = async (e) => {
        e.preventDefault();
        const clean = resetEmail.trim();
        if (!isValidEmail(clean)) {
            setFieldError("Please enter a valid registered email address.");
            return;
        }
        setFieldError("");
        setLoading(true);
        try {
            const res = await sendForgotPasswordCode(clean);
            toast.success(res.data?.message || `Verification code sent to ${clean}`);
            setStep("forgot-otp");
        } catch (error) {
            const msg = error.response?.data?.message || "Failed to send verification code.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Forgot Password Step 2: Verify OTP code
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const cleanCode = otpCode.trim();
        if (!/^\d{6}$/.test(cleanCode)) {
            setFieldError("Please enter the 6-digit verification code sent to your email.");
            return;
        }
        setFieldError("");
        setLoading(true);
        try {
            await verifyResetCode(resetEmail.trim(), cleanCode);
            toast.success("Code verified! Now set your new password.");
            setStep("forgot-reset");
        } catch (error) {
            const msg = error.response?.data?.message || "Invalid or expired verification code.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Forgot Password Step 3: Set new password & auto Sign In
    const handleResetPasswordAndSignIn = async (e) => {
        e.preventDefault();
        if (newPassword.length < 4) {
            setFieldError("New password must be at least 4 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setFieldError("Passwords do not match.");
            return;
        }
        setFieldError("");
        setLoading(true);
        try {
            const res = await resetPassword({
                email: resetEmail.trim(),
                code: otpCode.trim(),
                newPassword,
                confirmPassword,
            });
            if (res.status === 200 && res.data?.token) {
                toast.success("Password updated! Signing you in...");
                handleAuthSuccess(res.data);
            }
        } catch (error) {
            const msg = error.response?.data?.message || "Failed to reset password.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-wrapper">
            <div className="auth-card">
                <div className="auth-brand-header flex-column align-items-stretch gap-2">
                    <div className="d-flex justify-content-between align-items-center">
                        <img
                            src={assets.monogram}
                            alt="The Vantage House"
                            style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #c8923a" }}
                        />
                        <Link to="/dashboard" className="auth-back-home">
                            <i className="bi bi-arrow-left"></i>
                            Continue as Guest
                        </Link>
                    </div>
                    <div
                        style={{
                            background: "#1a3d29",
                            borderRadius: "14px",
                            padding: "8px 12px",
                            border: "1px solid rgba(200, 146, 58, 0.45)",
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <img
                            src={assets.primaryLogo}
                            alt="The Vantage House Quality Apparel"
                            style={{ width: "100%", maxHeight: 74, objectFit: "contain" }}
                        />
                    </div>
                </div>

                {/* STEP 1: IDENTIFIER (EMAIL OR MOBILE WITH COUNTRY CODE) */}
                {step === "identifier" && (
                    <>
                        <h1 className="auth-title">Sign in or create account</h1>
                        <p className="auth-subtitle">
                            Enter your email address or mobile phone number.
                        </p>

                        <form onSubmit={handleContinue} noValidate>
                            <div className="mb-3">
                                <label htmlFor="identifier" className="auth-form-label">
                                    Email or mobile phone number
                                </label>
                                <div className="auth-input-group">
                                    {showCountrySelector && (
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
                                    )}
                                    <input
                                        type="text"
                                        id="identifier"
                                        name="identifier"
                                        placeholder="Email or 10-digit mobile number"
                                        className={`auth-input ${fieldError ? "is-invalid" : ""}`}
                                        value={identifierInput}
                                        onChange={(e) => {
                                            setFieldError("");
                                            setIdentifierInput(e.target.value);
                                        }}
                                        autoFocus
                                    />
                                </div>
                                {fieldError && <div className="auth-field-error">{fieldError}</div>}
                                {emailSuggestion && (
                                    <div className="mt-2 p-2 rounded-3 bg-warning-subtle border border-warning-subtle d-flex align-items-center justify-content-between gap-2" style={{ fontSize: "12px" }}>
                                        <span className="text-dark fw-semibold">
                                            Did you mean <strong>{emailSuggestion.suggestedDomain}</strong>?
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-dark rounded-pill px-2 py-0 fw-bold"
                                            style={{ fontSize: "11px" }}
                                            onClick={() => {
                                                setIdentifierInput(emailSuggestion.correctedEmail);
                                                setFieldError("");
                                            }}
                                        >
                                            Fix it
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="auth-submit-btn" disabled={loading}>
                                {loading ? "Checking..." : "Continue"}
                            </button>
                        </form>

                        <div className="auth-create-small-row">
                            <span>New to BizBill?</span>
                            <Link to="/signup" className="auth-create-small-btn">
                                Create account
                            </Link>
                        </div>

                        <div className="auth-divider">or</div>
                        <GoogleLoginButton onSuccess={handleAuthSuccess} disabled={loading} />
                    </>
                )}

                {/* STEP 1B: EMAIL / MOBILE NOT REGISTERED */}
                {step === "not-found" && (
                    <>
                        <h1 className="auth-title">
                            {isPhoneLike(identifierInput)
                                ? "We couldn't find that number."
                                : "We couldn't find that email."}
                        </h1>
                        <p className="auth-subtitle">
                            Maybe it&apos;s a typo, or you&apos;re new here.
                        </p>

                        <div className="auth-identifier-pill">
                            <span>
                                <i className="bi bi-envelope-exclamation me-2"></i>
                                {resolvedLoginId}
                            </span>
                            <button
                                type="button"
                                className="auth-change-btn"
                                onClick={() => {
                                    setFieldError("");
                                    setStep("identifier");
                                }}
                            >
                                Edit
                            </button>
                        </div>

                        {emailSuggestion && (
                            <div className="mb-3 p-2 rounded-3 bg-warning-subtle border border-warning-subtle d-flex align-items-center justify-content-between gap-2" style={{ fontSize: "12px" }}>
                                <span className="text-dark fw-semibold">
                                    Did you mean <strong>{emailSuggestion.suggestedDomain}</strong>?
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-dark rounded-pill px-3 py-1 fw-bold"
                                    style={{ fontSize: "11px" }}
                                    onClick={() => {
                                        setIdentifierInput(emailSuggestion.correctedEmail);
                                        setStep("identifier");
                                    }}
                                >
                                    Use {emailSuggestion.suggestedDomain}
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            className="auth-submit-btn"
                            onClick={() =>
                                navigate("/signup", {
                                    state: {
                                        prefillEmail: pendingPrefill.email,
                                        prefillPhone: pendingPrefill.phone,
                                    },
                                })
                            }
                        >
                            Create my account
                        </button>

                        <div className="auth-divider">or</div>
                        <GoogleLoginButton onSuccess={handleAuthSuccess} disabled={loading} />

                        <div className="auth-create-small-row mt-3">
                            <button
                                type="button"
                                className="auth-create-small-btn"
                                onClick={() => {
                                    setFieldError("");
                                    setStep("identifier");
                                }}
                            >
                                Try a different email
                            </button>
                        </div>
                    </>
                )}

                {/* STEP 2A: SIGN IN PASSWORD */}
                {step === "signin" && (
                    <>
                        <h1 className="auth-title">Sign in</h1>
                        <p className="auth-subtitle">Enter your password to access your account.</p>

                        <div className="auth-identifier-pill">
                            <span>
                                <i className="bi bi-person-fill me-2"></i>
                                {resolvedLoginId}
                            </span>
                            <button
                                type="button"
                                className="auth-change-btn"
                                onClick={() => {
                                    setFieldError("");
                                    setFormData((p) => ({ ...p, password: "" }));
                                    setStep("identifier");
                                }}
                            >
                                Change
                            </button>
                        </div>

                        <form onSubmit={handleSignIn} noValidate>
                            <div className="mb-3">
                                <div className="auth-label-row">
                                    <label htmlFor="password" className="auth-form-label">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        className="auth-forgot-link"
                                        onClick={handleOpenForgotPassword}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    id="password"
                                    placeholder="Enter your password"
                                    className={`auth-input ${fieldError ? "is-invalid" : ""}`}
                                    onChange={onChangeHandler}
                                    value={formData.password}
                                    autoFocus
                                    required
                                />
                                {fieldError && <div className="auth-field-error">{fieldError}</div>}
                            </div>

                            <button type="submit" className="auth-submit-btn" disabled={loading}>
                                {loading ? "Signing in..." : "Sign in"}
                            </button>
                        </form>

                        <div className="auth-create-small-row">
                            <span>Want a new account instead?</span>
                            <Link to="/signup" className="auth-create-small-btn">
                                Create account
                            </Link>
                        </div>

                        <div className="auth-divider">or</div>
                        <GoogleLoginButton onSuccess={handleAuthSuccess} disabled={loading} />
                    </>
                )}

                {/* STEP 2B: CREATE ACCOUNT */}
                {step === "signup" && (
                    <>
                        <h1 className="auth-title">Create account</h1>
                        <p className="auth-subtitle">
                            Sign up with your verified email or mobile number.
                        </p>

                        <form onSubmit={handleSignUp} noValidate>
                            <div className="mb-3">
                                <label htmlFor="name" className="auth-form-label">
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    placeholder="First and last name"
                                    className="auth-input"
                                    onChange={onChangeHandler}
                                    value={formData.name}
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="email" className="auth-form-label">
                                    Email Address <small className="text-muted">(recommended for password recovery)</small>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    placeholder="you@example.com"
                                    className="auth-input"
                                    onChange={onChangeHandler}
                                    value={formData.email}
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="phoneNumber" className="auth-form-label">
                                    Mobile Number
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
                                        type="tel"
                                        name="phoneNumber"
                                        id="phoneNumber"
                                        placeholder="10-digit mobile number"
                                        className="auth-input"
                                        onChange={onChangeHandler}
                                        value={formData.phoneNumber}
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label htmlFor="password" className="auth-form-label">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    id="password"
                                    placeholder="At least 4 characters"
                                    className="auth-input"
                                    onChange={onChangeHandler}
                                    value={formData.password}
                                    required
                                />
                            </div>

                            {fieldError && <div className="auth-field-error mb-2">{fieldError}</div>}

                            <button type="submit" className="auth-submit-btn" disabled={loading}>
                                {loading ? "Creating account..." : "Create your BizBill account"}
                            </button>
                        </form>

                        <div className="auth-create-small-row">
                            <span>Already have an account?</span>
                            <button
                                type="button"
                                className="auth-create-small-btn"
                                onClick={() => {
                                    setFieldError("");
                                    setStep("identifier");
                                }}
                            >
                                Sign in
                            </button>
                        </div>

                        <div className="auth-divider">or</div>
                        <GoogleLoginButton onSuccess={handleAuthSuccess} disabled={loading} />
                    </>
                )}

                {/* FORGOT PASSWORD STEP 1: ASK EMAIL */}
                {step === "forgot-email" && (
                    <>
                        <h1 className="auth-title">Password assistance</h1>
                        <p className="auth-subtitle">
                            Enter the email address associated with your BizBill account. We&apos;ll send you a 6-digit verification code.
                        </p>

                        <form onSubmit={handleSendResetCode} noValidate>
                            <div className="mb-3">
                                <label htmlFor="resetEmail" className="auth-form-label">
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    id="resetEmail"
                                    className={`auth-input ${fieldError ? "is-invalid" : ""}`}
                                    placeholder="you@example.com"
                                    value={resetEmail}
                                    onChange={(e) => {
                                        setFieldError("");
                                        setResetEmail(e.target.value);
                                    }}
                                    autoFocus
                                    required
                                />
                                {fieldError && <div className="auth-field-error">{fieldError}</div>}
                            </div>

                            <button type="submit" className="auth-submit-btn" disabled={loading}>
                                {loading ? "Sending code..." : "Send verification code"}
                            </button>
                        </form>

                        <div className="auth-create-small-row">
                            <button
                                type="button"
                                className="auth-create-small-btn"
                                onClick={() => {
                                    setFieldError("");
                                    setStep("signin");
                                }}
                            >
                                Back to Sign in
                            </button>
                        </div>
                    </>
                )}

                {/* FORGOT PASSWORD STEP 2: ENTER VERIFICATION CODE */}
                {step === "forgot-otp" && (
                    <>
                        <h1 className="auth-title">Enter verification code</h1>
                        <p className="auth-subtitle">
                            We sent a 6-digit verification code to <strong>{resetEmail}</strong>.
                        </p>

                        <form onSubmit={handleVerifyOtp} noValidate>
                            <div className="mb-3">
                                <label htmlFor="otpCode" className="auth-form-label">
                                    6-digit code
                                </label>
                                <input
                                    type="text"
                                    id="otpCode"
                                    maxLength={6}
                                    className={`auth-input auth-otp-input ${fieldError ? "is-invalid" : ""}`}
                                    placeholder="000000"
                                    value={otpCode}
                                    onChange={(e) => {
                                        setFieldError("");
                                        setOtpCode(e.target.value.replace(/\D/g, ""));
                                    }}
                                    autoFocus
                                    required
                                />
                                {fieldError && <div className="auth-field-error">{fieldError}</div>}
                            </div>

                            <button type="submit" className="auth-submit-btn" disabled={loading}>
                                {loading ? "Verifying..." : "Verify code"}
                            </button>
                        </form>

                        <div className="auth-create-small-row">
                            <span>Didn&apos;t receive the email?</span>
                            <button
                                type="button"
                                className="auth-create-small-btn"
                                disabled={loading}
                                onClick={handleSendResetCode}
                            >
                                Resend code
                            </button>
                        </div>
                    </>
                )}

                {/* FORGOT PASSWORD STEP 3: NEW PASSWORD & CONFIRM PASSWORD */}
                {step === "forgot-reset" && (
                    <>
                        <h1 className="auth-title">Create new password</h1>
                        <p className="auth-subtitle">
                            Set a new password for <strong>{resetEmail}</strong> to sign in.
                        </p>

                        <form onSubmit={handleResetPasswordAndSignIn} noValidate>
                            <div className="mb-3">
                                <label htmlFor="newPassword" className="auth-form-label">
                                    New password
                                </label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    className="auth-input"
                                    placeholder="At least 4 characters"
                                    value={newPassword}
                                    onChange={(e) => {
                                        setFieldError("");
                                        setNewPassword(e.target.value);
                                    }}
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="confirmPassword" className="auth-form-label">
                                    Confirm new password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    className={`auth-input ${fieldError ? "is-invalid" : ""}`}
                                    placeholder="Re-enter new password"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setFieldError("");
                                        setConfirmPassword(e.target.value);
                                    }}
                                    required
                                />
                                {fieldError && <div className="auth-field-error">{fieldError}</div>}
                            </div>

                            <button type="submit" className="auth-submit-btn" disabled={loading}>
                                {loading ? "Updating password..." : "Set password & Sign in"}
                            </button>
                        </form>
                    </>
                )}

                <p className="auth-terms-note">
                    By continuing, you agree to BizBill&apos;s Conditions of Use and Privacy Notice.
                </p>
            </div>
        </div>
    );
};

export default Login;
