import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommunitiesContent } from "@/components/CommunitiesContent";
import { redirect } from "next/navigation";

export default async function CommunitiesPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const myCommunities = await prisma.community.findMany({
        where: { members: { some: { userId: session.user.id } } },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "desc" }
    });

    const discoverCommunities = await prisma.community.findMany({
        where: { members: { none: { userId: session.user.id } } },
        include: { _count: { select: { members: true } } },
        take: 10,
        orderBy: { createdAt: "desc" }
    });

    return (
        <CommunitiesContent 
            myCommunities={myCommunities} 
            discoverCommunities={discoverCommunities} 
            userId={session.user.id} 
        />
    );
}
