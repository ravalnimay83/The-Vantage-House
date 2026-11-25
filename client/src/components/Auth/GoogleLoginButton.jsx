import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { googleLogin } from "../../Service/AuthService.js";
import "./GoogleLoginButton.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const isPrivateLanIpOrigin = () => {
    if (typeof window === "undefined") return false;
    const host = window.location.hostname;
    const isPrivateIp =
        /^192\.168\./.test(host) ||
        /^10\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    return isPrivateIp && window.location.protocol === "http:";
};

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#EA4335" d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.31 0 3.26 2.69 1.28 6.6l3.66 2.84C5.8 6.86 8.64 5 12 5z" />
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3.01h3.86c2.26-2.09 3.56-5.17 3.56-8.83z" />
        <path fill="#FBBC05" d="M4.94 14.56A7.2 7.2 0 0 1 4.56 12c0-.89.15-1.76.38-2.56V6.6H1.28A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.66-2.84z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3.01c-1.08.72-2.45 1.16-4.07 1.16-3.36 0-6.2-1.86-7.06-4.68l-3.66 2.84C3.26 21.31 7.31 24 12 24z" />
    </svg>
);

const GoogleLoginButton = ({ onSuccess, disabled }) => {
    const gsiButtonRef = useRef(null);
    const wrapperRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [gsiReady, setGsiReady] = useState(false);
    const [showHint, setShowHint] = useState(false);

    const lanIpBlocked = isPrivateLanIpOrigin();

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID || lanIpBlocked) return;

        const handleCredentialResponse = async (response) => {
            if (!response?.credential) return;
            setLoading(true);
            try {
                const res = await googleLogin({ credential: response.credential });
                if (res.status === 200 && res.data) {
                    toast.success(`Welcome, ${res.data.name || res.data.email}!`);
                    onSuccess(res.data);
                }
            } catch (err) {
                const msg = err.response?.data?.message || "Google sign-in failed.";
                toast.error(msg);
                console.error("Google login error:", err);
            } finally {
                setLoading(false);
            }
        };

        const renderGsiButton = () => {
            if (!window.google?.accounts?.id || !gsiButtonRef.current) return;
            const containerWidth = wrapperRef.current?.clientWidth || 320;
            const targetWidth = Math.max(220, Math.min(containerWidth, 380));

            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
            });
            gsiButtonRef.current.innerHTML = "";
            window.google.accounts.id.renderButton(gsiButtonRef.current, {
                theme: "outline",
                size: "large",
                shape: "pill",
                width: targetWidth,
                text: "continue_with",
                logo_alignment: "center",
            });
            setGsiReady(true);
        };

        if (window.google?.accounts?.id) {
            renderGsiButton();
        } else {
            const scriptId = "google-gsi-script";
            let script = document.getElementById(scriptId);
            if (!script) {
                script = document.createElement("script");
                script.id = scriptId;
                script.src = "https://accounts.google.com/gsi/client";
                script.async = true;
                script.defer = true;
                script.onload = renderGsiButton;
                document.body.appendChild(script);
            } else {
                script.addEventListener("load", renderGsiButton);
                return () => script.removeEventListener("load", renderGsiButton);
            }
        }
    }, [onSuccess, lanIpBlocked]);

    return (
        <div ref={wrapperRef} className="google-auth-wrapper">
            {GOOGLE_CLIENT_ID && !lanIpBlocked && (
                <div
                    ref={gsiButtonRef}
                    className={gsiReady ? "google-gsi-container" : "d-none"}
                />
            )}

            {(!GOOGLE_CLIENT_ID || lanIpBlocked || !gsiReady) && (
                <button
                    type="button"
                    className="google-custom-btn"
                    disabled={disabled || loading}
                    onClick={() => {
                        setShowHint((prev) => !prev);
                        if (lanIpBlocked) {
                            toast.error("Google OAuth blocks raw http://192.168.x.x IPs. Use Email/Mobile or your HTTPS tunnel.");
                        } else if (!GOOGLE_CLIENT_ID) {
                            toast("Add VITE_GOOGLE_CLIENT_ID in client/.env to enable live Google Sign-In.", {
                                icon: "🔑",
                            });
                        }
                    }}
                >
                    <GoogleIcon />
                    <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
                </button>
            )}

            {loading && gsiReady && <small className="text-muted">Signing in with Google...</small>}

            {showHint && lanIpBlocked && (
                <div className="google-config-hint">
                    <strong>Why Google blocks Wi-Fi IP ({window.location.hostname}):</strong> Google OAuth 2.0 does not allow raw <code>http://192.168.x.x</code> origins (Error 400).
                    <br />
                    Use your <code>https://...trycloudflare.com</code> link or sign in with <strong>Email / Mobile</strong> above.
                </div>
            )}

            {showHint && !lanIpBlocked && !GOOGLE_CLIENT_ID && (
                <div className="google-config-hint">
                    <strong>Google OAuth Setup:</strong> Add <code>VITE_GOOGLE_CLIENT_ID=your-client-id</code> in <code>client/.env</code> to activate live Google Sign-In.
                </div>
            )}
        </div>
    );
};

export default GoogleLoginButton;
