import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const communities = await prisma.community.findMany({
        where: {
            members: { some: { userId: session.user.id } }
        },
        select: {
            id: true,
            name: true
        }
    });

    return NextResponse.json({ communities });
}
