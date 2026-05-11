"use client";

import { useEffect } from "react";
import PusherClient from "pusher-js";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

export function RealtimeProvider() {
    const { t } = useTranslation();
    const router = useRouter();
    const { data: session } = useSession();
    const userId = (session?.user as any)?.id;

    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_PUSHER_APP_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) return;

        // Initialize Pusher client
        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        });

        // Channel for new tweets in global feed
        const globalChannel = pusher.subscribe("global-feed");
        globalChannel.bind("new-tweet", (data: any) => {
            router.refresh();
        });

        // Channel for individual tweet actions (likes, rts)
        const actionsChannel = pusher.subscribe("tweet-actions");
        
        // User-specific notification channel
        if (userId) {
            const userChannel = pusher.subscribe(`user-notifs-${userId}`);
            userChannel.bind("new-notification", (data: any) => {
                const message = data.message || t("newActivity");
                toast.success(message, {
                    icon: "🔥",
                    style: {
                        borderRadius: "12px",
                        background: "var(--bg-elevated)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border)",
                    },
                });
                router.refresh();
            });
        }

        return () => {
            pusher.unsubscribe("global-feed");
            pusher.unsubscribe("tweet-actions");
            if (userId) pusher.unsubscribe(`user-notifs-${userId}`);
        };
    }, [router, userId]);

    return null;
}
