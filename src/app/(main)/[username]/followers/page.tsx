"use client";

import { useEffect, useState } from "react";
import { UserCard } from "@/components/UserCard";
import Link from "next/link";
import { use } from "react";
import { useTranslation } from "@/lib/i18n";

export default function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
    const { t } = useTranslation();
    const { username } = use(params);
    const [followers, setFollowers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/users/${username}/followers`)
            .then(res => res.json())
            .then(data => {
                setFollowers(data);
                setLoading(false);
            });
    }, [username]);

    return (
        <>
            <div className="column-header" style={{ borderBottom: "none" }}>
                <Link href={`/${username}`} className="back-btn" aria-label={t("back")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </Link>
                <div>
                    <h1 style={{ fontSize: "1.25rem" }}>{username}</h1>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}> {t("followers")} </div>
                </div>
            </div>

            <div className="profile-tabs" style={{ display: "flex", borderBottom: "1px solid var(--border)", position: "sticky", top: 53, background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", zIndex: 10 }}>
                <Link href={`/${username}/followers`} className="profile-tab active" style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <span>{t("followers")}</span>
                </Link>
                <Link href={`/${username}/following`} className="profile-tab" style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <span>{t("following")}</span>
                </Link>
            </div>

            {loading ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)" }}>
                    {t("loadingFollowers")}
                </div>
            ) : followers.length === 0 ? (
                <div className="empty-state">
                    <h2>{t("noFollowersYet")}</h2>
                    <p>{t("noFollowersDesc").replace("{username}", `@${username}`)}</p>
                </div>
            ) : (
                followers.map(user => (
                    <UserCard key={user.id} user={user} />
                ))
            )}
        </>
    );
}
