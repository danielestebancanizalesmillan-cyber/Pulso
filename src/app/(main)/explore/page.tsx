"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TweetCard } from "@/components/TweetCard";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n";

interface SearchUser { id: string; name: string; username: string; bio?: string; }
interface SearchTweet { id: string; content: string; author: SearchUser; createdAt: string; likes: any[]; replies: any[]; retweets: any[]; images: { url: string }[]; _count: any; }

export default function ExplorePage() {
    const router = useRouter();
    const params = useSearchParams();
    const { t } = useTranslation();
    const { data: session } = useSession();
    const [query, setQuery] = useState(params.get("q") || "");
    const [tab, setTab] = useState<"tweets" | "users">("tweets");
    const [tweets, setTweets] = useState<SearchTweet[]>([]);
    const [trends, setTrends] = useState<any[]>([]);
    const [users, setUsers] = useState<SearchUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Derive filters from query string
    const filters = {
        hasMedia: query.includes("has:media"),
        minLikes: query.match(/min_likes:(\d+)/i)?.[1] || "",
        since: query.match(/since:(\d{4}-\d{2}-\d{2})/i)?.[1] || "",
        until: query.match(/until:(\d{4}-\d{2}-\d{2})/i)?.[1] || ""
    };

    const updateFilter = (type: string, value: string | boolean) => {
        let clean = query
            .replace(/has:media/gi, "")
            .replace(/min_likes:\d+/gi, "")
            .replace(/since:\d{4}-\d{2}-\d{2}/gi, "")
            .replace(/until:\d{4}-\d{2}-\d{2}/gi, "")
            .replace(/\s+/g, " ")
            .trim();

        const f = { ...filters };
        if (type === "hasMedia") f.hasMedia = value as boolean;
        if (type === "minLikes") f.minLikes = value as string;
        if (type === "since") f.since = value as string;
        if (type === "until") f.until = value as string;

        if (f.hasMedia) clean += " has:media";
        if (f.minLikes) clean += ` min_likes:${f.minLikes}`;
        if (f.since) clean += ` since:${f.since}`;
        if (f.until) clean += ` until:${f.until}`;

        setQuery(clean.trim());
    };

    const userId = (session?.user as any)?.id;

    useEffect(() => {
        const q = params.get("q") || "";
        if (q !== query) setQuery(q);
    }, [params]);

    const handleSearch = (val: string) => {
        setQuery(val);
        const url = val.trim() ? `/explore?q=${encodeURIComponent(val.trim())}` : "/explore";
        router.push(url);
        setShowFilters(false);
    };

    useEffect(() => {
        if (!query.trim()) {
            setLoading(true);
            Promise.all([
                fetch("/api/feed/global").then(r => r.json()),
                fetch("/api/trending").then(r => r.json())
            ]).then(([feedData, trendData]) => {
                setTweets(feedData.tweets || []);
                setTrends(trendData.trends || []);
                setLoading(false);
            }).catch(() => setLoading(false));
            return;
        }

        const t = setTimeout(async () => {
            setLoading(true);
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setTweets(data.tweets || []);
            setUsers(data.users || []);
            setLoading(false);
        }, 400);
        return () => clearTimeout(t);
    }, [query]);


    return (
        <>
            <div className="column-header">
                <h1>{t("explore")}</h1>
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", position: "relative" }}>
                <form 
                    className="search-input-wrap"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSearch(query);
                    }}
                    style={{ position: "relative" }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        placeholder={t("searchPulso")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {query && (
                            <button 
                                type="button"
                                onClick={() => handleSearch("")} 
                                style={{ color: "var(--text-secondary)", cursor: "pointer", background: "none", border: "none" }}
                            >
                                ✕
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            style={{ background: showFilters ? "rgba(29, 155, 240, 0.1)" : "none", border: "none", cursor: "pointer", color: showFilters ? "var(--blue)" : "var(--text-secondary)", display: "flex", alignItems: "center", padding: "4px", borderRadius: "50%" }}
                            title="Filtros avanzados"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="12" x2="14" y2="12"/><line x1="18" y1="16" x2="22" y2="16"/></svg>
                        </button>
                    </div>
                </form>

                {showFilters && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: "16px", right: "16px", background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: "12px", animation: "fadeIn 0.15s ease" }}>
                        <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>Filtros avanzados</div>
                        
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.9rem" }}>
                            <input type="checkbox" checked={filters.hasMedia} onChange={(e) => updateFilter("hasMedia", e.target.checked)} style={{ cursor: "pointer" }} />
                            <span>Con imágenes / vídeo</span>
                        </label>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Mínimo de Likes</span>
                            <input 
                                type="number" 
                                value={filters.minLikes} 
                                onChange={(e) => updateFilter("minLikes", e.target.value)} 
                                placeholder="Ej: 5" 
                                style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", color: "var(--text-primary)", fontSize: "0.9rem" }} 
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Desde</span>
                                <input 
                                    type="date" 
                                    value={filters.since} 
                                    onChange={(e) => updateFilter("since", e.target.value)} 
                                    style={{ width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", color: "var(--text-primary)", fontSize: "0.9rem" }} 
                                />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Hasta</span>
                                <input 
                                    type="date" 
                                    value={filters.until} 
                                    onChange={(e) => updateFilter("until", e.target.value)} 
                                    style={{ width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", color: "var(--text-primary)", fontSize: "0.9rem" }} 
                                />
                            </div>
                        </div>

                        <button 
                            type="button" 
                            onClick={() => handleSearch(query)} 
                            style={{ background: "var(--blue)", color: "white", border: "none", borderRadius: "20px", padding: "10px", fontWeight: 700, cursor: "pointer", marginTop: "4px", textAlign: "center" }}
                        >
                            Aplicar filtros
                        </button>
                    </div>
                )}
            </div>


            {query && (
                <div className="tabs">
                    <button className={`tab ${tab === "tweets" ? "active" : ""}`} onClick={() => setTab("tweets")} style={{ textTransform: "capitalize" }}>{t("posts")}</button>
                    <button className={`tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")} style={{ textTransform: "capitalize" }}>{t("people") || "People"}</button>
                </div>
            )}

            {loading ? (
                <div className="loading-feed"><div className="spinner" /></div>
            ) : tab === "users" && query ? (
                <div className="search-results">
                    {users.length === 0 ? (
                        <div className="empty-state"><h2>{t("noPeopleFound")}</h2><p>{t("tryDifferentSearch")}</p></div>
                    ) : users.map((u) => (
                        <div key={u.id} className="user-result-item" onClick={() => router.push(`/${u.username}`)}>
                            <div className="avatar-placeholder avatar-lg">{u.name[0].toUpperCase()}</div>
                            <div className="user-result-info">
                                <div className="user-result-name">{u.name}</div>
                                <div className="user-result-handle">@{u.username}</div>
                                {u.bio && <div className="user-result-bio">{u.bio}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="explore-content">
                    {!query && (
                        <div className="explore-trends-section" style={{ borderBottom: "8px solid var(--border-light)" }}>
                            <h2 style={{ padding: "12px 16px", fontSize: "1.25rem", fontWeight: 800 }}>{t("exploreTrends")}</h2>
                            {trends.slice(0, 10).map((tItem: any, i) => (
                                <div 
                                    key={i} 
                                    className="trend-item" 
                                    style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid var(--border-light)" }}
                                    onClick={() => handleSearch(tItem.name)}
                                >
                                    <div className="trend-meta" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                        {tItem.categoryKey ? t(tItem.categoryKey) : t("new")}
                                    </div>
                                    <div className="trend-name" style={{ fontWeight: 700, margin: "2px 0" }}>{tItem.name}</div>
                                    <div className="trend-count" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{tItem.count} {t("posts")}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {!query && (
                        <h2 style={{ padding: "12px 16px", fontSize: "1.25rem", fontWeight: 800 }}>{t("popularForYou")}</h2>
                    )}

                    {tweets.length === 0 ? (
                        <div className="empty-state"><h2>{t("noTweetsFound")}</h2><p>{t("trySearchingSomethingElse")}</p></div>
                    ) : tweets.map((t) => (
                        <TweetCard key={t.id} tweet={t as any} currentUserId={userId} />
                    ))}
                </div>
            )}
        </>
    );
}
