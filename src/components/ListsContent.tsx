"use client";

import { useTranslation } from "@/lib/i18n";
import { useState, useTransition } from "react";
import { createList, deleteList } from "@/app/actions/list";
import Link from "next/link";
import { Avatar } from "./Avatar";

export function ListsContent({ createdLists, memberLists, userId }: { createdLists: any[], memberLists: any[], userId: string }) {
    const { t } = useTranslation();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);

    const handleCreate = () => {
        if (!name.trim()) return;
        startTransition(async () => {
            await createList({ name, description, isPrivate });
            setShowCreateModal(false);
            setName("");
            setDescription("");
            setIsPrivate(false);
        });
    };

    return (
        <>
            <div className="column-header">
                <Link href="/home" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </Link>
                <h1>{t("lists") || "Lists"}</h1>
                <button 
                    className="icon-btn" 
                    style={{ marginLeft: "auto" }}
                    onClick={() => setShowCreateModal(true)}
                >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                </button>
            </div>

            <div className="lists-section" style={{ padding: "0 16px" }}>
                <h2 style={{ fontSize: "1.2rem", margin: "16px 0" }}>{t("pinnedLists") || "Pinned Lists"}</h2>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", padding: "16px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "12px" }}>
                    {t("noPinnedLists") || "Nothing to show here yet — pin your favorite Lists to find them quickly."}
                </div>

                <h2 style={{ fontSize: "1.2rem", margin: "24px 0 16px" }}>{t("yourLists") || "Your Lists"}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[...createdLists, ...memberLists].length === 0 ? (
                        <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)" }}>
                            {t("noLists") || "You haven't created or joined any lists yet."}
                        </div>
                    ) : (
                        [...createdLists, ...memberLists].map(list => (
                            <Link key={list.id} href={`/lists/${list.id}`} style={{ display: "flex", gap: 12, padding: "12px", border: "1px solid var(--border)", borderRadius: "12px", textDecoration: "none", color: "inherit" }}>
                                <div style={{ width: 48, height: 48, background: "var(--bg-hover)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                                        {list.name}
                                        {list.isPrivate && (
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                        )}
                                    </div>
                                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{list._count.members} {t("members") || "members"}</div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: "95%", background: "var(--bg-secondary)", borderRadius: "16px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)" }}>
                        <div className="modal-header">
                            <button className="icon-btn" onClick={() => setShowCreateModal(false)}>
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                            <h2>{t("createList") || "Create List"}</h2>
                            <button 
                                className="btn btn-primary" 
                                style={{ marginLeft: "auto" }}
                                disabled={!name.trim() || isPending}
                                onClick={handleCreate}
                            >
                                {t("next") || "Next"}
                            </button>
                        </div>
                        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <input 
                                    className="input-field"
                                    placeholder={t("listName") || "Name"}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    maxLength={25}
                                />
                                <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
                                    {name.length}/25
                                </div>
                            </div>
                            <div>
                                <textarea 
                                    className="input-field"
                                    placeholder={t("listDescription") || "Description"}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={3}
                                    style={{ resize: "none" }}
                                />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{t("makePrivate") || "Make private"}</div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{t("privateListDesc") || "Only you can see this list."}</div>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={isPrivate} 
                                    onChange={e => setIsPrivate(e.target.checked)} 
                                    style={{ width: 20, height: 20 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ) }
        </>
    );
}
