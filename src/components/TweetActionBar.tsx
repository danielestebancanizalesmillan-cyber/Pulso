"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { likeTweet, retweetTweet, toggleBookmark } from "@/app/actions/tweet";
import { useToast } from "./ToastProvider";
import { motion, AnimatePresence } from "framer-motion";
import { ComposeTweet } from "./ComposeTweet";

interface TweetActionBarProps {
    tweet: any;
    userId?: string;
    onLikeChange?: (liked: boolean, count: number) => void;
    onRetweetChange?: (retweeted: boolean, count: number) => void;
    onBookmarkChange?: (bookmarked: boolean, count: number) => void;
}

export function TweetActionBar({ tweet, userId, onLikeChange, onRetweetChange, onBookmarkChange }: TweetActionBarProps) {
    const { addToast } = useToast();
    const [isPending, startTransition] = useTransition();
    
    // UI state for animation
    const [isAnimatingLike, setIsAnimatingLike] = useState(false);
    const [showQuoteModal, setShowQuoteModal] = useState(false);

    // Local states for status and counts
    const [liked, setLiked] = useState<boolean>(tweet.likes?.some((l: any) => l.userId === userId) || false);
    const [retweeted, setRetweeted] = useState<boolean>(tweet.retweets?.some((r: any) => r.authorId === userId) || false);
    const [bookmarked, setBookmarked] = useState<boolean>(tweet.bookmarks?.some((b: any) => b.userId === userId) || false);

    const [likeCount, setLikeCount] = useState<number>(tweet._count?.likes || 0);
    const [retweetCount, setRetweetCount] = useState<number>(tweet._count?.retweets || 0);
    const [bookmarkCount, setBookmarkCount] = useState<number>(tweet._count?.bookmarks || 0);
    const [replyCount, setReplyCount] = useState<number>(tweet._count?.replies || 0);

    const { useEffect } = require("react");

    useEffect(() => {
        setLiked(tweet.likes?.some((l: any) => l.userId === userId) || false);
        setRetweeted(tweet.retweets?.some((r: any) => r.authorId === userId) || false);
        setBookmarked(tweet.bookmarks?.some((b: any) => b.userId === userId) || false);

        setLikeCount(tweet._count?.likes || 0);
        setRetweetCount(tweet._count?.retweets || 0);
        setBookmarkCount(tweet._count?.bookmarks || 0);
        setReplyCount(tweet._count?.replies || 0);
    }, [tweet, userId]);

    const handleLike = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!liked) {
            setIsAnimatingLike(true);
            setTimeout(() => setIsAnimatingLike(false), 800);
        }
        
        const wasLiked = liked;
        const newLiked = !wasLiked;
        setLiked(newLiked);
        const newLikeCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
        setLikeCount(newLikeCount);
        onLikeChange?.(newLiked, newLikeCount);

        startTransition(async () => {
            try {
                await likeTweet(tweet.id);
            } catch (err) {
                setLiked(wasLiked);
                setLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
                onLikeChange?.(wasLiked, wasLiked ? likeCount : Math.max(0, likeCount - 1));
                addToast("Failed to like tweet", "error");
            }
        });
    };

    const handleRetweet = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const wasRt = retweeted;
        const newRt = !wasRt;
        setRetweeted(newRt);
        const newRtCount = newRt ? retweetCount + 1 : Math.max(0, retweetCount - 1);
        setRetweetCount(newRtCount);
        onRetweetChange?.(newRt, newRtCount);

        startTransition(async () => {
            try {
                await retweetTweet(tweet.id);
                addToast(wasRt ? "Retweet removed" : "Retweeted", "success");
            } catch (err) {
                setRetweeted(wasRt);
                setRetweetCount(prev => wasRt ? prev + 1 : Math.max(0, prev - 1));
                onRetweetChange?.(wasRt, wasRt ? retweetCount : Math.max(0, retweetCount - 1));
                addToast("Failed to retweet", "error");
            }
        });
    };

    const handleBookmark = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const wasBookmarked = bookmarked;
        const newBookmarked = !wasBookmarked;
        setBookmarked(newBookmarked);
        const newBkCount = newBookmarked ? bookmarkCount + 1 : Math.max(0, bookmarkCount - 1);
        setBookmarkCount(newBkCount);
        onBookmarkChange?.(newBookmarked, newBkCount);

        startTransition(async () => {
            try {
                await toggleBookmark(tweet.id);
                addToast(wasBookmarked ? "Removed from Bookmarks" : "Added to Bookmarks", "success");
            } catch (err) {
                setBookmarked(wasBookmarked);
                setBookmarkCount(prev => wasBookmarked ? prev + 1 : Math.max(0, prev - 1));
                onBookmarkChange?.(wasBookmarked, wasBookmarked ? bookmarkCount : Math.max(0, bookmarkCount - 1));
                addToast("Failed to update bookmark", "error");
            }
        });
    };

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard?.writeText(`${window.location.origin}/tweet/${tweet.id}`);
        addToast("Link copied to clipboard", "success");
    };

    return (
        <>
            <div className="tweet-actions" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "12px 0", maxWidth: "100%", justifyContent: "space-around" }}>
                {/* Reply */}
                <button className="action-btn reply" onClick={(e) => { e.stopPropagation(); document.querySelector<HTMLTextAreaElement>(".compose-tweet textarea")?.focus(); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <span className="action-count">{replyCount || 0}</span>
                </button>

                {/* Retweet */}
                <button className={`action-btn retweet ${retweeted ? "retweeted" : ""}`} onClick={handleRetweet} disabled={isPending}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9"></polyline>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                        <polyline points="7 23 3 19 7 15"></polyline>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                    </svg>
                    <span className="action-count">{retweetCount}</span>
                </button>

                {/* Quote */}
                <button className="action-btn" style={{ color: "var(--text-secondary)" }} onClick={(e) => { e.stopPropagation(); setShowQuoteModal(true); }} title="Quote">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>

                {/* Like */}
                <button className={`action-btn like ${liked ? "liked" : ""}`} onClick={handleLike} disabled={isPending}>
                    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg className={liked ? "animate-heart" : ""} viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative", zIndex: 2 }}>
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                        </svg>
                        <AnimatePresence>
                            {isAnimatingLike && (
                                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 1, scale: 0.8, x: 0, y: 0 }}
                                            animate={{ 
                                                opacity: 0, 
                                                scale: 0, 
                                                x: Math.cos(i * 60 * Math.PI / 180) * 36, 
                                                y: Math.sin(i * 60 * Math.PI / 180) * 36 
                                            }}
                                            transition={{ duration: 0.6, ease: "easeOut" }}
                                            style={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "50%",
                                                width: 5,
                                                height: 5,
                                                backgroundColor: "var(--red)",
                                                borderRadius: "50%",
                                                marginTop: -2.5,
                                                marginLeft: -2.5,
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                    <span className="action-count">{likeCount}</span>
                </button>

                {/* Bookmark */}
                <button className={`action-btn bookmark ${bookmarked ? "bookmarked" : ""}`} onClick={handleBookmark} disabled={isPending}>
                    <svg viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span className="action-count">{bookmarkCount}</span>
                </button>

                {/* Share */}
                <button className="action-btn share" onClick={handleShare}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                </button>
            </div>

            {
                showQuoteModal && (
                    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 100, paddingTop: "5vh" }} onClick={(e) => { e.stopPropagation(); setShowQuoteModal(false); }}>
                        <div style={{ background: "var(--bg-main)", padding: "16px", borderRadius: "16px", width: "90%", maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                                <button className="icon-btn" onClick={() => setShowQuoteModal(false)}>✕</button>
                            </div>
                            <ComposeTweet placeholder="Add a comment" quoteOfId={tweet.id} onSuccess={() => setShowQuoteModal(false)} autoFocus />
                        </div>
                    </div>
                )
            }
        </>
    );
}
