// ---------------------------------------------------------------------------
// Automatic AI provider fallback.
//
// Primary : Lovable AI Gateway (LOVABLE_API_KEY)
// Backup  : Google Gemini REST API (GEMINI_API_KEY)
//
// When the gateway returns credits exhausted / quota / 429 / timeout /
// 5xx, we transparently switch to Gemini and put the gateway on a short
// cooldown. Once the cooldown expires the gateway is tried again first, so the
// app switches back automatically. Callers get a `provider` field so the UI can
// show "Using backup AI provider." — no user action is ever required.
// ---------------------------------------------------------------------------

import {
  fallbackGenerateImage,
  geminiGenerateImage,
  geminiGenerateText,
  type GeminiContent,
} from "./gemini";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const GATEWAY_CHAT_MODEL = "google/gemini-2.5-flash";
const GATEWAY_IMAGE_MODEL = "google/gemini-3.1-flash-image";
const COOLDOWN_MS = 5 * 60 * 1000;

export type ProviderName = "lovable" | "gemini" | "fallback";

let gatewayCooldownUntil = 0;

function gatewayAvailable() {
  return Boolean(process.env.LOVABLE_API_KEY) && Date.now() >= gatewayCooldownUntil;
}

function markGatewayDown() {
  gatewayCooldownUntil = Date.now() + COOLDOWN_MS;
}

/** Statuses that mean "try the backup provider", not "the request was wrong". */
function shouldFailover(status: number) {
  return status === 402 || status === 408 || status === 429 || status >= 500;
}

