"use client";

import { useState, useEffect } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface NotificationBadgeProps {
    initialCount: number;
}

export function NotificationBadge({ initialCount }: NotificationBadgeProps) {
    const { data: session } = useSession();
    const [count, setCount] = useState(initialCount);

    useEffect(() => {
        if (!session?.user?.id) return;

        // Fetch initial count if not provided accurately (optional, but good for sync)
        const fetchCount = async () => {
            try {
                const res = await fetch("/api/notifications/unread-count");
                const data = await res.json();
                setCount(data.count);
            } catch (err) {
                console.error("Failed to fetch unread count", err);
            }
        };
        fetchCount();

        const channel = pusherClient.subscribe(`user-${session.user.id}`);

        channel.bind("notification", (data: any) => {
            setCount((prev) => prev + 1);
            toast.success(data.message || "New notification!", {
                icon: "🔔",
                style: {
                    borderRadius: "9999px",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                },
            });
        });

        // Listen for "read" event to clear badge
        channel.bind("notifications-read", () => {
            setCount(0);
        });

        return () => {
            pusherClient.unsubscribe(`user-${session.user.id}`);
        };
    }, [session?.user?.id]);

    if (count <= 0) return null;

    return (
        <span className="notification-badge">
            {count > 99 ? "99+" : count}
        </span>
    );
}
