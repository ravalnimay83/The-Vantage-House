import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../../context/AppContextDefinition.js";
import { assets } from "../../assets/assets.js";
import { openVantageAi } from "../VantageAi/VantageAiDrawer.jsx";
import "./PixieIntroPopup.css";

const QUICK_CHIPS = [
    "Outfit under ₹2000",
    "Campus fit",
    "Help with size",
];

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const PixieIntroPopup = () => {
    const { auth } = useContext(AppContext);
    // 'hidden' | 'full' | 'flying' | 'bubble'
    const [mode, setMode] = useState("hidden");
    const touchStartY = useRef(null);
    const autoCloseRef = useRef(null);

    const isReadyUser = Boolean(auth?.token && auth?.passwordSet !== false);
    const userScope = auth?.email || auth?.userId || "user";
    const firstName = auth?.name ? auth.name.split(" ")[0] : null;
    const introKey = `pixie_intro_seen_${userScope}`;
    const lastDayKey = `pixie_last_day_${userScope}`;
    const rememberAskedKey = `vantage_remember_asked_${userScope}`;

    const closeWithFly = useCallback(
        (promptToSend = null) => {
            if (mode !== "full") return;
            if (autoCloseRef.current) clearTimeout(autoCloseRef.current);

            localStorage.setItem(introKey, "1");
            localStorage.setItem(lastDayKey, getTodayKey());
            setMode("flying");

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent("pixie:landed"));
                setMode("hidden");
                if (typeof promptToSend === "string") {
                    openVantageAi(promptToSend);
                }
            }, 460);
        },
        [mode, introKey, lastDayKey]
    );

    useEffect(() => {
        if (!isReadyUser) return;

        const checkAndShow = () => {
            // Wait if RememberMePrompt hasn't been answered yet (avoid stacking popups)
            if (localStorage.getItem(rememberAskedKey) !== "1") return;

            const introSeen = localStorage.getItem(introKey) === "1";
            const today = getTodayKey();
            const lastDay = localStorage.getItem(lastDayKey);

            if (!introSeen) {
                setMode("full");
            } else if (lastDay && lastDay !== today) {
                localStorage.setItem(lastDayKey, today);
                setMode("bubble");
                setTimeout(() => setMode("hidden"), 4000);
            } else if (!lastDay) {
                localStorage.setItem(lastDayKey, today);
            }
        };

        const showTimer = setTimeout(checkAndShow, 550);
        const onRememberDone = () => {
            setTimeout(checkAndShow, 350);
        };
        window.addEventListener("vantage:remember-resolved", onRememberDone);

        return () => {
            clearTimeout(showTimer);
            window.removeEventListener("vantage:remember-resolved", onRememberDone);
        };
    }, [isReadyUser, introKey, lastDayKey, rememberAskedKey]);

    // Auto-close after 8 seconds + Esc key + scroll lock
    useEffect(() => {
        if (mode !== "full") {
            document.body.style.overflow = "";
            return;
        }
        document.body.style.overflow = "hidden";

        autoCloseRef.current = setTimeout(() => {
            closeWithFly(null);
        }, 8000);

        const onKeyDown = (e) => {
            if (e.key === "Escape") closeWithFly(null);
        };
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = "";
            if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [mode, closeWithFly]);

    if (mode === "hidden") return null;

    if (mode === "bubble") {
        return (
            <div
                className="pixie-returning-bubble"
                onClick={() => {
                    setMode("hidden");
                    openVantageAi();
                }}
                role="button"
                tabIndex={0}
            >
                <img src={assets.pixieIcon} alt="Pixie" />
                <span>
                    {firstName ? `Hey ${firstName}! Need a fresh fit today? ✨` : "Need a fresh fit today? ✨"}
                </span>
            </div>
        );
    }

    const greeting = firstName
        ? `Hi ${firstName}! I'm Pixie, the stylist at The Vantage House.`
        : "Hello there! I'm Pixie, the stylist at The Vantage House.";

    return (
        <div
            className={`pixie-intro-backdrop ${mode === "flying" ? "closing" : ""}`}
            onClick={() => closeWithFly(null)}
            onTouchStart={(e) => {
                touchStartY.current = e.touches?.[0]?.clientY ?? null;
            }}
            onTouchEnd={(e) => {
                const endY = e.changedTouches?.[0]?.clientY ?? null;
                if (touchStartY.current !== null && endY !== null && endY - touchStartY.current > 50) {
                    closeWithFly(null);
                }
            }}
            role="dialog"
            aria-label="Meet Pixie, your Vantage House stylist"
        >
            <div
                className={`pixie-intro-stage ${mode === "flying" ? "fly-to-tab" : ""}`}
                onClick={() => closeWithFly(null)}
            >
                {/* Speech Bubble */}
                <div className="pixie-speech-bubble" onClick={(e) => e.stopPropagation()}>
                    <p className="pixie-bubble-line1">{greeting}</p>
                    <p className="pixie-bubble-line2">Tell me the occasion, and I&apos;ll sort the fit.</p>
                    <span className="pixie-bubble-tail" />
                </div>

                {/* Sticker + Twinkling Sparkles */}
                <div className="pixie-sticker-wrap">
                    <span className="pixie-twinkle t1" aria-hidden="true">✦</span>
                    <span className="pixie-twinkle t2" aria-hidden="true">✦</span>
                    <span className="pixie-twinkle t3" aria-hidden="true">✧</span>
                    <div className="pixie-blink-dot" aria-hidden="true" />
                    <img
                        src={assets.pixieSticker}
                        alt="Pixie, the Vantage House stylist, waving"
                        className="pixie-sticker-img"
                    />
                </div>

                {/* Quick Chips & Say Hello */}
                <div className="pixie-intro-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="pixie-intro-chips">
                        {QUICK_CHIPS.map((chip) => (
                            <button
                                key={chip}
                                type="button"
                                className="pixie-intro-chip"
                                onClick={() => closeWithFly(chip)}
                            >
                                {chip}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="pixie-say-hello-btn"
                        onClick={() => closeWithFly("")}
                    >
                        Say hello
                    </button>
                </div>

                <div className="pixie-tap-hint">Tap anywhere to close</div>
            </div>
        </div>
    );
};

export default PixieIntroPopup;
