"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { pusherServer } from "@/lib/pusher";

export async function sendMessage(conversationId: string, content: string, type: string = "text", audioUrl?: string, isEncrypted: boolean = false) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser) throw new Error("Session invalid or user deleted. Please log out and log back in.");

    if (content.length > 1000) throw new Error("Message is too long (max 1000 characters)");

    // Anti-spam: 2 second cooldown
    const lastMessage = await prisma.message.findFirst({
        where: { senderId: session.user.id },
        orderBy: { createdAt: "desc" }
    });
    if (lastMessage) {
        const twoSecondsAgo = new Date(Date.now() - 2000);
        if (lastMessage.createdAt > twoSecondsAgo) {
            throw new Error("You are sending messages too fast. Please wait a moment.");
        }
    }

    // Verify conversation membership
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { participants: { select: { id: true } } }
    });
    
    const isParticipant = conversation?.participants.some(p => p.id === session.user.id);
    if (!isParticipant) throw new Error("Unauthorized to send message to this conversation");

    const message = await prisma.message.create({
        data: {
            content,
            conversationId,
            senderId: session.user.id,
            type,
            audioUrl,
            isEncrypted,
        },
        include: { sender: { select: { id: true, name: true, avatar: true, verificationType: true, isVerified: true } } }
    });


    // Restore conversation for any participant who deleted it
    await prisma.deletedConversation.deleteMany({
        where: { conversationId }
    });


    await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
    });

    // Trigger real-time message
    await pusherServer.trigger(`chat-${conversationId}`, "new-message", message);

    // Trigger recipient notification
    // Trigger recipient notification using pre-fetched conversation
    const recipient = conversation?.participants.find(p => p.id !== session.user.id);
    if (recipient) {
        await pusherServer.trigger(`user-${recipient.id}`, "message-notification", {
            type: "message",
            message: `New message from ${message.sender.name}`,
            conversationId
        });
    }

    revalidatePath(`/messages/${conversationId}`);
    revalidatePath("/messages");
    return message;
}

export async function markMessagesAsRead(conversationId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.message.updateMany({
        where: {
            conversationId: conversationId,
            conversation: { participants: { some: { id: session.user.id } } }, // Bound to participant
            senderId: { not: session.user.id },
            read: false,
        },
        data: { read: true },
    });

    // Notify the user themselves to update global unread count
    await pusherServer.trigger(`user-${session.user.id}`, "messages-read", {
        conversationId
    });

    revalidatePath("/messages");
    return { success: true };
}

export async function startConversation(partnerId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Check if conversation already exists
    const existing = await prisma.conversation.findFirst({
        where: {
            AND: [
                { participants: { some: { id: session.user.id } } },
                { participants: { some: { id: partnerId } } },
            ],
        },
    });

    if (existing) return existing.id;

    // Create new conversation
    const newConv = await prisma.conversation.create({
        data: {
            participants: {
                connect: [{ id: session.user.id }, { id: partnerId }],
            },
        },
    });

    revalidatePath("/messages");
    return newConv.id;
}

export async function toggleMessageReaction(messageId: string, emoji: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const existing = await prisma.messageReaction.findUnique({
        where: {
            messageId_userId_emoji: {
                messageId,
                userId: session.user.id,
                emoji,
            },
        },
    });

    let reaction;
    if (existing) {
        await prisma.messageReaction.delete({
            where: { id: existing.id },
        });
        reaction = { messageId, userId: session.user.id, emoji, removed: true };
    } else {
        reaction = await prisma.messageReaction.create({
            data: {
                messageId,
                userId: session.user.id,
                emoji,
            },
        });
    }

    const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { conversationId: true }
    });

    if (message) {
        await pusherServer.trigger(`chat-${message.conversationId}`, "message-reaction", reaction);
    }

    return { success: true };
}

export async function deleteMessageForMe(messageId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { conversationId: true }
    });

    if (!message) throw new Error("Message not found");

    await prisma.deletedMessage.create({
        data: {
            messageId,
            userId: session.user.id
        }
    });

    await pusherServer.trigger(`chat-${message.conversationId}`, "delete-message-for-me", { messageId, userId: session.user.id });

    revalidatePath(`/messages/${message.conversationId}`);
    return { success: true };
}

export async function deleteMessage(messageId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const message = await prisma.message.findUnique({
        where: { id: messageId }
    });

    if (!message) throw new Error("Message not found");
    if (message.senderId !== session.user.id) throw new Error("Unauthorized to delete this message");

    // Delete reactions first to avoid Foreign Key constraint violations
    await prisma.messageReaction.deleteMany({
        where: { messageId }
    });

    await prisma.message.delete({
        where: { id: messageId }
    });

    await pusherServer.trigger(`chat-${message.conversationId}`, "delete-message", { messageId });

    revalidatePath(`/messages/${message.conversationId}`);
    revalidatePath("/messages");
    
    return { success: true };
}

export async function deleteConversationForMe(conversationId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.deletedConversation.create({
        data: {
            conversationId,
            userId: session.user.id
        }
    });

    revalidatePath("/messages");
    return { success: true };
}

export async function markAllMessagesAsRead() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.message.updateMany({
        where: {
            conversation: { participants: { some: { id: session.user.id } } },
            senderId: { not: session.user.id },
            read: false
        },
        data: { read: true }
    });

    revalidatePath("/messages");
    return { success: true };
}

export async function sendCallNotification(conversationId: string, isAudioOnly: boolean = false) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await pusherServer.trigger(`chat-${conversationId}`, "incoming-call", {
        senderId: session.user.id,
        isAudioOnly
    });

    return { success: true };
}
export async function sendCallSignal(conversationId: string, signalData: any) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await pusherServer.trigger(`chat-${conversationId}`, "call-signal", {
        ...signalData,
        senderId: session.user.id
    });

    return { success: true };
}

