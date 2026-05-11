import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Get hashtags with their tweet count
        const hashtags = await prisma.hashtag.findMany({
            take: 50, // Limitar pool para evitar sobrecarga en SQLite
            include: {
                _count: {
                    select: { tweets: true },
                },
            },
        });

        // Sort in memory to avoid SQLite COALESCE aggregate error
        const topHashtags = hashtags
            .sort((a, b) => (b._count?.tweets || 0) - (a._count?.tweets || 0))
            .slice(0, 5);

        return NextResponse.json({ trends: topHashtags });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
