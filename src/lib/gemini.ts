// Shared helpers for calling Google Gemini REST API directly.
// Callers MUST pass the API key (read from process.env.GEMINI_API_KEY inside
// a server-function handler) — never import GEMINI_API_KEY at module scope.

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export type GeminiContent = { role?: "user" | "model"; parts: GeminiPart[] };

export type GeminiTextOptions = {
  model?: string;
  system?: string;
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
};

function friendlyError(status: number, body: string) {
  if (status === 400 && /API key not valid/i.test(body))
    return "Gemini API key is invalid. Update GEMINI_API_KEY.";
  if (status === 401 || status === 403)
    return "Gemini API key is invalid or lacks access. Check GEMINI_API_KEY.";
  if (status === 429)
    return "Gemini rate limit reached. Please try again in a moment.";
  if (status === 404) return `Gemini model not found (HTTP 404): ${body.slice(0, 300)}`;
  return `Gemini HTTP ${status}: ${body.slice(0, 500)}`;
}

async function callGemini(
  apiKey: string,
  model: string,
  body: unknown,
  attempts = 3,
): Promise<{ ok: true; json: any } | { ok: false; status: number; error: string; retryable: boolean }> {
  let lastErr: { status: number; error: string; retryable: boolean } = {
    status: 0,
    error: "unknown",
    retryable: false,
  };
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (res.ok) {
        try {
          return { ok: true, json: JSON.parse(text) };
        } catch {
          return { ok: false, status: res.status, error: "Gemini returned non-JSON", retryable: false };
        }
      }
      const retryable = res.status === 429 || res.status >= 500;
      lastErr = { status: res.status, error: friendlyError(res.status, text), retryable };
      if (!retryable) return { ok: false, ...lastErr };
      await new Promise((r) => setTimeout(r, (i + 1) * 1200));
    } catch (err) {
      lastErr = {
        status: 0,
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
      };
      await new Promise((r) => setTimeout(r, (i + 1) * 1200));
    }
  }
  return { ok: false, ...lastErr };
}

export function requireGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key)
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it in project settings to enable AI features.",
    );
  return key;
}

/** Generate text (optionally JSON) with Gemini. Returns the raw text content. */
export async function geminiGenerateText(
  apiKey: string,
  contents: GeminiContent[],
  options: GeminiTextOptions = {},
): Promise<string> {
  const model = options.model || "gemini-3.6-flash";
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      ...(options.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (options.system) {
    body.systemInstruction = { parts: [{ text: options.system }] };
  }
  const result = await callGemini(apiKey, model, body);
  if (!result.ok) throw new Error(result.error);
  const text = (result.json?.candidates?.[0]?.content?.parts || [])
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
  if (!text) {
    const finishReason = result.json?.candidates?.[0]?.finishReason;
    throw new Error(`Gemini returned empty response${finishReason ? ` (${finishReason})` : ""}`);
  }
  return text;
}

/** Generate an image with Gemini image models. Returns a data URL. */
// When the key's image quota is exhausted (HTTP 429), retrying every image is
// pure latency. Remember it for a short cooldown and go straight to fallback.
let imageQuotaCooldownUntil = 0;
const IMAGE_QUOTA_COOLDOWN_MS = 5 * 60 * 1000;

export async function geminiGenerateImage(
  apiKey: string,
  prompt: string,
  attempt = 0,
): Promise<{ ok: true; dataUrl: string; model: string } | { ok: false; error: string; retryable: boolean }> {
  if (Date.now() < imageQuotaCooldownUntil) {
    return {
      ok: false,
      error: "Gemini image quota exhausted (cooling down) — using fallback generator.",
      retryable: false,
    };
  }
  // Nano Banana / image-preview model. Fall back on retry.
  const models = [
    "gemini-3.1-flash-image",
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-lite-image",
  ];
  const model = models[Math.min(attempt, models.length - 1)];
  const result = await callGemini(
    apiKey,
    model,
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    },
    1,
  );
  if (!result.ok) {
    if (result.status === 429) {
      imageQuotaCooldownUntil = Date.now() + IMAGE_QUOTA_COOLDOWN_MS;
      return { ok: false, error: result.error, retryable: false };
    }
    return { ok: false, error: result.error, retryable: result.retryable };
  }
  const parts: any[] = result.json?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    const inline = p?.inlineData || p?.inline_data;
    if (inline?.data && inline?.mimeType) {
      return { ok: true, dataUrl: `data:${inline.mimeType};base64,${inline.data}`, model };
    }
  }
  return { ok: false, error: `Gemini ${model} returned no image data`, retryable: false };
}

/**
 * Free fallback image generator (no API key). Used when the Gemini image
 * models are unavailable or out of quota so documents still get visuals.
 */
export async function fallbackGenerateImage(
  prompt: string,
  attempt = 0,
): Promise<{ ok: true; dataUrl: string; model: string } | { ok: false; error: string }> {
  const seed = 1000 + attempt * 137;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt.slice(0, 900),
  )}?width=1024&height=576&nologo=true&model=flux&seed=${seed}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      return { ok: false, error: `Fallback image HTTP ${res.status}` };
    }
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      return { ok: false, error: `Fallback image returned ${mimeType}` };
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 1024) {
      return { ok: false, error: "Fallback image was empty" };
    }
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const base64 = btoa(binary);
    return { ok: true, dataUrl: `data:${mimeType};base64,${base64}`, model: "flux-fallback" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}