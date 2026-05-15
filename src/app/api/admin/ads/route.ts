import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

async function isAdmin(): Promise<boolean> {
    const session = await auth();
    if (!session?.user?.id) return false;
    // Always check DB directly — session token may not carry the role field
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    });
    return user?.role === "ADMIN";
}

export async function GET() {
    if (!await isAdmin()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ads = await prisma.ad.findMany({
        orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(ads);
}

export async function POST(req: Request) {
    if (!await isAdmin()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, imageUrl, videoUrl, avatarUrl, link, cta, active } = await req.json();

    const ad = await prisma.ad.create({
        data: {
            title,
            description,
            imageUrl,
            videoUrl,
            avatarUrl,
            link,
            cta: cta || "Más información",
            active: active ?? true
        }
    });

    return NextResponse.json(ad);
}

export async function PUT(req: Request) {
    if (!await isAdmin()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, ...data } = await req.json();

    const ad = await prisma.ad.update({
        where: { id },
        data
    });

    return NextResponse.json(ad);
}

export async function DELETE(req: Request) {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

        await prisma.ad.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("DELETE /api/admin/ads error:", e);
        return NextResponse.json({ error: e?.message || "Error interno del servidor" }, { status: 500 });
    }
}
