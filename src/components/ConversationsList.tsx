"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { useTranslation } from "@/lib/i18n";
import { deleteConversationForMe } from "@/app/actions/message";

export function ConversationsList({ conversations: initialConversations, userId }: { conversations: any[], userId: string }) {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState(initialConversations);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string, backupItem: any) => {
        setConversations((prev) => prev.filter((item) => item.id !== id));
        setDeletingId(null);
        await deleteConversationForMe(id).catch(err => {
            alert("Error al borrar chat: " + err.message);
            setConversations((prev) => [...prev, backupItem]);
        });
    };

    if (conversations.length === 0) {
        return (
            <div className="empty-state">
                <h2>{t("welcomeInbox")}</h2>
                <p>{t("inboxEmptyDesc")}</p>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            {conversations.map((c) => (
                <ConversationItem 
                    key={c.id} 
                    c={c} 
                    userId={userId} 
                    t={t} 
                    deletingId={deletingId} 
                    setDeletingId={setDeletingId} 
                    handleDelete={handleDelete} 
                />
            ))}

        </div>
    );
}

function ConversationItem({ c, userId, t, deletingId, setDeletingId, handleDelete }: any) {
    const partner = c.participants.find((p: any) => p.id !== userId);
    const lastMsg = c.messages[0];
    const isUnread = lastMsg && lastMsg.senderId !== userId && !lastMsg.read;

    const [decryptedContent, setDecryptedContent] = useState<string | null>(null);

    useEffect(() => {
        if (!lastMsg) return;
        if (lastMsg.type === "audio") {
            setDecryptedContent("🎤 Audio");
            return;
        }

        const isEncrypted = lastMsg.isEncrypted || (typeof lastMsg.content === 'string' && (lastMsg.content.includes('"to":') || lastMsg.content.includes('"from":')));
        if (!isEncrypted) {
            setDecryptedContent(lastMsg.content);
            return;
        }

        async function decrypt() {
            try {
                const privateKey = localStorage.getItem("e2ee_private_key");
                const { decryptContent } = await import("@/lib/e2ee");
                
                if (privateKey) {
                    let ciphertext = lastMsg.content;
                    try {
                        const parsed = JSON.parse(lastMsg.content);
                        const isMe = lastMsg.senderId === userId;
                        ciphertext = isMe ? parsed.from : parsed.to;
                    } catch (e) {
                        ciphertext = lastMsg.content;
                    }
                    if (ciphertext) {
                        const text = await decryptContent(ciphertext, privateKey);
                        setDecryptedContent(text);
                    } else {
                        setDecryptedContent("🔒 Mensaje cifrado");
                    }
                } else {
                    setDecryptedContent("🔒 Mensaje cifrado (Key missing)");
                }
            } catch (err) {
                setDecryptedContent("🔒 Mensaje cifrado");
            }
        }
        decrypt();
    }, [lastMsg, userId]);

    if (!partner) return null;



    return (
        <div style={{ position: "relative" }}>
            <Link href={`/messages/${c.id}`} style={{ textDecoration: "none", color: "inherit", padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", gap: "12px", alignItems: "center", transition: "background var(--transition)", backgroundColor: isUnread ? "rgba(29, 155, 240, 0.05)" : "transparent", width: "100%" }} className="conversation-item">
                <Avatar user={partner} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontWeight: 700 }}>{partner.name}</span>
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>@{partner.username}</span>
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 4px" }}>·</span>
                        <span style={{ fontSize: "1.2rem", color: "var(--blue)", opacity: isUnread ? 1 : 0 }}>•</span>
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginLeft: "auto" }}>
                            {lastMsg ? new Date(lastMsg.createdAt).toLocaleDateString() : ""}
                        </span>
                    </div>
                    <div style={{ color: isUnread ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: isUnread ? 600 : 400, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {lastMsg ? decryptedContent || t("loading") || "Cargando..." : t("draft")}
                    </div>
                </div>
            </Link>
            {deletingId === c.id ? (
                <div style={{ position: "absolute", right: "16px", bottom: "16px", zIndex: 60, display: "flex", gap: "6px", background: "var(--bg-main)", padding: "8px 12px", borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", marginRight: "4px" }}>¿Borrar?</span>
                    <button onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); handleDelete(c.id, c); }} style={{ padding: "4px 8px", background: "var(--red)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}>Sí</button>
                    <button onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); setDeletingId(null); }} style={{ padding: "4px 8px", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}>No</button>
                </div>
            ) : (
                <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(c.id); }} 
                    className="delete-hover-btn" 
                    style={{ position: "absolute", right: "16px", bottom: "16px", zIndex: 40, pointerEvents: "auto", background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "10px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }} 
                    title="Borrar Chat"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            )}
        </div>
    );
}

