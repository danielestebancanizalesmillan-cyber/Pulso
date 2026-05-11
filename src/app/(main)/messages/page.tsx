import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ConversationsList } from "@/components/ConversationsList";
import { MessagesHeader } from "@/components/MessagesHeader";

export const metadata = {
    title: "Messages / Pulso",
};

export default async function MessagesPage() {
    const session = await auth();
    if (!session?.user?.id) return redirect("/login");

    const userId = session.user.id;

    const conversations = await prisma.conversation.findMany({
        where: {
            participants: { some: { id: userId } },
            deletedBy: { none: { userId } }
        },
        include: {
            participants: true,
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
            },
        },
        orderBy: { updatedAt: "desc" },
    });

    return (
        <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
            <MessagesHeader />
            <ConversationsList conversations={conversations} userId={userId} />
        </div>
    );
}
