"use server";

export async function translateText(text: string, targetLocale: string) {
    if (!text || !targetLocale) return text;
    
    // Using MyMemory free, public translation API. It supports Autodetect.
    // E.g., https://api.mymemory.translated.net/get?q=Hello World!&langpair=Autodetect|es
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLocale}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url, { method: "GET" });
        
        if (!response.ok) {
            console.error("Translation API error", response.status);
            return text;
        }
        
        const data = await response.json();
        if (data && data[0] && Array.isArray(data[0])) {
            // Google Translate returns an array of segments in data[0]
            // Each segment is [translatedText, originalText, ...]
            const fullTranslation = data[0]
                .map((segment: any) => segment[0])
                .filter((text: any) => typeof text === "string")
                .join("");
            
            return fullTranslation || text;
        }
        
        return text;

    } catch (error) {
        console.error("Translation server action failed:", error);
        return text;
    }
}
export async function detectLanguage(text: string): Promise<string> {
    if (!text || text.length < 3) return "en";

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url, { method: "GET" });
        
        if (response.ok) {
            const data = await response.json();
            if (data && typeof data[2] === "string") {
                return data[2];
            }
        }
        
        // Heuristic fallback
        const spanishWords = [" el ", " la ", " los ", " las ", " en ", " de ", " que ", " es ", " si ", " no ", " y ", " con ", " por ", " para "];
        const lowerText = ` ${text.toLowerCase()} `;
        const isSpanish = spanishWords.some(word => lowerText.includes(word));
        return isSpanish ? "es" : "en";
    } catch (error) {
        return "en";
    }
}
