"use client";

import { useState, useEffect } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

export function MessageBadge() {
    const { data: session } = useSession();
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!session?.user?.id) return;

        const fetchCount = async () => {
            try {
                const res = await fetch("/api/messages/unread-count");
                const data = await res.json();
                setCount(data.count);
            } catch (err) {
                console.error("Failed to fetch unread message count", err);
            }
        };
        fetchCount();

        const channel = pusherClient.subscribe(`user-${session.user.id}`);

        channel.bind("message-notification", (data: any) => {
            setCount((prev) => prev + 1);
            toast.success(data.message || "New message!", {
                icon: "💬",
                style: {
                    borderRadius: "9999px",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                },
            });
        });

        channel.bind("messages-read", () => {
            fetchCount();
        });

        // Listen for local "messages-read" if dispatched via window event
        const handleRead = () => fetchCount();
        window.addEventListener("messages-read", handleRead);

        return () => {
            pusherClient.unsubscribe(`user-${session.user.id}`);
            window.removeEventListener("messages-read", handleRead);
        };
    }, [session?.user?.id]);

    if (count <= 0) return null;

    return (
        <span className="notification-badge">
            {count > 99 ? "99+" : count}
        </span>
    );
}
