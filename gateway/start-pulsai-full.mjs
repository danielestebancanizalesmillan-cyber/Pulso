/**
 * start-pulsai-full.mjs
 * Script maestro que:
 * 1. Carga el .env
 * 2. Arranca el gateway local (pulsai-gateway.mjs)
 * 3. Arranca el túnel de Cloudflare
 * 4. Detecta la URL pública asignada por Cloudflare
 * 5. Sube la URL a Vercel Blob como "pulsai-tunnel-url.json"
 * 6. Mantiene todo corriendo indefinidamente
 */

import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── 1. Cargar .env ────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const lines = readFileSync(resolve(ROOT, ".env"), "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
    console.log("[PulsAI] .env cargado ✓");
  } catch (e) {
    console.warn("[PulsAI] No se pudo leer .env:", e.message);
  }
}

// ── 2. Subir URL del túnel a Vercel Blob ─────────────────────────────────────
async function publishTunnelUrl(tunnelUrl) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn("[PulsAI] BLOB_READ_WRITE_TOKEN no encontrado. La URL no se publicará automáticamente.");
    return false;
  }

  try {
    // Vercel Blob API: PUT /v1/blobs/pulsai-tunnel-url.json
    const body = JSON.stringify({
      url: tunnelUrl,
      model: process.env.OLLAMA_MODEL || "gemma4:e2b",
      updatedAt: new Date().toISOString(),
    });

    const res = await fetch("https://blob.vercel-storage.com/pulsai-tunnel-url.json", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-content-type": "application/json",
      },
      body,
    });

    if (res.ok) {
      const data = await res.json();
      console.log("[PulsAI] ✅ URL publicada en Vercel Blob:", data.url || "OK");
      return true;
    } else {
      const errText = await res.text();
      console.warn("[PulsAI] ⚠️  Blob upload error:", res.status, errText.slice(0, 200));
      return false;
    }
  } catch (e) {
    console.error("[PulsAI] Error al subir a Vercel Blob:", e.message);
    return false;
  }
}

// ── 2.5 Limpiar puerto si está ocupado ──────────────────────────────────────
async function freePort(port) {
  return new Promise((resolve) => {
    // netstat para encontrar el PID que usa el puerto
    const ns = spawn("cmd", ["/c", `for /f "tokens=5" %a in ('netstat -aon ^| findstr ":${port} "') do taskkill /F /PID %a`], {
      stdio: "ignore",
      shell: false,
    });
    ns.on("exit", () => {
      setTimeout(resolve, 500); // breve pausa para que el OS libere el socket
    });
    ns.on("error", () => resolve());
  });
}

// ── 3. Arrancar el gateway local ─────────────────────────────────────────────
function startGateway() {
  const gatewayPath = resolve(__dirname, "pulsai-gateway.mjs");
  const gatewayCode = readFileSync(gatewayPath, "utf8");

  const child = spawn(process.execPath, ["--input-type=module"], {
    env: process.env,
    stdio: ["pipe", "inherit", "inherit"],
  });

  child.stdin.write(gatewayCode);
  child.stdin.end();

  child.on("exit", (code) => {
    console.error(`[PulsAI Gateway] Proceso terminó con código ${code}. Reiniciando en 3s...`);
    setTimeout(startGateway, 3000);
  });

  console.log("[PulsAI Gateway] Iniciado en http://127.0.0.1:11435 ✓");
  return child;
}

// ── 4. Arrancar túnel Cloudflare y capturar URL ───────────────────────────────
function startTunnel(onUrlDetected) {
  const cloudflaredPath = resolve(ROOT, "cloudflared.exe");
  const port = process.env.PULSAI_GATEWAY_PORT || "11435";

  console.log(`[PulsAI Tunnel] Iniciando Cloudflare Quick Tunnel → http://127.0.0.1:${port}`);

  const tunnel = spawn(cloudflaredPath, ["tunnel", "--url", `http://127.0.0.1:${port}`], {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let urlDetected = false;

  const parseOutput = (data) => {
    const text = data.toString();
    process.stdout.write(text);

    if (!urlDetected) {
      // Detectar la URL en el output de cloudflared
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        urlDetected = true;
        const detectedUrl = match[0];
        console.log(`\n[PulsAI Tunnel] ✅ URL pública detectada: ${detectedUrl}\n`);
        onUrlDetected(detectedUrl);
      }
    }
  };

  tunnel.stdout.on("data", parseOutput);
  tunnel.stderr.on("data", parseOutput);

  tunnel.on("exit", (code) => {
    console.error(`[PulsAI Tunnel] Proceso terminó con código ${code}. Reiniciando en 5s...`);
    urlDetected = false;
    setTimeout(() => startTunnel(onUrlDetected), 5000);
  });

  return tunnel;
}

// ── 5. Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   PulsAI — Arranque Completo v2.0      ║");
  console.log("╚════════════════════════════════════════╝\n");

  loadEnv();

  // Verificar que Ollama esté corriendo
  try {
    const check = await fetch("http://127.0.0.1:11434/api/tags");
    if (check.ok) {
      const data = await check.json();
      const models = data.models?.map((m) => m.name) || [];
      console.log("[PulsAI] Ollama online. Modelos:", models.join(", ") || "ninguno");
    }
  } catch {
    console.warn("[PulsAI] ⚠️  Ollama no responde en 11434. Asegúrate de que esté corriendo.");
  }

  // Liberar el puerto 11435 si ya está en uso
  console.log("[PulsAI] Liberando puerto 11435...");
  await freePort(11435);

  // Arrancar gateway
  startGateway();

  // Esperar un momento para que el gateway inicie
  await new Promise((r) => setTimeout(r, 1500));

  // Verificar gateway
  try {
    const token = process.env.PULSAI_GATEWAY_TOKEN || "pulsai-local-secret-key-2026";
    const health = await fetch("http://127.0.0.1:11435/api/health", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const healthData = await health.json();
    console.log("[PulsAI Gateway] Health:", JSON.stringify(healthData));
  } catch (e) {
    console.warn("[PulsAI Gateway] No responde aún:", e.message);
  }

  // Arrancar túnel y publicar URL cuando esté lista
  startTunnel(async (tunnelUrl) => {
    const ok = await publishTunnelUrl(tunnelUrl);
    if (ok) {
      console.log("[PulsAI] 🎉 Sistema completo activo. El backend de Pulso detectará la URL automáticamente.");
    } else {
      console.log(`[PulsAI] ⚠️  Actualiza manualmente OLLAMA_HOST en Vercel con: ${tunnelUrl}`);
    }
  });
}

main().catch(console.error);
