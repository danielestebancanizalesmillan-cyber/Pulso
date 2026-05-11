import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListsContent } from "@/components/ListsContent";
import { redirect } from "next/navigation";

export default async function ListsPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const createdLists = await prisma.tweetList.findMany({
        where: { creatorId: session.user.id },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "desc" }
    });

    const memberLists = await prisma.tweetList.findMany({
        where: { members: { some: { userId: session.user.id } } },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "desc" }
    });

    return (
        <ListsContent 
            createdLists={createdLists} 
            memberLists={memberLists} 
            userId={session.user.id} 
        />
    );
}
