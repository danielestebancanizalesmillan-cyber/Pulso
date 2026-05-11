"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateSecret, generateURI, verify } from "otplib";
import qrcode from "qrcode";
import { encrypt, decrypt } from "@/lib/crypto";
import bcrypt from "bcryptjs";

export async function generate2FASecret() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, username: true, twoFactorSecret: true }
    });

    if (!user) throw new Error("User not found");

    const rawSecret = user.twoFactorSecret ? decrypt(user.twoFactorSecret) : generateSecret();
    const emailPrefix = user.email ? user.email.split("@")[0] : user.username || "user";
    const otpauthUrl = generateURI({ issuer: "Pulso", label: emailPrefix, secret: rawSecret });
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Save encrypted secret 
    if (!user.twoFactorSecret) {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { twoFactorSecret: encrypt(rawSecret) }
        });
    }

    return { secret: rawSecret, qrCodeDataUrl };
}

export async function enable2FA(code: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { twoFactorSecret: true }
    });

    if (!user?.twoFactorSecret) throw new Error("No 2FA secret generated");

    const rawSecret = decrypt(user.twoFactorSecret);

    const isValid = await verify({
        token: code,
        secret: rawSecret
    });

    if (!isValid) throw new Error("Invalid verification code");

    // Generate 10 Backup Codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
        const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        backupCodes.push(randomCode);
    }

    // Hash codes
    const hashedCodes = await Promise.all(
        backupCodes.map(async (c) => {
            const salt = await bcrypt.genSalt(10);
            return bcrypt.hash(c, salt);
        })
    );

    // Save to DB
    await prisma.$transaction([
        prisma.user.update({
            where: { id: session.user.id },
            data: { twoFactorEnabled: true }
        }),
        prisma.backupCode.createMany({
            data: hashedCodes.map(hash => ({
                userId: session.user.id,
                codeHash: hash
            }))
        })
    ]);

    return { success: true, backupCodes };
}

export async function disable2FA(code: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { twoFactorSecret: true }
    });

    if (!user?.twoFactorSecret) throw new Error("No 2FA secret found");

    const rawSecret = decrypt(user.twoFactorSecret);

    const isValid = await verify({
        token: code,
        secret: rawSecret
    });

    if (!isValid) throw new Error("Invalid verification code");

    await prisma.$transaction([
        prisma.user.update({
            where: { id: session.user.id },
            data: { twoFactorEnabled: false, twoFactorSecret: null }
        }),
        prisma.backupCode.deleteMany({
            where: { userId: session.user.id }
        })
    ]);

    return { success: true };
}

export async function get2FAStatus() {
    const session = await auth();
    if (!session?.user?.id) return { enabled: false };

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { twoFactorEnabled: true }
    });

    return { enabled: !!user?.twoFactorEnabled };
}
