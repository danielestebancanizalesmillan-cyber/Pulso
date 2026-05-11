import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isEmailDisposable } from "@/app/actions/utils/email";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const username = searchParams.get("username");

    if (email) {
        const existing = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true }
        });
        const isDisposable = isEmailDisposable(email);
        return NextResponse.json({ exists: !!existing, isDisposable });
    }

    if (username) {
        const existing = await prisma.user.findUnique({
            where: { username: username.toLowerCase() },
            select: { id: true }
        });
        return NextResponse.json({ exists: !!existing });
    }

    return NextResponse.json({ error: "Missing email or username" }, { status: 400 });
}
