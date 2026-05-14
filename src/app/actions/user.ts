"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { sendVerificationEmail } from "@/lib/mail";
import { isEmailDisposable } from "@/app/actions/utils/email";
import { pusherServer } from "@/lib/pusher";

export async function registerUser(data: {
    name: string;
    username: string;
    email: string;
    firebaseUid: string;
}) {
    const emailLower = data.email.toLowerCase();
    const usernameLower = data.username.toLowerCase();

    const existing = await prisma.user.findFirst({
        where: { OR: [{ email: emailLower }, { username: usernameLower }] },
    });
    if (existing) {
        if (existing.email?.toLowerCase() === emailLower) throw new Error("Email already taken");
        throw new Error("Username already taken");
    }

    // Check for disposable email
    if (isEmailDisposable(data.email)) {
        throw new Error("Please use a permanent email address");
    }

    const user = await prisma.user.create({
        data: {
            id: data.firebaseUid,
            name: data.name,
            username: usernameLower,
            email: emailLower,
        },
    });

    return user;
}

export async function checkEmailExists(email: string) {
    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
    });
    return !!user;
}

export async function verifyEmail(token: string) {
    const existingToken = await prisma.emailVerification.findUnique({
        where: { token }
    });

    if (!existingToken) throw new Error("Token does not exist");

    const hasExpired = new Date(existingToken.expires) < new Date();
    if (hasExpired) throw new Error("Token has expired");

    const existingUser = await prisma.user.findUnique({
        where: { email: existingToken.email }
    });

    if (!existingUser) throw new Error("Email does not exist");

    await prisma.user.update({
        where: { id: existingUser.id },
        data: {
            emailVerified: new Date(),
            email: existingToken.email, // In case of email change flow, but here it's for verification
        }
    });

    await prisma.emailVerification.delete({
        where: { id: existingToken.id }
    });

    return { success: "Email verified!" };
}


export async function followUser(targetId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    if (targetId === session.user.id) throw new Error("Cannot follow yourself");

    const targetUser = await prisma.user.findUnique({
        where: { id: targetId },
        select: { isPrivate: true }
    });

    const existing = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: session.user.id, followingId: targetId } },
    });

    const existingRequest = await prisma.followRequest.findUnique({
        where: { senderId_receiverId: { senderId: session.user.id, receiverId: targetId } },
    });

    if (existing) {
        await prisma.follow.delete({ where: { id: existing.id } });
        await prisma.notification.deleteMany({
            where: { type: "follow", userId: targetId, actorId: session.user.id }
        });
    } else if (existingRequest) {
        await prisma.followRequest.delete({ where: { id: existingRequest.id } });
        await prisma.notification.deleteMany({
            where: { type: "follow_request", userId: targetId, actorId: session.user.id }
        });
    } else if (targetUser?.isPrivate) {
        await prisma.followRequest.create({
            data: { senderId: session.user.id, receiverId: targetId, status: "PENDING" },
        });

        const notif = await prisma.notification.create({
            data: {
                type: "follow_request",
                userId: targetId,
                actorId: session.user.id,
            },
            include: { actor: { select: { name: true, image: true, username: true } } }
        });

        await pusherServer.trigger(`user-${targetId}`, "notification", {
            ...notif,
            message: `${notif.actor.name} requested to follow you`
        });
    } else {
        await prisma.follow.create({
            data: { followerId: session.user.id, followingId: targetId },
        });
        const notif = await prisma.notification.create({
            data: {
                type: "follow",
                userId: targetId,
                actorId: session.user.id,
            },
            include: { actor: { select: { name: true, image: true, username: true } } }
        });

        await pusherServer.trigger(`user-${targetId}`, "notification", {
            ...notif,
            message: `${notif.actor.name} started following you`
        });
    }

    revalidatePath("/");
}

export async function updateProfile(data: {
    name: string;
    bio: string;
    location?: string;
    website?: string;
    avatar?: string;
    coverImage?: string;
    countryCode?: string;
    username?: string;
    profileAudioUrl?: string;
    profileAudioTitle?: string;
    profileAudioStart?: number;
}) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    if (data.name.length > 50) throw new Error("Name is too long (max 50 characters)");
    if (data.bio && data.bio.length > 160) throw new Error("Bio is too long (max 160 characters)");

    if (data.username) {
        const usernameLower = data.username.toLowerCase();
        if (!/^[a-zA-Z0-9_]{4,15}$/.test(usernameLower)) {
            throw new Error("Username must be between 4 and 15 characters and contain only letters, numbers, and underscores");
        }

        const existing = await prisma.user.findFirst({
            where: { 
                username: usernameLower,
                NOT: { id: session.user.id }
            }
        });
        if (existing) throw new Error("Username already taken");
    }

    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            name: data.name,
            username: data.username?.toLowerCase(),
            bio: data.bio,
            location: data.location,
            website: data.website,
            ...(data.avatar ? { avatar: data.avatar } : {}),
            ...(data.coverImage ? { coverImage: data.coverImage } : {}),
            countryCode: data.countryCode || undefined,
            profileAudioUrl: data.profileAudioUrl,
            profileAudioTitle: data.profileAudioTitle,
            profileAudioStart: data.profileAudioStart,
        },
    });

    revalidatePath("/");
}

