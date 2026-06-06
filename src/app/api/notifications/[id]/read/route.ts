import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, context: any) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const params = await context.params;
        const id = params.id;
        
        await prisma.notification.updateMany({
            where: { id: id, userId: session.user.id },
            data: { read: true }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: "Internal Server Error", details: e?.message || String(e) }, { status: 500 });
    }
}
