"use client";

import { useTranslation } from "@/lib/i18n";
import { useState, useTransition } from "react";
import { joinCommunity, leaveCommunity, deleteCommunity } from "@/app/actions/community";
import { InfiniteFeed } from "./InfiniteFeed";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { useRouter } from "next/navigation";

export function CommunityDetailContent({ community, membership, userId }: { community: any, membership: any, userId: string }) {
    const { t } = useTranslation();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showOptions, setShowOptions] = useState(false);

    const isMember = !!membership;
    const isOwner = community.creatorId === userId;

    const handleDelete = () => {
        if (confirm(t("confirmDeleteCommunity") || "¿Eliminar esta comunidad?")) {
            startTransition(async () => {
                try {
                    await deleteCommunity(community.id);
                    router.push("/communities");
                } catch (error: any) {
                    alert(error.message || "Failed to delete community");
                }
            });
        }
    };

    const handleToggleJoin = () => {
        startTransition(async () => {
            if (isMember) {
                await leaveCommunity(community.id);
            } else {
                await joinCommunity(community.id);
            }
        });
    };

    return (
        <>
            <div className="column-header">
                <Link href="/communities" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </Link>
                <div style={{ flex: 1 }}>
                    <h1 style={{ marginBottom: 2 }}>{community.name}</h1>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{community._count.members} {t("members") || "members"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button 
                        className={`btn ${isMember ? "btn-outline" : "btn-primary"}`}
                        onClick={handleToggleJoin}
                        disabled={isPending}
                        style={{ borderRadius: "var(--radius-full)", padding: "6px 20px" }}
                    >
                        {isMember ? (t("joined") || "Joined") : (t("join") || "Join")}
                    </button>
                    {isOwner && (
                        <div style={{ position: "relative" }}>
                            <button className="icon-btn" onClick={() => setShowOptions(!showOptions)}>
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                            </button>
                            {showOptions && (
                                <div className="dropdown-menu" style={{ position: "absolute", top: "100%", right: 0, zIndex: 100, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", padding: "4px" }}>
                                    <button className="dropdown-item danger" onClick={handleDelete} style={{ width: "100%", textAlign: "left" }}>
                                        {t("deleteCommunity") || "Delete Community"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="community-banner" style={{ height: "150px", background: "var(--bg-hover)", position: "relative" }}>
                {community.banner && <img src={community.banner} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                <div style={{ 
                    position: "absolute", 
                    bottom: "-40px", 
                    left: "20px", 
                    width: "80px", 
                    height: "80px", 
                    background: "var(--bg-main)", 
                    borderRadius: "12px", 
                    border: "4px solid var(--bg-main)",
                    overflow: "hidden"
                }}>
                    {community.avatar ? <img src={community.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-hover)" }}><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div>}
                </div>
            </div>

            <div style={{ marginTop: "50px", padding: "0 20px" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 8 }}>{community.name}</h2>
                {community.description && <p style={{ color: "var(--text-primary)", marginBottom: 12, lineHeight: 1.5 }}>{community.description}</p>}
                
                <div style={{ display: "flex", gap: "16px", marginBottom: 20, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                        <strong>{community._count.members}</strong> {t("members") || "Members"}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {t("created") || "Created"} {new Date(community.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div style={{ height: "48px", borderBottom: "1px solid var(--border)", display: "flex" }}>
                <div style={{ 
                    flex: 1, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontWeight: 700,
                    borderBottom: "4px solid var(--blue)",
                    color: "var(--text-primary)"
                }}>
                    {t("latest") || "Latest"}
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                    {t("about") || "About"}
                </div>
            </div>

            <InfiniteFeed 
                endpoint={`/api/communities/${community.id}/tweets`} 
                currentUserId={userId} 
            />
        </>
    );
}
