export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isGeminiEnabled, disableGemini, GEMINI_MODEL } from "@/lib/gemini-config";

let cachedTrends: Record<string, any> = {};
let lastFetchTimes: Record<string, number> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const classifyTrend = (text: string) => {
    const lower = text.toLowerCase();
    if (/vote|voto|gobierno|government|eleccion|election|polit|law|ley|peace|guerra|war|trump|biden|presid|congreso|senate|reforma|partido|senador|alcalde|pacto/.test(lower)) return "trendPolitics";
    if (/football|soccer|futbol|nba|f1|sports|deporte|match|partido|game|baloncesto|tenis/.test(lower)) return "trendSports";
    if (/music|musica|movie|film|pelicula|actor|singer|hollywood|netflix|grammy|oscar/.test(lower)) return "trendEntertainment";
    if (/tech|dev|programming|software|react|nextjs|apple|google|crypto|bitcoin|ai|ia|inteligencia/.test(lower)) return "trendTech";
    return "trendNews";
};

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const countryCode = searchParams.get("countryCode");
    try {
        const cacheKey = countryCode || "GLOBAL";
        const lastFetchTime = lastFetchTimes[cacheKey] || 0;

        // Fetch users simply (avoids SQLite _count bug in complex joins)
        const suggestedUsersRaw = await prisma.user.findMany({
            take: 10,
            select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                isVerified: true,
            }
        });

        // Mix variety
        const suggestedUsers = suggestedUsersRaw.sort(() => Math.random() - 0.5).slice(0, 3);

        if (cachedTrends[cacheKey] && (Date.now() - lastFetchTime < CACHE_DURATION)) {
            return NextResponse.json({
                trends: cachedTrends[cacheKey],
                users: suggestedUsers
            });
        }

        const isGlobal = !countryCode || countryCode === "GLOBAL";

        const trendingHashtagsRaw = await prisma.hashtag.findMany({
            where: isGlobal ? {} : { tweets: { some: { countryCode } } },
            take: 50,
            include: { _count: { select: { tweets: true } } }
        });

        const trendingHashtags = trendingHashtagsRaw
            .sort((a, b) => (b._count?.tweets || 0) - (a._count?.tweets || 0))
            .slice(0, 15);

        // Words frequency analysis (Fallback)
        const recentTweets = await prisma.tweet.findMany({
            where: isGlobal ? {} : { countryCode },
            take: 200,
            orderBy: { createdAt: "desc" },
            select: { content: true }
        });

        let trendingWords: { name: string, count: number, categoryKey: string }[] = [];
        const apiKey = process.env.GEMINI_API_KEY;

        if (apiKey && isGeminiEnabled()) {
            try {
                const ai = new GoogleGenerativeAI(apiKey);
                const model = ai.getGenerativeModel({ model: GEMINI_MODEL });

                const tweetTexts = recentTweets.map(t => t.content).join("\n---\n");
                const prompt = `
Analiza el contenido de estos tweets (2026) y extrae los **5 temas o palabras clave más relevantes** que estén en tendencia.
IMPORTANTE: NO conviertas oraciones ni frases en hashtags unidos (ejemplo: NO uses "#HolaComoEstas", mantenlo como "Hola como estas"). Solo usa el formato hashtag si la palabra es originamente un hashtag en el texto.
Responde **ÚNICAMENTE** en formato JSON como un array de objetos: [ { "name": "tema o palabra", "count": 10, "categoryKey": "trendTech" } ]

Tweets:
${tweetTexts}
`;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text().trim();
                
                const cleanJson = responseText.replace(/```json|```/g, "").trim();
                const aiTrends = JSON.parse(cleanJson);
                
                if (Array.isArray(aiTrends)) {
                    trendingWords = aiTrends.map(t => ({
                        name: t.name || "",
                        count: parseInt(t.count) || 1,
                        categoryKey: ["trendPolitics", "trendSports", "trendEntertainment", "trendTech", "trendNews"].includes(t.categoryKey) ? t.categoryKey : "trendNews"
                    }));
                }
            } catch (aiError: any) {
                if (aiError.status === 429) {
                    disableGemini(30);
                }
                console.error(">> [Trending API] AI Analysis failed:", aiError.message);
            }
        }

        // Fallback Logic if Gemini fails or is not configured
        if (trendingWords.length === 0) {
            const STOP_WORDS = new Set([
                "la", "el", "en", "que", "de", "los", "las", "un", "una", "y", "con", "por", "para", "como", "esta", "esto", "este", "pero", "mas", "sus", "si", "del", "lo", "mi", "me", "su",
                "the", "and", "for", "with", "that", "this", "from", "your", "was", "are", "have", "you", "not", "his", "they", "but", "what", "all", "were", "when", "can", "said",
                "para", "cómo", "esta", "está", "este", "esto", "aquí", "allí", "todo", "toda", "todos", "todas"
            ]);

            const wordCounts: Record<string, number> = {};
            recentTweets.forEach(t => {
                // Split by whitespace but keep casing and details
                const tokens = t.content.split(/\s+/);
                for (let i = 0; i < tokens.length; i++) {
                    // Strip leading/trailing punctuation but keep internal characters/casing
                    const w1 = tokens[i].replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?"'¡¿]+|[.,\/#!$%\^&\*;:{}=\-_`~()?"'¡¿]+$/g, "");
                    if (w1.length >= 4 && !STOP_WORDS.has(w1.toLowerCase())) {
                        wordCounts[w1] = (wordCounts[w1] || 0) + 1;
                        
                        if (i + 1 < tokens.length) {
                            const w2 = tokens[i+1].replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?"'¡¿]+|[.,\/#!$%\^&\*;:{}=\-_`~()?"'¡¿]+$/g, "");
                            if (w2.length >= 3 && !STOP_WORDS.has(w2.toLowerCase())) {
                                const bigram = `${w1} ${w2}`;
                                wordCounts[bigram] = (wordCounts[bigram] || 0) + 1;
                            }
                        }
                    }
                }
            });

            const plainWords = Object.entries(wordCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);

            trendingWords = plainWords.map(([word, count]) => ({
                name: word,
                count,
                categoryKey: classifyTrend(word)
            }));
        }

        const hashtagTrends = trendingHashtags.map(h => ({ 
            name: h.text, 
            count: h._count.tweets,
            categoryKey: classifyTrend(h.text)
        }));

        // Merge and take top X
        const combinedTrends = [...hashtagTrends, ...trendingWords]
            .sort((a, b) => b.count - a.count);

        // Deduplicate: If there is a bigram "A B", do not show single words "A" or "B" separately
        const bigramWords = new Set<string>();
        combinedTrends.forEach(item => {
            if (item.name.includes(" ")) {
                item.name.split(" ").forEach((p: string) => bigramWords.add(p.toLowerCase()));
            }
        });

        const filteredTrends = combinedTrends.filter(item => {
            if (!item.name.includes(" ")) {
                return !bigramWords.has(item.name.toLowerCase());
            }
            return true;
        }).slice(0, 12);

        // Update Cache
        cachedTrends[cacheKey] = filteredTrends;
        lastFetchTimes[cacheKey] = Date.now();

        return NextResponse.json({
            trends: filteredTrends,
            users: suggestedUsers
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
