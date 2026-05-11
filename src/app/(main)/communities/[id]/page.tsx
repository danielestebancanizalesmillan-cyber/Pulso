import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommunityDetailContent } from "@/components/CommunityDetailContent";
import { notFound, redirect } from "next/navigation";

export default async function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const resolvedParams = await params;
    const community = await prisma.community.findUnique({
        where: { id: resolvedParams.id },
        include: {
            _count: { select: { members: true } },
            creator: { select: { id: true, name: true, username: true } },
            members: {
                where: { userId: session.user.id },
                select: { id: true, role: true }
            }
        }
    });

    if (!community) {
        return notFound();
    }

    const membership = community.members[0] || null;

    return (
        <CommunityDetailContent 
            community={community} 
            membership={membership}
            userId={session.user.id} 
        />
    );
}
