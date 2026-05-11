"use client";

import { useTranslation } from "@/lib/i18n";
import { useState } from "react";
import { InfiniteFeed } from "./InfiniteFeed";
import Link from "next/link";
import { deleteList } from "@/app/actions/list";
import { useRouter } from "next/navigation";

export function ListDetailContent({ list, isOwner, currentUserId }: { list: any, isOwner: boolean, currentUserId: string }) {
    const { t } = useTranslation();
    const router = useRouter();
    const [showOptions, setShowOptions] = useState(false);

    const handleDelete = async () => {
        if (confirm(t("confirmDeleteList") || "Are you sure you want to delete this list?")) {
            await deleteList(list.id);
            router.push("/lists");
        }
    };

    return (
        <>
            <div className="column-header">
                <Link href="/lists" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </Link>
                <div style={{ flex: 1 }}>
                    <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {list.name}
                        {list.isPrivate && (
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        )}
                    </h1>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        @{list.creator.username}
                    </div>
                </div>
                {isOwner && (
                    <div style={{ position: "relative" }}>
                        <button className="icon-btn" onClick={() => setShowOptions(!showOptions)}>
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                        </button>
                        {showOptions && (
                            <div className="dropdown-menu" style={{ position: "absolute", top: "100%", right: 0, zIndex: 100 }}>
                                <button className="dropdown-item danger" onClick={handleDelete}>
                                    {t("deleteList") || "Delete List"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="list-banner" style={{ height: 200, background: "var(--bg-hover)", position: "relative" }}>
                {list.banner && <img src={list.banner} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Banner" />}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", color: "white" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.5rem" }}>{list.name}</div>
                    <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>{list._count.members} {t("members") || "members"}</div>
                </div>
            </div>

            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                {list.description && <p style={{ marginBottom: 16 }}>{list.description}</p>}
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.9rem" }}>
                    <span style={{ fontWeight: 700 }}>{list._count.members}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{t("members") || "Members"}</span>
                </div>
            </div>

            <InfiniteFeed 
                endpoint={`/api/lists/${list.id}/tweets`}
                currentUserId={currentUserId}
                tab="all"
            />
        </>
    );
}
