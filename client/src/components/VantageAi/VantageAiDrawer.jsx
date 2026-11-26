import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../../Service/apiConfig.js";
import { AppContext } from "../../context/AppContextDefinition.js";
import { assets } from "../../assets/assets.js";
import "./VantageAiDrawer.css";

const AI_EVENT = "vantage:open-ai";
const AI_CLOSE_EVENT = "vantage:close-ai";

export const openVantageAi = (initialPrompt = "") => {
    window.dispatchEvent(new CustomEvent(AI_EVENT, { detail: { initialPrompt } }));
};

export const closeVantageAi = () => {
    window.dispatchEvent(new CustomEvent(AI_CLOSE_EVENT));
};

const QUICK_PROMPTS = [
    "Suggest a casual club fit ✨",
    "Show items under ₹1500 💸",
    "Track my latest order 📦",
    "Open my bag 🛍️",
];

const CHAT_PLACEHOLDERS = [
    "Whisper your style dream to Pixie... 💭",
    "What’s the vibe today? Pixie’s listening... 🎧",
    "Tell Pixie what to hunt for today...",
];

const INITIAL_MSG = {
    role: "ai",
    text: "Hi! 👋✨ I'm **Pixie**, the stylist at The Vantage House. Tell me the occasion 🧥, ask for budget picks 💸, add items straight to your bag 🛍️, or track your order 📦!",
    items: [],
};

const renderFormattedText = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, lineIdx) => (
        <div key={lineIdx} className={lineIdx > 0 ? "mt-1" : ""}>
            {line.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
                part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={idx}>{part.slice(2, -2)}</strong>
                ) : (
                    <span key={idx}>{part}</span>
                )
            )}
        </div>
    ));
};

