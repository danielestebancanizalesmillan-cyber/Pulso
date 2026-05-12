import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Get hashtags with their tweet count
        const hashtags = await prisma.hashtag.findMany({
            take: 50, 
            include: {
                _count: {
                    select: { tweets: true },
                },
            },
        });

        // Sort in memory
        let topHashtags = hashtags
            .sort((a, b) => (b._count?.tweets || 0) - (a._count?.tweets || 0))
            .slice(0, 10)
            .map(h => ({
                id: h.id,
                text: h.text,
                tweetCount: h._count?.tweets || 0,
                category: "Tendencia en Pulso"
            }));

        // Fallback if no hashtags exist yet to make the platform look alive
        if (topHashtags.length < 3) {
            topHashtags = [
                { id: "1", text: "#PulsoSocial", tweetCount: 1540, category: "Tecnología · Tendencia" },
                { id: "2", text: "#NuevaEra", tweetCount: 850, category: "Entretenimiento · Tendencia" },
                { id: "3", text: "Daniel Esteban", tweetCount: 420, category: "Política · Tendencia" },
                { id: "4", text: "NextJS 15", tweetCount: 310, category: "Programación · Tendencia" },
                { id: "5", text: "#CyberSecurity", tweetCount: 120, category: "Seguridad · Tendencia" },
            ];
        }

        return NextResponse.json({ trends: topHashtags });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
