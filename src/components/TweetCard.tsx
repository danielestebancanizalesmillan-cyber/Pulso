"use client";

import { useState, useEffect, useTransition, useOptimistic, useRef } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import { useSession } from "next-auth/react";
import { VerifiedBadge } from "./VerifiedBadge";
import { likeTweet, retweetTweet, deleteTweet, toggleBookmark, toggleHighlight, voteInPoll, togglePinTweet, promoteTweet, editTweet } from "@/app/actions/tweet";
import { addBookmarkToFolder, createBookmarkFolder } from "@/app/actions/bookmark";
import { createReport } from "@/app/actions/admin";
import Link from "next/link";
import { ComposeTweet } from "./ComposeTweet";
import { useToast } from "./ToastProvider";
import { useTranslation } from "@/lib/i18n";
import { translateText } from "@/app/actions/translate";
import { MediaLightbox } from "./MediaLightbox";
import { LocationMap } from "./LocationMap";
import { MapPin } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

const DeleteConfirmModal = ({ show, onConfirm, onCancel, isDeleting, t }: any) => {
    if (!show) return null;
    return (
        <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); onCancel(); }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
            <motion.div 
               onClick={(e) => e.stopPropagation()} 
               style={{ background: "var(--bg-main)", padding: "24px", borderRadius: "16px", maxWidth: "320px", width: "90%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
            >
                <h2 style={{ margin: "0 0 8px 0", fontSize: "1.2rem", fontWeight: 700 }}>{t("deleteTweet") || "¿Eliminar Tweet?"}</h2>
                <p style={{ margin: "0 0 20px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>{t("deleteTweetConfirm") || "Esta acción no se puede deshacer."}</p>
                <button 
                   onClick={(e) => { e.stopPropagation(); onConfirm(); }} 
                   disabled={isDeleting} 
                   style={{ width: "100%", padding: "12px", borderRadius: "9999px", background: "var(--red)", color: "white", border: "none", fontWeight: 700, cursor: "pointer", marginBottom: "8px" }}
                >
                    {isDeleting ? "..." : (t("delete") || "Eliminar")}
                </button>
                <button 
                   onClick={(e) => { e.stopPropagation(); onCancel(); }} 
                   style={{ width: "100%", padding: "12px", borderRadius: "9999px", background: "transparent", color: "var(--text-main)", border: "1px solid var(--border)", fontWeight: 700, cursor: "pointer" }}
                >
                    {t("cancel") || "Cancelar"}
                </button>
            </motion.div>
        </div>
    );
};

const ReportConfirmModal = ({ show, onConfirm, onCancel, t }: any) => {
    const [reason, setReason] = useState("");
    if (!show) return null;
    return (
        <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); onCancel(); }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
            <motion.div 
               onClick={(e) => e.stopPropagation()} 
               style={{ background: "var(--bg-main)", padding: "24px", borderRadius: "16px", maxWidth: "340px", width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
            >
                <h2 style={{ margin: "0 0 12px 0", fontSize: "1.2rem", fontWeight: 700 }}>Reportar Tweet</h2>
                <textarea 
                    placeholder="Describe el motivo del reporte..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", minHeight: "80px", marginBottom: "16px", fontFamily: "inherit" }}
                />
                <button 
                   onClick={(e) => { e.stopPropagation(); onConfirm(reason); }} 
                   disabled={!reason.trim()} 
                   style={{ width: "100%", padding: "12px", borderRadius: "9999px", background: "var(--red)", color: "white", border: "none", fontWeight: 700, cursor: "pointer", marginBottom: "8px", opacity: reason.trim() ? 1 : 0.6 }}
                >
                    Enviar Reporte
                </button>
                <button 
                   onClick={(e) => { e.stopPropagation(); onCancel(); }} 
                   style={{ width: "100%", padding: "12px", borderRadius: "9999px", background: "transparent", color: "var(--text-main)", border: "1px solid var(--border)", fontWeight: 700, cursor: "pointer" }}
                >
                    {t("cancel") || "Cancelar"}
                </button>
            </motion.div>
        </div>
    );
};

interface TweetCardProps {
    tweet: any;
    currentUserId?: string;
    showThread?: boolean;
}

