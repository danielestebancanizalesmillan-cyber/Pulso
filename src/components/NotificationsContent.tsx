"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { pusherClient } from "@/lib/pusher-client";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

const icons: Record<string, React.ReactNode> = {
    like: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
    ),
    follow: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
    ),
    retweet: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
        </svg>
    ),
    reply: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
    ),
};

function formatTime(date: Date | string, t: any, locale: string) {
    const d = new Date(date);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}${t("timeSec")}`;
    if (diff < 3600) return `${Math.floor(diff / 60)}${t("timeMin")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${t("timeHour")}`;
    return d.toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { month: "short", day: "numeric" });
}

export function NotificationsContent({ notifications: initialNotifications }: { notifications: any[] }) {
    const { t, locale } = useTranslation();
    const { data: session } = useSession();
    const [notifications, setNotifications] = useState(initialNotifications);

    useEffect(() => {
        if (!session?.user?.id) return;

        const channel = pusherClient.subscribe(`user-${session.user.id}`);
        
        channel.bind("notification", (newNotif: any) => {
            setNotifications((prev) => [newNotif, ...prev]);
        });

        return () => {
            pusherClient.unsubscribe(`user-${session.user.id}`);
        };
    }, [session?.user?.id]);

    function notifText(n: any) {
        const name = n.actor?.name || "Someone";
        let key = "notifInteracted";
        if (n.type === "like") key = "notifLiked";
        if (n.type === "follow") key = "notifFollowed";
        if (n.type === "retweet") key = "notifRetweeted";
        if (n.type === "reply") key = "notifReplied";
        
        return <><strong>{name}</strong> {t(key)}</>;
    }

    if (notifications.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                </div>
                <h2>{t("nothingHereYet")}</h2>
                <p>{t("notifEmptyDesc")}</p>
            </div>
        );
    }

    return (
        <div className="notifications-list">
            {notifications.map((n) => (
                <Link
                    key={n.id}
                    href={n.tweetId ? `/tweet/${n.tweetId}` : `/${n.actor?.username}`}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                    <div className={`notif-item ${!n.read ? "unread" : ""}`}>
                        <div className={`notif-icon ${n.type}`}>
                            {icons[n.type]}
                        </div>
                        <div className="notif-content">
                            <div className="avatar-placeholder avatar-sm" style={{ marginBottom: 6 }}>
                                {(n.actor?.name || "?")[0].toUpperCase()}
                            </div>
                            <div className="notif-text">{notifText(n)}</div>
                            {n.tweet && (
                                <div className="notif-tweet-preview">{n.tweet.content}</div>
                            )}
                            <div className="notif-time" suppressHydrationWarning>{formatTime(n.createdAt, t, locale)}</div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
