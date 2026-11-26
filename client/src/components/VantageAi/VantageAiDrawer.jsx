import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../../Service/apiConfig.js";
import { AppContext } from "../../context/AppContextDefinition.js";
import { assets } from "../../assets/assets.js";
import "./VantageAiDrawer.css";

const AI_EVENT = "vantage:open-ai";

export const openVantageAi = (initialPrompt = "") => {
    window.dispatchEvent(new CustomEvent(AI_EVENT, { detail: { initialPrompt } }));
};

const QUICK_PROMPTS = [
    "Suggest a casual club fit ✨",
    "Show items under ₹1500 💸",
    "Track my latest order 📦",
    "Open my bag 🛍️",
];

const INITIAL_MSG = {
    role: "ai",
    text: "Hey! 👋✨ Welcome to **Vantage AI**. Ask me for outfit pairings 🧥, budget picks 💸, add items straight to your bag 🛍️, or track your order 📦!",
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
    const { auth, addToCart, clearCart } = useContext(AppContext);

    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [addedMap, setAddedMap] = useState({});
    const [messages, setMessages] = useState([INITIAL_MSG]);
    const listEndRef = useRef(null);

    const sendPrompt = async (promptText) => {
        const clean = (promptText || "").trim();
        if (!clean || sending) return;

        const nextHistory = [...messages, { role: "user", text: clean }];
        setMessages(nextHistory);
        setInput("");
        setSending(true);

        try {
            const token = localStorage.getItem("token");
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
        if (open) {
            listEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, sending, open]);

    if (!open) return null;

    return (
        <div className="vantage-ai-backdrop" onClick={() => setOpen(false)}>
            <aside
                className="vantage-ai-drawer"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Vantage AI Stylist"
            >
                {/* Header */}
                <div className="vantage-ai-head">
                    <div className="d-flex align-items-center gap-2">
                        <div className="vantage-ai-avatar-wrap">
                            <img src={assets.appLogo} alt="V" className="vantage-ai-avatar" />
                            <span className="vantage-ai-online-dot" />
                        </div>
                        <div>
                            <div className="vantage-ai-title">VANTAGE AI</div>
                            <div className="vantage-ai-sub">Personal Stylist &amp; Concierge</div>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        {messages.length > 1 && (
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
                            onClick={() => setOpen(false)}
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>

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
                            <div className="vantage-ai-bubble vantage-ai-typing">
                                <span />
                                <span />
                                <span />
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
                        <input
                            type="text"
                            placeholder="Ask Vantage AI anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            autoFocus
                        />
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
            </aside>
        </div>
    );
};

export default VantageAiDrawer;