function formatTime(date: Date | string, t: (key: string) => string, locale: string) {
    const d = new Date(date);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}${t("timeSec")}`;
    if (diff < 3600) return `${Math.floor(diff / 60)}${t("timeMin")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${t("timeHour")}`;
    return d.toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { month: "short", day: "numeric" });
}

export const CountWithAnimation = ({ count, active, activeColor }: { count: number, active?: boolean, activeColor?: string }) => (
    <span className="action-count" style={{ 
        display: "inline-block", 
        overflow: "hidden", 
        height: "1.2em", 
        verticalAlign: "middle",
        position: "relative" 
    }}>
        <AnimatePresence initial={false}>
            <motion.span
                key={count}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -15, opacity: 0, position: "absolute", left: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{ 
                    color: active ? activeColor : undefined,
                    display: "block",
                    minWidth: "1ch",
                    textAlign: "center"
                }}
            >
                {count}
            </motion.span>
        </AnimatePresence>
    </span>
);

export function TweetCard({ tweet, currentUserId, showThread }: TweetCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { data: session } = useSession();
    const { addToast } = useToast();
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const { t, locale } = useTranslation();
    const [translatedContent, setTranslatedContent] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isAnimatingLike, setIsAnimatingLike] = useState(false);
    const userId = currentUserId || (session?.user as any)?.id;
    const isOwner = tweet.authorId === userId;
    const isReply = !!tweet.parentId;
    const [lightboxMedia, setLightboxMedia] = useState<{ images: any[], index: number } | null>(null);
    const [showViews, setShowViews] = useState(true);
    const [autoplayVideos, setAutoplayVideos] = useState(true);
    const [showFolderMenu, setShowFolderMenu] = useState(false);
    const [folders, setFolders] = useState<any[]>([]);
    const [isLoadingFolders, setIsLoadingFolders] = useState(false);
    const [quickFolderName, setQuickFolderName] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);
    const [aiSources, setAiSources] = useState<any[]>([]);
    const [revealed, setRevealed] = useState(false);
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editContent, setEditContent] = useState(tweet.content);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const isGold = tweet.author?.verificationType === "GOLD";
    const isGrey = tweet.author?.verificationType === "GREY";

    const birthDate = (session?.user as any)?.birthDate;
    const userShowSensitive = (session?.user as any)?.showSensitiveContent;
    
    const calculateAge = (bday: string | Date | null) => {
        if (!bday) return null;
        const birth = new Date(bday);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
        return age;
    };

    const age = calculateAge(birthDate);
    const isMinor = age !== null && age < 18;
    const isSensitive = tweet.classification && tweet.classification !== "SAFE";
    
    // El texto es sensible si la IA detectó NSFW, VIOLENT o SENSITIVE_TEXT
    const textIsSensitive = ["SENSITIVE_TEXT", "NSFW", "VIOLENT"].includes(tweet.classification || "");
    
    const needsModeration = isSensitive && !userShowSensitive && !revealed && !isOwner;
    const shouldBlurWhole = needsModeration && textIsSensitive;
    const shouldBlurMediaOnly = needsModeration && !textIsSensitive;
    const shouldHideCompletely = isSensitive && isMinor && !isOwner;

    useEffect(() => {
        if (tweet.aiSources) {
            try {
                const parsed = typeof tweet.aiSources === "string" ? JSON.parse(tweet.aiSources) : tweet.aiSources;
                if (Array.isArray(parsed)) setAiSources(parsed);
            } catch (e) {
                console.error("Failed to parse aiSources:", e);
            }
        }
    }, [tweet.aiSources]);

    useEffect(() => {
        const checkFeatures = () => {
            setShowViews(localStorage.getItem("twtr_show_views") !== "false");
            setAutoplayVideos(localStorage.getItem("twtr_autoplay_videos") !== "false");
        };
        checkFeatures();
        window.addEventListener("twtr_settings_changed", checkFeatures);

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowFolderMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            window.removeEventListener("twtr_settings_changed", checkFeatures);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showReportConfirm, setShowReportConfirm] = useState(false);

    const handleConfirmReport = async (reason: string) => {
        try {
            await createReport("TWEET", tweet.id, reason);
            addToast("Reporte enviado correctamente", "success");
            setShowReportConfirm(false);
        } catch (error: any) {
            addToast(error.message || "Error al enviar reporte", "error");
        }
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteTweet(tweet.id);
            addToast(t("tweetDeleted"), "success");
            setShowDeleteConfirm(false);
        } catch (error: any) {
            addToast(error.message || "Failed to delete tweet", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const fetchFolders = async () => {
        setIsLoadingFolders(true);
        try {
            const res = await fetch("/api/bookmarks/folders");
            const data = await res.json();
            setFolders(data.folders || []);
        } catch (error) {
            console.error("Error fetching folders:", error);
        } finally {
            setIsLoadingFolders(false);
        }
    };

    // If it's a retweet, render the original tweet
    if (tweet.retweetOf) {
        const handleDeleteRetweet = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDeleteConfirm(true);
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
            >
                <div className="retweet-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 3v8.45l2.068-1.93 1.364 1.46L15.5 14.12l-4.432-4.14 1.364-1.46L14.5 10.45V5h-3V3h5z" />
                        </svg>
                        <span>{tweet.author?.name} {t("retweeted")}</span>
                    </div>
                    {tweet.authorId === userId && (
                        <button 
                            onClick={handleDeleteRetweet} 
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--red)", fontSize: "0.80rem", display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "12px", transition: "background 0.2s" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            title={t("deleteTweet") || "Delete"}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    )}
                </div>
                <TweetCard tweet={tweet.retweetOf} currentUserId={userId} />
                <DeleteConfirmModal 
                    show={showDeleteConfirm} 
                    onConfirm={handleConfirmDelete} 
                    onCancel={() => setShowDeleteConfirm(false)} 
                    isDeleting={isDeleting} 
                    t={t} 
                />
            </motion.div>
        );
    }

    const [liked, setLiked] = useState(tweet.likes?.some((l: any) => l.userId === userId));
    const [retweeted, setRetweeted] = useState(tweet.retweets?.some((r: any) => r.authorId === userId));
    const [bookmarked, setBookmarked] = useState(tweet.bookmarks?.some((b: any) => b.userId === userId) || false);
    const [likeCount, setLikeCount] = useState(tweet._count?.likes || tweet.likes?.length || 0);
    const [retweetCount, setRetweetCount] = useState(tweet._count?.retweets || tweet.retweets?.length || 0);
    const [bookmarkCount, setBookmarkCount] = useState(tweet._count?.bookmarks || tweet.bookmarks?.length || 0);

    useEffect(() => {
        setLiked(tweet.likes?.some((l: any) => l.userId === userId));
        setRetweeted(tweet.retweets?.some((r: any) => r.authorId === userId));
        setBookmarked(tweet.bookmarks?.some((b: any) => b.userId === userId) || false);
        setLikeCount(tweet._count?.likes || tweet.likes?.length || 0);
        setRetweetCount(tweet._count?.retweets || tweet.retweets?.length || 0);
        setBookmarkCount(tweet._count?.bookmarks || tweet.bookmarks?.length || 0);
    }, [tweet, userId]);
    
    const highlighted = tweet.highlights?.some((h: any) => h.userId === userId);

    const handleLike = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!userId) {
            router.push("/login");
            return;
        }
        
        // Optimistic update
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount((prev: number) => newLiked ? prev + 1 : prev - 1);

        if (newLiked) {
            setIsAnimatingLike(true);
            setTimeout(() => setIsAnimatingLike(false), 900);
        }
        
        likeTweet(tweet.id).catch(err => console.error("Like failed:", err));
    };
    const handleRetweet = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!userId) {
            router.push("/login");
            return;
        }
        
        // Optimistic update
        const newRetweeted = !retweeted;
        setRetweeted(newRetweeted);
        setRetweetCount((prev: number) => newRetweeted ? prev + 1 : prev - 1);

        retweetTweet(tweet.id)
            .then(() => addToast(newRetweeted ? t("retweeted") : t("retweetRemoved"), "success"))
            .catch(err => console.error("Retweet failed:", err));
    };
    const handleBookmark = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!userId) {
            router.push("/login");
            return;
        }
        
        if (!bookmarked) {
            // Optimistic update
            const newBookmarked = true;
            setBookmarked(newBookmarked);
            setBookmarkCount((prev: number) => prev + 1);

            toggleBookmark(tweet.id)
                .then(() => {
                    addToast(t("addedToBookmarks"), "success");
                    fetchFolders();
                    setShowFolderMenu(true);
                })
                .catch(err => {
                    setBookmarked(false);
                    setBookmarkCount((prev: number) => Math.max(0, prev - 1));
                    console.error("Bookmark failed:", err);
                    addToast("Error al guardar", "error");
                });
        } else {
            // Already bookmarked, just toggle the menu
            if (!showFolderMenu) {
                fetchFolders();
            }
            setShowFolderMenu(!showFolderMenu);
        }
    };

    const handleSaveToFolder = (e: React.MouseEvent, folderId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        setShowFolderMenu(false);
        startTransition(async () => {
            try {
                await addBookmarkToFolder(tweet.id, folderId);
                addToast(t("addedToFolder") || "Añadido a la carpeta", "success");
            } catch (err) {
                console.error(err);
                addToast("Error al guardar en carpeta", "error");
            }
        });
    };

    const handleRemoveBookmark = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!userId) {
            router.push("/login");
            return;
        }
        
        setBookmarked(false);
        setBookmarkCount((prev: number) => Math.max(0, prev - 1));
        setShowFolderMenu(false);
        
        toggleBookmark(tweet.id)
            .then(() => addToast(t("removedFromBookmarks"), "success"))
            .catch(err => {
                setBookmarked(true);
                setBookmarkCount((prev: number) => prev + 1);
                console.error("Remove bookmark failed:", err);
            });
    };

    const handleQuickCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickFolderName.trim()) return;
        
        const name = quickFolderName.trim();
        setQuickFolderName("");
        
        try {
            const newFolder = await createBookmarkFolder(name);
            setFolders((prev: any[]) => [...prev, newFolder].sort((a,b) => a.name.localeCompare(b.name)));
            addToast("Carpeta creada", "success");
        } catch (err) {
            console.error(err);
            addToast("Error al crear carpeta", "error");
        }
    };
    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };
    const handleHighlight = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleHighlight(tweet.id)
            .then(() => addToast(highlighted ? t("removedFromHighlights") : t("addedToHighlights"), "success"))
            .catch(err => console.error("Highlight failed:", err));
    };



    return (
        <>
        <motion.article
            className={`tweet-card ${isGold ? 'gold-premium' : ''} ${tweet.isPromoted ? 'is-promoted' : ''}`}
            onClick={() => !isEditingPost && router.push(`/tweet/${tweet.id}`)}
            style={{ 
                position: "relative", 
                overflow: "hidden",
                borderLeft: isGold ? "3px solid var(--yellow)" : (isGrey ? "3px solid #829aab" : (tweet.author?.isVerified ? "3px solid var(--blue)" : "1px solid var(--border)")),
                background: isGold ? "rgba(255, 215, 0, 0.03)" : (tweet.author?.isVerified ? "rgba(29, 155, 240, 0.02)" : "transparent"),
                transition: "background 0.2s, border-color 0.2s"
            }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
        >
            <div className="tweet-inner" style={{ opacity: shouldHideCompletely ? 0 : 1 }}>
                {shouldHideCompletely ? (
                    <div style={{ padding: "16px", color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", width: "100%" }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 8, display: "block", margin: "0 auto" }}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Este contenido ha sido ocultado por ser potencialmente sensible para menores.
                    </div>
                ) : (
                <>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, alignSelf: "stretch" }}>
                        <Link 
                            href={`/${tweet.author?.username}`} 
                            onClick={(e) => e.stopPropagation()}
                            className="avatar-link"
                        >
                            <Avatar user={tweet.author} size="md" />
                        </Link>
                        {showThread && <div className="thread-line" style={{ width: 2, background: "var(--border)", flex: 1, marginBottom: -12 }} />}
                    </div>

                    <div className="tweet-content">
                        <div className="tweet-header">
                            <span
                                className="tweet-name"
                                onClick={(e) => { e.stopPropagation(); router.push(`/${tweet.author?.username}`); }}
                                style={{ display: "flex", alignItems: "center", gap: 2 }}
                            >
                                {tweet.author?.name}
                                <VerifiedBadge type={tweet.author?.verificationType || (tweet.author?.isVerified ? "BLUE" : "NONE")} size={16} />
                                {tweet.author?.accountLabel && (
                                    <span style={{ 
                                        background: "var(--bg-secondary)", 
                                        color: "var(--text-secondary)", 
                                        fontSize: "0.70rem", 
                                        padding: "1px 6px", 
                                        borderRadius: "4px", 
                                        fontWeight: 600,
                                        marginLeft: 4,
                                    }}>
                                        {tweet.author.accountLabel}
                                    </span>
                                )}
                            </span>
                            <Link 
                                href={`/${tweet.author?.username}`} 
                                className="tweet-handle"
                                onClick={(e) => e.stopPropagation()}
                            >
                                @{tweet.author?.username}
                            </Link>
                            <span className="tweet-dot">·</span>
                            <span className="tweet-time" suppressHydrationWarning>{formatTime(tweet.createdAt, t, locale)}</span>
                            
                            {tweet.isEdited && (
                                <span style={{ color: "var(--text-secondary)", fontSize: "0.80rem", marginLeft: 4 }}>
                                    ({t("edited") || "Editado"})
                                </span>
                            )}

                            {tweet.isPromoted && (
                                <div style={{ 
                                    marginLeft: 8, 
                                    background: isGold ? "rgba(255, 215, 0, 0.15)" : "rgba(29, 155, 240, 0.1)",
                                    color: isGold ? "var(--yellow)" : "var(--blue)",
                                    fontSize: "0.65rem",
                                    fontWeight: 800,
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em"
                                }}>
                                    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M19.49 3.14a1.2 1.2 0 0 0-1.76 0l-1.07 1.07-1.48-1.48a1.2 1.2 0 0 0-1.71 0L12 4.19l-1.47-1.46a1.2 1.2 0 0 0-1.71 0l-1.48 1.48-1.07-1.07a1.2 1.2 0 0 0-1.76 0l-1.07 1.07a1.2 1.2 0 0 0 0 1.76l1.07 1.07-1.48 1.48a1.2 1.2 0 0 0 0 1.71L4.19 12l-1.46 1.47a1.2 1.2 0 0 0 0 1.71l1.48 1.48-1.07 1.07a1.2 1.2 0 0 0 0 1.76l1.07 1.07-1.48 1.48a1.2 1.2 0 0 0 1.71 0L12 19.81l1.47 1.46a1.2 1.2 0 0 0 1.71 0l1.48-1.48 1.07 1.07a1.2 1.2 0 0 0 1.76 0l1.07-1.07a1.2 1.2 0 0 0 0-1.76l-1.07-1.07 1.48-1.48a1.2 1.2 0 0 0 0-1.71L19.81 12l1.46-1.47a1.2 1.2 0 0 0 0-1.71l-1.48-1.48 1.07-1.07a1.2 1.2 0 0 0 0-1.76z"/></svg>
                                    {t("promoted") || "Promocionado"}
                                </div>
                            )}

                            {isOwner && (
                                <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                                    <button
                                        className={`action-btn ${highlighted ? "highlighted" : ""}`}
                                        onClick={handleHighlight}
                                        title={t("highlightOnProfile")}
                                    >
                                        <svg viewBox="0 0 24 24" fill={highlighted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                    </button>
                                    {!tweet.parentId && (
                                        <button
                                            className={`action-btn ${tweet.author?.pinnedTweetId === tweet.id ? "highlighted" : ""}`}
                                            onClick={(e) => { e.stopPropagation(); togglePinTweet(tweet.id); }}
                                            title={t("pinTweet")}
                                            style={{ color: tweet.author?.pinnedTweetId === tweet.id ? "var(--blue)" : undefined }}
                                        >
                                            <svg viewBox="0 0 24 24" fill={tweet.author?.pinnedTweetId === tweet.id ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                <path d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9zM12 5c-3.86 0-7 3.14-7 7s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7z" />
                                            </svg>
                                        </button>
                                    )}
                                    <button
                                        className="action-btn"
                                        onClick={handleDelete}
                                        title={t("deleteTweet")}
                                        disabled={isDeleting}
                                        style={{ opacity: isDeleting ? 0.5 : 1 }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                        </svg>
                                    </button>

                                    {/* Verified-only Action Menu */}
                                    {(session?.user as any)?.isVerified && (
                                        <>
                                            <button
                                                className={`action-btn ${tweet.isPromoted ? 'active-gold' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); startTransition(async () => { await promoteTweet(tweet.id); addToast("Post promocionado", "success"); }) }}
                                                title={tweet.isPromoted ? "Quitar promoción" : "Promocionar Post"}
                                                style={{ color: tweet.isPromoted ? "var(--yellow)" : undefined }}
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                                </svg>
                                            </button>

                                            {/* Edit Button (60m window) */}
                                            {(() => {
                                                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                                                const canEdit = new Date(tweet.createdAt) > oneHourAgo;
                                                if (!canEdit) return null;
                                                return (
                                                    <button
                                                        className="action-btn"
                                                        onClick={(e) => { e.stopPropagation(); setIsEditingPost(true); }}
                                                        title="Editar Post"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            )}

                            {!isOwner && (
                                <div style={{ marginLeft: "auto" }}>
                                    <button
                                        className="action-btn"
                                        onClick={(e) => { e.stopPropagation(); setShowReportConfirm(true); }}
                                        title="Reportar Tweet"
                                        style={{ color: "var(--text-secondary)" }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {isEditingPost ? (
                            <div className="edit-post-area" onClick={(e) => e.stopPropagation()} style={{ marginBottom: 12 }}>
                                <textarea
                                    className="compose-textarea"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    autoFocus
                                    style={{ fontSize: "1rem", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", background: "var(--bg-secondary)" }}
                                />
                                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                    <button 
                                        className="post-btn" 
                                        onClick={async () => {
                                            if (editContent.length > ((session?.user as any)?.isVerified ? 2000 : 280)) {
                                                addToast("El contenido es demasiado largo", "error");
                                                return;
                                            }
                                            setIsSavingEdit(true);
                                            try {
                                                await editTweet(tweet.id, editContent);
                                                addToast("Post actualizado", "success");
                                                setIsEditingPost(false);
                                            } catch (err: any) {
                                                addToast(err.message || "Error al editar", "error");
                                            } finally {
                                                setIsSavingEdit(false);
                                            }
                                        }}
                                        disabled={isSavingEdit || editContent === tweet.content || editContent.length > ((session?.user as any)?.isVerified ? 2000 : 280)}
                                    >
                                        {isSavingEdit ? "..." : t("save") || "Guardar"}
                                    </button>
                                    <button 
                                        className="btn-ghost" 
                                        onClick={() => { setIsEditingPost(false); setEditContent(tweet.content); }}
                                        style={{ color: "var(--text-secondary)", padding: "8px 16px" }}
                                    >
                                        {t("cancel") || "Cancelar"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="tweet-text" style={{ filter: shouldBlurWhole ? "blur(8px)" : "none", pointerEvents: shouldBlurWhole ? "none" : "auto" }}>
                                {(translatedContent || tweet.content || "").split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+|https?:\/\/[^\s]+|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part: string, i: number) => {
                                    if (!part) return null;
                                    if (part.startsWith("#")) {
                                        return (
                                            <Link key={i} href={`/explore?q=${encodeURIComponent(part)}`} style={{ color: "var(--blue)", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                                                {part}
                                            </Link>
                                        );
                                    }
                                    if (part.startsWith("@")) {
                                        const cleanedPart = part.replace(/\s/g, "");
                                        return (
                                            <Link key={i} href={`/${cleanedPart.substring(1)}`} style={{ color: "var(--blue)", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                                                {cleanedPart}
                                            </Link>
                                        );
                                    }
                                    if (part.startsWith("http://") || part.startsWith("https://")) {
                                        return (
                                            <a key={i} href={part} target="_blank" style={{ color: "var(--blue)", textDecoration: "underline" }} onClick={(e) => e.stopPropagation()}>
                                                {part}
                                            </a>
                                        );
                                    }
                                    if (part.startsWith("**") && part.endsWith("**")) {
                                        return <strong key={i} style={{ fontWeight: 800, color: "var(--text-main)" }}>{part.slice(2, -2)}</strong>;
                                    }
                                    if (part.startsWith("*") && part.endsWith("*")) {
                                        return <em key={i} style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>{part.slice(1, -1)}</em>;
                                    }
                                    return <span key={i}>{part}</span>;
                                })}
                            </p>
                        )}

                        {tweet.content && (
                            <div style={{ paddingBottom: 8 }}>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (translatedContent) {
                                            setTranslatedContent(null);
                                        } else {
                                            setIsTranslating(true);
                                            try {
                                                const result = await translateText(tweet.content, locale);
                                                setTranslatedContent(result);
                                            } catch (err) {
                                                console.error(err);
                                            } finally {
                                                setIsTranslating(false);
                                            }
                                        }
                                    }}
                                    style={{
                                        color: "var(--blue)", fontSize: "0.85rem", background: "none", border: "none",
                                        padding: 0, cursor: "pointer", display: "flex", gap: "4px", alignItems: "center"
                                    }}
                                >
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Google_Translate_logo.svg" alt="GTranslate" style={{ width: 16, height: 16, objectFit: "contain" }} />

                                    {isTranslating ? "..." : (translatedContent ? t("seeOriginal") : t("translatePost"))}
                                </button>
                            </div>
                        )}

                        {aiSources.length > 0 && (
                            <SourceBubbles sources={aiSources} />
                        )}

                        {tweet.poll && (
                            <div className="poll-container" style={{ margin: "12px 0", padding: "12px", border: "1px solid var(--border)", borderRadius: "16px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {(() => {
                                        const totalVotes = tweet.poll.options.reduce((acc: number, opt: any) => acc + (opt.votes?.length || 0), 0);
                                        const hasVoted = tweet.poll.options.some((opt: any) => opt.votes?.some((v: any) => v.userId === userId));
                                        const isExpired = new Date() > new Date(tweet.poll.expiresAt);
                                        const showResults = hasVoted || isExpired || tweet.authorId === userId;

                                        return (
                                            <>
                                                {tweet.poll.options.map((option: any) => {
                                                    const voteCount = option.votes?.length || 0;
                                                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                                    const userVotedForThis = option.votes?.some((v: any) => v.userId === userId);

                                                    return (
                                                        <div key={option.id} style={{ position: "relative" }}>
                                                            {showResults ? (
                                                                <div style={{ 
                                                                    position: "relative", 
                                                                    height: "36px", 
                                                                    background: "var(--bg-hover)", 
                                                                    borderRadius: "4px", 
                                                                    overflow: "hidden",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    padding: "0 12px",
                                                                    fontWeight: userVotedForThis ? 700 : 400
                                                                }}>
                                                                    <div style={{ 
                                                                        position: "absolute", 
                                                                        left: 0, 
                                                                        top: 0, 
                                                                        bottom: 0, 
                                                                        width: `${percentage}%`, 
                                                                        background: "var(--blue)", 
                                                                        opacity: 0.15,
                                                                        transition: "width 0.5s ease"
                                                                    }} />
                                                                    <div style={{ flex: 1, zIndex: 1, display: "flex", justifyContent: "space-between" }}>
                                                                        <span>{option.text}</span>
                                                                        <span>{percentage}%</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (!userId) {
                                                                            router.push("/login");
                                                                            return;
                                                                        }
                                                                        startTransition(async () => {
                                                                            try {
                                                                                await voteInPoll(option.id);
                                                                            } catch (err: any) {
                                                                                addToast(err.message || "Failed to vote", "error");
                                                                            }
                                                                        });
                                                                    }}
                                                                    disabled={isPending}
                                                                    style={{ 
                                                                        width: "100%", 
                                                                        height: "36px", 
                                                                        background: "none", 
                                                                        border: "1px solid var(--blue)", 
                                                                        color: "var(--blue)", 
                                                                        borderRadius: "18px", 
                                                                        cursor: isPending ? "not-allowed" : "pointer",
                                                                        fontWeight: 700,
                                                                        opacity: isPending ? 0.6 : 1
                                                                    }}
                                                                >
                                                                    {option.text}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                                    {totalVotes} {t("votes") || "votes"} · {isExpired ? (t("finalResults") || "Final results") : (t("pollOpen") || "Poll open")}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {tweet.images && tweet.images.length > 0 && (
                            <div style={{
                                marginTop: 12,
                                marginBottom: 12,
                                display: "grid",
                                gridTemplateColumns: tweet.images.length > 1 ? "1fr 1fr" : "1fr",
                                gap: 2,
                                borderRadius: 16,
                                overflow: "hidden",
                                border: "1px solid var(--border)",
                                filter: (shouldBlurWhole || shouldBlurMediaOnly) ? "blur(25px)" : "none",
                                pointerEvents: (shouldBlurWhole || shouldBlurMediaOnly) ? "none" : "auto",
                                maxWidth: isReply ? "380px" : "100%"
                            }}>
                                {tweet.images.map((img: any, idx: number) => (
                                    <div 
                                        key={idx} 
                                        style={{ position: "relative", width: "100%", height: "100%", cursor: "pointer" }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxMedia({ images: tweet.images, index: idx });
                                        }}
                                    >
                                        {img.type === 'video' ? (
                                            <div style={{ position: "relative", height: "100%" }}>
                                                <VideoPlayer 
                                                    src={img.url} 
                                                    style={{
                                                        width: "100%",
                                                        height: tweet.images.length === 1 ? "auto" : (tweet.images.length === 2 ? (isReply ? 200 : 280) : (isReply ? 120 : 150)),
                                                        maxHeight: tweet.images.length === 1 ? (isReply ? 300 : 500) : (isReply ? 200 : 280),
                                                        objectFit: "cover",
                                                        borderRadius: "inherit"
                                                    }}
                                                    autoplay={autoplayVideos}
                                                />
                                            </div>
                                        ) : img.type === 'audio' ? (
                                            <div style={{ width: "100%", padding: 12, background: "rgba(0,0,0,0.06)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <audio src={img.url} crossOrigin="anonymous" controls style={{ width: "100%" }} />
                                            </div>
                                        ) : (
                                            <img
                                                src={img.url}
                                                alt={`Tweet media ${idx}`}
                                                style={{
                                                    width: "100%",
                                                    height: tweet.images.length === 1 ? "auto" : (tweet.images.length === 2 ? (isReply ? 200 : 280) : (isReply ? 120 : 150)),
                                                    maxHeight: tweet.images.length === 1 ? (isReply ? 300 : 500) : (isReply ? 200 : 280),
                                                    objectFit: "cover"
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {tweet.quoteOf && (
                            <div 
                                style={{ 
                                    marginTop: 12, 
                                    marginBottom: 12, 
                                    padding: 12, 
                                    border: "1px solid var(--border)", 
                                    borderRadius: 16,
                                    cursor: "pointer",
                                    filter: (shouldBlurWhole || shouldBlurMediaOnly) ? "blur(20px)" : "none",
                                    pointerEvents: (shouldBlurWhole || shouldBlurMediaOnly) ? "none" : "auto"
                                }} 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    router.push(`/tweet/${tweet.quoteOf.id}`); 
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <Link 
                                        href={`/${tweet.quoteOf.author.username}`} 
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}
                                    >
                                        <Avatar user={tweet.quoteOf.author} size="sm" />
                                        <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 2 }}>
                                            {tweet.quoteOf.author.name}
                                            <VerifiedBadge type={tweet.quoteOf.author.verificationType || (tweet.quoteOf.author.isVerified ? "BLUE" : "NONE")} size={14} />
                                        </span>
                                        <span style={{ color: "var(--text-secondary)" }}>@{tweet.quoteOf.author.username}</span>
                                    </Link>
                                    <span style={{ color: "var(--text-secondary)" }} suppressHydrationWarning>· {formatTime(tweet.quoteOf.createdAt, t, locale)}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: "0.95rem" }}>{tweet.quoteOf.content}</p>
                                {tweet.quoteOf.images && tweet.quoteOf.images.length > 0 && (
                                    <div style={{
                                        marginTop: 8,
                                        display: "grid",
                                        gridTemplateColumns: tweet.quoteOf.images.length > 1 ? "1fr 1fr" : "1fr",
                                        gap: 2,
                                        borderRadius: 12,
                                        overflow: "hidden"
                                    }}>
                                        {tweet.quoteOf.images.map((img: any, idx: number) => (
                                            <div key={idx} style={{ position: "relative", width: "100%", height: "100%" }}>
                                                {img.type === 'video' ? (
                                                    <VideoPlayer 
                                                        src={img.url} 
                                                        autoplay={autoplayVideos}
                                                        style={{
                                                            width: "100%",
                                                            height: tweet.quoteOf.images.length === 1 ? "auto" : 120,
                                                            maxHeight: tweet.quoteOf.images.length === 1 ? 300 : 120,
                                                            objectFit: "cover",
                                                            borderRadius: "inherit"
                                                        }}
                                                    />
                                                ) : img.type === 'audio' ? (
                                                    <div 
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ width: "100%", padding: 12, background: "rgba(0,0,0,0.06)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                                                    >
                                                        <audio 
                                                            src={img.url} 
                                                            crossOrigin={
                                                                (img.url.startsWith("http") && !img.url.includes(window.location.host))
                                                                    ? undefined 
                                                                    : "anonymous"
                                                            } 
                                                            controls 
                                                            style={{ width: "100%" }} 
                                                        />
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={img.url}
                                                        alt={`Quote media ${idx}`}
                                                        style={{
                                                            width: "100%",
                                                            height: tweet.quoteOf.images.length === 1 ? "auto" : 120,
                                                            maxHeight: tweet.quoteOf.images.length === 1 ? 300 : 120,
                                                            objectFit: "cover"
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {tweet.locationLat && tweet.locationLng && (
                            <div onClick={(e) => e.stopPropagation()}>
                                <LocationMap 
                                    lat={tweet.locationLat} 
                                    lng={tweet.locationLng} 
                                    label={tweet.locationLabel || "Ubicación"} 
                                />
                            </div>
                        )}

                        <div className="tweet-actions" onClick={(e) => e.stopPropagation()}>
                            {/* Reply */}
                            <button className="action-btn reply" onClick={(e) => { e.stopPropagation(); router.push(`/tweet/${tweet.id}`); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                                <CountWithAnimation count={tweet._count?.replies || tweet.replies?.length || 0} />
                            </button>

                            {/* Retweet */}
                            <button className={`action-btn retweet ${retweeted ? "retweeted" : ""}`} onClick={handleRetweet} title={t("retweet")}>
                                <svg viewBox="0 0 24 24" fill={retweeted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
                                </svg>
                                <CountWithAnimation count={retweetCount} active={retweeted} activeColor="var(--green)" />
                            </button>

                            {/* Quote */}
                            <button className="action-btn" style={{ color: "var(--text-secondary)" }} onClick={(e) => { e.stopPropagation(); if (!userId) router.push("/login"); else setShowQuoteModal(true); }} title={t("quote")}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>

                            {/* Like */}
                            <button className={`action-btn like ${liked ? "liked" : ""}`} onClick={handleLike}>
                                <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <svg className={liked ? "animate-heart" : ""} viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative", zIndex: 2 }}>
                                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                                    </svg>
                                    <AnimatePresence>
                                        {isAnimatingLike && (
                                            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                                                {Array.from({ length: 12 }).map((_, i) => {
                                                    const angle = (i * 30 * Math.PI) / 180;
                                                    const distance = i % 2 === 0 ? 35 : 50; 
                                                    const size = i % 2 === 0 ? 5 : 3; 
                                                    const colors = ["var(--red)", "#ff007f", "#ff2a6d", "#05d9e8", "#ffc200", "#ffd700"];
                                                    const color = colors[i % colors.length];
                                                    return (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
                                                            animate={{ 
                                                                opacity: 0, 
                                                                scale: 0, 
                                                                x: Math.cos(angle) * distance, 
                                                                y: Math.sin(angle) * distance 
                                                            }}
                                                            transition={{ duration: 0.7, ease: "easeOut" }}
                                                            style={{
                                                                position: "absolute",
                                                                top: "50%",
                                                                left: "50%",
                                                                width: size,
                                                                height: size,
                                                                backgroundColor: color,
                                                                borderRadius: "50%",
                                                                marginTop: -size / 2,
                                                                marginLeft: -size / 2,
                                                                boxShadow: `0 0 6px ${color}`
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <CountWithAnimation count={likeCount} active={liked} activeColor="var(--red)" />
                            </button>



                            <div style={{ position: "relative" }} ref={menuRef} onClick={(e) => e.stopPropagation()}>
                                <button 
                                    className={`action-btn bookmark ${bookmarked ? "bookmarked" : ""}`} 
                                    onClick={handleBookmark}
                                    title={t("bookmark")}
                                    style={{ position: "relative" }}
                                >
                                    <svg viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    <CountWithAnimation count={bookmarkCount} active={bookmarked} activeColor="var(--blue)" />
                                    
                                    {bookmarked && (
                                        <div style={{ 
                                            position: "absolute", 
                                            top: -2, 
                                            right: -2, 
                                            background: "var(--blue)", 
                                            width: 8, 
                                            height: 8, 
                                            borderRadius: "50%", 
                                            border: "2px solid var(--bg-primary)",
                                            boxShadow: "0 0 4px var(--blue)"
                                        }} />
                                    )}
                                </button>
                                
                                <AnimatePresence>
                                    {showFolderMenu && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            style={{ 
                                                position: "absolute", 
                                                bottom: "100%", 
                                                left: "-60px", 
                                                background: "rgba(var(--bg-rgb), 0.8)", 
                                                backdropFilter: "blur(20px)",
                                                WebkitBackdropFilter: "blur(20px)",
                                                border: "1px solid rgba(var(--blue), 0.2)", 
                                                borderRadius: "16px", 
                                                padding: "8px 0", 
                                                minWidth: "240px",
                                                boxShadow: "0 10px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
                                                zIndex: 200,
                                                marginBottom: "12px",
                                                overflow: "hidden"
                                            }}
                                            className="glass"
                                        >
                                            <div style={{ padding: "8px 16px 4px", fontSize: "0.7rem", color: "var(--blue)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                {t("saveToFolder")}
                                            </div>
                                            <div style={{ maxHeight: "200px", overflowY: "auto", padding: "4px 0" }} className="custom-scrollbar">
                                                {isLoadingFolders ? (
                                                    <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}>
                                                        <div className="spinner" style={{ width: 20, height: 20, borderWidth: "2px" }} />
                                                    </div>
                                                ) : (
                                                    <>
                                                        {folders.length === 0 ? (
                                                            <div style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                                                {t("noFoldersFound")}
                                                            </div>
                                                        ) : (
                                                            folders.map(folder => (
                                                                <button 
                                                                    key={folder.id} 
                                                                    onClick={(e) => handleSaveToFolder(e, folder.id)}
                                                                    className="dropdown-item"
                                                                    style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px" }}
                                                                >
                                                                    <div style={{ background: "var(--blue-faint)", color: "var(--blue)", padding: 6, borderRadius: 8 }}>
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                                                        </svg>
                                                                    </div>
                                                                    <span style={{ flex: 1, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{folder.name}</span>
                                                                </button>
                                                            ))
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            <form 
                                                onSubmit={handleQuickCreateFolder}
                                                style={{ padding: "10px 12px", borderTop: "1px solid rgba(var(--border-rgb), 0.5)", display: "flex", gap: "8px" }}
                                            >
                                                <input 
                                                    type="text"
                                                    placeholder={t("newFolder")}
                                                    value={quickFolderName}
                                                    onChange={(e) => setQuickFolderName(e.target.value)}
                                                    style={{ 
                                                        flex: 1, 
                                                        padding: "6px 10px", 
                                                        fontSize: "0.85rem", 
                                                        borderRadius: "8px", 
                                                        border: "1px solid var(--border)",
                                                        background: "var(--bg-primary)",
                                                        color: "var(--text-primary)"
                                                    }}
                                                />
                                                <button 
                                                    type="submit"
                                                    disabled={!quickFolderName.trim()}
                                                    style={{ 
                                                        background: "var(--blue)", 
                                                        color: "white", 
                                                        borderRadius: "8px", 
                                                        padding: "0 10px", 
                                                        fontSize: "1rem",
                                                        fontWeight: 600,
                                                        opacity: quickFolderName.trim() ? 1 : 0.5
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </form>
                                            
                                            <div style={{ borderTop: "1px solid rgba(var(--border-rgb), 0.5)", paddingTop: "4px" }}>
                                                <Link 
                                                    href="/bookmarks" 
                                                    className="dropdown-item"
                                                    style={{ gap: "10px", padding: "10px 16px", opacity: 0.8 }}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                                        <path d="M12 20h9a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" />
                                                    </svg>
                                                    <span style={{ fontSize: "0.85rem" }}>{t("manageFolders")}</span>
                                                </Link>
                                                
                                                <button 
                                                    onClick={handleRemoveBookmark}
                                                    className="dropdown-item danger"
                                                    style={{ gap: "10px", padding: "10px 16px", borderTop: "1px solid rgba(var(--red-rgb), 0.1)" }}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                                        <path d="M18 6L6 18M6 6l12 12" />
                                                    </svg>
                                                    <span style={{ fontSize: "0.85rem" }}>{t("removeBookmark")}</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Share */}
                            <button className="action-btn share" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(`${window.location.origin}/tweet/${tweet.id}`); addToast(t("linkCopied"), "success"); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                </svg>
                            </button>

                            {/* Views */}
                            {showViews && (
                                <div className="action-btn views" style={{ cursor: "default", display: "flex", alignItems: "center", gap: "4px", color: "var(--text-secondary)" }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                                        <path d="M12 20V10M18 20V4M6 20v-4" />
                                    </svg>
                                    <CountWithAnimation count={tweet.views || 0} />
                                </div>
                            )}
                        </div>
                    </div>
                </>
                )}
            </div>
            {shouldBlurWhole && (
                    <div 
                        style={{ 
                            position: "absolute", 
                            inset: 0, 
                            display: "flex", 
                            flexDirection: "column", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            zIndex: 100,
                            padding: "24px",
                            textAlign: "center",
                            background: "rgba(15, 23, 42, 0.85)",
                            backdropFilter: "blur(24px)",
                            WebkitBackdropFilter: "blur(24px)",
                            borderRadius: "inherit",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            boxShadow: "inset 0 0 40px rgba(0, 0, 0, 0.6)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ 
                            background: "rgba(244, 63, 94, 0.15)", 
                            padding: "16px", 
                            borderRadius: "50%", 
                            marginBottom: "16px",
                            border: "1px solid rgba(244, 63, 94, 0.3)",
                            boxShadow: "0 0 20px rgba(244, 63, 94, 0.1)"
                        }}>
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <h4 style={{ color: "white", margin: "0 0 8px 0", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                            Contenido Altamente Sensible
                        </h4>
                        <p style={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 400, fontSize: "0.85rem", maxWidth: "280px", margin: "0 0 20px 0", lineHeight: "1.4" }}>
                            Esta publicación ha sido marcada debido a su contenido gráfico o sensible.
                        </p>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
                            style={{ 
                                background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)", 
                                color: "#0f172a", 
                                border: "none", 
                                padding: "10px 24px", 
                                borderRadius: "30px", 
                                fontWeight: 700, 
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                                transition: "all 0.2s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.05)";
                                e.currentTarget.style.boxShadow = "0 6px 16px rgba(255, 255, 255, 0.15)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
                            }}
                        >
                            👁️ Ver de todos modos
                        </button>
                    </div>
                )}
                
                {shouldBlurMediaOnly && (
                    <div 
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 11,
                            pointerEvents: "auto",
                            background: "rgba(15, 23, 42, 0.45)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            borderRadius: "inherit"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                         <button 
                            onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
                            style={{ 
                                background: "rgba(15, 23, 42, 0.9)", 
                                color: "white", 
                                border: "1px solid rgba(255, 255, 255, 0.15)", 
                                padding: "10px 20px", 
                                borderRadius: "30px", 
                                fontWeight: 700, 
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                backdropFilter: "blur(12px)",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.05)";
                                e.currentTarget.style.background = "#1e293b";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.background = "rgba(15, 23, 42, 0.9)";
                            }}
                        >
                            👁️ Mostrar multimedia
                        </button>
                    </div>
                )}
            </motion.article>
            {
                showQuoteModal && (
                    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 100, paddingTop: "5vh" }} onClick={(e) => { e.stopPropagation(); setShowQuoteModal(false); }}>
                        <div style={{ background: "var(--bg-main)", padding: "16px", borderRadius: "16px", width: "90%", maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                                <button className="icon-btn" onClick={() => setShowQuoteModal(false)}>✕</button>
                            </div>
                            <ComposeTweet placeholder={t("addAComment")} quoteOfId={tweet.id} onSuccess={() => setShowQuoteModal(false)} autoFocus />
                        </div>
                    </div>
                )
            }
            {lightboxMedia && (
                <MediaLightbox 
                    images={lightboxMedia.images} 
                    initialIndex={lightboxMedia.index} 
                    onClose={() => setLightboxMedia(null)} 
                    tweet={tweet}
                    userId={userId}
                />
            )}
            <DeleteConfirmModal 
                show={showDeleteConfirm} 
                onConfirm={handleConfirmDelete} 
                onCancel={() => setShowDeleteConfirm(false)} 
                isDeleting={isDeleting} 
                t={t} 
            />
            <ReportConfirmModal 
                show={showReportConfirm} 
                onConfirm={handleConfirmReport} 
                onCancel={() => setShowReportConfirm(false)} 
                t={t} 
            />
        </>
    );
}

export const VideoPlayer = ({ src, style, autoplay }: { src: string, style?: any, autoplay: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    
    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;
        
        // Per user request: force auto-play even if setting is off
        // if (!autoplay) { ... } 

        const observer = new IntersectionObserver(
            ([entry]) => {
                const currVid = videoRef.current;
                if (!currVid) return;
                if (entry.isIntersecting) {
                    currVid.play().catch(() => {});
                } else {
                    currVid.pause();
                }
            },
            { threshold: 0.5 }
        );

        observer.observe(vid);
        return () => observer.disconnect();
    }, [autoplay]);

    return (
        <video 
            ref={videoRef} 
            src={src} 
            style={style} 
            autoPlay
            muted 
            controls
            playsInline 
            loop 
        />
    );
};

const SourceBubbles = ({ sources }: { sources: any[] }) => {
    const [expanded, setExpanded] = useState(false);
    const displaySources = expanded ? sources : sources.slice(0, 5);
    const hasMore = sources.length > 5;

    return (
        <div className="ai-sources-container" onClick={(e) => e.stopPropagation()}>
            {displaySources.map((source, idx) => {
                const url = typeof source === "string" ? source : source.url;
                const title = typeof source === "string" ? new URL(source).hostname : (source.title || new URL(source.url).hostname);
                
                return (
                    <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="ai-source-bubble"
                        title={url}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        <span>{title}</span>
                    </a>
                );
            })}
            {hasMore && !expanded && (
                <button 
                    className="ai-source-more" 
                    onClick={() => setExpanded(true)}
                >
                    +{sources.length - 5}
                </button>
            )}
        </div>
    );
};
