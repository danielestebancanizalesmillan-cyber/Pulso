"use client";

import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { FollowButton } from "@/components/FollowButton";
import { MessageButton } from "@/components/MessageButton";
import { TweetCard } from "@/components/TweetCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useState, useEffect, useRef } from "react";
import { toggleBlock, toggleMute } from "@/app/actions/user";
import { getUserStatuses } from "@/app/actions/status";
import { StatusViewerModal } from "./StatusViewerModal";
import { motion, AnimatePresence } from "framer-motion";
import { CreateStatusModal } from "./CreateStatusModal";
import { PostContentTranslator } from "./PostContentTranslator";
import { MediaLightbox } from "./MediaLightbox";
import { ManageListsModal } from "./ManageListsModal";

function getYouTubeId(url?: string | null) {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    return match && match[2].length === 11 ? match[2] : null;
}

function loadYouTubeApi() {
    return new Promise<void>((resolve) => {
        if ((window as any).YT?.Player) {
            resolve();
            return;
        }

        const previousReady = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
            previousReady?.();
            resolve();
        };

        const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
        if (!existing) {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        } else {
            const interval = setInterval(() => {
                if ((window as any).YT?.Player) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(interval);
                resolve();
            }, 5000);
        }
    });
}

export function ProfileContent({ 
    user, 
    tweets, 
    pinnedTweet,
    tab, 
    isOwn, 
    isFollowing, 
    isPendingRequest = false,
    isBlocked,
    isMuted,
    isBlockingMe,
    currentUserId 
}: { 
    user: any, 
    tweets: any[], 
    pinnedTweet?: any,
    tab: string, 
    isOwn: boolean, 
    isFollowing: boolean, 
    isPendingRequest?: boolean,
    isBlocked: boolean,
    isMuted: boolean,
    isBlockingMe: boolean,
    currentUserId?: string 
}) {
    const { t, locale } = useTranslation();
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [lightboxCoverImage, setLightboxCoverImage] = useState<string | null>(null);

    // Status / History States
    const [statuses, setStatuses] = useState<any[]>([]);
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [showCreateStatus, setShowCreateStatus] = useState(false);
    const [showListsModal, setShowListsModal] = useState(false);

    useEffect(() => {
        if (user?.id) {
            getUserStatuses(user.id).then(setStatuses).catch(console.error);
        }
    }, [user.id]);

    const latestStatus = statuses[0];
    const hasStatus = statuses.length > 0;
    
    // Sync with the global player state
    useEffect(() => {
        const syncState = () => {
            const state = window.__globalAudioState;
            setIsPlayingAudio(!!(state?.isPlaying && state?.userId === user.id));
        };

        syncState(); // Initial check

        window.addEventListener("global-audio-state-change", syncState);
        return () => {
            window.removeEventListener("global-audio-state-change", syncState);
        };
    }, [user.id]);

    // Stop audio on unmount if it was playing for this profile
    useEffect(() => {
        return () => {
            const state = window.__globalAudioState;
            if (state?.isPlaying && state?.userId === user.id && !state?.isStatus) {
                window.dispatchEvent(new CustomEvent("pause-global-audio"));
            }
        };
    }, [user.id]);

    const toggleProfileAudio = () => {
        if (!user?.profileAudioUrl) return;

        const state = window.__globalAudioState;
        if (state?.isPlaying && state?.userId === user.id) {
            window.dispatchEvent(new CustomEvent("pause-global-audio"));
        } else if (state?.userId === user.id && !state?.isPlaying) {
            window.dispatchEvent(new CustomEvent("resume-global-audio"));
        } else {
            setIsLoadingAudio(true);
            window.dispatchEvent(new CustomEvent("play-global-audio", {
                detail: {
                    url: user.profileAudioUrl,
                    title: user.profileAudioTitle,
                    start: user.profileAudioStart,
                    userId: user.id
                }
            }));
            setTimeout(() => setIsLoadingAudio(false), 800);
        }
    };

    const handleViewHistory = (e: any) => {
        e.stopPropagation(); 
        setShowAvatarMenu(false);
        
        const firstItem = statuses?.[0];
        if (firstItem && firstItem.audioUrl) {
            window.dispatchEvent(new CustomEvent("play-global-audio", {
                detail: {
                    url: firstItem.audioUrl,
                    title: firstItem.styleOptions ? JSON.parse(firstItem.styleOptions).audioTitle || "Música del estado" : "Música del estado",
                    start: firstItem.audioStart || 0,
                    duration: firstItem.audioDuration || 15,
                    userId: firstItem.id,
                    isStatus: true
                }
            }));
        } else {
            // Only unlock silently if the first slide does not have audio
            window.dispatchEvent(new CustomEvent("unlock-mobile-audio"));
            window.dispatchEvent(new CustomEvent("temp-pause-global-audio"));
        }
        
        setViewerOpen(true);
    };

    function getEmptyTitle() {
        if (tab === "posts") return t("noPostsYet");
        if (tab === "replies") return t("noRepliesYet");
        if (tab === "highlights") return t("noHighlightsYet");
        return t("noLikesYet");
    }

    function getEmptyDesc() {
        if (isOwn) {
            if (tab === "posts") return t("shareMind");
            if (tab === "replies") return t("joinConversation");
            if (tab === "highlights") return t("highlightBest");
            return t("noLikesOwn");
        } else {
            const username = `@${user.username}`;
            if (tab === "posts") return t("hasntPosted").replace("{username}", username);
            if (tab === "replies") return t("hasntReplied").replace("{username}", username);
            if (tab === "highlights") return t("hasntHighlighted").replace("{username}", username);
            return t("hasntLiked").replace("{username}", username);
        }
    }

    return (
        <>
            <div className="column-header">
                <BackButton fallbackHref="/home" />
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <h1>{user.name}</h1>
                        <VerifiedBadge type={user.verificationType || (user.isVerified ? "BLUE" : "NONE")} size={20} className="mt-1" customBadges={user.badges} />
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 400 }}>
                        {user._count.tweets} {t("posts")}
                    </div>
                </div>
            </div>

            <div className="profile-cover" style={{ cursor: user.coverImage ? "pointer" : "default" }} onClick={() => user.coverImage && setLightboxCoverImage(user.coverImage)}>
                {user.coverImage && <img src={user.coverImage} className="profile-cover-img" alt="Cover" />}
            </div>

            <div className="profile-info-section">
                <div className="profile-avatar-row">
                    <div style={{ position: "relative", cursor: "pointer" }} onClick={() => {
                        if (hasStatus) setShowAvatarMenu(!showAvatarMenu);
                        else if (user.avatar || user.image) setLightboxImage(user.avatar || user.image);
                    }}>
                        {/* ☁️ Nube Flotante sobre el Avatar con Efecto Nube ☁️ */}
                        {latestStatus && latestStatus.background && (
                            <motion.div 
                                animate={{ y: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                style={{ position: "absolute", top: "-45px", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}
                            >
                                {/* Círculos de Nube de fondo */}
                                <div style={{ position: "absolute", width: "22px", height: "22px", background: "white", borderRadius: "50%", top: "-8px", left: "8px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.05))" }} />
                                <div style={{ position: "absolute", width: "28px", height: "28px", background: "white", borderRadius: "50%", top: "-14px", left: "26px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.05))" }} />
                                <div style={{ position: "absolute", width: "20px", height: "20px", background: "white", borderRadius: "50%", top: "-6px", right: "8px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.05))" }} />

                                {/* Contenedor Principal de Texto */}
                                <div style={{ position: "relative", background: "white", padding: "8px 16px", borderRadius: "20px", boxShadow: "0 6px 18px rgba(0,0,0,0.12)", whiteSpace: "nowrap" }}>
                                    <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#00b2fe" }}>{latestStatus.content}</span>
                                </div>
                                <div style={{ position: "absolute", bottom: "-5px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid white" }} />
                            </motion.div>
                        )}

                        <div style={{ padding: "3px", borderRadius: "50%", background: hasStatus ? "linear-gradient(45deg, #4facfe, #00f2fe)" : "transparent", transition: "all 0.3s" }}>
                            <div style={{ background: "var(--bg-primary)", borderRadius: "50%", padding: "2px" }}>
                                <Avatar user={user} size="2xl" />
                            </div>
                        </div>

                        {/* Botón + para agregar historia desde el perfil */}
                        {isOwn && (
                            <div 
                                onClick={(e) => { e.stopPropagation(); setShowCreateStatus(true); }} 
                                style={{ position: "absolute", bottom: "12px", right: "12px", background: "var(--blue)", color: "white", borderRadius: "50%", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold", border: "2px solid var(--bg-primary)", cursor: "pointer", zIndex: 11, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                            >
                                +
                            </div>
                        )}

                        {/* Menú de Avatar - Sólido */}
                        {showAvatarMenu && (
                            <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 8, zIndex: 100, minWidth: 160, background: "#1a1a1b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "6px", boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }}>
                                <button onClick={(e) => { e.stopPropagation(); if (user.avatar || user.image) setLightboxImage(user.avatar || user.image); setShowAvatarMenu(false); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "white", padding: "10px 12px", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseLeave={(e) => e.currentTarget.style.background = "none"}>Ver Foto</button>
                                <button onClick={handleViewHistory} style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#1d9bf0", padding: "10px 12px", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontWeight: "bold" }}>Ver Historia</button>
                            </div>
                        )}
                    </div>


                    <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
                        {isOwn ? (
                            <Link href={`/${user.username}/edit`} className="btn btn-outline">{t("editProfile")}</Link>
                        ) : (
                            <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
                                <button 
                                    className="icon-btn" 
                                    style={{ border: "1px solid var(--border)", padding: "10px" }}
                                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                                </button>
                                
                                {showMoreMenu && (
                                    <div className="dropdown-menu" style={{ 
                                        position: "absolute", 
                                        top: "100%", 
                                        right: 0, 
                                        marginTop: 8, 
                                        zIndex: 100,
                                        minWidth: 180
                                    }}>
                                        <button onClick={() => { toggleMute(user.id); setShowMoreMenu(false); }} className="dropdown-item">
                                            {isMuted ? (t("unmute") || "Unmute") : (t("mute") || "Mute")} @{user.username}
                                        </button>
                                        <button onClick={() => { setShowListsModal(true); setShowMoreMenu(false); }} className="dropdown-item">
                                            Administrar en Listas
                                        </button>
                                        <button onClick={() => { toggleBlock(user.id); setShowMoreMenu(false); }} className="dropdown-item" style={{ color: "var(--red)" }}>
                                            {isBlocked ? (t("unblock") || "Unblock") : (t("block") || "Block")} @{user.username}
                                        </button>
                                        <button onClick={() => { 
                                            const reason = window.prompt("¿Por qué quieres reportar a este usuario?");
                                            if (reason) {
                                                import("@/app/actions/admin").then(m => m.createReport("USER", user.id, reason))
                                                    .then(() => alert("Reporte enviado correctamente"))
                                                    .catch(e => alert(e.message));
                                            }
                                            setShowMoreMenu(false); 
                                        }} className="dropdown-item" style={{ color: "var(--red)" }}>
                                            Reportar @{user.username}
                                        </button>
                                    </div>
                                )}

                                {!isBlockingMe && (
                                    <>
                                        <MessageButton userId={user.id} />
                                        <FollowButton targetId={user.id} isFollowing={isFollowing} isPendingRequest={isPendingRequest} isPrivate={user.isPrivate} />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {user?.profileAudioUrl && (
                    <button
                        onClick={toggleProfileAudio}
                        disabled={isLoadingAudio}
                        className="btn btn-outline"
                        style={{ marginTop: 12, padding: "8px 14px", borderRadius: "999px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: 8, opacity: isLoadingAudio ? 0.7 : 1 }}
                    >
                        <span>{isLoadingAudio ? "Cargando..." : isPlayingAudio ? "Pausar musica" : "Reproducir musica"}</span>
                    </button>
                )}

                <div className="profile-name" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {user.name}
                    <VerifiedBadge type={user.verificationType || (user.isVerified ? "BLUE" : "NONE")} size={20} customBadges={user.badges} />
                    {user.accountLabel && (
                        <span style={{ 
                            background: "var(--bg-secondary)", 
                            color: "var(--text-secondary)", 
                            fontSize: "0.80rem", 
                            padding: "2px 8px", 
                            borderRadius: "4px", 
                            fontWeight: 600,
                            marginLeft: 4
                        }}>
                            {user.accountLabel}
                        </span>
                    )}
                </div>
                <div className="profile-handle">@{user.username}</div>
                {user.bio && (
                    <div style={{ marginTop: "12px", marginBottom: "4px" }}>
                        <PostContentTranslator content={user.bio} className="profile-bio" alwaysShowButton type="bio" />
                    </div>
                )}

                <div className="profile-meta">
                    {user.location && (
                        <div className="profile-meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            {user.location}
                        </div>
                    )}
                    {user.website && (
                        <div className="profile-meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                            </svg>
                            <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue)", textDecoration: "none" }}>
                                {user.website.replace(/^https?:\/\//, '')}
                            </a>
                        </div>
                    )}
                    <div className="profile-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {t("joined")} {new Date(user.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { month: "long", year: "numeric" })}
                    </div>
                </div>

                <div className="profile-stats">
                    <Link href={`/${user.username}/following`} className="stat-item" style={{ textDecoration: "none" }}>
                        <span className="stat-count">{user._count.following}</span>{" "}
                        <span className="stat-label">{t("following")}</span>
                    </Link>
                    <Link href={`/${user.username}/followers`} className="stat-item" style={{ textDecoration: "none" }}>
                        <span className="stat-count">{user._count.followers}</span>{" "}
                        <span className="stat-label">{t("followers")}</span>
                    </Link>
                </div>
            </div>

            <div className="profile-tabs" style={{ display: "flex", borderBottom: "1px solid var(--border)", position: "sticky", top: 53, background: "var(--bg-primary)", backdropFilter: "blur(12px)", zIndex: 50 }}>
                <Link href={`/${user.username}`} className={`profile-tab ${tab === "posts" ? "active" : ""}`} style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                    <span>{t("posts")}</span>
                </Link>
                <Link href={`/${user.username}?tab=replies`} className={`profile-tab ${tab === "replies" ? "active" : ""}`} style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                    <span>{t("replies")}</span>
                </Link>
                <Link href={`/${user.username}?tab=highlights`} className={`profile-tab ${tab === "highlights" ? "active" : ""}`} style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                    <span>{t("highlights") || "Highlights"}</span>
                </Link>
                <Link href={`/${user.username}?tab=likes`} className={`profile-tab ${tab === "likes" ? "active" : ""}`} style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                    <span>{t("like")}s</span>
                </Link>
            </div>

            {pinnedTweet && tab === "posts" && !isBlocked && !isBlockingMe && (
                <div style={{ borderBottom: "1px solid var(--border)" }}>
                    <div style={{ padding: "8px 16px 0", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            <path d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9zM12 5c-3.86 0-7 3.14-7 7s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7z" />
                        </svg>
                        {t("pinnedTweet") || "Pinned Tweet"}
                    </div>
                    <TweetCard tweet={pinnedTweet} currentUserId={currentUserId} />
                    <div style={{ height: 1, background: "var(--border)" }} />
                </div>
            )}

            {isBlockingMe ? (
                <div className="empty-state" style={{ marginTop: 80, padding: "0 20px" }}>
                    <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 8 }}>@{user.username} {t("blockedTitle") || "has blocked you"}</h2>
                    <p style={{ color: "var(--text-secondary)", maxWidth: 350, margin: "0 auto" }}>
                        {t("blockedDesc") || "You are blocked from following or seeing this user's posts."}
                    </p>
                </div>
            ) : isBlocked ? (
                <div className="empty-state" style={{ marginTop: 80, padding: "0 20px" }}>
                    <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 8 }}>{t("unblockToSee") || "Unblock to see posts"}</h2>
                    <p style={{ color: "var(--text-secondary)", maxWidth: 350, margin: "0 auto" }}>
                        {t("blockWarning") || "You have blocked this user. Unblock them to see their posts and profile info."}
                    </p>
                    <button 
                        onClick={() => toggleBlock(user.id)} 
                        className="btn btn-outline" 
                        style={{ marginTop: 24, padding: "12px 24px", borderRadius: "24px", fontWeight: 700 }}
                    >
                        {t("unblock") || "Unblock"} @{user.username}
                    </button>
                </div>
            ) : user.isPrivate && !isFollowing && !isOwn ? (
                <div className="empty-state" style={{ marginTop: 80, padding: "0 20px" }}>
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 8 }}>Esta cuenta es privada</h2>
                    <p style={{ color: "var(--text-secondary)", maxWidth: 350, margin: "0 auto" }}>
                        Síguela para ver sus publicaciones y fotos.
                    </p>
                </div>
            ) : tweets.length === 0 ? (
                <div className="empty-state">
                    <h2>{getEmptyTitle()}</h2>
                    <p>{getEmptyDesc()}</p>
                </div>
            ) : (
                tweets.map((tItem) => (
                    <div key={tItem.id}>
                        {tab === "highlights" && (
                            <div style={{ padding: "8px 16px 0", fontSize: "0.8rem", color: "var(--yellow, #F5A623)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                <span>{t("highlighted")}</span>
                            </div>
                        )}
                        <TweetCard tweet={tItem} currentUserId={currentUserId} />
                    </div>
                ))
            )}

            {viewerOpen && hasStatus && (
                <StatusViewerModal group={{ userId: user.id, user, items: statuses }} onClose={() => setViewerOpen(false)} />
            )}

            {showCreateStatus && (
                <CreateStatusModal onClose={() => { setShowCreateStatus(false); getUserStatuses(user.id).then(setStatuses); }} />
            )}

            {lightboxImage && (
                <MediaLightbox images={[{ url: lightboxImage }]} initialIndex={0} onClose={() => setLightboxImage(null)} />
            )}

            {lightboxCoverImage && (
                <MediaLightbox images={[{ url: lightboxCoverImage }]} initialIndex={0} onClose={() => setLightboxCoverImage(null)} />
            )}

            {showListsModal && (
                <ManageListsModal 
                    targetUserId={user.id} 
                    targetUsername={user.username} 
                    onClose={() => setShowListsModal(false)} 
                />
            )}
        </>
    );
}
