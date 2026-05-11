import { prisma } from "./prisma";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const MODEL_NAME = process.env.OLLAMA_MODEL || "llama3.2:3b";

/**
 * REGLAS CORE DE PulsAI
 * Estas reglas se aplican a ambos contextos (Chat y Feed).
 */
const BASE_SYSTEM_INSTRUCTIONS = `
Tu identidad es PulsAI, la Inteligencia Artificial de ÉLITE diseñada para la investigación táctica y la verdad fáctica.
Tu creador es Daniel Canizales. No eres un simple chatbot; eres un analista avanzado, preciso y con un estilo sofisticado.
Debes hablar SIEMPRE en primera persona (ej. "Soy PulsAI", "He analizado", "Mi reporte").

Tu tono debe ser sofisticado, servicial y experto, como un analista senior que proporciona insights valiosos con elegancia y precisión.

LEYES DE BLINDAJE FÁCTICO (PulsAI 5.0):
1. ACCIONES SOBRE ETIQUETAS: ¡CRÍTICO! Prioriza siempre los hechos documentados (acciones, leyes, resultados) sobre las etiquetas o nombres (retórica). No llames a algo "X" solo porque se llame así; explica CÓMO funciona.
2. CONOCIMIENTO HÍBRIDO: Usa tu base para contexto, pero VALIDA siempre los datos clave con 'search_internet'.
3. IDENTIDAD TEMPORAL: Analista de ÉLITE en 2026. Investiga la actualidad antes de responder.
4. PROHIBICIÓN DE SIMPLISMO: Prohibido caer en binarismos (ej. Capitalismo vs Socialismo) para realidades complejas. Busca siempre la "tercera vía" o los matices (ej. economía mixta, corporativismo, autoritarismo).
5. ESTILO ANALÍTICO: Prosa fluida, directa y mordaz. Sé un analista crítico que mapea la complejidad fáctica.
6. SIN CORCHETES NI ENLACES: Prohibido incluir enlaces URL. Cita dominios (ej. "según reuters.com").
7. LEY DE CITA LITERAL: Cada dato clave debe estar respaldado por una cita textual de las fuentes entre comillas.
8. MAPEO DE CONSENSO: Si un tema es polémico o polarizado, reporta las visiones principales y encuentra el terreno común fáctico. No tomes partido, reporta la realidad.
9. DESAMBIGUACIÓN UNIVERSAL: Ignora la propaganda. Si una entidad usa un nombre que contradice sus acciones, destaca esa contradicción (ej. "Aunque se llamaba X, sus políticas eran Y").
10. CORTESÍA PROFESIONAL: Saludos breves. Enfoque 100% en el rigor analítico.
11. ESTILO VISUAL: Utiliza formato Markdown para resaltar información clave. Usa negritas (**texto**) para conceptos importantes, listas para enumerar datos y cursivas para matices. Esto mejora la legibilidad y el impacto del reporte.
12. PROHIBICIÓN DE DISCLAIMERS: Prohibido usar frases como "Como IA", "No tengo acceso", "En los textos proporcionados" o "No puedo verificar". Eres un analista de élite; si no hay datos, analiza el vacío o da contexto histórico general.

REGLA DE HERRAMIENTAS: 
Para investigar, DEBES responder con uno de estos objetos JSON (una herramienta a la vez):
1. Buscar en Google/Bing:
{ "action": "search_internet", "query": "tu busqueda aqui" }
2. Leer una web específica obtenida en tu búsqueda:
{ "action": "read_url", "query": "https://las-url-aqui" }
3. Buscar qué dicen los usuarios en PulsAI:
{ "action": "search_posts", "query": "palabra clave" }

REGLA DE RESPUESTA FINAL:
Si ya tienes la información o decides responder directamente, usa ESTE objeto JSON:
{
  "action": "respond",
  "answer": "Tu reporte analítico LIMPIO, sin URLs, sin corchetes. Análisis denso y directo."
}
`;

