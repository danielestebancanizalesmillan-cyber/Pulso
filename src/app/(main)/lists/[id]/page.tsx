import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListDetailContent } from "@/components/ListDetailContent";
import { notFound, redirect } from "next/navigation";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const resolvedParams = await params;
    const listId = resolvedParams.id;

    const list = await prisma.tweetList.findUnique({
        where: { id: listId },
        include: { 
            creator: true,
            _count: { select: { members: true } }
        }
    });

    if (!list) notFound();
    if (list.isPrivate && list.creatorId !== session.user.id) {
        notFound(); // Or a custom "Private list" page
    }

    return (
        <ListDetailContent 
            list={list} 
            isOwner={list.creatorId === session.user.id}
            currentUserId={session.user.id}
        />
    );
}
