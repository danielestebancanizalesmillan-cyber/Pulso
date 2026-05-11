// Global state for Gemini Circuit Breaker
let GEMINI_DISABLED_UNTIL: number = 0;

export function isGeminiEnabled(): boolean {
  return Date.now() >= GEMINI_DISABLED_UNTIL;
}

export function disableGemini(durationInMinutes: number = 30) {
  GEMINI_DISABLED_UNTIL = Date.now() + durationInMinutes * 60 * 1000;
  console.error(`[Gemini Circuit Breaker] 429 Detected. Disabling AI features for ${durationInMinutes} minutes.`);
}

export const GEMINI_MODEL = "gemini-3-flash-preview";
