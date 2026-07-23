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
  const model = options.model || "gemini-2.5-flash";
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
export async function geminiGenerateImage(
  apiKey: string,
  prompt: string,
  attempt = 0,
): Promise<{ ok: true; dataUrl: string; model: string } | { ok: false; error: string; retryable: boolean }> {
  // Nano Banana / image-preview model. Fall back on retry.
  const models = [
    "gemini-2.5-flash-image-preview",
    "gemini-2.0-flash-preview-image-generation",
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
  if (!result.ok) return { ok: false, error: result.error, retryable: result.retryable };
  const parts: any[] = result.json?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    const inline = p?.inlineData || p?.inline_data;
    if (inline?.data && inline?.mimeType) {
      return { ok: true, dataUrl: `data:${inline.mimeType};base64,${inline.data}`, model };
    }
  }
  return { ok: false, error: `Gemini ${model} returned no image data`, retryable: false };
}