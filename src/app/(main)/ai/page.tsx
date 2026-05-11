"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/Avatar";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PusherClient from "pusher-js";
import styles from "./page.module.css";

interface Message {
    id: string;
    text: string;
    sender: "user" | "ai";
    sources?: any[];
    createdAt: Date;
}

interface AIChat {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    _count?: { messages: number };
}

function SourceList({ sources }: { sources: any[] }) {
    const [expanded, setExpanded] = useState(false);
    const hasMore = sources.length > 5;
    const displayed = expanded ? sources : sources.slice(0, 5);

    return (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
            {displayed.map((src, i) => (
                <button
                    key={i}
                    onClick={(e) => {
                        e.preventDefault();
                        window.open(src.url, "_blank", "noopener,noreferrer");
                    }}
                    style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        background: "rgba(var(--bg-rgb), 0.5)", 
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(var(--blue-rgb), 0.1)",
                        padding: "8px 14px", borderRadius: "20px", fontSize: "0.75rem",
                        color: "var(--text-main)", cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                    className="hover-card"
                    title={src.url}
                >
                    <img
                        src={`https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(src.url)}`}
                        alt="favicon"
                        style={{ width: 14, height: 14, borderRadius: "50%", background: "white", flexShrink: 0 }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                    <span style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>{src.title}</span>
                </button>
            ))}
            {hasMore && !expanded && (
                <button
                    onClick={() => setExpanded(true)}
                    style={{
                        background: "var(--accent-light)", border: "1px solid var(--accent)",
                        padding: "6px 12px", borderRadius: "20px", fontSize: "0.75rem",
                        color: "var(--accent)", cursor: "pointer", fontWeight: 600
                    }}
                >
                    +{sources.length - 5} fuentes más
                </button>
            )}
            {expanded && hasMore && (
                <button
                    onClick={() => setExpanded(false)}
                    style={{
                        background: "transparent", border: "1px solid var(--border)",
                        padding: "6px 12px", borderRadius: "20px", fontSize: "0.75rem",
                        color: "var(--text-secondary)", cursor: "pointer"
                    }}
                >
                    Ver menos
                </button>
            )}
        </div>
    );
}

export default function AIPage() {
    const { data: session } = useSession();
    const [chats, setChats] = useState<AIChat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            text: "¡Hola! Soy PulsAI, tu copiloto de investigación. ¿En qué te ayudo hoy?",
            sender: "ai",
            createdAt: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState("Analizando consulta...");
    const [statusIndex, setStatusIndex] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isSidebarClick = useRef(false);

    const STATUS_MESSAGES = [
        "Analizando tu consulta...",
        "Investigando en tiempo real...",
        "Rastreando fuentes externas...",
        "Conectando con la red global...",
        "Escaneando datos factuales...",
        "Procesando información crítica...",
        "Refinando reporte analítico...",
        "Cotejando evidencias...",
        "Sintetizando la verdad..."
    ];

    // Timer para actualizar el estado cada 3 segundos
    useEffect(() => {
        let interval: any;
        if (loading) {
            interval = setInterval(() => {
                setStatusIndex(prev => (prev + 1) % STATUS_MESSAGES.length);
            }, 3000);
        } else {
            setStatusIndex(0);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const activeStatus = loadingStep.includes("...") ? STATUS_MESSAGES[statusIndex] : loadingStep;

    const user = session?.user as any;

    const scrollToBottom = () => {
        if (messagesEndRef.current && messagesEndRef.current.parentElement) {
            const parent = messagesEndRef.current.parentElement;
            parent.scrollTop = parent.scrollHeight;
        }
    };

    const renderMessageText = (text: string, isUser: boolean) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <button
                        key={i}
                        onClick={(e) => {
                            e.preventDefault();
                            window.open(part, "_blank", "noopener,noreferrer");
                        }}
                        style={{
                            background: "transparent", border: "none", 
                            color: isUser ? "white" : "var(--accent)", 
                            textDecoration: "underline", cursor: "pointer", padding: 0, 
                            font: "inherit", display: "inline"
                        }}
                    >
                        {part}
                    </button>
                );
            }
            return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
        });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    useEffect(() => {
        if (!activeChatId) return;

        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        const channel = pusher.subscribe(`ai-chat-${activeChatId}`);
        channel.bind("ai-step", (data: { step: string }) => {
            setLoadingStep(data.step);
        });

        return () => {
            pusher.unsubscribe(`ai-chat-${activeChatId}`);
        };
    }, [activeChatId]);

    // 📥 1. Cargar lista de chats
    const loadChats = async () => {
        try {
            const res = await fetch("/api/ai/chats");
            const data = await res.json();
            setChats(data.chats || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadChats();
    }, []);

    // 📥 2. Cargar mensajes del chat activo
    useEffect(() => {
        if (!activeChatId) {
            setMessages([{
                id: "welcome",
                text: "¡Hola! Soy PulsAI, tu copiloto de investigación. ¿En qué te ayudo hoy?",
                sender: "ai",
                createdAt: new Date()
            }]);
            return;
        }

        const loadMessages = async () => {
            if (!isSidebarClick.current) return;
            setLoading(true);
            try {
                const res = await fetch(`/api/ai/chats/${activeChatId}`);
                const data = await res.json();
                const mapped = data.messages.map((m: any) => {
                    let textParsed = m.content;
                    let sourcesParsed: any[] | undefined = undefined;
                    // Intento extraer mensaje enriquecido si existe
                    if (m.content && m.content.startsWith('{"type":"rich_message"')) {
                        try {
                            const parsed = JSON.parse(m.content);
                            textParsed = parsed.text;
                            sourcesParsed = parsed.sources;
                        } catch (e) { /* Fallback a texto normal */ }
                    }
                    return {
                        id: m.id,
                        text: textParsed,
                        sources: sourcesParsed,
                        sender: m.role === "user" ? "user" : "ai",
                        createdAt: new Date(m.createdAt)
                    };
                });
                setMessages(mapped.length > 0 ? mapped : [{
                    id: "welcome",
                    text: "Chat vacío. ¡Di hola!",
                    sender: "ai",
                    createdAt: new Date()
                }]);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };

        loadMessages();
    }, [activeChatId]);

    const createNewChat = async () => {
        setActiveChatId(null);
        setInput("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const currentInput = input.trim();
        setInput("");

        const userMsg: Message = {
            id: Date.now().toString(),
            text: currentInput,
            sender: "user",
            createdAt: new Date()
        };

        setMessages((prev) => [...prev, userMsg]);
        setLoadingStep("Analizando datos y decidiendo acción...");
        setLoading(true);

        try {
            let currentChatId = activeChatId;

            // 💾 3. Si es el primer mensaje, crear el chat en BD primero
            if (!currentChatId) {
                const res = await fetch("/api/ai/chats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: currentInput.slice(0, 35) + (currentInput.length > 35 ? "..." : "") })
                });
                const data = await res.json();
                currentChatId = data.chat.id;
                isSidebarClick.current = false;
                setActiveChatId(currentChatId);
                loadChats(); // Recargar lista
            }

            const history = messages.slice(-4).map(m => ({
                sender: m.sender,
                text: m.text
            }));

            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: currentInput,
                    history: history,
                    chatId: currentChatId
                })
            });

            let data: any = {};
            try {
                data = await response.json();
            } catch (e) {
                throw new Error("Servidor no respondió o error de formato (502 Gateway).");
            }

            if (data.error) throw new Error(data.error);

            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    text: data.response,
                    sources: data.sources,
                    sender: "ai",
                    createdAt: new Date()
                }
            ]);

            loadChats(); // Actualizar contadores si aplica

        } catch (error: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    text: `Error: ${error.message || "No se pudo conectar con PulsAI."}`,
                    sender: "ai",
                    createdAt: new Date()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const deleteChat = async (chatId: string) => {
        if (!confirm("¿Eliminar esta conversación?")) return;
        try {
            const res = await fetch(`/api/ai/chats/${chatId}`, { method: "DELETE" });
            if (res.ok) {
                if (activeChatId === chatId) setActiveChatId(null);
                loadChats();
            }
        } catch (e) { console.error(e); }
    };

    const deleteMessage = async (messageId: string) => {
        if (!activeChatId) return;
        try {
            const res = await fetch(`/api/ai/chats/${activeChatId}?messageId=${messageId}`, { method: "DELETE" });
            if (res.ok) setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (e) { console.error(e); }
    };

    const regenerateLastMessage = async () => {
        if (!activeChatId || loading) return;
        const lastUserIdx = [...messages].reverse().findIndex(m => m.sender === "user");
        if (lastUserIdx === -1) return;
        const actualIdx = messages.length - 1 - lastUserIdx;
        const lastUserPrompt = messages[actualIdx].text;

        const messagesToKeep = messages.slice(0, actualIdx + 1);
        setMessages(messagesToKeep);
        setLoading(true);

        try {
            const history = messagesToKeep.slice(-4, -1).map(m => ({ sender: m.sender, text: m.text }));
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: lastUserPrompt, history: history, chatId: activeChatId })
            });

            let data: any = {};
            try { data = await response.json(); } catch { throw new Error("Servidor no respondió."); }
            if (data.error) throw new Error(data.error);

            setMessages((prev) => [...prev, { id: Date.now().toString(), text: data.response, sources: data.sources, sender: "ai", createdAt: new Date() }]);
        } catch (error: any) {
            setMessages((prev) => [...prev, { id: Date.now().toString(), text: `Error: ${error.message}`, sender: "ai", createdAt: new Date() }]);
        } finally { setLoading(false); }
    };

    return (
        <div className={styles.pulsAiLayout}>
            {/* ✨ FONDO ANIMADO PREMIUM */}
            <div className={styles.animatedBg} />

            {/* 📁 PANEL LATERAL (Historial) */}
            <aside 
                className={styles.glass}
                style={{ 
                    position: isHistoryCollapsed ? "relative" : "absolute",
                    zIndex: 50,
                    height: "100%",
                    width: isHistoryCollapsed ? "0px" : "260px", 
                    minWidth: isHistoryCollapsed ? "0px" : "260px",
                    overflow: "hidden",
                    borderRight: isHistoryCollapsed ? "none" : "1px solid var(--border)", 
                    display: "flex", 
                    flexDirection: "column", 
                    boxShadow: isHistoryCollapsed ? "none" : "10px 0 30px rgba(0,0,0,0.5)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
            >
                <header style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", gap: "8px", alignItems: "center" }}>
                    <button 
                        onClick={createNewChat}
                        style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "1px dashed var(--accent)", background: "transparent", color: "var(--accent)", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M12 5v14M5 12h14" /></svg>
                        Nuevo Chat
                    </button>
                    <button 
                        onClick={() => setIsHistoryCollapsed(true)}
                        style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "10px", padding: "8px", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="Cerrar historial"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </header>
                
                <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {chats.map(chat => (
                        <div 
                            key={chat.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "12px 14px",
                                borderRadius: "14px",
                                cursor: "pointer",
                                background: activeChatId === chat.id ? "rgba(var(--blue-rgb), 0.1)" : "transparent",
                                border: activeChatId === chat.id ? "1px solid rgba(var(--blue-rgb), 0.2)" : "1px solid transparent",
                                transition: "all 0.3s",
                                margin: "2px 0"
                            }}
                            className={styles.chatItem}
                        >
                            <div 
                                onClick={() => { isSidebarClick.current = true; setActiveChatId(chat.id); setIsHistoryCollapsed(true); }} 
                                style={{ flex: 1, overflow: "hidden" }}
                            >
                                <div style={{ fontSize: "0.9rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {chat.title}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                    {new Date(chat.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px", borderRadius: "4px", display: "flex" }}
                                title="Eliminar Chat"
                                className="delete-chat-btn"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                        </div>
                    ))}
                    {chats.length === 0 && (
                        <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "20px" }}>
                            Sin historial aún
                        </div>
                    )}
                </div>
            </aside>

            {/* 💬 AREA DE CHAT PRINCIPAL */}
            <div className="ai-container" style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
                {/* Header */}
                <header style={{ 
                    padding: "16px 20px", 
                    borderBottom: "1px solid var(--border)", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "16px",
                    background: "rgba(15, 15, 15, 0.6)",
                    backdropFilter: "blur(12px)",
                    zIndex: 10
                }}>
                    <button 
                        onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                        style={{ background: "var(--blue-faint)", border: "none", cursor: "pointer", color: "var(--blue)", display: "flex", alignItems: "center", padding: "8px", borderRadius: "10px", transition: "all 0.3s" }}
                        title={isHistoryCollapsed ? "Mostrar historial" : "Ocultar historial"}
                        className={styles.hoverGlow}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20, transform: isHistoryCollapsed ? "scaleX(-1)" : "none", transition: "transform 0.3s" }}>
                            <rect width="18" height="18" x="3" y="3" rx="2" />
                            <path d="M9 3v18" />
                        </svg>
                    </button>
                    <div style={{ padding: "10px", background: "var(--blue-faint)", borderRadius: "14px", display: "flex", boxShadow: "0 0 15px rgba(29, 155, 240, 0.15)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22, color: "var(--blue)" }}>
                            <path d="M12 3C12 3 12 8 7 8C12 8 12 13 12 13C12 13 12 8 17 8C12 8 12 3 12 3Z" />
                        </svg>
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 900, margin: 0, letterSpacing: "-0.02em", color: "var(--blue)" }}>PulsAI</h1>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            <span style={{ width: 6, height: 6, background: "#10b981", borderRadius: "50%", boxShadow: "0 0 8px #10b981" }}></span>
                            Núcleo Fáctico Operativo
                        </span>
                    </div>
                </header>

                {/* Messages Area */}
                <div className="messages-area" style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <AnimatePresence>
                        {messages.map((m) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    display: "flex",
                                    justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
                                    alignItems: "flex-end",
                                    gap: "8px"
                                }}
                            >
                                {m.sender === "ai" && (
                                    <div style={{ width: 32, height: 32, background: "var(--accent-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: "var(--accent)" }}>
                                            <path d="M12 3C12 3 12 8 7 8C12 8 12 13 12 13C12 13 12 8 17 8C12 8 12 3 12 3Z" />
                                        </svg>
                                    </div>
                                )}
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "75%", alignItems: m.sender === "user" ? "flex-end" : "flex-start" }}>
                                    <div className={m.sender === "ai" ? styles.aiMarkdownReply : ""} style={{
                                        padding: "16px 20px",
                                        borderRadius: m.sender === "user" ? "24px 24px 4px 24px" : "4px 24px 24px 24px",
                                        background: m.sender === "user" 
                                            ? "linear-gradient(135deg, var(--blue), #0077ff)" 
                                            : "rgba(255, 255, 255, 0.05)",
                                        backdropFilter: "blur(20px)",
                                        border: "1px solid var(--border)",
                                        color: m.sender === "user" ? "white" : "var(--text-primary)",
                                        boxShadow: m.sender === "user" 
                                            ? "0 8px 25px rgba(29, 155, 240, 0.25)" 
                                            : "0 4px 20px rgba(0,0,0,0.1)",
                                        wordBreak: "break-word",
                                        lineHeight: "1.7",
                                        fontSize: "1rem",
                                        transition: "all 0.3s ease"
                                    }}>
                                        {m.sender === "user" ? (
                                            renderMessageText(m.text, true)
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                <ReactMarkdown 
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: ({node, ...props}) => <p style={{ margin: 0, padding: 0 }} {...props} />,
                                                        ul: ({node, ...props}) => <ul style={{ margin: 0, paddingLeft: "1.5rem" }} {...props} />,
                                                        ol: ({node, ...props}) => <ol style={{ margin: 0, paddingLeft: "1.5rem" }} {...props} />,
                                                        li: ({node, ...props}) => <li style={{ marginBottom: "4px" }} {...props} />,
                                                        a: ({node, ...props}) => <a style={{ color: "var(--accent)", textDecoration: "underline" }} {...props} />
                                                    }}
                                                >
                                                    {m.text}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* 📎 Tarjetas de Fuentes */}
                                    {m.sources && m.sources.length > 0 && (
                                        <SourceList sources={m.sources} />
                                    )}

                                    {/* Botones de acción (Eliminar / Recargar) */}
                                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "4px", opacity: 0.5 }}>
                                        <button 
                                            onClick={() => deleteMessage(m.id)}
                                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: "4px", borderRadius: "6px", transition: "all 0.2s" }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = "var(--red)"}
                                            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                                            title="Eliminar mensaje"
                                        >
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                        
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(m.text);
                                                // Feedback visual rápido
                                                const btn = document.activeElement as HTMLButtonElement;
                                                if (btn) btn.style.color = "#10b981";
                                                setTimeout(() => { if (btn) btn.style.color = "var(--text-secondary)"; }, 2000);
                                            }}
                                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: "4px", borderRadius: "6px", transition: "all 0.2s" }}
                                            title="Copiar texto"
                                        >
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        </button>

                                        {m.sender === "ai" && m.id === messages[messages.length - 1].id && !loading && (
                                            <button 
                                                onClick={regenerateLastMessage}
                                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--accent)", display: "flex", padding: "4px", borderRadius: "6px", transition: "all 0.2s" }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = "rotate(180deg)"}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = "rotate(0deg)"}
                                                title="Regenerar respuesta"
                                            >
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {m.sender === "user" && <Avatar user={user} size="sm" />}
                            </motion.div>
                        ))}

                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ display: "flex", gap: "8px", alignItems: "center" }}
                            >
                                <div style={{ width: 32, height: 32, background: "var(--accent-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: "var(--accent)" }}>
                                        <path d="M12 3C12 3 12 8 7 8C12 8 12 13 12 13C12 13 12 8 17 8C12 8 12 3 12 3Z" />
                                    </svg>
                                </div>
                                <motion.div 
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    style={{ background: "var(--blue-faint)", backdropFilter: "blur(10px)", border: "1px solid var(--border)", padding: "12px 18px", borderRadius: "18px", color: "var(--blue)", fontSize: "0.95rem", fontWeight: 500 }}
                                >
                                    {activeStatus}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Footer */}
                <footer style={{ padding: "16px", borderTop: "1px solid var(--border)", background: "var(--bg-main)" }}>
                    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Interroga a PulsAI..."
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: "14px 20px",
                                borderRadius: "18px",
                                border: "1px solid rgba(var(--blue-rgb), 0.2)",
                                background: "rgba(var(--bg-rgb), 0.5)",
                                backdropFilter: "blur(8px)",
                                color: "var(--text-primary)",
                                outline: "none",
                                fontSize: "1rem",
                                transition: "all 0.3s"
                            }}
                            className={styles.premiumInput}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            style={{
                                padding: "0 20px",
                                borderRadius: "24px",
                                background: "var(--accent)",
                                color: "white",
                                border: "none",
                                cursor: loading ? "not-allowed" : "pointer",
                                fontWeight: 600,
                                opacity: loading || !input.trim() ? 0.6 : 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
}
