"use client";

import { useTranslation } from "@/lib/i18n";
import { TweetCard } from "./TweetCard";
import Link from "next/link";
import { useState } from "react";
import { createBookmarkFolder, deleteBookmarkFolder } from "@/app/actions/bookmark";

export function BookmarksContent({ 
    tweets, 
    userId, 
    username, 
    folders, 
    currentFolderId 
}: { 
    tweets: any[], 
    userId: string, 
    username: string, 
    folders: any[], 
    currentFolderId?: string 
}) {
    const { t } = useTranslation();
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    const currentFolder = folders.find(f => f.id === currentFolderId);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await createBookmarkFolder(newFolderName.trim());
            setNewFolderName("");
            setIsCreating(false);
        } catch (error) {
            console.error(error);
        }
    };
    
    const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(t("deleteFolderConfirm") || "¿Estás seguro de que quieres eliminar esta carpeta? Los marcadores volverán a la vista general.")) return;
        try {
            await deleteBookmarkFolder(folderId);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <>
            <div className="column-header">
                <div>
                    <h1>{currentFolder ? currentFolder.name : t("bookmarks")}</h1>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        @{username}
                    </div>
                </div>
            </div>

            {/* Folders Navigation */}
            <div style={{ display: "flex", gap: "12px", padding: "12px 16px", borderBottom: "1px solid var(--border)", overflowX: "auto", whiteSpace: "nowrap" }}>
                <Link 
                    href="/bookmarks" 
                    style={{ 
                        padding: "6px 16px", 
                        borderRadius: "var(--radius-full)", 
                        background: !currentFolderId ? "var(--blue)" : "var(--bg-hover)",
                        color: !currentFolderId ? "white" : "var(--text-primary)",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.9rem"
                    }}
                >
                    {t("all") || "Todos"}
                </Link>
                {folders.map(folder => (
                    <Link 
                        key={folder.id}
                        href={`/bookmarks?folderId=${folder.id}`} 
                        style={{ 
                            padding: "6px 16px", 
                            borderRadius: "var(--radius-full)", 
                            background: currentFolderId === folder.id ? "var(--blue)" : "var(--bg-hover)",
                            color: currentFolderId === folder.id ? "white" : "var(--text-primary)",
                            textDecoration: "none",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}
                    >
                        {folder.name}
                        <button 
                            onClick={(e) => handleDeleteFolder(folder.id, e)}
                            style={{ 
                                background: "none", 
                                border: "none", 
                                padding: 0, 
                                cursor: "pointer", 
                                color: currentFolderId === folder.id ? "rgba(255,255,255,0.7)" : "var(--text-secondary)",
                                display: "flex",
                                alignItems: "center"
                            }}
                            title={t("deleteFolder") || "Eliminar carpeta"}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                            </svg>
                        </button>
                    </Link>
                ))}
                <button 
                    onClick={() => setIsCreating(true)}
                    style={{ 
                        padding: "6px 12px", 
                        borderRadius: "var(--radius-full)", 
                        background: "var(--bg-hover)",
                        color: "var(--blue)",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
                        <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
                    </svg>
                    {t("newFolder") || "New Folder"}
                </button>
            </div>

            {isCreating && (
                <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", gap: "12px" }}>
                    <input 
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder={t("newFolder") || "Nueva carpeta..."}
                        style={{ flex: 1, padding: "8px 16px", borderRadius: "20px", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
                        autoFocus
                    />
                    <button onClick={handleCreateFolder} className="btn btn-primary" style={{ padding: "8px 20px" }}>{t("add") || "Añadir"}</button>
                    <button onClick={() => setIsCreating(false)} className="btn btn-outline" style={{ padding: "8px 20px" }}>{t("cancel") || "Cancelar"}</button>
                </div>
            )}

            {tweets.length === 0 ? (
                <div className="empty-state">
                    <h2>{t("saveLater")}</h2>
                    <p>{t("bookmarkFlyAway")}</p>
                </div>
            ) : (
                <div className="feed">
                    {tweets.map((tItem) => (
                        <TweetCard key={tItem.id} tweet={tItem} currentUserId={userId} />
                    ))}
                </div>
            )}
        </>
    );
}
