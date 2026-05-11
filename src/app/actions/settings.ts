"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getUserSettings() {
    const session = await auth();
    if (!session?.user?.id) return {};

    const settings = await prisma.userSetting.findMany({
        where: { userId: session.user.id }
    });

    const result: Record<string, string> = {};
    settings.forEach(s => {
        result[s.key] = s.value;
    });
    return result;
}

export async function updateUserSetting(key: string, value: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.userSetting.upsert({
        where: {
            userId_key: { userId: session.user.id, key }
        },
        update: { value },
        create: { userId: session.user.id, key, value }
    });

    if (key === "protectedTweets") {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { isPrivate: value === "true" }
        });
    }

    return { success: true };
}
