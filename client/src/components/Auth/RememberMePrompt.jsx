import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContextDefinition.js";
import { assets } from "../../assets/assets.js";
import "./RememberMePrompt.css";

const RememberMePrompt = () => {
    const { auth, setRememberPreference } = useContext(AppContext);
    const [visible, setVisible] = useState(false);

    const isReadyUser = Boolean(auth?.token && auth?.passwordSet !== false);
    const userScope = auth?.email || auth?.userId || "user";
    const askedKey = `vantage_remember_asked_${userScope}`;

    useEffect(() => {
        if (!isReadyUser) {
            setVisible(false);
            return;
        }
        if (localStorage.getItem(askedKey) === "1") {
            return;
        }
        const timer = setTimeout(() => {
            setVisible(true);
        }, 900);
        return () => clearTimeout(timer);
    }, [isReadyUser, askedKey]);

    const handleChoice = (remember) => {
        localStorage.setItem(askedKey, "1");
        setRememberPreference(remember);
        setVisible(false);
        window.dispatchEvent(new CustomEvent("vantage:remember-resolved"));
    };

    if (!visible) return null;

    return (
        <div className="vantage-remember-backdrop">
            <div className="vantage-remember-card" role="dialog" aria-label="Remember me preference">
                <div className="vantage-remember-head">
                    <img src={assets.appLogo} alt="The Vantage House" />
                    <div>
                        <h5>Stay signed in?</h5>
                        <p>
                            Remember your account on this device so you don&apos;t have to sign in every time you return.
                        </p>
                    </div>
                </div>

                <div className="vantage-remember-actions">
                    <button
                        type="button"
                        className="vantage-remember-yes"
                        onClick={() => handleChoice(true)}
                    >
                        Yes, remember me
                    </button>
                    <button
                        type="button"
                        className="vantage-remember-no"
                        onClick={() => handleChoice(false)}
                    >
                        Not now (this session only)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RememberMePrompt;
