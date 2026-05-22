"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TrendingSidebar } from "./TrendingSidebar";
import { WhoToFollow } from "./WhoToFollow";
import { Avatar } from "./Avatar";
import { useTranslation } from "@/lib/i18n";
import { VerifiedBadge } from "./VerifiedBadge";

interface UserSuggestion { id: string; name: string; username: string; isVerified?: boolean; verificationType?: string; badges?: any[]; }

export function RightPanel() {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
    const [hashtagSuggestions, setHashtagSuggestions] = useState<{ text: string }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query.trim()) { 
            setSuggestions([]); 
            setHashtagSuggestions([]);
            return; 
        }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setSuggestions(data.users || []);
                setHashtagSuggestions(data.hashtags || []);
            } finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    const [trends, setTrends] = useState<any[]>([]);
    const [loadingTrends, setLoadingTrends] = useState(true);

    useEffect(() => {
        fetch("/api/trends")
            .then((r) => r.json())
            .then((d) => {
                setTrends(d.trends || []);
                setLoadingTrends(false);
            })
            .catch(() => setLoadingTrends(false));
    }, []);

    const isExplore = pathname === "/explore";

    return (
        <div className="right-panel-content">
            {!isExplore && (
                <div className="search-box-container">
                    <div className="search-input-wrap glass">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            placeholder={t("searchPulso")}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && query.trim()) {
                                    router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
                                    setQuery("");
                                }
                            }}
                        />
                    </div>

                    {(suggestions.length > 0 || hashtagSuggestions.length > 0) && (
                        <div className="search-suggestions panel-card">
                            {hashtagSuggestions.map((h) => (
                                <div key={h.text} className="suggestion-item" onClick={() => { setQuery(""); router.push(`/explore?q=${encodeURIComponent(h.text)}`); }}>
                                    <div className="suggestion-info">
                                        <div className="suggestion-name" style={{ color: "var(--blue)" }}>{h.text}</div>
                                        <div className="suggestion-handle">{t("trendingHashtag")}</div>
                                    </div>
                                </div>
                            ))}
                            {suggestions.map((u) => (
                                <div key={u.id} className="suggestion-item" onClick={() => { setQuery(""); router.push(`/${u.username}`); }}>
                                    <Avatar user={u as any} size="sm" />
                                    <div className="suggestion-info">
                                        <div className="suggestion-name">
                                            {u.name}
                                            <VerifiedBadge isVerified={u.isVerified} type={u.verificationType} size={16} customBadges={u.badges} />
                                        </div>
                                        <div className="suggestion-handle">@{u.username}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <WhoToFollow />
            {!isExplore && <TrendingSidebar />}

            <div style={{ padding: '0 1rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <a href="/terms" target="_blank" style={{ color: 'inherit', textDecoration: 'none' }}>
                    Terms of Service
                </a>
                <a href="/privacy" target="_blank" style={{ color: 'inherit', textDecoration: 'none' }}>
                    Privacy Policy
                </a>
                <span>© 2026 Pulso</span>
            </div>
        </div>
    );
}
