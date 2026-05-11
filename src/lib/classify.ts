import { GoogleGenerativeAI } from "@google/generative-ai";
import { isGeminiEnabled, disableGemini, GEMINI_MODEL } from "./gemini-config";
import { getOllamaResponse } from "./ai-service";

const CATEGORIES = [
    "Tecnología",
    "Deportes",
    "Entretenimiento",
    "Política",
    "Salud",
    "Finanzas",
    "Estilo de Vida",
    "Música",
    "Cine",
    "Gaming"
];

const KEYWORDS_MAP: { [key: string]: string[] } = {
    "Tecnología": ["ios", "android", "ia", "ai", "desarrollador", "computadora", "código", "programación", "software", "hardware", "apple", "microsoft", "google", "tech"],
    "Deportes": ["futbol", "messi", "ronaldo", "gol", "partido", "tenis", "baloncesto", "nba", "atleta", "entrenamiento", "marcador", "champions", "mundial"],
    "Entretenimiento": ["cine", "pelicula", "netflix", "hbo", "serie", "farándula", "chisme", "actor", "famoso", "celebridad"],
    "Política": ["presidente", "elecciones", "gobierno", "voto", "senado", "congreso", "partido político", "ley", "reforma"],
    "Finanzas": ["cripto", "bitcoin", "inversión", "dinero", "bolsa", "acciones", "mercado", "dólar", "euros", "inflación"],
    "Gaming": ["ps5", "xbox", "gta", "nintendo", "streamer", "twitch", "gaming", "gamer", "pc master race", "esports"]
};

// 1. Fallback Rule-Based Classification
export function classifyWithKeywords(content: string): string | null {
    const text = content.toLowerCase();
    let bestCategory = null;
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(KEYWORDS_MAP)) {
        const matches = keywords.filter(word => text.includes(word)).length;
        if (matches > maxMatches) {
            maxMatches = matches;
            bestCategory = category;
        }
    }
    // Only category if we have at least 1 match, otherwise null (General)
    return maxMatches > 0 ? bestCategory : null;
}

// 2. Intelligent AI Classification
export async function classifyTweet(content: string): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback if no API key is provided yet
    if (!apiKey) {
        console.log(">> [Classify] No GEMINI_API_KEY found. Using keyword fallback.");
        return classifyWithKeywords(content);
    }

    // AI Bypass if on cooldown -> Fast keyword fallback (Ollama is too slow for sync requests)
    if (!isGeminiEnabled()) {
        return classifyWithKeywords(content);
    }

    try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: GEMINI_MODEL });
        

        const prompt = `
            Analiza el siguiente texto de un tweet y clasifícalo en **ÚNICAMENTE UNA** de las categorías de la siguiente lista.
            Responde **SÓLO con el nombre de la categoría** (ej. "Tecnología"). Si no estás seguro o no encaja, responde "General".

            Categorías permitidas:
            ${CATEGORIES.join(", ")}

            Tweet:
            "${content}"
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim().replace(/[*.#]/g, "");

        // Validate that response matches one of our categories
        if (CATEGORIES.includes(responseText)) {
            return responseText;
        }
        return responseText === "General" ? null : classifyWithKeywords(content);

    } catch (error: any) {
        if (error.status === 429 || error.message?.includes("quota")) {
            console.error(">> [Classify] Gemini 429 detected.");
            disableGemini(30);
        }
        console.error(">> [Classify] AI Classification failed, using Ollama/Keyword fallback.");
        
        // Final fallback chain if Gemini failed just now
        try {
            const ollamaPrompt = [{ role: "system", content: `Clasifica en: ${CATEGORIES.join(", ")}. Responde solo la palabra.` }, { role: "user", content }];
            const ollamaRes = await getOllamaResponse(ollamaPrompt, false);
            const category = ollamaRes.trim();
            if (CATEGORIES.includes(category)) return category;
        } catch (e) {}

        return classifyWithKeywords(content);
    }
}
