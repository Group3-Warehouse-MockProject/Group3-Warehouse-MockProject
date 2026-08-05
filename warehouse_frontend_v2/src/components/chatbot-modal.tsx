import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { api } from "@/lib/api";

interface Message {
    role: "user" | "bot";
    text: string;
}

const SUGGESTED_QUESTIONS = [
    "📦 How many products are currently in stock?",
    "📉 Which products are running low on stock?",
    "🏭 Show me the inventory for each warehouse",
    "💰 What are the most expensive products?",
    "🔍 List all RAM products and their quantities",
];

interface ChatBotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function useDraggable(containerRef: React.RefObject<HTMLElement | null>) {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const hasMoved = useRef(false);
    const dragState = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, isDragging: false });

    const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const closestBtn = target.closest("button");
        if ((closestBtn && closestBtn !== containerRef.current) || target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        dragState.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: rect.left,
            initialY: rect.top,
            isDragging: true
        };
        hasMoved.current = false;
        
        try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch (err) {}
    };

    const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
        if (!dragState.current.isDragging) return;
        e.preventDefault();
        
        const { startX, startY, initialX, initialY } = dragState.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved.current = true;
        }
        
        const container = containerRef.current;
        if (!container) return;
        
        let newX = initialX + dx;
        let newY = initialY + dy;
        
        newX = Math.max(0, Math.min(newX, window.innerWidth - container.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - container.offsetHeight));

        setPos({ x: newX, y: newY });
    };

    const endDrag = (e: React.PointerEvent<HTMLElement>) => {
        if (!dragState.current.isDragging) return;
        dragState.current.isDragging = false;
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch (err) {}
    };

    return {
        pos,
        dragProps: {
            onPointerDown,
            onPointerMove,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
        },
        hasMoved,
    };
}

