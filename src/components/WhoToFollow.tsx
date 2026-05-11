"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserCard } from "./UserCard";
import { TweetSkeleton } from "./TweetSkeleton";
import { useTranslation } from "@/lib/i18n";

export function WhoToFollow() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch("/api/users/who-to-follow");
                const data = await res.json();
                setUsers(data.users || []);
            } catch (error) {
                console.error("Error fetching who to follow:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    if (loading) {
        return (
            <div className="panel-card">
                <h2 className="panel-title">{t("whoToFollow")}</h2>
                <div style={{ padding: "0 16px" }}>
                    <div className="skeleton" style={{ height: "60px", margin: "12px 0", borderRadius: "12px" }} />
                    <div className="skeleton" style={{ height: "60px", margin: "12px 0", borderRadius: "12px" }} />
                </div>
            </div>
        );
    }

    if (users.length === 0) return null;

    return (
        <div className="panel-card glass">
            <h2 className="panel-title">{t("whoToFollow")}</h2>
            <div className="who-to-follow-list">
                {users.map((u) => (
                    <div key={u.id} className="who-to-follow-item">
                        <UserCard user={u} />
                    </div>
                ))}
            </div>
            <Link href="/suggested" className="show-more" style={{ display: "block", textDecoration: "none" }}>
                {t("showMore")}
            </Link>
        </div>
    );
}
