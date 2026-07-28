import { useEffect, useRef, useState, KeyboardEvent } from "react";
import axios from "axios";

// URL backend Spring Boot — đổi thành domain thật khi deploy production
const API_BASE = "http://localhost:8080";

interface Message {
    role: "user" | "bot";
    text: string;
}

interface ChatBotModalProps {
    isOpen: boolean;
    onClose: () => void;
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
    const messageEndRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || isTyping) return;

        const userMessage: Message = { role: "user", text: trimmed };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                `${API_BASE}/api/ai/ask`,
                { question: trimmed },
                {
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                }
            );

            // Backend trả về plain string
            const answer =
                typeof response.data === "string"
                    ? response.data
                    : response.data?.answer ?? "No response.";

            setMessages((prev) => [...prev, { role: "bot", text: answer }]);
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
        }
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
                style={{
                    position: "fixed",
                    bottom: "24px",
                    right: "24px",
                    width: "380px",
                    height: "540px",
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
                    style={{
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
                            width: "36px",
                            height: "36px",
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(0.15 0.03 250)" strokeWidth="2">
                            <path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2z" />
                            <path d="M8 12h.01M12 12h.01M16 12h.01" strokeLinecap="round" strokeWidth="2.5" />
                        </svg>
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

            <style>{`
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
            `}</style>
        </>
    );
}

// Nút mở chatbot (nổi góc dưới phải màn hình)
export function ChatBotButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <ChatBotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />

            <button
                id="chatbot-open-btn"
                onClick={() => setIsOpen((prev) => !prev)}
                title="TechStock AI Assistant"
                style={{
                    position: "fixed",
                    bottom: "24px",
                    right: "24px",
                    width: "54px",
                    height: "54px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--primary), var(--accent))",
                    border: "none",
                    cursor: "pointer",
                    display: isOpen ? "none" : "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "var(--shadow-glow), 0 4px 20px oklch(0 0 0 / 0.4)",
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="oklch(0.15 0.03 250)" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </button>
        </>
    );
}