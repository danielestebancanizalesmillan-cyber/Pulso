import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const ads = await prisma.ad.findMany({
            where: { active: true },
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(ads);
    } catch (error) {
        return NextResponse.json([], { status: 500 });
    }
}
