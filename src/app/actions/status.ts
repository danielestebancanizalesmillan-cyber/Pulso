"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createStatus(
    type: string, 
    content?: string | null, 
    mediaUrl?: string | null, 
    audioUrl?: string | null, 
    background?: string | null,
    audioStart?: number | null,
    audioDuration?: number | null,
    styleOptions?: string | null
) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const status = await prisma.status.create({
        data: {
            userId: session.user.id,
            type,
            content: content || null,
            mediaUrl: mediaUrl || null,
            audioUrl: audioUrl || null,
            background: background || null,
            audioStart: audioStart ? Math.floor(audioStart) : null,
            audioDuration: audioDuration ? Math.floor(audioDuration) : 15,
            styleOptions: styleOptions || null,
            expiresAt
        }
    });

    revalidatePath("/home");
    return status;
}

export async function getStatuses() {
    const session = await auth();
    if (!session?.user?.id) return [];

    // Fetch following user IDs
    const following = await prisma.follow.findMany({
        where: { followerId: session.user.id },
        select: { followingId: true }
    });
    const userIds = [session.user.id, ...following.map(f => f.followingId)];

    const statuses = await prisma.status.findMany({
        where: {
            userId: { in: userIds },
            expiresAt: { gt: new Date() }
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    avatar: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return statuses;
}

export async function getUserStatuses(userId: string) {
    const statuses = await prisma.status.findMany({
        where: {
            userId,
            expiresAt: { gt: new Date() }
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    avatar: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return statuses;
}

export async function deleteStatus(id: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const status = await prisma.status.findUnique({
        where: { id }
    });

    if (!status) throw new Error("Status not found");
    if (status.userId !== session.user.id) throw new Error("Unauthorized to delete this status");

    await prisma.status.delete({
        where: { id }
    });

    revalidatePath("/home");
    return { success: true };
}

export async function searchYouTube(query: string) {
    if (!query || query.trim().length === 0) return [];
    try {
        // Añadimos "audio" a la búsqueda para forzar resultados musicales puros
        const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query + " audio")}`);
        const text = await res.text();
        
        const match = text.match(/ytInitialData\s*=\s*({.+?});/);
        if (!match) return [];
        const json = JSON.parse(match[1]);
        
        const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
        if (!contents) return [];

        const results = contents.map((item: any) => {
            const video = item.videoRenderer;
            if (!video) return null;
            return {
                id: video.videoId,
                title: video.title?.runs?.[0]?.text || "Sin título",
                duration: video.lengthText?.simpleText || "",
                thumbnail: video.thumbnail?.thumbnails?.[0]?.url || "",
                url: `https://www.youtube.com/watch?v=${video.videoId}`
            };
        }).filter(Boolean).slice(0, 5);

        return results;
    } catch (err) {
        console.error("searchYouTube Error:", err);
        return [];
    }
}