export async function markNotificationsRead() {
    const session = await auth();
    if (!session?.user?.id) return;

    await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
    });

    await pusherServer.trigger(`user-${session.user.id}`, "notifications-read", {});

    revalidatePath("/notifications");
}

export async function setupUsername(username: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    if (!/^[a-zA-Z0-9_]{4,15}$/.test(username)) {
        throw new Error("Username must be between 4 and 15 characters and contain only letters, numbers, and underscores");
    }

    const usernameLower = username.toLowerCase();

    // Check if username is already taken
    const existing = await prisma.user.findUnique({
        where: { username: usernameLower }
    });
    if (existing) throw new Error("Username already taken");

    await prisma.user.update({
        where: { id: session.user.id },
        data: { username: usernameLower }
    });

    revalidatePath("/");
}

export async function resendVerification() {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    });

    if (user?.emailVerified) throw new Error("Email already verified");

    // Clear old tokens
    await prisma.emailVerification.deleteMany({
        where: { email: session.user.email }
    });

    // Generate New Token
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 3600 * 1000);

    await prisma.emailVerification.create({
        data: {
            email: session.user.email,
            token,
            expires,
        },
    });

    await sendVerificationEmail(session.user.email, token);

    return { success: "Verification email sent!" };
}

export async function toggleBlock(targetId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    if (targetId === session.user.id) throw new Error("Cannot block yourself");

    const existing = await prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: session.user.id, blockedId: targetId } },
    });

    if (existing) {
        await prisma.block.delete({ where: { id: existing.id } });
    } else {
        await prisma.block.create({
            data: { blockerId: session.user.id, blockedId: targetId },
        });
        // Also unfollow if blocked
        await prisma.follow.deleteMany({
            where: {
                OR: [
                    { followerId: session.user.id, followingId: targetId },
                    { followerId: targetId, followingId: session.user.id },
                ],
            },
        });
    }

    revalidatePath("/");
    revalidatePath(`/${targetId}`);
}

export async function toggleMute(targetId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    if (targetId === session.user.id) throw new Error("Cannot mute yourself");

    const existing = await prisma.mute.findUnique({
        where: { muterId_mutedId: { muterId: session.user.id, mutedId: targetId } },
    });

    if (existing) {
        await prisma.mute.delete({ where: { id: existing.id } });
    } else {
        await prisma.mute.create({
            data: { muterId: session.user.id, mutedId: targetId },
        });
    }

    revalidatePath("/");
    revalidatePath(`/${targetId}`);
}

export async function updateUserLabel(label: string | null) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.user.update({
        where: { id: session.user.id },
        data: { accountLabel: label || null },
    });

    revalidatePath("/");
}

export async function updateE2EKeys(publicKey: string, privateKey: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.user.update({
        where: { id: session.user.id },
        data: { publicKey, privateKey },
    });

    revalidatePath("/");
}

export async function getE2EKeys() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { publicKey: true, privateKey: true }
    });

    return user;
}

export async function requestPasswordReset(email: string) {
    const user = await prisma.user.findFirst({
        where: { email: email.toLowerCase() }
    });
    if (!user) {
        throw new Error("No user found with that email address");
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) throw new Error("Firebase API key is missing");

    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requestType: "PASSWORD_RESET",
                email: user.email,
            })
        }
    );

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error?.message || "Failed to send reset email");
    }

    return { success: true };
}


export async function updateBirthDate(birthDate: Date | null) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.user.update({
        where: { id: session.user.id },
        data: { birthDate },
    });

    revalidatePath("/");
}

export async function updateSensitiveToggle(show: boolean) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.user.update({
        where: { id: session.user.id },
        data: { showSensitiveContent: show },
    });

    revalidatePath("/");
}

export async function deleteAccount() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.user.delete({
        where: { id: session.user.id }
    });
}

export async function getProfileData(username?: string) {
    const session = await auth();
    let queryId = session?.user?.id;
    if (username) {
        const u = await prisma.user.findUnique({ where: { username } });
        if (u) queryId = u.id;
    }
    
    if (!queryId) return null;

    return prisma.user.findUnique({
        where: { id: queryId }
    });
}
