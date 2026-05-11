"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { pusherServer } from "@/lib/pusher";

// Get pending follow requests for the logged-in user
export async function getPendingFollowRequests() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const requests = await prisma.followRequest.findMany({
        where: {
            receiverId: session.user.id,
            status: "PENDING"
        },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true,
                    image: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return requests;
}

// Approve a follow request
export async function approveFollowRequest(requestId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const request = await prisma.followRequest.findUnique({
        where: { id: requestId }
    });

    if (!request) throw new Error("Request not found");
    if (request.receiverId !== session.user.id) throw new Error("Unauthorized action");

    // Start a transaction to ensure atomic operation
    await prisma.$transaction([
        // 1. Create the follow record
        prisma.follow.create({
            data: {
                followerId: request.senderId,
                followingId: request.receiverId
            }
        }),
        // 2. Delete the request
        prisma.followRequest.delete({
            where: { id: requestId }
        })
    ]);

    // Send notification to the sender that they were approved
    const notif = await prisma.notification.create({
        data: {
            type: "follow", // Standard follow notification type
            userId: request.senderId,
            actorId: session.user.id
        },
        include: { actor: { select: { name: true, username: true } } }
    });

    await pusherServer.trigger(`user-${request.senderId}`, "notification", {
        ...notif,
        message: `${notif.actor.name} approved your follow request`
    });

    revalidatePath("/");
    return { success: true };
}

// Deny/Reject a follow request
export async function denyFollowRequest(requestId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const request = await prisma.followRequest.findUnique({
        where: { id: requestId }
    });

    if (!request) throw new Error("Request not found");
    if (request.receiverId !== session.user.id) throw new Error("Unauthorized action");

    await prisma.followRequest.delete({
        where: { id: requestId }
    });

    revalidatePath("/");
    return { success: true };
}
