"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createList(data: { name: string, description?: string, isPrivate?: boolean, banner?: string }) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const list = await prisma.tweetList.create({
        data: {
            ...data,
            creatorId: session.user.id
        }
    });

    revalidatePath("/lists");
    return list;
}

export async function updateList(listId: string, data: { name: string, description?: string, isPrivate?: boolean, banner?: string }) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const list = await prisma.tweetList.findUnique({ where: { id: listId } });
    if (!list || list.creatorId !== session.user.id) throw new Error("Unauthorized");

    const updated = await prisma.tweetList.update({
        where: { id: listId },
        data
    });

    revalidatePath("/lists");
    revalidatePath(`/lists/${listId}`);
    return updated;
}

export async function deleteList(listId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const list = await prisma.tweetList.findUnique({ where: { id: listId } });
    if (!list || list.creatorId !== session.user.id) throw new Error("Unauthorized");

    await prisma.tweetList.delete({ where: { id: listId } });

    revalidatePath("/lists");
    return { success: true };
}

export async function toggleListMember(listId: string, userId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const list = await prisma.tweetList.findUnique({ where: { id: listId } });
    if (!list || list.creatorId !== session.user.id) throw new Error("Unauthorized");

    const existing = await prisma.tweetListMember.findUnique({
        where: { listId_userId: { listId, userId } }
    });

    if (existing) {
        await prisma.tweetListMember.delete({ where: { id: existing.id } });
    } else {
        await prisma.tweetListMember.create({
            data: { listId, userId }
        });
    }

    revalidatePath(`/lists/${listId}`);
    return { success: true };
}

export async function getUserListsWithMembership(targetUserId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const lists = await prisma.tweetList.findMany({
        where: { creatorId: session.user.id },
        include: {
            members: {
                where: { userId: targetUserId }
            }
        },
        orderBy: { name: "asc" }
    });

    return lists.map(list => ({
        id: list.id,
        name: list.name,
        description: list.description,
        isPrivate: list.isPrivate,
        isMember: list.members.length > 0
    }));
}
