import { useEffect, useState } from "react";
import { assets } from "../../assets/assets.js";
import "./ItemLoadingSkeleton.css";

const LOADING_LINES = [
    "Good things take a minute. ✨",
    "Your next favourite fit is loading. 🧥",
    "Worth the wait, promise. 💫",
    "Dressing up the pixels… 🎨",
];

export const ServerWarmupNote = ({ active }) => {
    const [state, setState] = useState("hidden"); // 'hidden' | 'visible' | 'leaving'

    useEffect(() => {
        if (!active) {
            setState("hidden");
            return;
        }
        let leaveTimer;
        let hideTimer;
        const showTimer = setTimeout(() => {
            setState("visible");
            leaveTimer = setTimeout(() => {
                setState("leaving");
                hideTimer = setTimeout(() => setState("hidden"), 300);
            }, 5500);
        }, 2500);

        return () => {
            clearTimeout(showTimer);
            if (leaveTimer) clearTimeout(leaveTimer);
            if (hideTimer) clearTimeout(hideTimer);
        };
    }, [active]);

    if (!active || state === "hidden") return null;

    return (
        <div className={`vh-warmup-note ${state === "leaving" ? "is-leaving" : ""}`}>
            <span>
                Waking up the House — 20–30s is normal on our free server
                <span className="vh-ellipsis" aria-hidden="true">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                </span>{" "}
                ☕✨
            </span>
        </div>
    );
};

export const RotatingLoadingLine = ({ compact = false }) => {
    const [idx, setIdx] = useState(0);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setFading(true);
            setTimeout(() => {
                setIdx((prev) => (prev + 1) % LOADING_LINES.length);
                setFading(false);
            }, 240);
        }, 2400);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`vh-loading-status ${compact ? "is-compact" : ""}`}>
            <span className={`vh-loading-line ${fading ? "is-fading" : ""}`}>
                {LOADING_LINES[idx]}
            </span>
        </div>
    );
};

export const WatermarkSkeletonBox = ({ className = "" }) => (
    <div className={`vh-watermark-box ${className}`}>
        <img
            src={assets.appLogoWatermark}
            alt=""
            aria-hidden="true"
            className="vh-watermark-img"
        />
    </div>
);

export const WatermarkSkeletonGrid = ({ count = 4, showBanner = true, gridClassName = "" }) => (
    <div className="vh-skeleton-wrap">
        {showBanner && <RotatingLoadingLine />}
        <div className={gridClassName || "vh-skeleton-grid"}>
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="vh-skeleton-card">
                    <WatermarkSkeletonBox className="vh-skeleton-media" />
                    <div className="vh-skeleton-body">
                        <div className="vh-skeleton-line w-75" />
                        <div className="vh-skeleton-line w-45" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);
