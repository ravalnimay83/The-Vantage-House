import { useCallback, useEffect, useRef, useState } from "react";
import { assets } from "../../assets/assets.js";
import "./SplashScreen.css";

const STYLE_EMOJIS = [
    { icon: "👕", label: "Tees" },
    { icon: "🧥", label: "Outerwear" },
    { icon: "👟", label: "Sneakers" },
    { icon: "🧢", label: "Headwear" },
    { icon: "🕶️", label: "Shades" },
    { icon: "👗", label: "Fits" },
    { icon: "👜", label: "Carry" },
    { icon: "👖", label: "Denim" },
    { icon: "✨", label: "Drops" },
];

const MARQUEE_EMOJIS = [
    "👕", "🧥", "👟", "🧢", "🕶️", "👗", "👜", "👖", "🥾", "🧣", "👑", "✨",
    "👕", "🧥", "👟", "🧢", "🕶️", "👗", "👜", "👖", "🥾", "🧣", "👑", "✨",
];

const DEFAULT_SUBTITLE = "Fresh drops · Everyday fits · Zero effort";
const SPLASH_EVENT = "bizbill:splash";
const SPLASH_HIDE_EVENT = "bizbill:splash-hide";

export const triggerSplash = (subtitle = DEFAULT_SUBTITLE) => {
    window.dispatchEvent(new CustomEvent(SPLASH_EVENT, { detail: { subtitle } }));
};

export const hideSplash = () => {
    window.dispatchEvent(new CustomEvent(SPLASH_HIDE_EVENT));
};

const SplashScreen = ({ onComplete }) => {
    const [visible, setVisible] = useState(true);
    const [fadingOut, setFadingOut] = useState(false);
    const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
    const [emojiIndex, setEmojiIndex] = useState(0);
    const [runKey, setRunKey] = useState(0);
    const timersRef = useRef({ fade: null, done: null });

    const startSplashCycle = useCallback(
        (nextSubtitle) => {
            if (timersRef.current.fade) clearTimeout(timersRef.current.fade);
            if (timersRef.current.done) clearTimeout(timersRef.current.done);

            setSubtitle(nextSubtitle || DEFAULT_SUBTITLE);
            setFadingOut(false);
            setVisible(true);
            setRunKey((k) => k + 1);

            timersRef.current.fade = setTimeout(() => {
                setFadingOut(true);
            }, 3100);

            timersRef.current.done = setTimeout(() => {
                setVisible(false);
                if (onComplete) onComplete();
            }, 3550);
        },
        [onComplete]
    );

    useEffect(() => {
        startSplashCycle(DEFAULT_SUBTITLE);

        const handleTrigger = (e) => {
            startSplashCycle(e.detail?.subtitle || DEFAULT_SUBTITLE);
        };
        const handleHide = () => {
            if (timersRef.current.fade) clearTimeout(timersRef.current.fade);
            if (timersRef.current.done) clearTimeout(timersRef.current.done);
            setVisible(false);
            setFadingOut(false);
        };

        window.addEventListener(SPLASH_EVENT, handleTrigger);
        window.addEventListener(SPLASH_HIDE_EVENT, handleHide);
        return () => {
            window.removeEventListener(SPLASH_EVENT, handleTrigger);
            window.removeEventListener(SPLASH_HIDE_EVENT, handleHide);
            if (timersRef.current.fade) clearTimeout(timersRef.current.fade);
            if (timersRef.current.done) clearTimeout(timersRef.current.done);
        };
    }, [startSplashCycle]);

    useEffect(() => {
        if (!visible) return;
        const roll = setInterval(() => {
            setEmojiIndex((prev) => (prev + 1) % STYLE_EMOJIS.length);
        }, 380);
        return () => clearInterval(roll);
    }, [visible]);

    if (!visible) return null;

    const currentEmoji = STYLE_EMOJIS[emojiIndex];

    return (
        <div className={`splash-overlay ${fadingOut ? "fading-out" : ""}`}>
            <div className="splash-ambient-glow" />

            <div className="splash-center-stage">
                {/* Rolling Emoji Spotlight */}
                <div className="splash-emoji-stage">
                    <div key={emojiIndex} className="splash-emoji-roller">
                        <span className="splash-emoji-main" role="img" aria-label={currentEmoji.label}>
                            {currentEmoji.icon}
                        </span>
                    </div>
                    <div className="splash-emoji-chip">{currentEmoji.label}</div>
                </div>

                {/* Rolling Clothing & Styling Marquee */}
                <div className="splash-marquee-wrap" aria-hidden="true">
                    <div className="splash-marquee-track">
                        {MARQUEE_EMOJIS.map((em, idx) => (
                            <span key={idx} className="splash-marquee-item">
                                {em}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Awesome Tagline */}
                <h1 className="splash-headline">Your style. Your rules.</h1>
                <p className="splash-tagline">{subtitle}</p>

                {/* Smooth 3.5s Progress Track */}
                <div className="splash-progress-track">
                    <div key={runKey} className="splash-progress-fill" />
                </div>
            </div>

            {/* Static Brand Logo at the Bottom */}
            <div className="splash-static-footer">
                <div className="splash-static-logo-box">
                    <img src={assets.monogram} alt="The Vantage House" />
                </div>
                <div className="splash-static-brand-group">
                    <span className="splash-static-brand">THE VANTAGE HOUSE</span>
                    <span className="splash-static-estd">ESTD 2024 · QUALITY APPAREL</span>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