export function ChatBotModal({ isOpen, onClose }: ChatBotModalProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "bot",
            text: "Hello! I am the TechStock AI assistant. You can ask me about inventory, products, or warehouses.",
        },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [activeSuggestions, setActiveSuggestions] = useState<string[]>(SUGGESTED_QUESTIONS);
    const messageEndRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const { pos, dragProps } = useDraggable(modalRef);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSuggestionClick = (question: string) => {
        sendMessageDirect(question);
    };

    const sendMessageDirect = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isTyping) return;

        const userMessage: Message = { role: "user", text: trimmed };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setShowSuggestions(false);
        setIsTyping(true);

        try {
            const response = await api.post(`/ai/ask`, { question: trimmed });

            const data = response.data;
            const answer = typeof data === "string" ? data : (data?.answer ?? "No response.");
            const suggestions = Array.isArray(data?.suggestions) && data.suggestions.length > 0
                ? data.suggestions
                : [];

            setMessages((prev) => [...prev, { role: "bot", text: answer }]);
            if (suggestions.length > 0) {
                setActiveSuggestions(suggestions);
            }
        } catch (error) {
            console.error("Chatbot error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "bot",
                    text: "An error occurred while connecting to the AI. Please try again later.",
                },
            ]);
        } finally {
            setIsTyping(false);
            setShowSuggestions(true);
        }
    };

    const sendMessage = async () => {
        await sendMessageDirect(input);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.45)",
                    backdropFilter: "blur(4px)",
                    zIndex: 999,
                    animation: "fadeIn 0.2s ease",
                }}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className="chatbot-modal"
                style={{
                    position: "fixed",
                    ...(pos ? { left: pos.x, top: pos.y } : { bottom: "24px", right: "24px" }),
                    width: "420px",
                    height: "600px",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "1.25rem",
                    boxShadow: "var(--shadow-glow), var(--shadow-card)",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 1000,
                    overflow: "hidden",
                    animation: "slideUp 0.25s cubic-bezier(0.4,0,0.2,1)",
                }}
            >
                {/* Header */}
                <div
                    {...dragProps}
                    style={{
                        cursor: "move",
                        touchAction: "none",
                        userSelect: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "14px 16px",
                        background:
                            "linear-gradient(135deg, oklch(0.78 0.16 195 / 0.15), oklch(0.72 0.18 155 / 0.1))",
                        borderBottom: "1px solid var(--border)",
                        flexShrink: 0,
                    }}
                >
                    {/* Avatar */}
                    <div
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background:
                                "linear-gradient(135deg, var(--primary), var(--accent))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: "0 0 12px oklch(0.78 0.16 195 / 0.4)",
                        }}
                    >
                        <img
                            src="/chatbot-logo.png"
                            alt="TechStock AI logo"
                            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                        />
                    </div>

                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>
                            TechStock AI
                        </p>
                        <p style={{ margin: 0, fontSize: "11px", color: "var(--accent)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{
                                width: "6px", height: "6px", borderRadius: "50%",
                                background: "var(--accent)",
                                display: "inline-block",
                                boxShadow: "0 0 6px var(--accent)",
                            }} />
                            Online
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        title="Close"
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--muted-foreground)",
                            padding: "4px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Messages */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        scrollbarWidth: "thin",
                        scrollbarColor: "var(--border) transparent",
                    }}
                >
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: "flex",
                                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                animation: "fadeIn 0.2s ease",
                            }}
                        >
                            <div
                                style={{
                                    maxWidth: "78%",
                                    padding: "10px 14px",
                                    borderRadius:
                                        msg.role === "user"
                                            ? "18px 18px 4px 18px"
                                            : "18px 18px 18px 4px",
                                    background:
                                        msg.role === "user"
                                            ? "linear-gradient(135deg, var(--primary), oklch(0.7 0.17 200))"
                                            : "var(--secondary)",
                                    color:
                                        msg.role === "user"
                                            ? "var(--primary-foreground)"
                                            : "var(--foreground)",
                                    fontSize: "13px",
                                    lineHeight: "1.55",
                                    border: msg.role === "bot" ? "1px solid var(--border)" : "none",
                                    boxShadow:
                                        msg.role === "user"
                                            ? "0 2px 12px oklch(0.78 0.16 195 / 0.3)"
                                            : "none",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                }}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {/* Suggested questions */}
                    {showSuggestions && !isTyping && (
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "8px",
                                padding: "4px 0",
                                animation: "fadeIn 0.3s ease",
                            }}
                        >
                            {activeSuggestions.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSuggestionClick(q)}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: "20px",
                                        border: "1px solid var(--border)",
                                        background: "var(--secondary)",
                                        color: "var(--foreground)",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                        lineHeight: "1.4",
                                        textAlign: "left",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "linear-gradient(135deg, oklch(0.78 0.16 195 / 0.15), oklch(0.72 0.18 155 / 0.1))";
                                        e.currentTarget.style.borderColor = "var(--primary)";
                                        e.currentTarget.style.transform = "translateY(-1px)";
                                        e.currentTarget.style.boxShadow = "0 2px 8px oklch(0.78 0.16 195 / 0.2)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "var(--secondary)";
                                        e.currentTarget.style.borderColor = "var(--border)";
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}


                    {/* Typing indicator */}
                    {isTyping && (
                        <div style={{ display: "flex", justifyContent: "flex-start", animation: "fadeIn 0.2s ease" }}>
                            <div
                                style={{
                                    padding: "12px 16px",
                                    borderRadius: "18px 18px 18px 4px",
                                    background: "var(--secondary)",
                                    border: "1px solid var(--border)",
                                    display: "flex",
                                    gap: "5px",
                                    alignItems: "center",
                                }}
                            >
                                {[0, 1, 2].map((i) => (
                                    <span
                                        key={i}
                                        style={{
                                            width: "7px",
                                            height: "7px",
                                            borderRadius: "50%",
                                            background: "var(--primary)",
                                            display: "inline-block",
                                            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div ref={messageEndRef} />
                </div>

                {/* Input */}
                <div
                    style={{
                        padding: "12px 16px",
                        borderTop: "1px solid var(--border)",
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        background: "var(--card)",
                        flexShrink: 0,
                    }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question about the warehouse..."
                        disabled={isTyping}
                        style={{
                            flex: 1,
                            padding: "10px 14px",
                            background: "var(--input)",
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            color: "var(--foreground)",
                            fontSize: "13px",
                            outline: "none",
                            transition: "border-color 0.2s, box-shadow 0.2s",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.boxShadow = "0 0 0 3px oklch(0.78 0.16 195 / 0.15)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isTyping || !input.trim()}
                        title="Send"
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background:
                                isTyping || !input.trim()
                                    ? "var(--muted)"
                                    : "linear-gradient(135deg, var(--primary), oklch(0.7 0.17 200))",
                            border: "none",
                            cursor: isTyping || !input.trim() ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.2s",
                            boxShadow:
                                isTyping || !input.trim()
                                    ? "none"
                                    : "0 2px 10px oklch(0.78 0.16 195 / 0.35)",
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={isTyping || !input.trim() ? "var(--muted-foreground)" : "oklch(0.15 0.03 250)"}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                        >
                            <path d="M22 2L11 13" />
                            <path d="M22 2L15 22 11 13 2 9l20-7z" />
                        </svg>
                    </button>
                </div>
            </div>


        </>
    );
}

// Nút mở chatbot (nổi góc dưới phải màn hình)
export function ChatBotButton() {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { pos, dragProps, hasMoved } = useDraggable(buttonRef);

    const handleClick = () => {
        if (hasMoved.current) {
            hasMoved.current = false;
            return;
        }
        setIsOpen((prev) => !prev);
    };

    return (
        <>
            <ChatBotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />

            <button
                ref={buttonRef}
                {...dragProps}
                id="chatbot-open-btn"
                className="chatbot-open-button"
                onClick={handleClick}
                title="TechStock AI Assistant"
                style={{
                    position: "fixed",
                    ...(pos ? { left: pos.x, top: pos.y } : { bottom: "24px", right: "24px" }),
                    width: "84px",
                    height: "84px",
                    borderRadius: 0,
                    touchAction: "none",
                    userSelect: "none",
                    background: "transparent",
                    border: "none",
                    overflow: "visible",
                    cursor: "pointer",
                    display: isOpen ? "none" : "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "none",
                    zIndex: 998,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                }}
            >
                <img
                    src="/chatbot-logo.png"
                    alt="Open TechStock AI assistant"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
            </button>

            <style>{`
                .chatbot-modal {
                    max-width: calc(100vw - 24px);
                    max-height: calc(100dvh - 24px);
                }

                .chatbot-open-button {
                    max-width: 18vw;
                    max-height: 18vw;
                }

                @media (max-width: 640px) {
                    .chatbot-modal {
                        left: 12px !important;
                        right: 12px !important;
                        bottom: 12px !important;
                        width: auto !important;
                        height: min(600px, calc(100dvh - 24px)) !important;
                        max-width: none;
                        max-height: none;
                        border-radius: 16px;
                    }

                    .chatbot-open-button {
                        left: auto !important;
                        right: 12px !important;
                        bottom: 12px !important;
                        width: 68px !important;
                        height: 68px !important;
                        max-width: none;
                        max-height: none;
                    }
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30%           { transform: translateY(-6px); }
                }
                @keyframes twinkle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(0.85); }
                }
                .sparkle-1, .sparkle-2 {
                    transform-origin: center;
                    transform-box: fill-box;
                }
                .sparkle-1 {
                    animation: twinkle 2s ease-in-out infinite;
                }
                .sparkle-2 {
                    animation: twinkle 2.5s ease-in-out infinite 0.5s;
                }
            `}</style>
        </>
    );
}