"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";
import { TweetCard } from "./TweetCard";
import PusherClient from "pusher-js";
import { motion, AnimatePresence } from "framer-motion";
import { StatusCarousel } from "./StatusCarousel";
import { TweetSkeleton } from "./TweetSkeleton";
import { useTranslation } from "@/lib/i18n";
import { useSession } from "next-auth/react";
import { AdComponent, MOCK_ADS } from "./AdComponent";
import { AdPostCard } from "./AdPostCard";

interface InfiniteFeedProps {
    initialTweets?: any[];
    endpoint: string; // e.g. "/api/feed" 
    currentUserId?: string;
    tab?: string;
    countryCode?: string;
    hideSocial?: boolean; // hide StatusCarousel, ads, and real-time new-tweet notifications
}

const EMPTY_ARRAY: any[] = [];

export function InfiniteFeed({ initialTweets = EMPTY_ARRAY, endpoint, currentUserId, tab = "for-you", countryCode, hideSocial = false }: InfiniteFeedProps) {
    const { t } = useTranslation();
    const { status, data } = useSession();
    const [tweets, setTweets] = useState<any[]>(initialTweets);
    const [newTweetsArrived, setNewTweetsArrived] = useState<any[]>([]);
    const tweetsRef = useRef<any[]>(initialTweets);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(initialTweets.length === 0);
    const [refreshing, setRefreshing] = useState(false);
    const loadingRef = useRef(false);
    const hasMoreRef = useRef(true);
    const [pullDistance, setPullDistance] = useState(0);
    const touchStartRef = useRef<number | null>(null);

    // Sync ref with state
    useEffect(() => {
        tweetsRef.current = tweets;
    }, [tweets]);

    // Reset feed when tab changes
    useEffect(() => {
        if (page > 1 || tweets !== initialTweets) {
            setTweets(initialTweets);
            setPage(1);
            setHasMore(true);
            hasMoreRef.current = true;
            setInitialLoading(initialTweets.length === 0);
        }
    }, [tab, initialTweets]);

    // Create a ref for the observer target
    const observerTarget = useRef<HTMLDivElement>(null);

    const loadMore = useCallback(async () => {
        if (loadingRef.current || !hasMoreRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        try {
            const lastRealTweet = [...tweetsRef.current].reverse().find(t => !t.isAd);
            const cursor = lastRealTweet ? lastRealTweet.id : null;
            if (!endpoint) {
                console.error("InfiniteFeed: No endpoint provided");
                return;
            }
            let url = `${endpoint}?type=${tab}`;
            if (countryCode) url += `&countryCode=${countryCode}`;
            if (cursor) url += `&cursor=${cursor}`;

            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 401) {
                    setHasMore(false);
                    return;
                }
                const text = await res.text();
                throw new Error(`Failed to fetch: ${res.status} ${text.substring(0, 100)}`);
            }
            const data = await res.json();

            const newTweets = data.tweets || [];
            if (newTweets.length === 0) {
                setHasMore(false);
                hasMoreRef.current = false;
            } else {
                setTweets((prev) => {
                    const filtered = newTweets.filter((nt: any) => !prev.some((pt: any) => pt.id === nt.id));
                    if (filtered.length === 0 && newTweets.length > 0) {
                        setHasMore(false);
                        hasMoreRef.current = false;
                        return prev;
                    }
                    return [...prev, ...filtered];
                });
                setPage((p) => p + 1);
            }
        } catch (error) {
            console.error("Error loading more tweets:", error);
        } finally {
            loadingRef.current = false;
            setLoading(false);
            setInitialLoading(false);
        }
    }, [endpoint, tab, countryCode]);

    useEffect(() => {
        if (initialTweets.length === 0 && page === 1 && status !== "loading") {
            loadMore();
        }
    }, [initialTweets.length, page, loadMore, status]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            let url = `${endpoint}?type=${tab}&t=${Date.now()}`;
            if (countryCode) url += `&countryCode=${countryCode}`;
            const res = await fetch(url);
            const data = await res.json();
            setTweets(data.tweets || []);
            setPage(1);
            setHasMore(true);
        } catch (err) {
            console.error("Refresh failed:", err);
        } finally {
            setRefreshing(false);
            setPullDistance(0);
        }
    }, [endpoint, tab]);

    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_PUSHER_APP_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) return;

        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        });

        if (endpoint === "/api/feed") {
            const globalChannel = pusher.subscribe("global-feed");
            globalChannel.bind("new-tweet", (newTweet: any) => {
                if (newTweet.authorId === currentUserId) {
                    // Own tweet: prepend immediately (X-style instant appearance)
                    setTweets((prev) => {
                        if (prev.find(t => t.id === newTweet.id)) return prev;
                        return [newTweet, ...prev];
                    });
                } else {
                    // Other users' tweets: show the "X new posts" button
                    setNewTweetsArrived((prev) => {
                        if (prev.find(t => t.id === newTweet.id) || tweetsRef.current.find(t => t.id === newTweet.id)) return prev;
                        return [newTweet, ...prev];
                    });
                }
            });
        }

        const actionsChannel = pusher.subscribe("tweet-actions");
 
        actionsChannel.bind("like-update", ({ tweetId, actorId }: { tweetId: string, actorId?: string }) => {
            if (actorId === currentUserId) return;
            fetch(`/api/tweets/${tweetId}?t=${Date.now()}`)
                .then(r => r.json())
                .then(updatedTweet => {
                    if (updatedTweet && updatedTweet.id) {
                        setTweets(prev => prev.map(t => t.id === tweetId ? updatedTweet : t));
                    }
                })
                .catch(err => console.error(err));
        });

        actionsChannel.bind("rt-update", ({ tweetId, actorId }: { tweetId: string, actorId?: string }) => {
            if (actorId === currentUserId) return;
            fetch(`/api/tweets/${tweetId}?t=${Date.now()}`)
                .then(r => r.json())
                .then(updatedTweet => {
                    if (updatedTweet && updatedTweet.id) {
                        setTweets(prev => prev.map(t => t.id === tweetId ? updatedTweet : t));
                    }
                })
                .catch(err => console.error(err));
        });
 
        actionsChannel.bind("bookmark-update", ({ tweetId, actorId }: { tweetId: string, actorId?: string }) => {
            if (actorId === currentUserId) return;
            fetch(`/api/tweets/${tweetId}?t=${Date.now()}`)
                .then(r => r.json())
                .then(updatedTweet => {
                    if (updatedTweet && updatedTweet.id) {
                        setTweets(prev => prev.map(t => t.id === tweetId ? updatedTweet : t));
                    }
                })
                .catch(err => console.error(err));
        });

        actionsChannel.bind("reply-update", ({ tweetId }: { tweetId: string }) => {
            fetch(`/api/tweets/${tweetId}?t=${Date.now()}`)
                .then(r => r.json())
                .then(updatedTweet => {
                    if (updatedTweet && updatedTweet.id) {
                        setTweets(prev => prev.map(t => t.id === tweetId ? updatedTweet : t));
                    }
                })
                .catch(err => console.error(err));
        });

        actionsChannel.bind("view-update", ({ tweetId }: { tweetId: string }) => {
            fetch(`/api/tweets/${tweetId}?t=${Date.now()}`)
                .then(r => r.json())
                .then(updatedTweet => {
                    if (updatedTweet && updatedTweet.id) {
                        setTweets(prev => prev.map(t => t.id === tweetId ? updatedTweet : t));
                    }
                })
                .catch(err => console.error(err));
        });

        actionsChannel.bind("tweet-deleted", ({ tweetId }: { tweetId: string }) => {
            setTweets(prev => prev.filter(t => t.id !== tweetId));
        });

        actionsChannel.bind("poll-update", ({ pollId }: { pollId: string }) => {
            setTweets(prev => {
                const tweetToUpdate = prev.find(t => t.poll?.id === pollId);
                if (tweetToUpdate) {
                    fetch(`/api/tweets/${tweetToUpdate.id}?t=${Date.now()}`)
                        .then(r => r.json())
                        .then(updatedTweet => {
                            if (updatedTweet && updatedTweet.id) {
                                setTweets(current => current.map(t => t.id === tweetToUpdate.id ? updatedTweet : t));
                            }
                        })
                        .catch(err => console.error(err));
                }
                return prev;
            });
        });

        return () => {
            pusher.unsubscribe("global-feed");
            pusher.unsubscribe("tweet-actions");
        };
    }, [endpoint]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) touchStartRef.current = e.touches[0].clientY;
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (touchStartRef.current !== null && window.scrollY === 0) {
                const distance = e.touches[0].clientY - touchStartRef.current;
                if (distance > 0) setPullDistance(Math.min(distance * 0.4, 80));
            }
        };
        const handleTouchEnd = () => {
            if (pullDistance > 60) handleRefresh();
            else setPullDistance(0);
            touchStartRef.current = null;
        };

        window.addEventListener("touchstart", handleTouchStart);
        window.addEventListener("touchmove", handleTouchMove);
        window.addEventListener("touchend", handleTouchEnd);
        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [pullDistance, handleRefresh]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading, loadMore]);

    return (
        <div className="feed" style={{ position: "relative" }}>
            {status === "authenticated" && !hideSocial && <StatusCarousel />}
            {pullDistance > 0 && (
                <div style={{ 
                    display: "flex", justifyContent: "center", padding: "12px", 
                    position: "absolute", top: -40, left: 0, right: 0, zIndex: 10,
                    transform: `translateY(${pullDistance}px)`
                }}>
                    <div className="spinner" style={{ opacity: Math.min(pullDistance / 60, 1) }} />
                </div>
            )}
            {refreshing && (
                <div style={{ display: "flex", justifyContent: "center", padding: "12px" }}>
                    <div className="spinner" />
                </div>
            )}
            {newTweetsArrived.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", margin: "12px 0", position: "sticky", top: "12px", zIndex: 100 }}>
                    <button 
                        onClick={() => { 
                            setTweets(prev => [...newTweetsArrived, ...prev]); 
                            setNewTweetsArrived([]); 
                        }} 
                        className="load-new-tweets"
                        style={{ background: "var(--blue)", color: "white", padding: "8px 16px", borderRadius: "9999px", border: "none", cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 12px rgba(29, 155, 240, 0.3)", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                        <span>⬆️</span> {newTweetsArrived.length} {newTweetsArrived.length === 1 ? "nuevo Post" : "nuevos Posts"}
                    </button>
                </div>
            )}
            {initialLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                    <TweetSkeleton key={i} />
                ))
            ) : (
                <AnimatePresence initial={false}>
                    {tweets.map((t) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: -20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            layout
                        >
                            {t.isAd && !hideSocial ? (
                                <AdPostCard ad={t} />
                            ) : !t.isAd ? (
                                <TweetCard tweet={t} currentUserId={currentUserId} />
                            ) : null}
                        </motion.div>
                    ))}
                </AnimatePresence>
            )}

            {hasMore && (
                <div ref={observerTarget} style={{ padding: "24px", display: "flex", justifyContent: "center" }}>
                    <div className="spinner" />
                </div>
            )}

            {!hasMore && tweets.length > 0 && (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {t("noMoreTweets")}
                </div>
            )}
        </div>
    );
}
