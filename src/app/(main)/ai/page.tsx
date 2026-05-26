"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, MessageSquare, Trash2, ChevronLeft } from "lucide-react";
import { useSession } from "next-auth/react";

interface Message {
    id?: string;
    role: "user" | "assistant";
    content: string;
    sender?: "user" | "pulsai";
    text?: string;
}

interface Chat {
    id: string;
    title: string;
    createdAt: string;
    _count?: { messages: number };
}

export default function PulsAIPage() {
    const { data: session } = useSession();
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Cargar chats
    useEffect(() => {
        if (!session?.user) return;
        
        const loadChats = async () => {
            try {
                const res = await fetch("/api/ai/chats");
                if (res.ok) {
                    const data = await res.json();
                    setChats(data.chats || []);
                }
            } catch (error) {
                console.error("Error cargando chats:", error);
            }
        };

        loadChats();
    }, [session]);

    // Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Crear nuevo chat
    const createNewChat = async () => {
        if (!session?.user) return;

        try {
            const res = await fetch("/api/ai/chats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Nueva conversaci├│n" })
            });

            if (res.ok) {
                const data = await res.json();
                setCurrentChatId(data.chat.id);
                setMessages([]);
                setChats([data.chat, ...chats]);
            }
        } catch (error) {
            console.error("Error creando chat:", error);
        }
    };

    // Seleccionar chat
    const selectChat = (chatId: string) => {
        setCurrentChatId(chatId);
        setMessages([]);
        setSidebarOpen(false);
    };

    // Enviar mensaje
    const handleSendMessage = async () => {
        if (!inputValue.trim() || !session?.user) return;

        const userMessage: Message = {
            role: "user",
            content: inputValue
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue("");
        setLoading(true);

        try {
            // Crear chat si no existe
            let chatId = currentChatId;
            if (!chatId) {
                const chatRes = await fetch("/api/ai/chats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: inputValue.slice(0, 50) })
                });
                if (chatRes.ok) {
                    const chatData = await chatRes.json();
                    chatId = chatData.chat.id;
                    setCurrentChatId(chatId);
                    setChats([chatData.chat, ...chats]);
                }
            }

            // Enviar mensaje
            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage.content,
                    history: messages,
                    chatId: chatId
                })
            });

            if (res.ok) {
                const data = await res.json();
                const assistantMessage: Message = {
                    role: "assistant",
                    content: data.response || "Lo siento, no pude procesar tu solicitud."
                };
                setMessages(prev => [...prev, assistantMessage]);
            }
        } catch (error) {
            console.error("Error enviando mensaje:", error);
            const errorMessage: Message = {
                role: "assistant",
                content: "Error de conexi├│n. Por favor, intenta de nuevo."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    // Eliminar chat
    const deleteChat = async (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch(`/api/ai/chats/${chatId}`, { method: "DELETE" });
            setChats(chats.filter(c => c.id !== chatId));
            if (currentChatId === chatId) {
                setCurrentChatId(null);
                setMessages([]);
            }
        } catch (error) {
            console.error("Error eliminando chat:", error);
        }
    };

    if (!session?.user) {
        return (
            <div style={{ 
                height: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                color: "var(--text-secondary)"
            }}>
                Cargando...
            </div>
        );
    }

    return (
        <div style={{ 
            display: "flex", 
            height: "100%",
            backgroundColor: "var(--bg-main)",
            overflow: "hidden"
        }}>
            {/* Sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{
                            width: "280px",
                            borderRight: "1px solid var(--border-color)",
                            display: "flex",
                            flexDirection: "column",
                            backgroundColor: "var(--bg-secondary)",
                            zIndex: 10
                        }}
                    >
                        {/* Header */}
                        <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)" }}>
                            <button
                                onClick={createNewChat}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    background: "var(--blue)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    transition: "background 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "var(--blue-dark)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "var(--blue)"}
                            >
                                <Plus size={20} /> Nuevo chat
                            </button>
                        </div>

                        {/* Chats List */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                            {chats.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => selectChat(chat.id)}
                                    style={{
                                        width: "100%",
                                        padding: "12px",
                                        marginBottom: "8px",
                                        textAlign: "left",
                                        background: currentChatId === chat.id ? "var(--blue)" : "transparent",
                                        color: currentChatId === chat.id ? "white" : "var(--text-primary)",
                                        border: "1px solid " + (currentChatId === chat.id ? "var(--blue)" : "transparent"),
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        fontSize: "0.9rem",
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => {
                                        if (currentChatId !== chat.id) {
                                            e.currentTarget.style.background = "var(--bg-hover)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (currentChatId !== chat.id) {
                                            e.currentTarget.style.background = "transparent";
                                        }
                                    }}
                                >
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                        {chat.title}
                                    </span>
                                    <button
                                        onClick={(e) => deleteChat(chat.id, e)}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            color: "var(--text-secondary)",
                                            cursor: "pointer",
                                            padding: "4px",
                                            display: "flex",
                                            alignItems: "center"
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </button>
                            ))}
                            {chats.length === 0 && (
                                <div style={{ 
                                    padding: "20px", 
                                    color: "var(--text-secondary)",
                                    textAlign: "center",
                                    fontSize: "0.9rem"
                                }}>
                                    Sin conversaciones a├║n
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Area */}
            <div style={{ 
                flex: 1, 
                display: "flex", 
                flexDirection: "column",
                position: "relative"
            }}>
                {/* Header */}
                <div style={{
                    padding: "16px",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                }}>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-primary)",
                            display: "flex",
                            alignItems: "center"
                        }}
                    >
                        {sidebarOpen ? <ChevronLeft size={24} /> : <MessageSquare size={24} />}
                    </button>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>PulsAI</h2>
                    <span style={{ 
                        display: "inline-block",
                        padding: "2px 8px",
                        background: "var(--blue)",
                        color: "white",
                        borderRadius: "9999px",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        marginLeft: "auto"
                    }}>
                        Coming Soon
                    </span>
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                }}>
                    {messages.length === 0 && !currentChatId && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center"
                            }}
                        >
                            <div style={{
                                width: "80px",
                                height: "80px",
                                background: "var(--blue-faint)",
                                borderRadius: "24px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "24px",
                                boxShadow: "0 0 30px rgba(29, 155, 240, 0.2)"
                            }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" style={{ width: 40, height: 40 }}>
                                    <path d="M12 3C12 3 12 8 7 8C12 8 12 13 12 13C12 13 12 8 17 8C12 8 12 3 12 3Z" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>Hola, soy PulsAI</h3>
                            <p style={{ color: "var(--text-secondary)", maxWidth: "400px" }}>
                                Tu asistente de investigaci├│n avanzado. Preg├║ntame cualquier cosa y te ayudar├® a analizar, investigar y crear.
                            </p>
                        </motion.div>
                    )}

                    <AnimatePresence>
                        {messages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    display: "flex",
                                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
                                }}
                            >
                                <div style={{
                                    maxWidth: "70%",
                                    padding: "12px 16px",
                                    borderRadius: "12px",
                                    background: msg.role === "user" ? "var(--blue)" : "var(--bg-secondary)",
                                    color: msg.role === "user" ? "white" : "var(--text-primary)",
                                    wordBreak: "break-word",
                                    lineHeight: "1.5"
                                }}>
                                    {msg.content}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                display: "flex",
                                gap: "4px",
                                padding: "12px 16px"
                            }}
                        >
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                    style={{
                                        width: "6px",
                                        height: "6px",
                                        borderRadius: "50%",
                                        background: "var(--blue)"
                                    }}
                                />
                            ))}
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                    padding: "16px",
                    borderTop: "1px solid var(--border-color)",
                    display: "flex",
                    gap: "12px"
                }}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                        placeholder="Pregunta algo..."
                        style={{
                            flex: 1,
                            padding: "10px 14px",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            fontSize: "0.95rem",
                            outline: "none",
                            transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = "var(--blue)"}
                        onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}
                        disabled={loading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={loading || !inputValue.trim()}
                        style={{
                            padding: "10px 14px",
                            background: "var(--blue)",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: loading || !inputValue.trim() ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: loading || !inputValue.trim() ? 0.5 : 1,
                            transition: "opacity 0.2s"
                        }}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

