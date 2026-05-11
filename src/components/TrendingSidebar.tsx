"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { TrendingSkeleton } from "./TweetSkeleton";
import { REGIONS } from "@/lib/constants";

export function TrendingSidebar() {
    const pathname = usePathname();
    const { t } = useTranslation();
    const [trends, setTrends] = useState<{ name: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTrends, setShowTrends] = useState(true);
    const [trendRegion, setTrendRegion] = useState("GLOBAL");
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const checkFeatures = () => {
            setShowTrends(localStorage.getItem("twtr_show_trends") !== "false");
            setTrendRegion(localStorage.getItem("twtr_trend_region") || "GLOBAL");
        };
        checkFeatures();
        window.addEventListener("twtr_settings_changed", checkFeatures);
        
        const fetchTrends = () => {
            fetch(`/api/trending?t=${Date.now()}&countryCode=${trendRegion}`)
                .then((r) => {
                    if (!r.ok) throw new Error("Trending fetch failed");
                    return r.json();
                })
                .then((data) => {
                    if (data.trends) setTrends(data.trends);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        };

        fetchTrends();
        const interval = setInterval(fetchTrends, 15000); // 15 seconds

        return () => {
            clearInterval(interval);
            window.removeEventListener("twtr_settings_changed", checkFeatures);
        };
    }, [trendRegion]);

    if (!showTrends) return null;

    if (loading) {
        return (
            <div style={{ position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="panel-card glass" style={{ padding: "12px 16px" }}>
                    <h2 className="panel-title" style={{ marginBottom: 12 }}>{t("whatsHappening")}</h2>
                    {[1, 2, 3, 4].map(i => <TrendingSkeleton key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="panel-card glass" style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h2 className="panel-title" style={{ marginBottom: 0 }}>{t("whatsHappening")}</h2>
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        style={{ border: "none", background: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 4 }}
                        aria-label="Trend Settings"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                    </button>
                </div>
                <div className="trends-list">
                    {trends.length === 0 ? (
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{t("notMuchRightNow")}</p>
                    ) : (
                        trends.slice(0, 4).map((tItem: any, i) => (
                            <Link href={`/explore?q=${encodeURIComponent(tItem.name)}`} key={i} className="trend-item">
                                <div className="trend-meta">
                                    {trendRegion !== "GLOBAL" 
                                        ? `${t("trendingIn")} ${t("region_" + trendRegion)}` 
                                        : t(tItem.categoryKey || "trendNews")}
                                </div>
                                <div className="trend-name">{tItem.name}</div>
                                <div className="trend-count">{tItem.count} {t("posts")}</div>
                            </Link>
                        ))
                    )}
                </div>
                <Link href="/explore" className="show-more" style={{ display: "block", textDecoration: "none" }}>
                    {t("showMore")}
                </Link>
            </div>

            {isModalOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setIsModalOpen(false)}>
                    <div style={{ background: "var(--bg-main)", padding: 20, borderRadius: 16, width: "90%", maxWidth: 400, border: "1px solid var(--border-light)" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 16, color: "var(--text-main)" }}>{t("trendsSettings") || "Ajustes de Tendencias"}</h3>
                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label className="form-label">{t("location") || "Ubicación"}</label>
                            <select 
                                className="form-input" 
                                value={trendRegion} 
                                onChange={(e) => {
                                    setTrendRegion(e.target.value);
                                    localStorage.setItem("twtr_trend_region", e.target.value);
                                    window.dispatchEvent(new Event("twtr_settings_changed"));
                                }}
                                style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "var(--bg-hover)", border: "1px solid var(--border-light)", color: "var(--text-main)" }}
                            >
                                {REGIONS.map(r => (
                                    <option key={r.code} value={r.code}>{t("region_" + r.code)}</option>
                                ))}
                            </select>
                        </div>
                        <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setIsModalOpen(false)}>{t("done") || "Listo"}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
