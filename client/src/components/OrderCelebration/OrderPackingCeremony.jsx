import { useEffect, useState } from "react";
import { assets } from "../../assets/assets.js";
import "./OrderPackingCeremony.css";

const OrderPackingCeremony = ({ orderNumber, onComplete }) => {
    // 'stamp' -> 'packing' -> 'fadeout'
    const [phase, setPhase] = useState("stamp");
    const [lidsClosed, setLidsClosed] = useState(false);

    useEffect(() => {
        const packTimer = setTimeout(() => {
            setPhase("packing");
        }, 1750);

        const closeTimer = setTimeout(() => {
            setLidsClosed(true);
        }, 3250);

        const fadeTimer = setTimeout(() => {
            setPhase("fadeout");
        }, 4100);

        const doneTimer = setTimeout(() => {
            if (onComplete) onComplete();
        }, 4500);

        return () => {
            clearTimeout(packTimer);
            clearTimeout(closeTimer);
            clearTimeout(fadeTimer);
            clearTimeout(doneTimer);
        };
    }, [onComplete]);

    return (
        <div
            className={`vantage-ceremony-overlay ${
                phase === "stamp" ? "phase-stamp" : phase === "fadeout" ? "phase-fadeout" : ""
            }`}
        >
            <button
                type="button"
                className="ceremony-skip-btn"
                onClick={onComplete}
            >
                Skip ›
            </button>

            {phase === "stamp" ? (
                <div className="stamp-stage">
                    <div className="stamp-order-text">ORDER IN PROCESS...</div>
                    {orderNumber && (
                        <div className="stamp-order-num">{orderNumber}</div>
                    )}

                    {/* Heavy Industrial V Stamp */}
                    <div className="vantage-stamp-slam">
                        <div className="vantage-stamp-ring">
                            <img src={assets.favicon} alt="Vantage Stamp" />
                            <span className="stamp-approved-ribbon">APPROVED</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="packing-stage">
                    {/* Arched Retro Typography */}
                    <svg className="packing-arch-svg" viewBox="0 0 380 95" aria-hidden="true">
                        <defs>
                            <path id="vantageArchPath" d="M 25,85 Q 190,10 355,85" />
                        </defs>
                        <text className="packing-arch-text">
                            <textPath href="#vantageArchPath" startOffset="50%" textAnchor="middle">
                                WE&apos;RE PACKING YOUR GOODS
                            </textPath>
                        </text>
                    </svg>

                    {/* Flying Clothing Goods (Stop-Motion) */}
                    <div className="packing-goods-stage">
                        <span className="flying-good good-1">👕</span>
                        <span className="flying-good good-2">🧥</span>
                        <span className="flying-good good-3">👖</span>
                        <span className="flying-good good-4">👟</span>

                        {/* Hand-Drawn Stylized Vantage Box */}
                        <div className={`vantage-box-wrap ${lidsClosed ? "lids-closed" : ""}`}>
                            <div className="vantage-box-flap flap-left" />
                            <div className="vantage-box-flap flap-right" />
                            <div className="vantage-box-body">
                                <div className="vantage-box-tape" />
                                <div className="vantage-box-crest">
                                    <img src={assets.favicon} alt="V" />
                                </div>
                                <div className="vantage-box-label">VANTAGE HOUSE</div>
                            </div>
                        </div>
                    </div>

                    <div className="packing-sub-note">
                        {lidsClosed ? "Sealed with care ✔" : "Hand-checking every piece..."}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderPackingCeremony;