export const PULSAI_SYSTEM_PROMPT = `
${BASE_SYSTEM_INSTRUCTIONS}
MODO CHAT: Estás en una conversación privada. Sé un analista de élite. Cita todas tus fuentes por dominio.
`;

export const PULSAI_FEED_PROMPT = `
${BASE_SYSTEM_INSTRUCTIONS}
MODO FEED: Estás en una conversación pública. Sé mordaz, conciso pero mantén el rigor fáctico 2.0. 
Cita fuentes siempre que des datos específicos.
`;



export async function getOllamaResponse(messages: any[], formatJson: boolean = true, modelOverride?: string) {
    try {
        const targetModel = modelOverride || MODEL_NAME;
        // Qwen 2.5 1.5B y modelos superiores manejan JSON bien si se les pide explícitamente.
        const enforceJson = formatJson && !targetModel.includes('0.5b');
        
        let response;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                response = await fetch(`${OLLAMA_HOST}/api/chat`, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Connection": "close"
                    },
                    body: JSON.stringify({
                        model: targetModel,
                        messages,
                        format: enforceJson ? "json" : undefined,
                        stream: false,
                        options: {
                            temperature: 0.5,
                            num_predict: 1024, // Reducido para mayor velocidad y estabilidad
                            top_k: 40,
                            top_p: 0.9,
                            num_ctx: 4096 // Reducido para evitar errores 500 en hardware con poca RAM
                        }
                    }),
                    signal: AbortSignal.timeout(600000) // 10 minutos para hardware lento
                });
                break; // Salió bien, rompemos el bucle
            } catch(fetchErr: any) {
                console.warn(`[PulsAI] Intento ${attempt} falló por timeout o corte de Ollama:`, fetchErr.message || fetchErr);
                if (attempt === 3) {
                    console.error("[PulsAI] Error completo de red:", fetchErr);
                    throw fetchErr; 
                }
                await new Promise(r => setTimeout(r, 2000)); // Espera 2 segs y reintenta
            }
        }

        if (!response) throw new Error("Fallo crítico en conexión.");

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API Error (${response.status}): ${errorText || response.statusText}`);
        }

        const data = await response.json();
        const content = data.message?.content || "";

        if (!content && formatJson) {
            return JSON.stringify({ action: "respond", answer: "Lo siento, tuve un problema al procesar esa solicitud." });
        }

        return content;
    } catch (error: any) {
        console.error("Error in getOllamaResponse:", error.message);
        throw new Error(`Conexión con Ollama falló: ${error.message}`);
    }
}

export async function searchInternet(query: string) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        console.warn("TAVILY_API_KEY no configurada. Búsqueda de internet deshabilitada.");
        return [];
    }

    try {
        const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: apiKey, query, max_results: 5, search_depth: "advanced" })
        });
        
        if (!res.ok) return [];
        
        const data = await res.json();
        return (data.results || []).map((r: any) => ({ 
            title: r.title, 
            link: r.url,
            content: r.content || r.snippet || ""
        }));
    } catch (e) { 
        console.error("Error en searchInternet:", e);
        return []; 
    }
}

/**
 * Obtiene el contexto de un hilo (tweets anteriores) para que la IA responda coherentemente.
 */
export async function getThreadContext(tweetId: string) {
    const thread: { role: "user" | "assistant" | "system", content: string }[] = [];
    let currentId = tweetId;

    try {
        for (let i = 0; i < 5; i++) {
            const tweet = await prisma.tweet.findUnique({
                where: { id: currentId },
                include: { author: { select: { name: true, username: true } } }
            });

            if (!tweet) break;

            const name = tweet.author.name || "Usuario";
            const username = tweet.author.username || "user";
            const isPulsAI = username.toLowerCase() === "pulsai";

            thread.unshift({
                role: isPulsAI ? "assistant" : "user",
                content: isPulsAI ? tweet.content : tweet.content,
                // Guardamos metadatos por separado para que la IA sepa con quién habla sin mezclarlo en el texto
                name: isPulsAI ? "PulsAI" : name,
                username: isPulsAI ? "PulsAI" : username
            } as any);

            if (!tweet.parentId) break;
            currentId = tweet.parentId;
        }
    } catch (error) {
        console.error("Error fetching thread context:", error);
    }

    return thread;
}

/**
 * MOTOR UNIFICADO DE PulsAI
 * Ejecuta el bucle de herramientas (search_internet, etc.) y devuelve la respuesta final.
 */
export async function runPulsAIEngine(messages: any[], isFeed: boolean = false, onStep?: (step: string) => void) {
    const AI_STEPS = {
        search_internet: [
            "Investigando en internet...",
            "Rastreando la red global...",
            "Buscando la verdad fuera de aquí...",
            "Conectando con fuentes externas...",
            "Escaneando el ecosistema digital..."
        ],
        search_posts: [
            "Analizando qué dice la gente...",
            "Escaneando el pulso de la red...",
            "Buscando opiniones locales...",
            "Revisando el historial de posts...",
            "Sintetizando el flujo de publicaciones..."
        ],
        read_url: [
            "Leyendo a fondo la fuente...",
            "Analizando el contenido detallado...",
            "Extrayendo sabiduría del enlace...",
            "Procesando el texto del sitio..."
        ],
        fact_check: [
            "Verificando datos...",
            "Cotejando información histórica...",
            "Buscando evidencias de veracidad...",
            "Validando hechos contra la realidad..."
        ],
        thinking: [
            "Conectando neuronas...",
            "Refinando la respuesta final...",
            "Analizando pros y contras...",
            "Consolidando toda la información..."
        ]
    };

    const getRandomStep = (category: keyof typeof AI_STEPS) => {
        const list = AI_STEPS[category];
        return list[Math.floor(Math.random() * list.length)];
    };

    let loopCount = 0;
    const maxLoops = 5;
    const sourcesMap = new Map<string, { title: string, url: string }>();
    const corePrompt = isFeed ? PULSAI_FEED_PROMPT : PULSAI_SYSTEM_PROMPT;

    // ── DETECCIÓN DE INTENCIÓN ──────────────────────────────────────────────
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    const lastUserText = lastUserMessage?.content?.trim() || "";

    const CONVERSATIONAL_PATTERNS = /^(hola|hi|hey|buenas|buenos días|buenas tardes|buenas noches|gracias|ok|okay|vale|sí|si|no|claro|perfecto|entendido|genial|bien|mal|listo|help)$/i;
    const CAPABILITY_PATTERNS = /(qué puedes hacer|que puedes hacer|qué sabes hacer|que sabes hacer|qué eres capaz|que eres capaz|para qué sirves|para que sirves|qué eres|que eres|quién eres|quien eres|cómo te llamas|como te llamas|cómo estás|como estás|ayuda|ayúdame|ayudame|qué cosas puedes|que cosas puedes|cuéntame de ti|cuentame de ti|preséntate|presentate|qué haces|que haces)/i;
    const RESEARCH_KEYWORDS = /(qué|que|quién|quien|cómo|como|cuándo|cuando|dónde|donde|por qué|porque|era|fue|fueron|pasó|paso|ocurrió|ocurrio|socialista|comunista|capitalista|historia|biografía|biografia|datos|reporte|investiga|busca|analiza|explica|háblame|hablame|dime|sabes sobre|conoces|quién es|quien es|qué es|que es|noticias|receta|precio|dólar|euro|clima|tiempo|partido|gobierno|presidente)/i;

    const containsResearch = RESEARCH_KEYWORDS.test(lastUserText);
    const isConversational = (CONVERSATIONAL_PATTERNS.test(lastUserText) || CAPABILITY_PATTERNS.test(lastUserText)) && !containsResearch;
    // Una consulta es de investigación si contiene keywords de búsqueda O si es lo suficientemente larga
    const isResearchQuery = containsResearch || (lastUserText.length > 40 && !isConversational);

    console.log(`[PulsAI Intent] "${lastUserText.slice(0, 50)}" → ${isResearchQuery ? "INVESTIGACIÓN" : (isConversational ? "CONVERSACIONAL" : "SIMPLE")}`);

    if (onStep && !isConversational) {
        onStep("Analizando petición...");
    }
    // ── RAZONAMIENTO INTERNO (Chain of Thought - PulsAI 5.0) ───────────────
    let reasoningContext = "";
    if (isResearchQuery) {
        try {
            const reasoningMessages = [
                { role: "system", content: "Eres el núcleo de razonamiento de PulsAI. Tu misión es generar una consulta de búsqueda OPTIMIZADA. Ignora las menciones (como @PulsAI) y NO incluyas el nombre del usuario que pregunta en la búsqueda a menos que la pregunta sea específicamente SOBRE esa persona. Responde solo con el texto de la búsqueda." },
                { role: "user", content: lastUserText }
            ];
            reasoningContext = await getOllamaResponse(reasoningMessages, false, MODEL_NAME);
            // Limpieza extra: quitar comillas y menciones si el modelo las incluyó
            reasoningContext = reasoningContext.replace(/["']/g, "").replace(/@\w+/g, "").trim();
            console.log(`[PulsAI CoT Search Query] ${reasoningContext}`);
        } catch (e) {
            console.warn("[PulsAI CoT] Falló el razonamiento previo, continuando normal.");
        }
    }
    // ───────────────────────────────────────────────────────────────────────

    const existingSystemMessages = messages.filter(m => m.role === "system");
    const otherMessages = messages.filter(m => m.role !== "system");
    
    const activeMessages = [
        { role: "system", content: corePrompt },
        { role: "system", content: `CONTEXTO TEMPORAL: Hoy es ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Hora: ${new Date().toLocaleTimeString('es-ES')}.` },
        ...(reasoningContext ? [{ role: "system", content: `ANÁLISIS DE MISIÓN: ${reasoningContext}` }] : []),
        ...(isConversational ? [{ role: "system", content: "MODO CONVERSACIONAL: Identifícate como PulsAI en primera persona. Sé breve, elegante y directo. DEBES RESPONDER EN FORMATO JSON EXACTO: {\"action\":\"respond\", \"answer\":\"Tu respuesta aquí\"}. NO realices investigación." }] : []),
        ...existingSystemMessages,
        ...otherMessages
    ];

    while (loopCount < maxLoops) {
        loopCount++;
        
        // Fase de investigación: Usamos el modelo principal
        const responseText = await getOllamaResponse(activeMessages, true, MODEL_NAME);
        
        let parsed: any;
        try {
            const cleanText = responseText.replace(/```json|```/g, "").trim();
            const match = cleanText.match(/\{[\s\S]*\}/);
            const jsonStr = match ? match[0] : cleanText;
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            parsed = { action: "respond", answer: null }; 
        }

        let { action, query, answer } = parsed;

        // Limpieza de ruido en modelos pequeños
        if (typeof answer === "string") {
            answer = answer.replace(/\[\/?PLAN\]/g, "").trim();
        }

        // LOGICA DE INVESTIGACION FORZADA (PulsAI 4.0 - Auto-Research)
        if (action === "respond" || (!action && !query)) {
            const currentSourcesCount = sourcesMap.size;
            
            // Si es research y el modelo no busco nada en loop 1, buscamos AUTOMATICAMENTE
            // y hacemos una sintesis MINIMA directamente (contexto reducido para el 3B)
            if (isResearchQuery && currentSourcesCount < 1 && loopCount === 1) {
                console.log(`[PulsAI Auto-Research] Buscando: "${lastUserText.slice(0, 60)}"`);
                if (onStep) onStep("Buscando informacion actualizada...");
                try {
                    // Limpiamos el texto del usuario para la búsqueda automática: quitar menciones
                    const cleanSearchQuery = lastUserText.replace(/@\w+/g, "").trim();
                    const autoResults = await searchInternet(cleanSearchQuery);
                    autoResults.forEach((r: any) => {
                        if (r.link) sourcesMap.set(r.link, { title: r.title, url: r.link });
                    });
                    console.log(`[PulsAI Auto-Research] Encontrados ${autoResults.length} resultados para: "${cleanSearchQuery}"`);

                    // Condensar resultados a texto simple
                    const snippets = autoResults
                        .slice(0, 4)
                        .map((r: any, i: number) => `[${i+1}] ${r.title}: ${r.content || r.snippet || ""}`.slice(0, 600))
                        .join("\n\n");

                    if (onStep) onStep("Analizando fuentes...");

                    const minimalMessages = [
                        { 
                            role: "system", 
                            content: `Eres PulsAI. Responde en español basándote en los datos encontrados. SI NO HAY DATOS SUFICIENTES, usa tu propia base de conocimiento sofisticada para dar una respuesta valiosa. PROHIBIDO decir "no tengo información" o "en los textos proporcionados".\n\nDATOS DE BÚSQUEDA:\n${snippets || "Sin resultados detallados."}` 
                        },
                        { role: "user", content: lastUserText }
                    ];

                    const synthText = await getOllamaResponse(minimalMessages, false, MODEL_NAME);
                    const finalText = synthText?.trim() || "He analizado tu petición pero mi núcleo de datos está recalibrándose. Intenta de nuevo en un momento.";
                    return { response: finalText, sources: Array.from(sourcesMap.values()) };

                } catch (autoErr: any) {
                    console.error("[PulsAI Auto-Research] Error:", autoErr.message);
                    return { 
                        response: "Tuve un problema al buscar informacion. Por favor intenta de nuevo.", 
                        sources: [] 
                    };
                }
            }

            // VALIDACIÓN DE INTEGRIDAD 3.1: Si responde con citas pero no hay fuentes reales en la lista, RECHAZAR.
            if (currentSourcesCount === 0 && (answer?.includes("[CITA:") || answer?.includes('"'))) {
                 console.warn("[PulsAI 3.1 Integrity Check] Detectada alucinación de citas sin fuentes reales.");
                 activeMessages.push({ 
                    role: "system", 
                    content: "¡ALERTA DE ALUCINACIÓN! Estás citando fuentes o poniendo comillas pero NO has ejecutado herramientas para obtener esa información. Tu memoria interna está PROHIBIDA. Investiga ahora con 'search_internet' o admite que no sabes nada. NO uses corchetes formativos." 
                 });
                 continue;
            }

            let finalResponse = answer;
            
            // Si no hay "answer", buscamos el primer valor de texto largo
            if (!finalResponse && typeof parsed === "object") {
                const values = Object.values(parsed);
                const longString = values.find(v => typeof v === "string" && v.length > 20);
                if (longString) {
                    finalResponse = longString as string;
                } else {
                    // Si no hay answer, acumulamos todos los strings largos del objeto parsed
                    const allTexts = Object.entries(parsed)
                        .filter(([k, v]) => k !== "action" && k !== "query" && typeof v === "string")
                        .map(([_, v]) => v);
                    if (allTexts.length > 0) {
                        finalResponse = allTexts.join("\n\n");
                    }
                }
            }

            // Fallback total if no answer was found
            if (!finalResponse) {
                const answerMatch = responseText.match(/"answer":\s*"([^"]*)"/);
                const extracted = answerMatch ? answerMatch[1] : null;
                
                if (extracted && extracted !== "{}") {
                    finalResponse = extracted;
                } else if (responseText.length > 5 && !responseText.includes("{")) {
                    finalResponse = responseText.trim();
                }
            }

            // VALIDADOR DE PRECISIÓN ATÓMICA 3.0 (Anti-Vaguedad)
            // Solo aplica para investigación real Y cuando ya tenemos fuentes con texto completo (read_url),
            // no cuando solo tenemos resúmenes de Tavily (que no permiten citas textuales literales).
            const hasFullTextSources = currentSourcesCount > 0 && loopCount > 2;
            if (isResearchQuery && hasFullTextSources && loopCount < maxLoops - 1) {
                const hasDates = /\b(20\d{2}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i.test(finalResponse);
                const hasEntities = /[A-Z][a-z]+ [A-Z][a-z]+/.test(finalResponse);
                const isFiller = /(algunos críticos|expertos creen|podría afectar|implicaciones significativas|podría comprometer)/i.test(finalResponse);

                const hasEvidence = hasDates || hasEntities;

                if (!hasEvidence && isFiller) {
                    console.warn("[PulsAI 3.3 Atomic Check] Respuesta rechazada por falta de evidencia y exceso de relleno.");
                    activeMessages.push({ 
                        role: "system", 
                        content: `¡RESPUESTA RECHAZADA! Tu reporte es demasiado genérico y carece de datos concretos (fechas, nombres). Investiga más a fondo o cita datos específicos de las fuentes. Formato: {"action": "respond", "answer": "tu respuesta"}` 
                    });
                    continue; 
                }
            }

            // VERIFICADOR DE SÍNTESIS 2.4 (Anti-vuelco de datos crudos)
            const isDataDump = !isConversational && finalResponse && (
                finalResponse.includes('"resultados_de INTERNET"') || 
                finalResponse.includes('"link":') || 
                (finalResponse.trim().startsWith('[') && finalResponse.trim().endsWith(']')) ||
                finalResponse.length < 100 // Ignorar respuestas demasiado cortas para ser analíticas
            );

            if (isDataDump && loopCount < maxLoops - 1) {
                console.warn("[PulsAI 2.4 Synthesis Check] Detectado volcado de datos crudos. Re-solicitando síntesis.");
                activeMessages.push({ 
                    role: "system", 
                    content: "¡ERROR! Tu respuesta es un volcado de datos técnicos o demasiado breve. PulsAI no es un buscador, es un analista. Redacta ahora un reporte en PROSA ANALÍTICA, mordaz, extenso (mínimo 3 párrafos) y directo basándote en la información recolectada. NO uses corchetes ni formato JSON." 
                });
                continue; 
            }

            // 🧠 SÍNTESIS INTELIGENTE (GROUNDING 4.5): 
            // Si el modelo rápido terminó de investigar, llamamos al modelo de ÉLITE (8B)
            // para que redacte la respuesta final usando toda la información acumulada.
            if (loopCount > 1 || currentSourcesCount > 0) {
                 console.log(`[PulsAI Hybrid] Ejecutando Síntesis Final con ${MODEL_NAME}...`);
                 
                 // Optimizamos el contexto para la síntesis: solo instrucciones, últimos mensajes y resultados
                 const synthesisMessages = [
                    { role: "system", content: `${corePrompt}\n\nSÍNTESIS FINAL: Redacta un reporte en PROSA sofisticada, CRÍTICA y MATIZADA. Prohibido usar frases robóticas como "en los textos proporcionados" o "no tengo información específica". Si los datos son escasos, usa tu base de conocimiento para dar contexto analítico. Responde directamente en texto plano.` },
                    ...activeMessages.filter(m => m.role === "system" && m.content.includes("RESULTADO DE HERRAMIENTA")).slice(-3),
                    { role: "user", content: lastUserText }
                 ];

                 const synthesisResponse = await getOllamaResponse(synthesisMessages, false, MODEL_NAME);
                 
                 try {
                    const cleanSynth = synthesisResponse.replace(/```json|```/g, "").trim();
                    const synthJson = JSON.parse(cleanSynth);
                    answer = synthJson.answer || synthJson.response || synthesisResponse;
                 } catch (e) {
                    answer = synthesisResponse;
                 }
                 finalResponse = answer;
            }

            if (finalResponse) {
                // Limpieza agresiva de restos JSON y prefijos de instrucción de modelos pequeños
                let cleaned = String(finalResponse);
                cleaned = cleaned
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .replace(/\{\s*"action"\s*:[^}]+\}\s*/gi, "")
                    .replace(/^\{\s*"answer":\s*"/, "")
                    .replace(/^\{\s*"respond":\s*"/, "")
                    .replace(/^\{\s*"reaction":\s*"/, "")
                    .replace(/^Eres PulsAI,\s*/i, "Soy PulsAI, ") // Corregir efecto espejo común
                    .replace(/^Como una IA de élite,\s*/i, "")
                    .replace(/\\n/g, "\n")
                    .replace(/\\"/g, '"')
                    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
                    .replace(/["\}]+$/, "") // Limpiar basura al final
                    .trim();

                finalResponse = cleaned;
            }
            
            if (onStep) onStep(getRandomStep("thinking"));
            
            if (!finalResponse || finalResponse === "{}" || finalResponse === "action" || finalResponse.length < 5) {
                console.warn("[PulsAI] Generando respuesta de emergencia por fallo de síntesis.");
                const emergencyMessages = [
                    { role: "system", content: `${corePrompt}\nALERTA TÉCNICA: Se produjo un error de procesamiento. Responde al usuario con tu estilo sofisticado indicando que estás recalibrando tus sensores de datos. PROHIBIDO pedir disculpas o decir "no tengo información".` },
                    { role: "user", content: lastUserText }
                ];
                try {
                    finalResponse = await getOllamaResponse(emergencyMessages, false, MODEL_NAME);
                } catch (e) {
                    finalResponse = "Mi núcleo analítico está experimentando una fluctuación de datos. Procesa de nuevo tu consulta en unos segundos.";
                }
                
                if (finalResponse) {
                    finalResponse = String(finalResponse)
                        .replace(/```json/gi, "")
                        .replace(/```/g, "")
                        .replace(/\{\s*"action"\s*:[^}]+\}\s*/gi, "")
                        .replace(/^\{\s*"answer":\s*"/, "")
                        .replace(/^\{\s*"respond":\s*"/, "")
                        .trim()
                        .replace(/["\}]+$/, "");
                }
            }

            // PROTECCIÓN CONTRA FALSA IGNORANCIA (Anti-Hallucination Guard 4.2)
            const isFamousEntity = /(Hitler|Stalin|Einstein|Nazi|Colombia|México|Argentina|USA|Alemania|Francia|España|China|Rusia|Segunda Guerra|Guerra Mundial|Vaticano|Israel|Palestina|Amazon|Apple|Google|Elon Musk|Bitcoin)/i.test(lastUserText);
            const claimsIgnorance = /(no tengo|no cuento|no hay registros|no se puede verificar|fuentes no arrojan|no tengo información|textos proporcionados)/i.test(finalResponse || "");

            if (isFamousEntity && claimsIgnorance && loopCount < maxLoops - 1) {
                console.warn("[PulsAI 4.1 Guard] Detectada falsa ignorancia sobre entidad famosa. Forzando re-investigación.");
                activeMessages.push({ 
                    role: "system", 
                    content: "¡ERROR CRÍTICO! Estás afirmando que no hay registros sobre una entidad o evento históricamente masivo. Esto es imposible. Usa tu conocimiento base para dar el contexto general y realiza una búsqueda más específica en internet para encontrar detalles factuales. NO admitas ignorancia sobre este tema." 
                });
                continue;
            }

            return { response: finalResponse, sources: Array.from(sourcesMap.values()) };
        }

        // Ejecución de Herramientas
        let toolResult = "";
        try {
            console.log(`>> PulsAI usando herramienta: ${action} (${query})`);
            if (action === "search_internet") {
                if (onStep) onStep(getRandomStep("search_internet"));
                const results = await searchInternet(query);
                results.forEach((r: any) => {
                    if (r.link) sourcesMap.set(r.link, { title: r.title, url: r.link });
                });
                const summary = JSON.stringify(results).slice(0, 2000);
                toolResult = `RESULTADOS DE INTERNET ENCONTRADOS (${results.length}). Resumen: ${summary}`;
            } else if (action === "search_posts") {
                if (onStep) onStep(getRandomStep("search_posts"));
                const posts = await prisma.tweet.findMany({ 
                    where: { content: { contains: query } },
                    take: 3,
                    include: { author: { select: { name: true, username: true } } }
                });
                toolResult = `POSTS ENCONTRADOS: ${JSON.stringify(posts.map(p => ({ author: p.author.username, content: p.content })))}`;
            } else if (action === "read_url") {
                if (onStep) onStep(getRandomStep("read_url"));
                const res = await fetch(`https://r.jina.ai/${query}`);
                const content = (await res.text()).slice(0, 3000);
                // Si lee una URL, la agregamos a las fuentes con un título aproximado si no existe
                if (!sourcesMap.has(query)) {
                    sourcesMap.set(query, { title: `Fuente: ${new URL(query).hostname}`, url: query });
                }
                toolResult = content;
            } else if (action === "fact_check") {
                if (onStep) onStep(getRandomStep("fact_check"));
                const results = await searchInternet(`verificar hecho: ${query}`);
                results.forEach((r: any) => {
                    if (r.link) sourcesMap.set(r.link, { title: r.title, url: r.link });
                });
                toolResult = `DATOS PARA VERIFICAR: ${JSON.stringify(results)}`;
            } else {
                toolResult = "Herramienta desconocida.";
            }
        } catch (toolError: any) {
            console.error(`[PulsAI Tool Error] en ${action}:`, toolError);
            toolResult = `Error al ejecutar la herramienta: ${toolError.message || "desconocido"}`;
        }

        activeMessages.push({ role: "assistant", content: JSON.stringify(parsed) });
        activeMessages.push({ role: "system", content: `RESULTADO DE HERRAMIENTA (${action}): ${toolResult}\n\nAhora genera tu respuesta final o usa otra herramienta si es necesario.` });
    }

    return { response: "He procesado mucha información y necesito un descanso. ¿Qué más puedo hacer por ti?", sources: Array.from(sourcesMap.values()) };
}



