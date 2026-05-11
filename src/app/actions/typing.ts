"use server";
import { pusherServer } from "@/lib/pusher";

export async function sendTypingStatus(conversationId: string, userId: string, isTyping: boolean) {
    try {
        await pusherServer.trigger(`chat-${conversationId}`, "typing", { userId, isTyping });
    } catch (err) {
        console.error("Error triggering typing Pusher event:", err);
    }
}

