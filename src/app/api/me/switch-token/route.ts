import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user || !user.password) return NextResponse.json({ error: "No password available for switch token" }, { status: 400 });

        const secret = process.env.AUTH_SECRET || "default_secret";
        const token = crypto.createHmac("sha256", secret).update(user.id + user.password).digest("hex");

        return NextResponse.json({ token, id: user.id });
    } catch (e: any) {
        console.error("Error generating switch token:", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