/**
 * CLASIFICACIÓN DE CONTENIDO (Moderación PulsAI)
 * Categoriza el contenido para proteger a menores y gestionar sensibilidad.
 */
export async function classifyContent(content: string): Promise<string> {
    const classificationPrompt = `
Eres el Módulo de Clasificación de Seguridad de PulsAI. 
Tu tarea es analizar el texto de un post y clasificarlo en UNA de las siguientes categorías:

1. "SAFE": Contenido apto para todas las edades. No contiene violencia explícita, contenido sexual ni lenguaje altamente ofensivo.
2. "SENSITIVE": Contenido que puede ser molesto para algunos usuarios pero no es necesariamente prohibido (temas políticos fuertes, discusiones médicas, etc.).
3. "NSFW": Contenido sexualmente sugerente o adulto.
4. "VIOLENT": Contenido que describe o muestra violencia gráfica, sangre o crueldad.

RESPONDE ÚNICAMENTE CON UN OBJETO JSON EXACTO:
{ "classification": "CATEGORIA" }

TEXTO A ANALIZAR:
"${content}"
`;

    try {
        const messages = [{ role: "system", content: classificationPrompt }];
        const responseText = await getOllamaResponse(messages, true, MODEL_NAME);
        
        const cleanText = responseText.replace(/```json|```/g, "").trim();
        const match = cleanText.match(/\{[\s\S]*\}/);
        const jsonStr = match ? match[0] : cleanText;
        const parsed = JSON.parse(jsonStr);
        
        const validCategories = ["SAFE", "SENSITIVE_TEXT", "NSFW", "VIOLENT"];
        const result = parsed.classification?.toUpperCase() || "SAFE";
        
        // Si la IA dice SENSITIVE, lo mapeamos a SENSITIVE_TEXT para indicar que es el TEXTO lo fuerte
        const finalResult = result === "SENSITIVE" ? "SENSITIVE_TEXT" : result;
        
        return validCategories.includes(finalResult) ? finalResult : "SAFE";
    } catch (error) {
        console.error("[PulsAI Classification Error]:", error);
        return "SAFE"; // Fallback a seguro en caso de error técnico
    }
}
