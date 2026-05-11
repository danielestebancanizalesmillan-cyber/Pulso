import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ count: 0 });

    const count = await prisma.message.count({
        where: {
            conversation: {
                participants: { some: { id: session.user.id } }
            },
            senderId: { not: session.user.id },
            read: false,
        },
    });

    return NextResponse.json({ count });
}
