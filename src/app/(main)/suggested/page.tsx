"use client";

import { useState, useEffect } from "react";
import { UserCard } from "@/components/UserCard";
import { useTranslation } from "@/lib/i18n";
import { useRouter } from "next/navigation";

export default function SuggestedPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();
    const router = useRouter();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch("/api/users/who-to-follow?limit=50");
                const data = await res.json();
                setUsers(data.users || []);
            } catch (error) {
                console.error("Error fetching suggested users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    return (
        <>
            <div className="column-header" style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", borderRadius: "50%", transition: "background 0.2s" }} className="hover-bg">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 style={{ marginLeft: "16px", fontSize: "1.25rem", fontWeight: 800 }}>{t("whoToFollow")}</h1>
            </div>

            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                    <div className="spinner" />
                </div>
            ) : users.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                    {t("noPeopleFound")}
                </div>
            ) : (
                <div className="suggested-users-list">
                    {users.map((u) => (
                        <UserCard key={u.id} user={u} />
                    ))}
                </div>
            )}
        </>
    );
}