const VantageAiDrawer = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { auth, addToCart, clearCart } = useContext(AppContext);
    const isLoggedIn = Boolean(auth?.token && auth?.passwordSet !== false);

    const [open, setOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const [storyOpen, setStoryOpen] = useState(false);
    const [input, setInput] = useState("");
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const [placeholderFading, setPlaceholderFading] = useState(false);
    const [sending, setSending] = useState(false);
    const [addedMap, setAddedMap] = useState({});
    const [messages, setMessages] = useState([INITIAL_MSG]);
    const listEndRef = useRef(null);

    const closeSmoothly = useCallback(() => {
        if (!open || closing) return;
        setClosing(true);
        setTimeout(() => {
            setOpen(false);
            setClosing(false);
        }, 220);
    }, [open, closing]);

    // Smoothly close chat if user taps Home / Shop / Bag / Account on the bottom bar
    useEffect(() => {
        if (open) closeSmoothly();
    }, [location.pathname]);

    useEffect(() => {
        window.addEventListener(AI_CLOSE_EVENT, closeSmoothly);
        return () => window.removeEventListener(AI_CLOSE_EVENT, closeSmoothly);
    }, [closeSmoothly]);

    const sendPrompt = async (promptText) => {
        const clean = (promptText || "").trim();
        if (!clean || sending) return;

        const nextHistory = [...messages, { role: "user", text: clean }];
        setMessages(nextHistory);
        setInput("");
        setSending(true);

        try {
            const token = localStorage.getItem("token") || sessionStorage.getItem("token");
            const res = await axios.post(
                `${API_BASE_URL}/ai/chat`,
                {
                    message: clean,
                    userName: auth?.name || "",
                    history: nextHistory.slice(-8).map((m) => ({ role: m.role, text: m.text })),
                },
                { headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );

            const data = res.data || {};
            const aiMsg = {
                role: "ai",
                text: data.reply || "Got you! ✨",
                items: Array.isArray(data.items) ? data.items : [],
            };
            setMessages((prev) => [...prev, aiMsg]);

            const action = data.action;
            if (action?.type === "ADD_TO_CART" && action.item) {
                addToCart(action.item, 1, action.size || "M");
                toast.success(`Added ${action.item.name} (${action.size || "M"}) to bag`);
            } else if (action?.type === "CLEAR_CART") {
                clearCart();
                toast.success("Bag cleared");
            } else if (action?.type === "NAVIGATE" && action.path) {
                setTimeout(() => {
                    setOpen(false);
                    navigate(action.path);
                }, 700);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: "I couldn't reach the server right now 😅. Give me a second and try again!",
                    items: [],
                },
            ]);
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        const onOpen = (e) => {
            setOpen(true);
            const initial = e.detail?.initialPrompt;
            if (initial && initial.trim()) {
                sendPrompt(initial.trim());
            }
        };
        window.addEventListener(AI_EVENT, onOpen);
        return () => window.removeEventListener(AI_EVENT, onOpen);
    }, []);

    useEffect(() => {
        window.dispatchEvent(new CustomEvent("vantage:ai-state", { detail: { open, typing: sending } }));
    }, [open, sending]);

    useEffect(() => {
        if (open) {
            listEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, sending, open]);

    useEffect(() => {
        if (!open || !isLoggedIn || input) return;
        const interval = setInterval(() => {
            setPlaceholderFading(true);
            setTimeout(() => {
                setPlaceholderIdx((prev) => (prev + 1) % CHAT_PLACEHOLDERS.length);
                setPlaceholderFading(false);
            }, 260);
        }, 3200);
        return () => clearInterval(interval);
    }, [open, isLoggedIn, input]);

    if (!open) return null;

    return (
        <div
            className={`vantage-ai-backdrop ${closing ? "is-closing" : ""}`}
            onClick={closeSmoothly}
        >
            <aside
                className={`vantage-ai-drawer ${closing ? "is-closing" : ""}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Vantage AI Stylist"
            >
                {/* Header + Collapsible Story */}
                <div className="vantage-ai-head-shell">
                    <div className="vantage-ai-head">
                        <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                            <div className="vantage-ai-avatar-wrap">
                                <img
                                    src={isLoggedIn ? assets.pixieSticker : assets.pixieSignInRequired}
                                    alt="Pixie"
                                    className="vantage-ai-avatar"
                                />
                                <span className={`vantage-ai-online-dot ${!isLoggedIn ? "is-locked" : ""}`} />
                            </div>
                            <div className="flex-grow-1 min-w-0">
                                <div className="vantage-ai-title">
                                    <span className="vantage-ai-title-ask">ASK</span>{" "}
                                    <span className="vantage-ai-title-pixie">PIXIE</span>
                                </div>
                                <div className="vantage-ai-sub-row">
                                    <span className="vantage-ai-sub">
                                        {isLoggedIn ? "Vantage House Stylist" : "Club Access Required"}
                                    </span>
                                    <button
                                        type="button"
                                        className={`pixie-story-toggle ${storyOpen ? "is-open" : ""}`}
                                        onClick={() => setStoryOpen((v) => !v)}
                                        aria-expanded={storyOpen}
                                    >
                                        <span>Wanna hear my story?</span>
                                        <span className="pixie-story-caret" aria-hidden="true">▾</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            {isLoggedIn && messages.length > 1 && (
                                <button
                                    type="button"
                                    className="vantage-ai-clear-btn"
                                    onClick={() => setMessages([INITIAL_MSG])}
                                    title="New chat"
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                type="button"
                                className="vantage-ai-close"
                                onClick={closeSmoothly}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div className={`pixie-story-collapse ${storyOpen ? "is-open" : ""}`}>
                        <div className="pixie-story-collapse-inner">
                            <div className="pixie-story-book">
                                <div className="pixie-story-chapter">
                                    ✦ Pixie&apos;s Story ✦
                                </div>
                                <p className="pixie-story-text">
                                    I started out as an old-school CRT monitor tucked away in the back room of The Vantage House—until a late-night spark of fashion inspiration woke me up! Now I wear my green varsity jacket, blast style playlists through my headphones, and spend all day matching you with outfits you&apos;ll actually love.
                                </p>
                                <div className="pixie-story-footer">
                                    <span className="pixie-story-sign">— Pixie, House Stylist</span>
                                    <button
                                        type="button"
                                        className="pixie-story-hide-btn"
                                        onClick={() => setStoryOpen(false)}
                                    >
                                        Close ▲
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {!isLoggedIn ? (
                    <div className="pixie-locked-screen">
                        <div className="pixie-locked-badge">
                            <span className="pixie-locked-dot" />
                            MEMBERS ONLY · ACCESS DENIED
                        </div>

                        <div className="pixie-locked-bubble">
                            <h4>Oh my gosh, I have so much to tell you! ✨</h4>
                            <p>
                                We need to discuss all the latest styles and gossip—but wait, they won&apos;t let me start until you sign in! Quick, log in so we can chat!
                            </p>
                        </div>

                        <div className="pixie-locked-visual-row">
                            <div className="pixie-locked-actions">
                                <button
                                    type="button"
                                    className="pixie-locked-signin-btn"
                                    onClick={() => {
                                        setOpen(false);
                                        navigate("/login");
                                    }}
                                >
                                    Sign In to Chat
                                </button>
                                <button
                                    type="button"
                                    className="pixie-locked-signup-btn"
                                    onClick={() => {
                                        setOpen(false);
                                        navigate("/signup");
                                    }}
                                >
                                    Create Account
                                </button>
                                <button
                                    type="button"
                                    className="pixie-locked-dismiss-btn"
                                    onClick={() => setOpen(false)}
                                >
                                    Maybe later
                                </button>
                            </div>

                            <div className="pixie-locked-sticker-box">
                                <img
                                    src={assets.pixieSignInRequired}
                                    alt="Pixie Access Denied"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Quick Chips */}
                        <div className="vantage-ai-quick-row">
                            {QUICK_PROMPTS.map((qp) => (
                                <button
                                    key={qp}
                                    type="button"
                                    className="vantage-ai-chip"
                                    onClick={() => sendPrompt(qp)}
                                >
                                    {qp}
                                </button>
                            ))}
                        </div>

                        {/* Messages */}
                        <div className="vantage-ai-messages">
                            {messages.map((m, idx) => (
                                <div key={idx} className={`vantage-ai-msg ${m.role}`}>
                                    <div className="vantage-ai-bubble">
                                        {renderFormattedText(m.text)}
                                    </div>

                                    {m.items && m.items.length > 0 && (
                                        <div className="vantage-ai-items-grid">
                                            {m.items.map((item) => {
                                                const isAdded = Boolean(addedMap[item.itemId]);
                                                return (
                                                    <div key={item.itemId} className="vantage-ai-item-card">
                                                        <img
                                                            src={item.imageUrl || assets.upload}
                                                            alt={item.name}
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = assets.upload;
                                                            }}
                                                        />
                                                        <div className="vantage-ai-item-meta">
                                                            <div className="vantage-ai-item-name" title={item.name}>
                                                                {item.name}
                                                            </div>
                                                            <div className="vantage-ai-item-price">
                                                                &#8377;{Number(item.price || 0).toLocaleString("en-IN")}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className={`vantage-ai-add-btn ${isAdded ? "added" : ""}`}
                                                            onClick={() => {
                                                                addToCart(item, 1, "M");
                                                                setAddedMap((p) => ({ ...p, [item.itemId]: true }));
                                                                toast.success(`Added ${item.name} to bag`);
                                                            }}
                                                        >
                                                            {isAdded ? "✓ Added" : "Add"}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {sending && (
                                <div className="vantage-ai-msg ai">
                                    <div className="vantage-ai-typing-row">
                                        <img
                                            src={assets.pixieSticker}
                                            alt="Pixie is typing"
                                            className="vantage-ai-typing-sticker"
                                        />
                                        <div className="vantage-ai-bubble vantage-ai-typing">
                                            <span />
                                            <span />
                                            <span />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={listEndRef} />
                        </div>

                        {/* Floating Input Pill */}
                        <form
                            className="vantage-ai-input-wrap"
                            onSubmit={(e) => {
                                e.preventDefault();
                                sendPrompt(input);
                            }}
                        >
                            <div className="vantage-ai-input-bar">
                                <div className="vantage-ai-input-field">
                                    {!input && (
                                        <span
                                            className={`vantage-ai-placeholder ${placeholderFading ? "is-fading" : ""}`}
                                            aria-hidden="true"
                                        >
                                            {CHAT_PLACEHOLDERS[placeholderIdx]}
                                        </span>
                                    )}
                                    <input
                                        type="text"
                                        aria-label={CHAT_PLACEHOLDERS[placeholderIdx]}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="vantage-ai-send-btn"
                                    disabled={sending || !input.trim()}
                                    aria-label="Send"
                                >
                                    <i className="bi bi-arrow-up"></i>
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </aside>
        </div>
    );
};

export default VantageAiDrawer;
