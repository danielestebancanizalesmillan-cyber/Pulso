"use client";

import { useTranslation } from "@/lib/i18n";
import { useState, useTransition } from "react";
import { createCommunity } from "@/app/actions/community";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "./BackButton";

export function CommunitiesContent({ myCommunities, discoverCommunities, userId }: { myCommunities: any[], discoverCommunities: any[], userId: string }) {
    const { t } = useTranslation();
    const router = useRouter();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const handleCreate = () => {
        if (!name.trim()) return;
        setError("");
        startTransition(async () => {
            try {
                const community = await createCommunity({ name, description });
                setShowCreateModal(false);
                setName("");
                setDescription("");
                router.refresh();
                router.push(`/communities/${community.id}`);
            } catch (e: any) {
                setError(e.message || "Error al crear la comunidad");
            }
        });
    };

    return (
        <>
            <div className="column-header">
                <BackButton fallbackHref="/home" />
                <h1>{t("communities") || "Communities"}</h1>
                <button 
                    className="icon-btn" 
                    style={{ marginLeft: "auto" }}
                    onClick={() => setShowCreateModal(true)}
                >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                </button>
            </div>

            <div className="communities-section" style={{ padding: "0 16px" }}>
                <h2 style={{ fontSize: "1.2rem", margin: "16px 0" }}>{t("myCommunities") || "My Communities"}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {myCommunities.length === 0 ? (
                        <div style={{ padding: "16px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "12px", color: "var(--text-secondary)" }}>
                            {t("noCommunitiesJoined") || "You haven't joined any communities yet."}
                        </div>
                    ) : (
                        myCommunities.map(community => (
                            <Link key={community.id} href={`/communities/${community.id}`} style={{ display: "flex", gap: 12, padding: "12px", border: "1px solid var(--border)", borderRadius: "12px", textDecoration: "none", color: "inherit" }}>
                                <div style={{ width: 48, height: 48, background: "var(--bg-hover)", borderRadius: "8px", overflow: "hidden" }}>
                                    {community.avatar ? <img src={community.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700 }}>{community.name}</div>
                                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{community._count.members} {t("members") || "members"}</div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>

                <h2 style={{ fontSize: "1.2rem", margin: "24px 0 16px" }}>{t("discoverCommunities") || "Discover Communities"}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {discoverCommunities.length === 0 ? (
                        <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)" }}>
                            {t("noCommunitiesToDiscover") || "No new communities to discover right now."}
                        </div>
                    ) : (
                        discoverCommunities.map(community => (
                            <div key={community.id} style={{ display: "flex", gap: 12, padding: "12px", border: "1px solid var(--border)", borderRadius: "12px" }}>
                                <div style={{ width: 48, height: 48, background: "var(--bg-hover)", borderRadius: "8px", overflow: "hidden" }}>
                                    {community.avatar ? <img src={community.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700 }}>{community.name}</div>
                                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8 }}>{community._count.members} {t("members") || "members"}</div>
                                    <Link href={`/communities/${community.id}`} className="btn btn-outline" style={{ fontSize: "0.85rem", padding: "4px 12px", textDecoration: "none", display: "inline-block" }}>
                                        {t("view") || "View"}
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5000 }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: "95%", background: "var(--bg-secondary)", borderRadius: "16px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)" }}>
                        <div className="modal-header">
                            <button className="icon-btn" onClick={() => setShowCreateModal(false)}>
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                            <h2>{t("createCommunity") || "Create Community"}</h2>
                            <button 
                                className="btn btn-primary" 
                                style={{ marginLeft: "auto" }}
                                disabled={!name.trim() || isPending}
                                onClick={handleCreate}
                            >
                                {t("create") || "Create"}
                            </button>
                        </div>
                        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                            {error && (
                                <div style={{ padding: "10px 14px", background: "rgba(244,33,46,0.1)", border: "1px solid rgba(244,33,46,0.3)", borderRadius: "8px", color: "var(--red)", fontSize: "0.9rem" }}>
                                    {error}
                                </div>
                            )}
                            <div>
                                <input 
                                    className="input-field"
                                    placeholder={t("communityName") || "Community Name"}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleCreate()}
                                    maxLength={40}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <textarea 
                                    className="input-field"
                                    placeholder={t("communityDescription") || "Description (optional)"}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={4}
                                    style={{ resize: "none" }}
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                disabled={!name.trim() || isPending}
                                onClick={handleCreate}
                                style={{ width: "100%", padding: "12px" }}
                            >
                                {isPending ? "Creando..." : (t("create") || "Crear Comunidad")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
