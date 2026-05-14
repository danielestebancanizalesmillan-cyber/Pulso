"use client";

import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PostContentTranslator } from "@/components/PostContentTranslator";
import { ViewCounter } from "@/components/ViewCounter";
import { TweetActionBar } from "@/components/TweetActionBar";
import { ComposeTweet } from "@/components/ComposeTweet";
import { TweetCard, CountWithAnimation, VideoPlayer } from "@/components/TweetCard";
import { MediaLightbox } from "@/components/MediaLightbox";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { pusherClient } from "@/lib/pusher-client";

function SubRepliesList({ replies, userId }: { replies: any[], userId?: string }) {
    const [limit, setLimit] = useState(3);
    const visibleReplies = replies.slice(0, limit);
    const hasMore = replies.length > limit;

    if (replies.length === 0) return null;

    return (
        <div style={{ marginLeft: "20px", paddingLeft: "16px", borderLeft: "2px dashed rgba(255,255,255,0.15)", marginBottom: "16px", marginTop: "4px" }}>
            {visibleReplies.map((reply) => (
                <div key={reply.id} style={{ opacity: 0.95 }}>
                    <TweetCard tweet={reply} currentUserId={userId} />
                </div>
            ))}
            {hasMore && (
                <div style={{ padding: "6px 0", display: "flex", gap: "8px" }}>
                    <button 
                        onClick={() => setLimit(prev => prev + 10)} 
                        style={{ background: "rgba(29, 155, 240, 0.1)", border: "1px solid rgba(29, 155, 240, 0.2)", color: "var(--blue)", cursor: "pointer", fontSize: "0.82rem", padding: "5px 12px", borderRadius: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}
                    >
                        <span>💬</span> Mostrar {replies.length - limit} más
                    </button>
                </div>
            )}
            {!hasMore && limit > 3 && (
                <div style={{ padding: "6px 0", display: "flex" }}>
                    <button 
                        onClick={() => setLimit(3)} 
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.82rem", padding: "5px 12px", borderRadius: "16px", fontWeight: 700, display: "flex", alignItems: "center" }}
                    >
                        Ocultar
                    </button>
                </div>
            )}
        </div>
    );
}

export function TweetDetailContent({ tweet: initialTweet, userId }: { tweet: any, userId?: string }) {
    const { t, locale } = useTranslation();
    const [lightboxMedia, setLightboxMedia] = useState<{ images: any[], index: number } | null>(null);
    const [showViews, setShowViews] = useState(true);
    const [detailedTweet, setDetailedTweet] = useState(initialTweet);
    
    // Lifted states for stats synchronization
    const [likeCount, setLikeCount] = useState<number>(initialTweet._count?.likes || 0);
    const [retweetCount, setRetweetCount] = useState<number>(initialTweet._count?.retweets || 0);
    const [replyCount, setReplyCount] = useState<number>(initialTweet._count?.replies || 0);

    useEffect(() => {
        const channel = pusherClient.subscribe("tweet-actions");
        
        const handleUpdate = ({ tweetId, actorId }: { tweetId: string, actorId?: string }) => {
            if (tweetId === initialTweet.id) {
                fetch(`/api/tweets/${tweetId}?t=${Date.now()}`)
                    .then(r => r.json())
                    .then(updated => {
                        if (updated && updated.id) {
                            console.log(`[DEBUG] Re-fetched count for ${tweetId}:`, updated._count);
                            setDetailedTweet(updated);
                            setLikeCount(updated._count?.likes || 0);
                            setRetweetCount(updated._count?.retweets || 0);
                            setReplyCount(updated._count?.replies || 0);
                        }
                    });
            }
        };

        channel.bind("like-update", handleUpdate);
        channel.bind("retweet-update", handleUpdate);
        channel.bind("reply-update", handleUpdate);
        channel.bind("view-update", handleUpdate);
        channel.bind("bookmark-update", handleUpdate);

        return () => {
            pusherClient.unsubscribe("tweet-actions");
        };
    }, [initialTweet.id]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const checkFeatures = () => {
                setShowViews(localStorage.getItem("twtr_show_views") !== "false");
            };
            checkFeatures();
            window.addEventListener("twtr_settings_changed", checkFeatures);
            return () => {
                window.removeEventListener("twtr_settings_changed", checkFeatures);
            };
        }
    }, []);

    const ancestors: any[] = [];
    try {
        let current = detailedTweet.parent;
        let depth = 0;
        while (current && depth < 5) {
            ancestors.unshift(current);
            current = current.parent;
            depth++;
        }
    } catch (err) {
        console.error("Error building ancestors chain:", err);
    }

    return (
        <>
            <div className="column-header">
                <Link href="/home" className="back-btn" aria-label={t("back")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </Link>
                <h1>{t("post")}</h1>
            </div>

            {/* Ancestors Thread Chain */}
            {ancestors.map((anc) => (
                <TweetCard key={anc.id} tweet={anc} currentUserId={userId} showThread={true} />
            ))}

            <motion.div 
                className="tweet-card-focused"
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <Link href={`/${(detailedTweet as any).author?.username}`} onClick={(e) => e.stopPropagation()}>
                        <Avatar user={(detailedTweet as any).author} size="md" />
                    </Link>
                    <Link 
                        href={`/${(detailedTweet as any).author?.username}`} 
                        onClick={(e) => e.stopPropagation()}
                        style={{ textDecoration: "none", color: "inherit" }}
                    >
                        <div style={{ fontWeight: 700 }}>{(detailedTweet as any).author?.name}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>@{(detailedTweet as any).author?.username}</div>
                    </Link>
                </div>

                <PostContentTranslator content={detailedTweet.content} />
                
                {detailedTweet.poll && (
                    <div className="poll-container" style={{ margin: "16px 0", padding: "16px", border: "1px solid var(--border)", borderRadius: "16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {(() => {
                                const totalVotes = detailedTweet.poll.options.reduce((acc: number, opt: any) => acc + (opt.votes?.length || 0), 0);
                                const hasVoted = detailedTweet.poll.options.some((opt: any) => opt.votes?.some((v: any) => v.userId === userId));
                                const isExpired = new Date() > new Date(detailedTweet.poll.expiresAt);
                                const showResults = hasVoted || isExpired || detailedTweet.authorId === userId;

                                return (
                                    <>
                                        {detailedTweet.poll.options.map((option: any) => {
                                            const voteCount = option.votes?.length || 0;
                                            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                            const userVotedForThis = option.votes?.some((v: any) => v.userId === userId);

                                            return (
                                                <div key={option.id} style={{ position: "relative" }}>
                                                    {showResults ? (
                                                        <div style={{ 
                                                            position: "relative", 
                                                            height: "40px", 
                                                            background: "var(--bg-hover)", 
                                                            borderRadius: "6px", 
                                                            overflow: "hidden",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            padding: "0 14px",
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
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                // Use transition if we had it, but for now just call the action
                                                                const { voteInPoll } = await import("@/app/actions/tweet");
                                                                try {
                                                                    await voteInPoll(option.id);
                                                                } catch (err) {
                                                                    console.error(err);
                                                                }
                                                            }}
                                                            style={{ 
                                                                width: "100%", 
                                                                height: "40px", 
                                                                background: "none", 
                                                                border: "1px solid var(--blue)", 
                                                                color: "var(--blue)", 
                                                                borderRadius: "20px", 
                                                                cursor: "pointer",
                                                                fontWeight: 700,
                                                                transition: "background 0.2s"
                                                            }}
                                                        >
                                                            {option.text}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        <div style={{ marginTop: "8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                                            {totalVotes} {t("votes") || "votes"} · {isExpired ? (t("finalResults") || "Final results") : (t("pollOpen") || "Poll open")}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {detailedTweet.images && detailedTweet.images.length > 0 && (
                    <div style={{
                        marginTop: 16,
                        marginBottom: 16,
                        display: "grid",
                        gridTemplateColumns: detailedTweet.images.length > 1 ? "1fr 1fr" : "1fr",
                        gap: 2,
                        borderRadius: 16,
                        overflow: "hidden",
                        border: "1px solid var(--border)"
                    }}>
                        {detailedTweet.images.map((img: any, idx: number) => (
                            <div 
                                key={idx} 
                                style={{ position: "relative", width: "100%", height: "100%", cursor: "pointer" }}
                                onClick={() => setLightboxMedia({ images: detailedTweet.images, index: idx })}
                            >
                                {img.type === 'video' ? (
                                    <div style={{ position: "relative", height: "100%" }}>
                                        <VideoPlayer 
                                            src={img.url} 
                                            style={{
                                                width: "100%",
                                                height: detailedTweet.images.length === 1 ? "auto" : (detailedTweet.images.length === 2 ? 350 : 220),
                                                maxHeight: detailedTweet.images.length === 1 ? 500 : 350,
                                                objectFit: "cover",
                                                borderRadius: "inherit"
                                            }}
                                            autoplay={true}
                                        />
                                    </div>
                                ) : img.type === 'audio' ? (
                                    <div style={{ width: "100%", padding: 12, background: "rgba(0,0,0,0.06)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <audio src={img.url} crossOrigin="anonymous" controls style={{ width: "100%" }} />
                                    </div>
                                ) : (
                                    <img
                                        src={img.url}
                                        alt={t("tweet")}
                                        style={{
                                            width: "100%",
                                            height: detailedTweet.images.length === 1 ? "auto" : (detailedTweet.images.length === 2 ? 350 : 220),
                                            maxHeight: detailedTweet.images.length === 1 ? 500 : 350,
                                            objectFit: "cover"
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {detailedTweet.quoteOf && (
                    <Link 
                        href={`/tweet/${detailedTweet.quoteOf.id}`} 
                        className="quote-link"
                        style={{ display: "block", textDecoration: "none", color: "inherit", marginTop: 12, marginBottom: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 16, cursor: "pointer" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <Avatar user={detailedTweet.quoteOf.author} size="sm" />
                            <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 2 }}>
                                {detailedTweet.quoteOf.author.name}
                                {detailedTweet.quoteOf.author.isVerified && (
                                    <svg viewBox="0 0 24 24" fill="#1d9bf0" style={{ width: 14, height: 14 }}>
                                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.756 2.766 1.918 3.46-.09.385-.138.79-.138 1.2 0 2.21 1.71 4 3.918 4 .51 0 1.004-.112 1.458-.315C9.282 22.095 10.562 23 12 23s2.718-.905 3.337-2.165c.454.203.95.315 1.458.315 2.21 0 3.918-1.79 3.918-4 0-.41-.048-.815-.138-1.2 1.162-.694 1.918-2 1.918-3.46zM10.25 17.5l-3.5-3.5 1.41-1.41L10.25 14.67l7.09-7.09 1.41 1.41-8.5 8.5z" />
                                    </svg>
                                )}
                            </span>
                            <span style={{ color: "var(--text-secondary)" }}>@{detailedTweet.quoteOf.author.username}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.95rem" }}>{detailedTweet.quoteOf.content}</p>
                    </Link>
                )}

                <div className="tweet-focused-meta">
                    <span suppressHydrationWarning>{new Date(detailedTweet.createdAt).toLocaleTimeString(locale === "en" ? "en-US" : "es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>·</span>
                    <span suppressHydrationWarning>{new Date(detailedTweet.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { month: "long", day: "numeric", year: "numeric" })}</span>
                </div>

                <div className="tweet-focused-stats" style={{ display: "flex", gap: "16px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "12px 0", marginTop: "12px" }}>
                    {showViews && (
                        <div className="focused-stat" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <strong style={{ display: "inline-flex", alignItems: "center" }}><CountWithAnimation count={(detailedTweet as any).views || 0} /></strong> <span>{t("visualizations")}</span>
                        </div>
                    )}
                    <div className="focused-stat" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <strong style={{ display: "inline-flex", alignItems: "center" }}><CountWithAnimation count={retweetCount} /></strong> <span>{t("retweet")}s</span>
                    </div>
                    <div className="focused-stat" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <strong style={{ display: "inline-flex", alignItems: "center" }}><CountWithAnimation count={likeCount} /></strong> <span>{t("like")}s</span>
                    </div>
                    <div className="focused-stat" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <strong style={{ display: "inline-flex", alignItems: "center" }}><CountWithAnimation count={replyCount} /></strong> <span>{t("reply")}s</span>
                    </div>
                </div>

                <ViewCounter tweetId={detailedTweet.id} />
                <TweetActionBar 
                    tweet={detailedTweet} 
                    userId={userId} 
                    onLikeChange={(liked, count) => setLikeCount(count)}
                    onRetweetChange={(rt, count) => setRetweetCount(count)}
                />

            </motion.div>

            <ComposeTweet placeholder={t("postYourReply")} parentId={detailedTweet.id} />

            {((detailedTweet as any).replies || []).map((reply: any) => {
                try {
                    return (
                        <div key={reply.id}>
                            <TweetCard tweet={reply} currentUserId={userId} showThread={false} />
                            <SubRepliesList replies={reply.replies || []} userId={userId} />
                        </div>
                    );
                } catch (err) {
                    console.error("Error rendering reply:", err);
                    return <div key={reply.id} style={{ color: "red", padding: 12 }}>Error en respuesta</div>;
                }
            })}

            {(detailedTweet as any).replies?.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                    </div>
                    <h2>{t("noRepliesYet")}</h2>
                    <p>{t("beTheFirstReply")}</p>
                </div>
            )}
            {lightboxMedia && (
                <MediaLightbox 
                    images={lightboxMedia.images} 
                    initialIndex={lightboxMedia.index} 
                    onClose={() => setLightboxMedia(null)} 
                    tweet={detailedTweet}
                    userId={userId}
                />
            )}
        </>
    );
}
