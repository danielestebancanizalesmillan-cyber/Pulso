"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, MessageSquare, Trash2, ChevronLeft, Sparkles, Bot } from "lucide-react";
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
    const [isMobile, setIsMobile] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Detectar tamaño de pantalla
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile) setSidebarOpen(false);
        };
        handleResize(); // Configuración inicial
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

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
                body: JSON.stringify({ title: "Nueva conversación" })
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
    const selectChat = async (chatId: string) => {
        setCurrentChatId(chatId);
        setMessages([]);
        if (isMobile) setSidebarOpen(false);
        setLoading(true);
        try {
            const res = await fetch(`/api/ai/chats/${chatId}`);
            if (res.ok) {
                const data = await res.json();
                const formattedMessages = data.messages.map((m: any) => {
                    let content = m.content;
                    try {
                        const parsed = JSON.parse(m.content);
                        if (parsed.type === "rich_message") {
                            content = parsed.text;
                        }
                    } catch (e) {
                        // No es JSON
                    }
                    return {
                        id: m.id,
                        role: m.role,
                        content: content
                    };
                });
                setMessages(formattedMessages);
            }
        } catch (error) {
            console.error("Error al cargar mensajes:", error);
        } finally {
            setLoading(false);
        }
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
            } else {
                const errorData = await res.json().catch(() => ({}));
                const errorMessage: Message = {
                    role: "assistant",
                    content: "Hubo un error al procesar tu solicitud: " + (errorData.error || res.statusText || "Error desconocido.")
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error("Error enviando mensaje:", error);
            const errorMessage: Message = {
                role: "assistant",
                content: "Error de conexión. Por favor, intenta de nuevo."
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
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                Cargando...
            </div>
        );
    }

    return (
        <div style={{ 
            display: "flex", 
            height: "100%",
            backgroundColor: "var(--bg-main)",
            overflow: "hidden",
            position: "relative"
        }}>
            {/* Animated Background Glow (Aesthetic) */}
            <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "400px",
                height: "400px",
                background: "var(--blue)",
                filter: "blur(180px)",
                opacity: 0.1,
                borderRadius: "50%",
                pointerEvents: "none",
                zIndex: 0
            }} />

            {/* Sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{
                            width: "280px",
                            borderRight: "1px solid var(--border-color)",
                            display: "flex",
                            flexDirection: "column",
                            backgroundColor: "var(--bg-main)",
                            zIndex: 20,
                            position: isMobile ? "absolute" : "relative",
                            height: "100%",
                            left: 0,
                            top: 0
                        }}
                    >
                        {/* Header Sidebar */}
                        <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                                width: "40px",
                                height: "40px",
                                background: "var(--blue-faint)",
                                borderRadius: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 0 15px rgba(29, 155, 240, 0.2)"
                            }}>
                                <Sparkles size={20} color="var(--blue)" />
                            </div>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, background: "linear-gradient(to right, var(--blue), #8a2be2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                PulsAI
                            </h2>
                        </div>
                        
                        <div style={{ padding: "16px" }}>
                            <button
                                onClick={createNewChat}
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    background: "linear-gradient(45deg, var(--blue), #8a2be2)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    fontSize: "0.95rem",
                                    fontWeight: 700,
                                    boxShadow: "0 4px 14px rgba(29, 155, 240, 0.3)",
                                    transition: "transform 0.2s, box-shadow 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(29, 155, 240, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "none";
                                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(29, 155, 240, 0.3)";
                                }}
                            >
                                <Plus size={20} /> Nuevo chat
                            </button>
                        </div>

                        {/* Chats List */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
                            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", marginLeft: "4px" }}>Conversaciones</h3>
                            {chats.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => selectChat(chat.id)}
                                    style={{
                                        width: "100%",
                                        padding: "12px 14px",
                                        marginBottom: "8px",
                                        textAlign: "left",
                                        background: currentChatId === chat.id ? "var(--bg-main)" : "transparent",
                                        color: currentChatId === chat.id ? "var(--text-primary)" : "var(--text-secondary)",
                                        border: currentChatId === chat.id ? "1px solid var(--border-color)" : "1px solid transparent",
                                        borderRadius: "12px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        fontSize: "0.9rem",
                                        transition: "all 0.2s",
                                        boxShadow: currentChatId === chat.id ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
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
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                                        <MessageSquare size={16} color={currentChatId === chat.id ? "var(--blue)" : "currentColor"} />
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontWeight: currentChatId === chat.id ? 600 : 400 }}>
                                            {chat.title}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => deleteChat(chat.id, e)}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            color: "var(--text-secondary)",
                                            cursor: "pointer",
                                            padding: "4px",
                                            display: "flex",
                                            alignItems: "center",
                                            opacity: 0.6,
                                            transition: "opacity 0.2s, color 0.2s"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.opacity = "1";
                                            e.currentTarget.style.color = "var(--red)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.opacity = "0.6";
                                            e.currentTarget.style.color = "var(--text-secondary)";
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
                                    Sin conversaciones aún
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
                position: "relative",
                zIndex: 1
            }}>
                {/* Header */}
                <div style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    background: "rgba(var(--bg-main-rgb), 0.8)",
                    backdropFilter: "blur(12px)",
                    position: "sticky",
                    top: 0,
                    zIndex: 10
                }}>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-primary)",
                            display: "flex",
                            alignItems: "center",
                            padding: "8px",
                            borderRadius: "50%",
                            transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                        {sidebarOpen ? <ChevronLeft size={24} /> : <MessageSquare size={24} />}
                    </button>
                    <div>
                        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "2px" }}>PulsAI</h2>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Asistente Inteligente</span>
                    </div>
                    <span style={{ 
                        display: "inline-block",
                        padding: "4px 10px",
                        background: "var(--blue-faint)",
                        color: "var(--blue)",
                        borderRadius: "9999px",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        marginLeft: "auto",
                        border: "1px solid rgba(29, 155, 240, 0.2)"
                    }}>
                        BETA
                    </span>
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "24px"
                }}>
                    {messages.length === 0 && !currentChatId && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                marginTop: "-10vh"
                            }}
                        >
                            <div style={{
                                width: "88px",
                                height: "88px",
                                background: "var(--blue-faint)",
                                borderRadius: "28px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "24px",
                                boxShadow: "0 0 40px rgba(29, 155, 240, 0.25)"
                            }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" style={{ width: 44, height: 44 }}>
                                    <path d="M12 3C12 3 12 8 7 8C12 8 12 13 12 13C12 13 12 8 17 8C12 8 12 3 12 3Z" />
                                </svg>
                            </div>
                            <h1 style={{ 
                                fontSize: isMobile ? "2rem" : "2.5rem", 
                                fontWeight: 900, 
                                marginBottom: "12px", 
                                background: "linear-gradient(to bottom, var(--text-primary), var(--text-secondary))", 
                                WebkitBackgroundClip: "text", 
                                WebkitTextFillColor: "transparent" 
                            }}>
                                PulsAI
                            </h1>
                            <p style={{ color: "var(--text-secondary)", maxWidth: "400px", fontSize: isMobile ? "1rem" : "1.1rem", lineHeight: "1.6", padding: "0 20px" }}>
                                Tu asistente de investigación avanzado. Pregúntame cualquier cosa y te ayudaré a analizar, investigar y crear.
                            </p>
                        </motion.div>
                    )}

                    <AnimatePresence>
                        {messages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                                style={{
                                    display: "flex",
                                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                    gap: "12px",
                                    alignItems: "flex-end"
                                }}
                            >
                                {msg.role === "assistant" && (
                                    <div style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "50%",
                                        background: "linear-gradient(135deg, var(--blue), #8a2be2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        boxShadow: "0 4px 10px rgba(29, 155, 240, 0.2)"
                                    }}>
                                        <Bot size={20} color="white" />
                                    </div>
                                )}
                                <div style={{
                                    maxWidth: "75%",
                                    padding: "16px 20px",
                                    borderRadius: msg.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                                    background: msg.role === "user" ? "var(--blue)" : "var(--bg-secondary)",
                                    color: msg.role === "user" ? "white" : "var(--text-primary)",
                                    wordBreak: "break-word",
                                    lineHeight: "1.6",
                                    fontSize: "0.95rem",
                                    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                                    border: msg.role === "assistant" ? "1px solid var(--border-color)" : "none"
                                }}>
                                    {msg.content.split('\n').map((line, i) => (
                                        <span key={i}>
                                            {line}
                                            {i !== msg.content.split('\n').length - 1 && <br />}
                                        </span>
                                    ))}
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
                                gap: "12px",
                                alignItems: "center"
                            }}
                        >
                            <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: "var(--bg-secondary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid var(--border-color)"
                            }}>
                                <Bot size={20} color="var(--blue)" />
                            </div>
                            <div style={{
                                padding: "16px 20px",
                                borderRadius: "20px 20px 20px 4px",
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border-color)",
                                display: "flex",
                                gap: "6px"
                            }}>
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
                                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                        style={{
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "50%",
                                            background: "var(--blue)"
                                        }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{
                    padding: "20px",
                    borderTop: "1px solid var(--border-color)",
                    background: "rgba(var(--bg-main-rgb), 0.8)",
                    backdropFilter: "blur(12px)",
                    zIndex: 2
                }}>
                    <div style={{
                        display: "flex",
                        gap: "12px",
                        maxWidth: "800px",
                        margin: "0 auto",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "24px",
                        padding: "8px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                        transition: "box-shadow 0.3s, border-color 0.3s"
                    }}>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                            placeholder="Envíale un mensaje a PulsAI..."
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                border: "none",
                                background: "transparent",
                                color: "var(--text-primary)",
                                fontSize: isMobile ? "0.95rem" : "1rem",
                                outline: "none"
                            }}
                            disabled={loading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={loading || !inputValue.trim()}
                            style={{
                                padding: "12px",
                                width: "44px",
                                height: "44px",
                                background: (loading || !inputValue.trim()) ? "var(--bg-hover)" : "var(--blue)",
                                color: (loading || !inputValue.trim()) ? "var(--text-secondary)" : "white",
                                border: "none",
                                borderRadius: "50%",
                                cursor: loading || !inputValue.trim() ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s",
                                boxShadow: (!loading && inputValue.trim()) ? "0 4px 14px rgba(29, 155, 240, 0.3)" : "none"
                            }}
                            onMouseEnter={(e) => {
                                if (!loading && inputValue.trim()) {
                                    e.currentTarget.style.transform = "scale(1.05)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                            }}
                        >
                            <Send size={20} style={{ marginLeft: "2px" }} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
