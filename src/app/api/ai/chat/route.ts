import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "../../../../lib/auth";
import { getOllamaResponse, PULSAI_SYSTEM_PROMPT, searchInternet, runPulsAIEngine } from "../../../../lib/ai-service";
import { pusherServer } from "../../../../lib/pusher";


// 🕐 Caché para el contexto diario
let cachedDailyContext: { data: string; timestamp: number } | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora


export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, username: true }
        });

        const { message, history = [], chatId } = await req.json();
        if (!message) return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });

        if (chatId) {
            // Verificar que el chat existe antes de insertar
            const chatExists = await prisma.aIChat.findUnique({ where: { id: chatId } });
            if (chatExists) {
                await prisma.aIMessage.create({ 
                    data: { 
                        content: message.slice(0, 5000), // Limitar tamaño
                        role: "user", 
                        chatId: chatId 
                    } 
                });
            }
        }

        const dailyContext = await loadDailyContext();
        const creatorRule = `\nUsuario: ${currentUser?.name}. Tu creador: Daniel Canizales.`;

        let messages = [
            { role: "system", content: creatorRule + "\nContexto Diario:\n" + dailyContext },
            ...history.map((m: any) => ({
                role: m.sender === "user" ? "user" : "assistant",
                content: m.text
            })),
            { role: "user", content: message }
        ];

        // Usar el motor unificado de PulsAI con actualizaciones en tiempo real via Pusher
        const { response: finalResponse, sources: usedSources } = await runPulsAIEngine(
            messages, 
            false, 
            async (stepText) => {
                if (chatId) {
                    try {
                        await pusherServer.trigger(`ai-chat-${chatId}`, "ai-step", { step: stepText });
                    } catch (e) {
                        console.error("Pusher trigger error:", e);
                    }
                }
            }
        );

        if (chatId) {
            const chatExists = await prisma.aIChat.findUnique({ where: { id: chatId } });
            if (chatExists) {
                const dbContent = (usedSources && usedSources.length > 0) 
                    ? JSON.stringify({ type: "rich_message", text: finalResponse || "No pude generar una respuesta.", sources: usedSources })
                    : (finalResponse || "No pude generar una respuesta.");
                    
                await prisma.aIMessage.create({ 
                    data: { 
                        content: dbContent, 
                        role: "assistant", 
                        chatId: chatId 
                    } 
                });
            }
        }

        return NextResponse.json({ response: finalResponse, sources: usedSources });


    } catch (error: any) {
        console.error("[PulsAI Chat Error]:", error);
        return NextResponse.json({ 
            error: "Error en PulsAI",
            details: error.message 
        }, { status: 500 });
    }
}

async function loadDailyContext() {
    const now = Date.now();
    if (cachedDailyContext && (now - cachedDailyContext.timestamp) < CACHE_DURATION) return cachedDailyContext.data;
    
    let context = "Sin noticias recientes disponibles.";
    try {
        const internetNews = await searchInternet("noticias mundiales hoy");
        if (internetNews && internetNews.length > 0) {
            context = "Noticias: " + JSON.stringify(internetNews);
        }
    } catch (e) {
        console.error("Error loading daily context:", e);
    }
    
    cachedDailyContext = { data: context, timestamp: now };
    return context;
}

