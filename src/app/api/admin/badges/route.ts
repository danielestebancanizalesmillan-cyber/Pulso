import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await auth();
        if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const badges = await prisma.badge.findMany({
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(badges);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch badges" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { name, description, imageUrl } = await req.json();
        
        if (!name || !imageUrl) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const badge = await prisma.badge.create({
            data: {
                name,
                description,
                imageUrl
            }
        });

        return NextResponse.json(badge);
    } catch (e) {
        return NextResponse.json({ error: "Failed to create badge" }, { status: 500 });
    }
}
