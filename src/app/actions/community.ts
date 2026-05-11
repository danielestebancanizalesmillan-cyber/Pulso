"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createCommunity(data: { name: string, description?: string, banner?: string, avatar?: string }) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const community = await prisma.community.create({
        data: {
            ...data,
            creatorId: session.user.id,
            members: {
                create: {
                    userId: session.user.id,
                    role: "ADMIN"
                }
            }
        }
    });

    revalidatePath("/communities");
    return community;
}

export async function joinCommunity(communityId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const membership = await prisma.communityMember.create({
        data: {
            communityId,
            userId: session.user.id,
            role: "MEMBER"
        }
    });

    revalidatePath(`/communities/${communityId}`);
    return membership;
}

export async function leaveCommunity(communityId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.communityMember.delete({
        where: {
            communityId_userId: {
                communityId,
                userId: session.user.id
            }
        }
    });

    revalidatePath(`/communities/${communityId}`);
    return { success: true };
}

export async function updateCommunity(communityId: string, data: any) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const member = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId: session.user.id } }
    });

    if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
        throw new Error("Unauthorized");
    }

    const updated = await prisma.community.update({
        where: { id: communityId },
        data
    });

    revalidatePath(`/communities/${communityId}`);
    return updated;
}

export async function deleteCommunity(communityId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const community = await prisma.community.findUnique({
        where: { id: communityId }
    });

    if (!community) throw new Error("Community not found");
    if (community.creatorId !== session.user.id) throw new Error("Unauthorized");

    await prisma.community.delete({
        where: { id: communityId }
    });

    revalidatePath("/communities");
    return { success: true };
}
