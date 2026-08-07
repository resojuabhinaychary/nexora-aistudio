// ---------------------------------------------------------------------------
// Nexora AI router — never let one API limit stop a presentation.
//
// TEXT  : Gemini key 1..6  ->  Lovable AI Gateway  ->  OpenRouter  ->  Groq  ->  Together AI
// IMAGE : Lovable AI Gateway image model -> Gemini keys -> OpenRouter image -> keyless generator
//
// Every provider/key that fails with a quota / rate-limit / server error is put
// on a short cooldown and skipped, so the next request goes straight to a
// healthy one. Users never see provider names or raw API errors.
// ---------------------------------------------------------------------------

import { fallbackGenerateImage, geminiGenerateImage, geminiGenerateText, type GeminiContent } from "./gemini";

const COOLDOWN_MS = 4 * 60 * 1000;
const cooldowns = new Map<string, number>();

const down = (id: string) => cooldowns.set(id, Date.now() + COOLDOWN_MS);
const alive = (id: string) => (cooldowns.get(id) ?? 0) < Date.now();

/** All configured Gemini keys, in priority order (up to 6 + legacy names). */
export function geminiKeys(): { id: string; key: string }[] {
  const raw = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GOOGLE_API_KEY,
  ];
  const seen = new Set<string>();
  const out: { id: string; key: string }[] = [];
  raw.forEach((k, i) => {
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push({ id: `gemini-${i + 1}`, key: k });
  });
  return out;
}

export type TextOptions = {
  system?: string;
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
};

function toOpenAiMessages(contents: GeminiContent[], system?: string) {
  const messages: any[] = [];
  if (system) messages.push({ role: "system", content: system });
  for (const c of contents) {
    const parts = c.parts.map((p) =>
      "text" in p
        ? { type: "text", text: p.text }
        : { type: "image_url", image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } },
    );
    messages.push({ role: c.role === "model" ? "assistant" : "user", content: parts });
  }
  return messages;
}

async function openAiCompatibleChat(args: {
  id: string;
  url: string;
  headers: Record<string, string>;
  model: string;
  contents: GeminiContent[];
  options: TextOptions;
}): Promise<string> {
  const res = await fetch(args.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...args.headers },
    body: JSON.stringify({
      model: args.model,
      messages: toOpenAiMessages(args.contents, args.options.system),
      temperature: args.options.temperature ?? 0.75,
      max_tokens: args.options.maxOutputTokens ?? 8192,
      ...(args.options.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 402 || res.status === 408 || res.status === 429 || res.status >= 500) down(args.id);
    throw new Error(`${args.id} HTTP ${res.status}: ${body.slice(0, 160)}`);
  }
  const json: any = await res.json();
  const text = (json?.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error(`${args.id} returned an empty response`);
  return text;
}

type TextProvider = { id: string; run: () => Promise<string> };

function textProviders(contents: GeminiContent[], options: TextOptions): TextProvider[] {
  const list: TextProvider[] = [];

  for (const { id, key } of geminiKeys()) {
    list.push({
      id,
      run: async () => {
        try {
          return await geminiGenerateText(key, contents, options);
        } catch (err) {
          down(id);
          throw err;
        }
      },
    });
  }

  if (process.env.LOVABLE_API_KEY) {
    list.push({
      id: "lovable",
      run: () =>
        openAiCompatibleChat({
          id: "lovable",
          url: "https://ai.gateway.lovable.dev/v1/chat/completions",
          headers: { "Lovable-API-Key": process.env.LOVABLE_API_KEY!, "X-Lovable-AIG-SDK": "fetch" },
          model: "google/gemini-3.6-flash",
          contents,
          options,
        }),
    });
  }

  if (process.env.OPENROUTER_API_KEY) {
    list.push({
      id: "openrouter",
      run: () =>
        openAiCompatibleChat({
          id: "openrouter",
          url: "https://openrouter.ai/api/v1/chat/completions",
          headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
          model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
          contents,
          options,
        }),
    });
  }

  if (process.env.GROQ_API_KEY) {
    list.push({
      id: "groq",
      run: () =>
        openAiCompatibleChat({
          id: "groq",
          url: "https://api.groq.com/openai/v1/chat/completions",
          headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          contents,
          options,
        }),
    });
  }

  if (process.env.TOGETHER_API_KEY) {
    list.push({
      id: "together",
      run: () =>
        openAiCompatibleChat({
          id: "together",
          url: "https://api.together.xyz/v1/chat/completions",
          headers: { Authorization: `Bearer ${process.env.TOGETHER_API_KEY}` },
          model: process.env.TOGETHER_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo",
          contents,
          options,
        }),
    });
  }

  if (process.env.OPENAI_API_KEY) {
    list.push({
      id: "openai",
      run: () =>
        openAiCompatibleChat({
          id: "openai",
          url: "https://api.openai.com/v1/chat/completions",
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          model: "gpt-5.4-mini",
          contents,
          options,
        }),
    });
  }

  return list;
}

/** Try every configured key/provider in order. Only throws when all are down. */
export async function routeText(contents: GeminiContent[], options: TextOptions = {}): Promise<string> {
  const all = textProviders(contents, options);
  if (all.length === 0) throw new Error("No AI provider is configured yet.");
  const ordered = [...all.filter((p) => alive(p.id)), ...all.filter((p) => !alive(p.id))];
  const errors: string[] = [];
  for (const provider of ordered) {
    try {
      return await provider.run();
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  console.error("[aiRouter] all text providers failed:", errors.join(" | "));
  throw new Error("The AI is busy right now. Please try again in a moment.");
}

// ------------------------------- Images ------------------------------------

async function gatewayImage(prompt: string): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key || !alive("lovable-image")) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
      signal: AbortSignal.timeout(75_000),
    });
    if (!res.ok) {
      down("lovable-image");
      return null;
    }
    const json: any = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch {
    down("lovable-image");
    return null;
  }
}

async function openrouterImage(prompt: string): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || !alive("openrouter-image")) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
      signal: AbortSignal.timeout(75_000),
    });
    if (!res.ok) {
      down("openrouter-image");
      return null;
    }
    const json: any = await res.json();
    const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return typeof url === "string" && url.startsWith("data:image") ? url : null;
  } catch {
    down("openrouter-image");
    return null;
  }
}

/**
 * One AI image for one slide. Tries every provider/key before giving up.
 * `attempt` rotates models and seeds so a retry never returns the same picture.
 */
export async function routeImage(prompt: string, attempt = 0): Promise<{ dataUrl: string } | null> {
  const gw = await gatewayImage(prompt);
  if (gw) return { dataUrl: gw };

  for (const { id, key } of geminiKeys()) {
    if (!alive(`${id}-image`)) continue;
    const g = await geminiGenerateImage(key, prompt, attempt);
    if (g.ok) return { dataUrl: g.dataUrl };
    down(`${id}-image`);
  }

  const or = await openrouterImage(prompt);
  if (or) return { dataUrl: or };

  for (let i = 0; i < 2; i += 1) {
    const fb = await fallbackGenerateImage(prompt, attempt + i);
    if (fb.ok) return { dataUrl: fb.dataUrl };
  }
  return null;
}
