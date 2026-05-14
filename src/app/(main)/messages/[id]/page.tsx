import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ChatForm } from "@/components/ChatForm";

import { ChatMessages } from "@/components/ChatMessages";
import { ChatHeaderClient } from "@/components/ChatHeaderClient";


export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.id) return redirect("/login");

    const userId = session.user.id;

    const conversation = await prisma.conversation.findUnique({
        where: { id: resolvedParams.id },
        include: {
            participants: true,
            messages: {
                where: {
                    deletedBy: { none: { userId: userId } }
                },
                orderBy: { createdAt: "asc" },
                include: { 
                    sender: { select: { id: true, name: true, avatar: true } },
                    reactions: true
                },
            },
        },
    });

    if (!conversation) notFound();

    // Verify user is part of the conversation
    const isParticipant = conversation.participants.some((p: any) => p.id === userId);
    if (!isParticipant) return notFound();

    const partner = conversation.participants.find((p: any) => p.id !== userId);
    if (!partner) return notFound();

    return (
        <div style={{ display: "flex", height: "100%", flexDirection: "column", maxHeight: "100vh" }}>
            <ChatHeaderClient partner={partner as any} conversationId={conversation.id} userId={userId} />

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", background: "var(--bg-main)" }}>

                {/* Chat Partner Header */}
                <div style={{ padding: "32px 16px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid var(--border)", marginBottom: "16px", position: "relative", zIndex: 1 }}>
                    <Avatar user={partner} size="lg" />
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", marginTop: 8 }}>{partner.name}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>@{partner.username}</div>
                    <p style={{ marginTop: 8, color: "var(--text-primary)", textAlign: "center" }}>{partner.bio || "Joined Pulso"}</p>
                </div>

                {/* Messages container with Real-time */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 10 }}>
                    <ChatMessages
                        initialMessages={conversation.messages as any}
                        conversationId={conversation.id}
                        userId={userId}
                    />
                </div>
            </div>

            {/* Chat Input */}
            <ChatForm conversationId={conversation.id} userId={userId} recipientPublicKey={(partner as any).publicKey} />

        </div>
    );
}
