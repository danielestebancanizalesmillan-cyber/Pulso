import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folders = await prisma.bookmarkFolder.findMany({
        where: { userId: session.user.id },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ folders });
}
