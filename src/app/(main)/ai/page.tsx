"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, MessageSquare, Trash2, ChevronLeft, Sparkles, Bot, Wifi, WifiOff, Loader2 } from "lucide-react";
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

type ServiceStatus = "checking" | "online" | "offline";

export default function PulsAIPage() {
    const { data: session } = useSession();
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [status, setStatus] = useState<ServiceStatus>("checking");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Comprobar estado de disponibilidad real de PulsAI
    const checkStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/ai/status", { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                setStatus(data.status === "online" ? "online" : "offline");
            } else {
                setStatus("offline");
            }
        } catch {
            setStatus("offline");
        }
    }, []);

    // Monitoreo periódico de estado cada 15s (se detiene al desmontar)
    useEffect(() => {
        let isMounted = true;
        
        const runCheck = async () => {
            if (!isMounted) return;
            await checkStatus();
        };

        runCheck();
        const intervalId = setInterval(runCheck, 15000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [checkStatus]);

    // Detectar tamaño de pantalla (para drawer responsive)
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
        };
        handleResize();
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
        setSidebarOpen(false);
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
                    } catch {
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

    // Enviar mensaje con validación de disponibilidad
    const handleSendMessage = async () => {
        if (!inputValue.trim() || !session?.user || status !== "online" || loading) return;

        const messageText = inputValue;
        const userMessage: Message = {
            role: "user",
            content: messageText
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
                    body: JSON.stringify({ title: messageText.slice(0, 50) })
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
                    content: data.response || "No pude generar una respuesta."
                };
                setMessages(prev => [...prev, assistantMessage]);
            } else {
                const errorData = await res.json().catch(() => ({}));
                
                // Si el servicio falló por desconexión / fuera de línea
                if (res.status === 503 || res.status === 502 || res.status === 504) {
                    setStatus("offline");
                    // Restaurar texto en el input para que no se pierda
                    setInputValue(messageText);
                }

                const errorMessage: Message = {
                    role: "assistant",
                    content: errorData.error || "PulsAI no está disponible en este momento. Por favor verifica tu servidor."
                };
                setMessages(prev => [...prev, errorMessage]);
                checkStatus();
            }
        } catch (error) {
            console.error("Error enviando mensaje:", error);
            setStatus("offline");
            setInputValue(messageText);
            const errorMessage: Message = {
                role: "assistant",
                content: "Error de conexión con el servidor de PulsAI. Se restauró tu mensaje."
            };
            setMessages(prev => [...prev, errorMessage]);
            checkStatus();
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
            {/* Animated Background Glow */}
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

            {/* Sidebar Overlay (Mobile & Drawer) */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                zIndex: 40,
                                backdropFilter: "blur(2px)"
                            }}
                        />

                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                bottom: 0,
                                width: isMobile ? "85%" : "320px",
                                maxWidth: "340px",
                                height: "100%",
                                backgroundColor: "var(--bg-main)",
                                borderRight: "1px solid var(--border-color)",
                                display: "flex",
                                flexDirection: "column",
                                zIndex: 50,
                                boxShadow: "4px 0 24px rgba(0,0,0,0.2)"
                            }}
                        >
                            {/* Header del Sidebar */}
                            <div style={{ 
                                padding: "16px 20px", 
                                borderBottom: "1px solid var(--border-color)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <Sparkles size={20} color="var(--blue)" />
                                    <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>PulsAI Chats</span>
                                </div>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--text-secondary)",
                                        padding: "6px",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            </div>

                            {/* Botón Nuevo Chat */}
                            <div style={{ padding: "16px" }}>
                                <button
                                    onClick={createNewChat}
                                    style={{
                                        width: "100%",
                                        padding: "12px",
                                        backgroundColor: "var(--blue)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "16px",
                                        fontWeight: 700,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        cursor: "pointer",
                                        boxShadow: "0 4px 12px rgba(29, 155, 240, 0.25)"
                                    }}
                                >
                                    <Plus size={18} />
                                    Nueva conversación
                                </button>
                            </div>

                            {/* Lista de Chats */}
                            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
                                {chats.map((chat) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => selectChat(chat.id)}
                                        style={{
                                            width: "100%",
                                            padding: "12px 14px",
                                            marginBottom: "4px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            backgroundColor: currentChatId === chat.id ? "var(--bg-secondary)" : "transparent",
                                            border: "none",
                                            borderRadius: "12px",
                                            color: "var(--text-primary)",
                                            cursor: "pointer",
                                            textAlign: "left"
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                                            <MessageSquare size={16} color="var(--text-secondary)" />
                                            <span style={{ fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {chat.title}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => deleteChat(chat.id, e)}
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                cursor: "pointer",
                                                color: "var(--text-secondary)",
                                                padding: "4px"
                                            }}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </button>
                                ))}
                                {chats.length === 0 && (
                                    <div style={{ padding: "20px", color: "var(--text-secondary)", textAlign: "center", fontSize: "0.9rem" }}>
                                        Sin conversaciones aún
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
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
                    >
                        {sidebarOpen ? <ChevronLeft size={24} /> : <MessageSquare size={24} />}
                    </button>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>PulsAI</h2>
                            {status === "online" ? (
                                <span style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "0.75rem",
                                    color: "#10b981",
                                    fontWeight: 700,
                                    background: "rgba(16, 185, 129, 0.12)",
                                    padding: "2px 8px",
                                    borderRadius: "12px"
                                }}>
                                    <Wifi size={12} />
                                    Online (gemma4:e2b)
                                </span>
                            ) : status === "checking" ? (
                                <span style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "0.75rem",
                                    color: "var(--text-secondary)",
                                    background: "var(--bg-secondary)",
                                    padding: "2px 8px",
                                    borderRadius: "12px"
                                }}>
                                    <Loader2 size={12} className="animate-spin" />
                                    Verificando...
                                </span>
                            ) : (
                                <span style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "0.75rem",
                                    color: "#ef4444",
                                    fontWeight: 700,
                                    background: "rgba(239, 68, 68, 0.12)",
                                    padding: "2px 8px",
                                    borderRadius: "12px"
                                }}>
                                    <WifiOff size={12} />
                                    Desconectado
                                </span>
                            )}
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            Asistente Táctico y de Investigación
                        </span>
                    </div>
                </div>

                {/* Banner de Estado Fuera de Línea */}
                {status === "offline" && (
                    <div style={{
                        padding: "10px 16px",
                        background: "rgba(239, 68, 68, 0.1)",
                        borderBottom: "1px solid rgba(239, 68, 68, 0.2)",
                        color: "#ef4444",
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <WifiOff size={16} />
                            <span>PulsAI está temporalmente fuera de línea. Se habilitará cuando el servidor vuelva a estar disponible.</span>
                        </div>
                        <button
                            onClick={checkStatus}
                            style={{
                                background: "rgba(239, 68, 68, 0.15)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#ef4444",
                                borderRadius: "8px",
                                padding: "4px 10px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer"
                            }}
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Messages Area */}
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
                                margin: "0 auto 20px",
                                boxShadow: "0 0 35px rgba(29, 155, 240, 0.15)"
                            }}>
                                <Bot size={44} color="var(--blue)" />
                            </div>
                            <h2 style={{ fontSize: "1.75rem", fontWeight: 900, marginBottom: "8px" }}>
                                ¿En qué puedo ayudarte hoy?
                            </h2>
                            <p style={{ maxWidth: "420px", color: "var(--text-secondary)", lineHeight: "1.6", fontSize: "0.95rem" }}>
                                Soy PulsAI, analista de investigación táctica y verdad fáctica conectado a tu servidor local.
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
                                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                    gap: "12px",
                                    width: "100%"
                                }}
                            >
                                {msg.role === "assistant" && (
                                    <div style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "50%",
                                        background: "var(--blue)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0
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
                        opacity: status !== "online" ? 0.6 : 1,
                        transition: "opacity 0.3s"
                    }}>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                            placeholder={
                                status === "online" 
                                    ? "Envíale un mensaje a PulsAI..." 
                                    : status === "checking" 
                                        ? "Verificando disponibilidad de PulsAI..." 
                                        : "PulsAI no disponible. Servidor fuera de línea."
                            }
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                border: "none",
                                background: "transparent",
                                color: "var(--text-primary)",
                                fontSize: isMobile ? "0.95rem" : "1rem",
                                outline: "none"
                            }}
                            disabled={loading || status !== "online"}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={loading || status !== "online" || !inputValue.trim()}
                            style={{
                                padding: "12px",
                                width: "44px",
                                height: "44px",
                                background: (loading || status !== "online" || !inputValue.trim()) ? "var(--bg-hover)" : "var(--blue)",
                                color: (loading || status !== "online" || !inputValue.trim()) ? "var(--text-secondary)" : "white",
                                border: "none",
                                borderRadius: "50%",
                                cursor: (loading || status !== "online" || !inputValue.trim()) ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s"
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
