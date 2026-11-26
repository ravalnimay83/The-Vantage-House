import { useEffect, useState } from "react";
import { assets } from "../../assets/assets.js";
import "./InstallAppPrompt.css";

const InstallAppPrompt = ({ auth }) => {
    const [deferredPrompt, setDeferredPrompt] = useState(() => window.__vantageDeferredPrompt || null);
    const [visible, setVisible] = useState(false);
    const [showManualHint, setShowManualHint] = useState(false);

    const isLoggedIn = Boolean(auth?.token && auth?.passwordSet !== false);
    const userScope = auth?.email || auth?.userId || "user";
    const storageKey = `vantage_install_prompt_seen_${userScope}`;

    useEffect(() => {
        if (window.__vantageDeferredPrompt && !deferredPrompt) {
            setDeferredPrompt(window.__vantageDeferredPrompt);
        }
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            window.__vantageDeferredPrompt = e;
            setDeferredPrompt(e);
        };
        const handleAppInstalled = () => {
            localStorage.setItem(storageKey, "1");
            window.__vantageDeferredPrompt = null;
            setDeferredPrompt(null);
            setVisible(false);
        };
        window.addEventListener("beforeinstallprompt", handleBeforeInstall);
        window.addEventListener("appinstalled", handleAppInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, [storageKey, deferredPrompt]);

    useEffect(() => {
        if (!isLoggedIn) {
            setVisible(false);
            return;
        }
        const isStandalone =
            window.matchMedia?.("(display-mode: standalone)").matches ||
            window.navigator.standalone === true;
        if (isStandalone) return;

        if (localStorage.getItem(storageKey) === "1") return;

        const timer = setTimeout(() => {
            setVisible(true);
        }, 1600);

        return () => clearTimeout(timer);
    }, [isLoggedIn, storageKey]);

    const dismiss = () => {
        localStorage.setItem(storageKey, "1");
        setVisible(false);
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            setDeferredPrompt(null);
            if (choice?.outcome === "accepted") {
                localStorage.setItem(storageKey, "1");
                setVisible(false);
            }
        } else {
            setShowManualHint(true);
        }
    };

    if (!visible) return null;

    return (
        <div className="vantage-install-popup" role="dialog" aria-label="Add Vantage House App">
            <button
                type="button"
                className="vantage-install-close"
                onClick={dismiss}
                aria-label="Close"
            >
                ✕
            </button>

            <div className="vantage-install-header">
                <div className="vantage-install-crest">
                    <img src={assets.monogram} alt="The Vantage House" />
                </div>
                <div className="min-width-0">
                    <h6 className="vantage-install-title">Add The Vantage House to your apps</h6>
                    <p className="vantage-install-copy">
                        For a better experience — 1-tap launch &amp; live order tracking.
                    </p>
                </div>
            </div>

            {showManualHint && (
                <div className="vantage-install-hint">
                    Tap your browser menu (<strong>⋮</strong> or <strong>Share ⎙</strong>) →{" "}
                    <strong>&ldquo;Install app&rdquo;</strong> / <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                </div>
            )}

            <div className="vantage-install-actions">
                <button
                    type="button"
                    className="vantage-install-primary"
                    onClick={handleInstallClick}
                >
                    Add to my Apps
                </button>
                <button
                    type="button"
                    className="vantage-install-secondary"
                    onClick={dismiss}
                >
                    Continue on browser
                </button>
            </div>
        </div>
    );
};

export default InstallAppPrompt;
