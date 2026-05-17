"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getUserListsWithMembership, toggleListMember } from "@/app/actions/list";
import { useTranslation } from "@/lib/i18n";

interface ManageListsModalProps {
    targetUserId: string;
    targetUsername: string;
    onClose: () => void;
}

export function ManageListsModal({ targetUserId, targetUsername, onClose }: ManageListsModalProps) {
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);
    const [lists, setLists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [togglingMap, setTogglingMap] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        setMounted(true);
        const fetchLists = async () => {
            try {
                const userLists = await getUserListsWithMembership(targetUserId);
                setLists(userLists);
            } catch (err) {
                console.error("Failed to load lists membership:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLists();
    }, [targetUserId]);

    const handleToggle = async (listId: string) => {
        if (togglingMap[listId]) return;
        setTogglingMap(prev => ({ ...prev, [listId]: true }));
        try {
            await toggleListMember(listId, targetUserId);
            setLists(prev => prev.map(l => l.id === listId ? { ...l, isMember: !l.isMember } : l));
        } catch (err: any) {
            alert(err.message || "Failed to toggle list membership");
        } finally {
            setTogglingMap(prev => ({ ...prev, [listId]: false }));
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 5000
        }} onClick={onClose}>
            <div style={{
                background: "var(--bg-elevated)", padding: "24px", borderRadius: "16px",
                width: "90%", maxWidth: "440px", boxShadow: "var(--shadow-lg)",
                maxHeight: "80vh", display: "flex", flexDirection: "column"
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>Agregar/Remover de Listas</h2>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>para @{targetUsername}</span>
                    </div>
                    <button className="icon-btn" onClick={onClose} style={{ background: "var(--bg-hover)" }}>✕</button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", margin: "8px 0" }} className="custom-scrollbar">
                    {loading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                            <div className="spinner" />
                        </div>
                    ) : lists.length === 0 ? (
                        <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--text-secondary)" }}>
                            <p style={{ margin: 0, fontWeight: 500 }}>No tienes ninguna lista creada.</p>
                            <p style={{ fontSize: "0.85rem", marginTop: 4 }}>Ve a la pestaña de Listas en el menú para crear una.</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {lists.map((list) => (
                                <div 
                                    key={list.id} 
                                    onClick={() => handleToggle(list.id)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "12px 16px",
                                        borderRadius: "12px",
                                        background: "var(--bg-secondary)",
                                        border: "1px solid var(--border)",
                                        cursor: togglingMap[list.id] ? "not-allowed" : "pointer",
                                        transition: "background 0.2s"
                                    }}
                                >
                                    <div style={{ flex: 1, marginRight: 16 }}>
                                        <div style={{ fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                                            {list.name}
                                            {list.isPrivate && (
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ color: "var(--text-secondary)" }}>
                                                    <path d="M12 2C9.24 2 7 4.24 7 7v2H6c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-9c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 7V7c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z" />
                                                </svg>
                                            )}
                                        </div>
                                        {list.description && (
                                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 2 }}>
                                                {list.description}
                                            </div>
                                        )}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={list.isMember}
                                        disabled={togglingMap[list.id]}
                                        onChange={() => {}} // Controlled by wrapper click
                                        style={{ 
                                            width: "20px", 
                                            height: "20px", 
                                            cursor: "pointer",
                                            accentColor: "var(--blue)"
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <button 
                        onClick={onClose}
                        className="btn btn-primary"
                        style={{ borderRadius: "var(--radius-full)", padding: "8px 24px" }}
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
