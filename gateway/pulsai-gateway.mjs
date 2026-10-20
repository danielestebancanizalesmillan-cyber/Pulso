import http from "node:http";

const PORT = parseInt(process.env.PULSAI_GATEWAY_PORT || "11435", 10);
const HOST = "127.0.0.1";
const OLLAMA_URL = process.env.OLLAMA_INTERNAL_URL || "http://127.0.0.1:11434";
const SECRET_TOKEN = process.env.PULSAI_GATEWAY_TOKEN || "b9798b3b4631b1a0eebb4dfa9694b94c5b243ea9f75e514093210af276317ce6";
const TARGET_MODEL = process.env.OLLAMA_MODEL || "gemma4:e2b";
const MAX_BODY_BYTES = 512 * 1024; // 512 KB
const TIMEOUT_MS = 180000; // 3 minutos

let activeRequests = 0;
const MAX_CONCURRENT = 3; // Permitir health check y streaming simultáneo

const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

    // 1. Validar token de autorización para cualquier operación
    const authHeader = req.headers["authorization"] || "";
    const customHeader = req.headers["x-pulsai-token"] || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const token = bearerToken || customHeader;

    if (!token || token !== SECRET_TOKEN) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }));
    }

    // 2. Health check endpoint liviano (GET /api/health)
    if (req.method === "GET" && url.pathname === "/api/health") {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

        fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal })
            .then(async (ollamaRes) => {
                clearTimeout(timeout);
                if (!ollamaRes.ok) {
                    res.writeHead(502, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ status: "offline", reason: "Ollama returned error" }));
                }
                const data = await ollamaRes.json();
                const models = Array.isArray(data.models) ? data.models.map((m) => m.name) : [];
                const modelReady = models.some((m) => m === "gemma4:e2b" || m.includes("gemma4"));

                if (!modelReady) {
                    res.writeHead(503, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ status: "offline", reason: "Model gemma4:e2b not loaded" }));
                }

                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ status: "online", model: "gemma4:e2b" }));
            })
            .catch(() => {
                clearTimeout(timeout);
                res.writeHead(502, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ status: "offline", reason: "Cannot connect to local Ollama" }));
            });
        return;
    }

    // 3. Validar método y ruta para operaciones de chat
    if (req.method !== "POST" || url.pathname !== "/api/chat") {
        res.writeHead(403, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Forbidden: Only POST /api/chat or GET /api/health is allowed" }));
    }

    // 4. Limitar concurrencia para proteger los 8 GB de RAM
    if (activeRequests >= MAX_CONCURRENT) {
        res.writeHead(429, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Too Many Requests: Gateway is processing another request" }));
    }

    activeRequests++;

    let bodyChunks = [];
    let receivedBytes = 0;

    req.on("data", (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_BODY_BYTES) {
            req.destroy();
            activeRequests = Math.max(0, activeRequests - 1);
            res.writeHead(413, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Payload Too Large: Max size 512KB" }));
        }
        bodyChunks.push(chunk);
    });

    req.on("end", async () => {
        const rawBody = Buffer.concat(bodyChunks).toString("utf8");
        let parsed;
        try {
            parsed = JSON.parse(rawBody);
        } catch {
            activeRequests = Math.max(0, activeRequests - 1);
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Bad Request: Invalid JSON body" }));
        }

        // 5. Validar formato mínimo de chat
        if (!parsed.model || !Array.isArray(parsed.messages)) {
            activeRequests = Math.max(0, activeRequests - 1);
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Bad Request: 'model' and 'messages' array required" }));
        }

        // Enforzar estrictamente gemma4:e2b
        parsed.model = "gemma4:e2b";
        const isStreaming = Boolean(parsed.stream);
        const forwardBody = JSON.stringify(parsed);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: forwardBody,
                signal: controller.signal
            });

            clearTimeout(timer);

            if (!ollamaRes.ok) {
                const errText = await ollamaRes.text();
                res.writeHead(ollamaRes.status, { "Content-Type": "application/json" });
                return res.end(errText);
            }

            if (isStreaming && ollamaRes.body) {
                // Modo Streaming: Escribir encabezados inmediatamente con chunked transfer
                res.writeHead(200, {
                    "Content-Type": "application/x-ndjson; charset=utf-8",
                    "Transfer-Encoding": "chunked",
                    "Cache-Control": "no-cache, no-transform",
                    "Connection": "keep-alive"
                });

                const reader = ollamaRes.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(Buffer.from(value));
                }
                res.end();
            } else {
                const dataText = await ollamaRes.text();
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(dataText);
            }
        } catch (err) {
            clearTimeout(timer);
            const isTimeout = err.name === "AbortError";
            if (!res.headersSent) {
                res.writeHead(isTimeout ? 504 : 502, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    error: isTimeout ? "Gateway Timeout: Ollama took too long" : "Bad Gateway: Cannot reach Ollama service"
                }));
            } else {
                res.end();
            }
        } finally {
            activeRequests = Math.max(0, activeRequests - 1);
        }
    });

    req.on("error", () => {
        activeRequests = Math.max(0, activeRequests - 1);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`[PulsAI Gateway] Listening strictly on http://${HOST}:${PORT}`);
    console.log(`[PulsAI Gateway] Protected routes: POST /api/chat, GET /api/health`);
});
