"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createBookmarkFolder(name: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const folder = await prisma.bookmarkFolder.create({
        data: {
            name,
            userId: session.user.id,
        },
    });

    revalidatePath("/bookmarks");
    return folder;
}

export async function deleteBookmarkFolder(folderId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.bookmarkFolder.delete({
        where: {
            id: folderId,
            userId: session.user.id,
        },
    });

    revalidatePath("/bookmarks");
    return { success: true };
}

export async function addBookmarkToFolder(tweetId: string, folderId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Check if bookmark exists, if not create it
    let bookmark = await prisma.bookmark.findUnique({
        where: {
            userId_tweetId: {
                userId: session.user.id,
                tweetId,
            },
        },
    });

    if (!bookmark) {
        bookmark = await prisma.bookmark.create({
            data: {
                userId: session.user.id,
                tweetId,
            },
        });
    }

    await prisma.bookmark.update({
        where: { id: bookmark.id },
        data: { folderId },
    });

    revalidatePath("/bookmarks");
    return { success: true };
}

export async function removeBookmarkFromFolder(tweetId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.bookmark.update({
        where: {
            userId_tweetId: {
                userId: session.user.id,
                tweetId,
            },
        },
        data: { folderId: null },
    });

    revalidatePath("/bookmarks");
    return { success: true };
}
