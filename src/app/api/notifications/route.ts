import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_SELECT } from "@/lib/constants";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            include: {
                actor: { select: USER_SELECT },
                tweet: {
                    include: {
                        author: { select: USER_SELECT },
                        images: { select: { url: true, type: true } }
                    }
                },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return NextResponse.json({ notifications });
    } catch (e: any) {
        return NextResponse.json({ error: "Internal Server Error", details: e?.message || String(e) }, { status: 500 });
    }
}
