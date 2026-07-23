"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/app/actions/message";
import { Avatar } from "@/components/Avatar";
import { useTranslation } from "@/lib/i18n";
import { createPortal } from "react-dom";

interface UserSuggestion {
    id: string;
    name: string;
    username: string;
    avatar?: string | null;
    isVerified?: boolean;
}

export function NewMessageModal({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const { t } = useTranslation();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UserSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [starting, setStarting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!query.trim()) {
            setLoading(true);
            fetch("/api/users/who-to-follow?limit=10")
                .then((res) => res.json())
                .then((data) => setResults(data.users || []))
                .catch((e) => console.error("Suggestions failed:", e))
                .finally(() => setLoading(false));
            return;
        }

        const timeoutId = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setResults(data.users || []);
            } catch (e) {
                console.error("Search failed:", e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleSelectUser = async (userId: string) => {
        if (starting) return;
        setStarting(true);
        try {
            const convId = await startConversation(userId);
            router.push(`/messages/${convId}`);
            onClose();
        } catch (e) {
            console.error(e);
            setStarting(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, height: 600, display: "flex", flexDirection: "column" }}>
                <div className="modal-header">
                    <button onClick={onClose} className="icon-btn" aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <h2 className="modal-title">{t("newMessage")}</h2>
                </div>

                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                    <div className="search-input-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            placeholder={t("searchPeople")}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                    {loading && <div style={{ padding: 16, textAlign: "center", color: "var(--text-secondary)" }}>{t("searching")}</div>}
                    {!loading && results.length === 0 && query.trim() && (
                        <div style={{ padding: 16, textAlign: "center", color: "var(--text-secondary)" }}>{t("noPeopleFound")}</div>
                    )}
                    
                    {!loading && !query.trim() && results.length > 0 && (
                        <div style={{ padding: "12px 16px 8px", fontSize: "0.80rem", fontWeight: 800, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Sugeridos para ti
                        </div>
                    )}
                    
                    {!loading && results.map((u) => (
                        <div key={u.id} className="suggestion-item" onClick={() => handleSelectUser(u.id)} style={{ opacity: starting ? 0.5 : 1 }}>
                            <Avatar user={u as any} size="sm" />
                            <div className="suggestion-info">
                                <div className="suggestion-name">
                                    {u.name}
                                    {u.isVerified && (
                                        <svg viewBox="0 0 24 24" fill="#1d9bf0" className="verified-icon">
                                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.756 2.766 1.918 3.46-.09.385-.138.79-.138 1.2 0 2.21 1.71 4 3.918 4 .51 0 1.004-.112 1.458-.315C9.282 22.095 10.562 23 12 23s2.718-.905 3.337-2.165c.454.203.95.315 1.458.315 2.21 0 3.918-1.79 3.918-4 0-.41-.048-.815-.138-1.2 1.162-.694 1.918-2 1.918-3.46zM10.25 17.5l-3.5-3.5 1.41-1.41L10.25 14.67l7.09-7.09 1.41 1.41-8.5 8.5z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="suggestion-handle">@{u.username}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}
