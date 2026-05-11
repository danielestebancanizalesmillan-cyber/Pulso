"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function improveTweetWithAI(content: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined in environment variables");

    if (!content || content.trim().length === 0) {
        throw new Error("El contenido del tweet no puede estar vacío");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

        const prompt = `Actúa como un experto en redacción para redes sociales. Mejora el siguiente borrador de tweet para que sea más atractivo, correcto y optimizado (máximo 280 caracteres). Mantén el significado y tono general (si es serio, divertido, informativo). 
No agregues hashtags inventados a menos que correspondan. Devuelve ÚNICAMENTE el texto del tweet mejorado, sin introducciones, explicaciones, ni comillas envolventes.

Borrador:
"${content}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Strip quotes if any remain
        let cleanedText = text.trim();
        if (cleanedText.startsWith('"') && cleanedText.endsWith('"')) {
            cleanedText = cleanedText.substring(1, cleanedText.length - 1);
        }

        return { enhancedText: cleanedText };
    } catch (error: any) {
        console.error("Gemini AI Enhance Error:", error);
        const msg = error.message || "";
        if (msg.includes("429") || msg.includes("Quota") || msg.includes("quota")) {
            throw new Error("Has superado el límite de uso de IA (Quota Exceeded). Por favor, intenta de nuevo en unos segundos.");
        }
        throw new Error("No se pudo mejorar el tweet mediante inteligencia artificial.");
    }

}
