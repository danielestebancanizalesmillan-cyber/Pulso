"use client";

import { useEffect, useState } from "react";
import { getCreatorAnalytics } from "@/app/actions/analytics";
import { useTranslation } from "@/lib/i18n";
import { motion } from "framer-motion";
import Link from "next/link";

interface AnalyticsData {
    followersCount: number;
    followingCount: number;
    totalViews: number;
    totalLikes: number;
    totalReplies: number;
    totalRetweets: number;
    totalBookmarks: number;
    totalTweets: number;
    topTweets: Array<{
        id: string;
        content: string;
        views: number;
        createdAt: Date;
        _count: { likes: number; replies: number; retweets: number; bookmarks: number }
    }>;
}

export default function AnalyticsPage() {
    const { t } = useTranslation();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCreatorAnalytics()
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="skeleton-container" style={{ padding: '20px' }}>{t("analyticsLoading")}</div>;
    if (!data) return <div style={{ padding: '20px' }}>{t("analyticsError")}</div>;

    const stats = [
        { label: t("analyticsImpressions"), value: data.totalViews, icon: "👁️", color: "#1d9bf0" },
        { label: t("analyticsLikes"), value: data.totalLikes, icon: "❤️", color: "#f91880" },
        { label: t("analyticsReplies"), value: data.totalReplies, icon: "💬", color: "#00ba7c" },
        { label: t("analyticsRetweets"), value: data.totalRetweets, icon: "🔁", color: "#00ba7c" },
        { label: t("analyticsBookmarks"), value: data.totalBookmarks, icon: "🔖", color: "#ffd400" },
        { label: t("analyticsTotalTweets"), value: data.totalTweets, icon: "✍️", color: "#1d9bf0" },
    ];

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: 'var(--text)' }}>
            <header style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800 }}>{t("analyticsTitle")}</h1>
                <p style={{ color: 'var(--text-secondary)' }}>{t("analyticsSub")}</p>
            </header>

            {/* Stats Grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                gap: '16px',
                marginBottom: '40px'
            }}>
                {stats.map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                            background: 'var(--bg-secondary)',
                            padding: '20px',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ fontSize: '24px' }}>{s.icon}</div>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</span>
                        <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)' }}>{s.value.toLocaleString()}</span>
                        <div style={{
                            position: 'absolute', right: '-20px', bottom: '-20px', width: '80px', height: '80px',
                            background: s.color, opacity: 0.1, borderRadius: '50%', filter: 'blur(20px)'
                        }} />
                    </motion.div>
                ))}
            </div>

            {/* Top Posts */}
            <section style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>{t("analyticsTopPosts")}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.topTweets.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t("analyticsNoTweets")}</p>
                    ) : (
                        data.topTweets.map((tweet, i) => (
                            <motion.div
                                key={tweet.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.05 }}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{ flex: 1, marginRight: '16px' }}>
                                    <p style={{ 
                                        lineHeight: 1.4, 
                                        marginBottom: '8px', 
                                        color: 'var(--text)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                    }}>
                                        {tweet.content || <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{t("analyticsNoText")}</span>}
                                    </p>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {new Date(tweet.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>👁️</span> {tweet.views || 0}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>❤️</span> {tweet._count.likes || 0}
                                    </div>
                                    <Link href={`/tweet/${tweet.id}`} style={{
                                        padding: '6px 12px', 
                                        borderRadius: '20px', 
                                        background: 'var(--blue)', 
                                        color: '#fff', 
                                        fontSize: '12px', 
                                        fontWeight: 600, 
                                        textDecoration: 'none'
                                    }}>
                                        {t("analyticsView")}
                                    </Link>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