function contentsToMessages(contents: GeminiContent[], system?: string) {
  const messages: any[] = [];
  if (system) messages.push({ role: "system", content: system });
  for (const c of contents) {
    const parts = c.parts.map((p) =>
      "text" in p
        ? { type: "text", text: p.text }
        : {
            type: "image_url",
            image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` },
          },
    );
    messages.push({ role: c.role === "model" ? "assistant" : "user", content: parts });
  }
  return messages;
}

export type ProviderTextResult = { text: string; provider: ProviderName; notice?: string };

export async function generateTextWithFallback(
  contents: GeminiContent[],
  options: {
    system?: string;
    json?: boolean;
    temperature?: number;
    maxOutputTokens?: number;
  } = {},
): Promise<ProviderTextResult> {
  let gatewayError: string | undefined;

  if (gatewayAvailable()) {
    try {
      const res = await fetch(`${GATEWAY}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": process.env.LOVABLE_API_KEY!,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: GATEWAY_CHAT_MODEL,
          messages: contentsToMessages(contents, options.system),
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxOutputTokens ?? 8192,
          ...(options.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (res.ok) {
        const json: any = await res.json();
        const text = (json?.choices?.[0]?.message?.content ?? "").trim();
        if (text) return { text, provider: "lovable" };
        gatewayError = "Lovable AI Gateway returned an empty response";
      } else {
        const body = await res.text();
        gatewayError = `Lovable AI Gateway HTTP ${res.status}: ${body.slice(0, 200)}`;
        if (shouldFailover(res.status)) markGatewayDown();
      }
    } catch (err) {
      gatewayError = err instanceof Error ? err.message : String(err);
      markGatewayDown();
    }
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      gatewayError
        ? `${gatewayError}. No backup provider configured (GEMINI_API_KEY missing).`
        : "No AI provider configured. Add LOVABLE_API_KEY or GEMINI_API_KEY.",
    );
  }
  const text = await geminiGenerateText(key, contents, options);
  return {
    text,
    provider: "gemini",
    notice: gatewayError ? "Using backup AI provider." : undefined,
  };
}

export type ProviderImageResult =
  | { ok: true; dataUrl: string; provider: ProviderName; model: string; notice?: string }
  | { ok: false; error: string; retryable: boolean };

/** Search trusted educational image sources (Wikimedia Commons) and inline the bytes. */
async function searchEducationalImage(
  prompt: string,
): Promise<{ ok: true; dataUrl: string; model: string } | { ok: false; error: string }> {
  // Use the topic/keyword lines of the prompt as the search query.
  const query = prompt
    .split("\n")
    .filter((l) => /^(Subject|Chapter|Topic|Keywords):/i.test(l))
    .map((l) => l.replace(/^[^:]+:\s*/, ""))
    .join(" ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  if (!query) return { ok: false, error: "No search query available" };
  try {
    const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(
      `${query} diagram`,
    )}&prop=imageinfo&iiprop=url|mime&iiurlwidth=1024`;
    const res = await fetch(api, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return { ok: false, error: `Educational image search HTTP ${res.status}` };
    const json: any = await res.json();
    const pages: any[] = Object.values(json?.query?.pages || {});
    for (const p of pages) {
      const info = p?.imageinfo?.[0];
      const url: string | undefined = info?.thumburl || info?.url;
      if (!url || !/\.(png|jpe?g)$/i.test(url.split("?")[0])) continue;
      const img = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!img.ok) continue;
      const mimeType = img.headers.get("content-type") || "image/jpeg";
      if (!mimeType.startsWith("image/")) continue;
      const bytes = new Uint8Array(await img.arrayBuffer());
      if (bytes.byteLength < 2048) continue;
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      return { ok: true, dataUrl: `data:${mimeType};base64,${btoa(binary)}`, model: "wikimedia-commons" };
    }
    return { ok: false, error: "No relevant educational image found" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function generateImageWithFallback(prompt: string): Promise<ProviderImageResult> {
  const errors: string[] = [];
  let usedBackup = false;
  let retryable = false;

  if (gatewayAvailable()) {
    try {
      const res = await fetch(`${GATEWAY}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": process.env.LOVABLE_API_KEY!,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: GATEWAY_IMAGE_MODEL,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) {
        const json: any = await res.json();
        const b64 = json?.data?.[0]?.b64_json;
        if (b64) {
          return {
            ok: true,
            dataUrl: `data:image/png;base64,${b64}`,
            provider: "lovable",
            model: GATEWAY_IMAGE_MODEL,
          };
        }
        errors.push("Lovable AI Gateway returned no image data");
      } else {
        const body = await res.text();
        errors.push(`Lovable gateway HTTP ${res.status}: ${body.slice(0, 160)}`);
        if (shouldFailover(res.status)) {
          markGatewayDown();
          usedBackup = true;
          if (res.status === 429) retryable = true;
        }
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      markGatewayDown();
      usedBackup = true;
      retryable = true;
    }
  }

  const key = process.env.GEMINI_API_KEY;
  if (key) {
    const gem = await geminiGenerateImage(key, prompt, 0);
    if (gem.ok) {
      return {
        ok: true,
        dataUrl: gem.dataUrl,
        provider: "gemini",
        model: gem.model,
        notice: usedBackup ? "Using backup AI provider." : undefined,
      };
    }
    errors.push(gem.error);
    if (gem.retryable) retryable = true;
  }

  // Trusted educational image search before the generic generator.
  const searched = await searchEducationalImage(prompt);
  if (searched.ok) {
    return {
      ok: true,
      dataUrl: searched.dataUrl,
      provider: "fallback",
      model: searched.model,
      notice: "Finding the best educational resources…",
    };
  }
  errors.push(searched.error);

  // Last resort: free no-key generator so documents still get illustrations.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const fb = await fallbackGenerateImage(prompt, attempt);
    if (fb.ok) {
      return {
        ok: true,
        dataUrl: fb.dataUrl,
        provider: "fallback",
        model: fb.model,
        notice: "Using backup AI provider.",
      };
    }
    errors.push(fb.error);
    if (/timeout|abort|network|fetch/i.test(fb.error)) retryable = true;
  }

  return { ok: false, error: errors.join(" | ") || "Image generation failed", retryable };
}
