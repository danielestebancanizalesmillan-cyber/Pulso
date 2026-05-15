import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ads = await prisma.ad.findMany({
        orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(ads);
}

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
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
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
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
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.ad.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
