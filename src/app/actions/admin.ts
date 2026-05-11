"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// --- USER ACTIONS (Reporting) ---

export async function createReport(targetType: "TWEET" | "USER", targetId: string, reason: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const report = await prisma.report.create({
            data: {
                reporterId: session.user.id,
                targetType,
                targetId,
                reason,
                status: "PENDING"
            }
        });
        return { success: true, reportId: report.id };
    } catch (e) {
        console.error("Failed to create report:", e);
        throw new Error("Could not submit report. Please try again.");
    }
}

// --- ADMIN ACTIONS (Access Restricted) ---

async function checkAdmin() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    });

    if (user?.role !== "ADMIN") {
        throw new Error("Forbidden: Admin access required");
    }
    return session;
}

export async function resolveReport(reportId: string, status: "RESOLVED" | "DISMISSED") {
    await checkAdmin();

    try {
        const report = await prisma.report.update({
            where: { id: reportId },
            data: { status }
        });
        revalidatePath("/admin");
        return { success: true, report };
    } catch (e) {
        console.error("Resolve report error:", e);
        throw new Error("Failed to resolve report");
    }
}

export async function handleVerification(requestId: string, approve: boolean) {
    await checkAdmin();

    try {
        const request = await prisma.verificationRequest.update({
            where: { id: requestId },
            data: { status: approve ? "APPROVED" : "REJECTED" }
        });

        if (approve) {
            await prisma.user.update({
                where: { id: request.userId },
                data: { 
                    isVerified: true,
                    verificationType: "BLUE" 
                }
            });
        }

        revalidatePath("/admin");
        return { success: true };
    } catch (e) {
        console.error("Verification processing error:", e);
        throw new Error("Failed to process verification request");
    }
}

export async function getUsers() {
    await checkAdmin();
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                role: true,
                isVerified: true,
                verificationType: true,
                createdAt: true
            },
            orderBy: { createdAt: "desc" }
        });
        return users;
    } catch (e) {
        console.error("Get users error:", e);
        throw new Error("Failed to fetch users");
    }
}

export async function updateUserRole(userId: string, role: string) {
    await checkAdmin();
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role }
        });
        revalidatePath("/admin");
        return { success: true };
    } catch (e) {
        console.error("Update user role error:", e);
        throw new Error("Failed to update user role");
    }
}

export async function updateUserVerification(userId: string, isVerified: boolean, type: string) {
    await checkAdmin();
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isVerified, verificationType: type }
        });
        revalidatePath("/admin");
        return { success: true };
    } catch (e) {
        console.error("Update user verification error:", e);
        throw new Error("Failed to update user verification");
    }
}
