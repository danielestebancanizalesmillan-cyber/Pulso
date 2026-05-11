"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function submitVerificationRequest() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const existing = await prisma.verificationRequest.findUnique({
        where: { userId: session.user.id }
    });

    if (existing) throw new Error("Ya tienes una solicitud en curso o procesada");

    await prisma.verificationRequest.create({
        data: {
            userId: session.user.id,
            status: "PENDING"
        }
    });

    return { success: true };
}

export async function getVerificationStatus() {
    const session = await auth();
    if (!session?.user?.id) return { status: "none" };

    const req = await prisma.verificationRequest.findUnique({
        where: { userId: session.user.id }
    });

    return { status: req?.status || "none" };
}
