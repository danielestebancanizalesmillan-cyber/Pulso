"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getUserInterests(): Promise<string[]> {
    const session = await auth();
    if (!session?.user?.id) return [];

    const interests = await prisma.userInterest.findMany({
        where: { userId: session.user.id },
        select: { category: true }
    });

    return interests.map(i => i.category);
}

export async function updateUserInterests(categories: string[]): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;

    try {
        // Delete existing interests
        await prisma.userInterest.deleteMany({
            where: { userId }
        });

        // Add new ones
        if (categories.length > 0) {
            await prisma.userInterest.createMany({
                data: categories.map(cat => ({
                    userId,
                    category: cat
                }))
            });
        }

        revalidatePath("/home");
        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error(">> [UpdateInterests] Failed:", error);
        return { success: false, error: "Failed to save preferences" };
    }
}
