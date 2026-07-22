"use client";

import { useState, useCallback } from "react";
import { ChatMessages } from "./ChatMessages";
import { ChatForm } from "./ChatForm";

interface ChatViewProps {
    initialMessages: any[];
    conversationId: string;
    userId: string;
    recipientPublicKey?: string;
}

export function ChatView({ initialMessages, conversationId, userId, recipientPublicKey }: ChatViewProps) {
    // Optimistic messages added before server confirms
    const [optimisticMessages, setOptimisticMessages] = useState<any[]>([]);

    const handleOptimisticSend = useCallback((content: string) => {
        const tempId = `optimistic-${Date.now()}`;
        const optimisticMsg = {
            id: tempId,
            content,
            senderId: userId,
            createdAt: new Date().toISOString(),
            type: "text",
            audioUrl: null,
            reactions: [],
            read: false,
            isEncrypted: false,
            isOptimistic: true,
            sender: null,
        };
        setOptimisticMessages(prev => [...prev, optimisticMsg]);
    }, [userId]);

    // When real message arrives via Pusher, remove the optimistic copy
    const handleRealMessageArrived = useCallback(() => {
        setOptimisticMessages([]);
    }, []);

    return (
        <>
            <ChatMessages
                initialMessages={initialMessages}
                conversationId={conversationId}
                userId={userId}
                optimisticMessages={optimisticMessages}
                onRealMessageArrived={handleRealMessageArrived}
            />
            <ChatForm
                conversationId={conversationId}
                userId={userId}
                recipientPublicKey={recipientPublicKey}
                onOptimisticSend={handleOptimisticSend}
            />
        </>
    );
}
