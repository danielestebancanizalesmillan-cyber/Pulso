"use client";

import { startConversation } from "@/app/actions/message";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function MessageButton({ userId }: { userId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleMessage = () => {
        startTransition(async () => {
            try {
                const convId = await startConversation(userId);
                router.push(`/messages/${convId}`);
            } catch (e) {
                console.error(e);
            }
        });
    };

    return (
        <button
            className="btn btn-outline"
            onClick={handleMessage}
            disabled={isPending}
            title="Message"
            style={{
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "50%"
            }}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
            </svg>
        </button>
    );
}
