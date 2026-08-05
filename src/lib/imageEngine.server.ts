// ---------------------------------------------------------------------------
// Nexora unified educational image engine (server-only).
//
// One intelligent engine from the caller's point of view. Internally it walks a
// provider chain and NEVER fails: if every network provider is unavailable it
// renders a real educational SVG diagram locally.
//
//   1. Gemini image models        (GEMINI_API_KEY / GOOGLE_API_KEY)
//   2. OpenRouter image models    (OPENROUTER_API_KEY)
//   3. Replicate (FLUX schnell)   (REPLICATE_API_TOKEN)
//   4. Pixabay educational search (PIXABAY_API_KEY)
//   5. Pexels educational search  (PEXELS_API_KEY)
//   6. Unsplash educational search(UNSPLASH_ACCESS_KEY)
//   7. Keyless generator (Pollinations)
//   8. Locally rendered SVG diagram  <- always succeeds
//
// Any failure (429, quota, billing, timeout, network, empty/blocked response)
// moves instantly to the next provider. Errors are logged server-side only and
// are never surfaced to the user.
// ---------------------------------------------------------------------------

import { geminiGenerateImage } from "./gemini";

export type EngineImage = { dataUrl: string; source: string };

const COOLDOWN_MS = 4 * 60 * 1000;
const cooldowns = new Map<string, number>();

function down(name: string) {
  cooldowns.set(name, Date.now() + COOLDOWN_MS);
}
function available(name: string) {
  const until = cooldowns.get(name);
  return !until || Date.now() >= until;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

async function fetchImageAsDataUrl(url: string, timeoutMs = 20_000, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  if (!mimeType.startsWith("image/")) throw new Error(`bad mime ${mimeType}`);
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 2048) throw new Error("empty image");
  return `data:${mimeType.split(";")[0]};base64,${bytesToBase64(new Uint8Array(buffer))}`;
}

// ---------------------------------------------------------------------------
// Prompt parsing — the prompt is a structured block built by the client.
// ---------------------------------------------------------------------------

export type PromptFacts = {
  subject: string;
  chapter: string;
  topic: string;
  keywords: string[];
  variantIndex: number;
};

function field(prompt: string, name: string) {
  const line = prompt.split("\n").find((l) => new RegExp(`^${name}:`, "i").test(l.trim()));
  return line ? line.replace(/^[^:]+:\s*/, "").trim() : "";
}

export function parsePromptFacts(prompt: string): PromptFacts {
  const variant = field(prompt, "Unique variant");
  let variantIndex = 0;
  for (const ch of variant) variantIndex = (variantIndex * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    subject: field(prompt, "Subject") || "Education",
    chapter: field(prompt, "Chapter"),
    topic: field(prompt, "Topic") || "Educational concept",
    keywords: field(prompt, "Keywords")
      .split(/[,;]/)
      .map((k) => k.trim())
      .filter(Boolean),
    variantIndex: variantIndex % 997,
  };
}

// --- Focused educational query building -----------------------------------

const STOP = new Set([
  "the","a","an","and","or","of","in","on","for","to","with","by","from","its","it",
  "is","are","was","were","be","this","that","these","those","as","at","into","about",
  "how","what","why","when","which","explain","introduction","chapter","lesson","topic",
  "study","notes","class","part","using","use","their","there","can","also","more",
]);

/** Domain hint words that make a query read as an educational diagram search. */
const SUBJECT_HINTS: Array<[RegExp, string[]]> = [
  [/phys/i, ["diagram", "labelled diagram", "physics illustration"]],
  [/chem/i, ["diagram", "molecular structure", "chemistry illustration"]],
  [/bio|life science/i, ["diagram", "labelled biology diagram", "anatomy illustration"]],
  [/math|algebra|geometry|calculus/i, ["diagram", "graph", "geometry figure"]],
  [/geo|earth/i, ["map diagram", "geography diagram", "illustration"]],
  [/hist|civics|social/i, ["timeline illustration", "historical illustration", "infographic"]],
  [/comput|coding|program/i, ["flowchart", "architecture diagram", "infographic"]],
  [/econom|commerce|business/i, ["infographic", "chart", "process diagram"]],
];

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/**
 * Extracts the 3-5 most important educational keywords for the lesson,
 * ranked by where they appear (topic title > chapter > keyword list).
 */
export function coreKeywords(facts: PromptFacts): string[] {
  const score = new Map<string, number>();
  const add = (text: string, weight: number) => {
    tokens(text).forEach((w, i) => {
      score.set(w, (score.get(w) || 0) + weight - i * 0.01);
    });
  };
  add(facts.topic.split("—")[0] || "", 6);
  add(facts.chapter, 3);
  facts.keywords.slice(0, 6).forEach((k) => add(k, 2));
  add(facts.subject, 0.5);
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

/**
 * Ordered list of focused search phrases, best first:
 * full lesson phrase + "diagram", keyword cluster + "diagram", then broader.
 */
export function buildSearchQueries(facts: PromptFacts): string[] {
  const core = coreKeywords(facts);
  const phrase = tokens(facts.topic.split("—")[0] || facts.chapter || facts.subject)
    .slice(0, 4)
    .join(" ");
  const cluster = core.slice(0, 3).join(" ");
  const hint = SUBJECT_HINTS.find(([re]) => re.test(facts.subject))?.[1] ?? [
    "diagram",
    "educational illustration",
    "infographic",
  ];
  const list = [
    phrase && `${phrase} ${hint[0]}`,
    cluster && `${cluster} ${hint[0]}`,
    phrase && `${phrase} ${hint[1]}`,
    cluster && `${cluster} ${hint[2] ?? "educational illustration"}`,
    phrase || cluster,
  ].filter(Boolean) as string[];
  return [...new Set(list.map((q) => q.replace(/\s+/g, " ").trim()))].filter(Boolean);
}

/** Relevance of a candidate's own text (tags/alt/title) against the lesson. */
function relevance(candidateText: string, facts: PromptFacts) {
  const core = coreKeywords(facts);
  if (!core.length) return 1;
  const hay = ` ${candidateText.toLowerCase()} `;
  let hits = 0;
  for (const w of core) {
    const stem = w.length > 5 ? w.slice(0, Math.ceil(w.length * 0.75)) : w;
    if (hay.includes(stem)) hits += 1;
  }
  return hits / Math.min(core.length, 4);
}

const MIN_RELEVANCE = 0.5;

/** Picks the most lesson-relevant candidate, or null when none is close enough. */
function pickRelevant<T>(
  items: T[],
  facts: PromptFacts,
  describe: (item: T) => string,
): T | null {
  const scored = items
    .map((item) => ({ item, score: relevance(describe(item), facts) }))
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score >= MIN_RELEVANCE);
  if (!scored.length) return null;
  const top = scored.filter((s) => s.score >= scored[0].score - 0.001);
  return top[facts.variantIndex % top.length].item;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

async function viaGemini(prompt: string, facts: PromptFacts): Promise<EngineImage | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key || !available("gemini")) return null;
  try {
    const res = await geminiGenerateImage(key, prompt, facts.variantIndex % 3);
    if (res.ok) return { dataUrl: res.dataUrl, source: "gemini" };
    down("gemini");
  } catch {
    down("gemini");
  }
  return null;
}

async function viaOpenRouter(prompt: string): Promise<EngineImage | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || !available("openrouter")) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt.slice(0, 3500) }],
        modalities: ["image", "text"],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      down("openrouter");
      return null;
    }
    const json: any = await res.json();
    const url: string | undefined =
      json?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      json?.data?.[0]?.b64_json ||
      undefined;
    if (!url) return null;
    if (url.startsWith("data:image/")) return { dataUrl: url, source: "openrouter" };
    if (url.startsWith("http")) return { dataUrl: await fetchImageAsDataUrl(url), source: "openrouter" };
    return { dataUrl: `data:image/png;base64,${url}`, source: "openrouter" };
  } catch {
    down("openrouter");
  }
  return null;
}

async function viaReplicate(prompt: string): Promise<EngineImage | null> {
  const key = process.env.REPLICATE_API_TOKEN;
  if (!key || !available("replicate")) return null;
  try {
    const res = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        Prefer: "wait=50",
      },
      body: JSON.stringify({
        input: { prompt: prompt.slice(0, 2500), aspect_ratio: "16:9", output_format: "jpg" },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      down("replicate");
      return null;
    }
    let json: any = await res.json();
    // Poll if the sync wait was not enough.
    for (let i = 0; i < 8 && json?.status && !["succeeded", "failed", "canceled"].includes(json.status); i += 1) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(json.urls?.get, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(20_000),
      });
      if (!poll.ok) break;
      json = await poll.json();
    }
    const out = Array.isArray(json?.output) ? json.output[0] : json?.output;
    if (typeof out === "string" && out.startsWith("http")) {
      return { dataUrl: await fetchImageAsDataUrl(out, 30_000), source: "replicate" };
    }
  } catch {
    down("replicate");
  }
  return null;
}

async function viaPixabay(facts: PromptFacts): Promise<EngineImage | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key || !available("pixabay")) return null;
  try {
    for (const query of buildSearchQueries(facts)) {
      const res = await fetch(
        `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(
          query,
        )}&image_type=all&safesearch=true&per_page=30&order=popular`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (!res.ok) {
        down("pixabay");
        return null;
      }
      const json: any = await res.json();
      const hits: any[] = json?.hits || [];
      const hit = pickRelevant(hits, facts, (h) => `${h?.tags || ""} ${h?.pageURL || ""}`);
      const url = hit?.largeImageURL || hit?.webformatURL;
      if (url) return { dataUrl: await fetchImageAsDataUrl(url), source: "pixabay" };
    }
  } catch {
    down("pixabay");
  }
  return null;
}

async function viaPexels(facts: PromptFacts): Promise<EngineImage | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !available("pexels")) return null;
  try {
    for (const query of buildSearchQueries(facts)) {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=30`,
        { headers: { Authorization: key }, signal: AbortSignal.timeout(15_000) },
      );
      if (!res.ok) {
        down("pexels");
        return null;
      }
      const json: any = await res.json();
      const photos: any[] = json?.photos || [];
      const photo = pickRelevant(photos, facts, (p) => `${p?.alt || ""} ${p?.url || ""}`);
      const url = photo?.src?.large || photo?.src?.medium;
      if (url) return { dataUrl: await fetchImageAsDataUrl(url), source: "pexels" };
    }
  } catch {
    down("pexels");
  }
  return null;
}

async function viaUnsplash(facts: PromptFacts): Promise<EngineImage | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !available("unsplash")) return null;
  try {
    for (const query of buildSearchQueries(facts)) {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30`,
        { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(15_000) },
      );
      if (!res.ok) {
        down("unsplash");
        return null;
      }
      const json: any = await res.json();
      const results: any[] = json?.results || [];
      const pick = pickRelevant(
        results,
        facts,
        (r) =>
          `${r?.alt_description || ""} ${r?.description || ""} ${(r?.tags || [])
            .map((t: any) => t?.title)
            .join(" ")}`,
      );
      const url = pick?.urls?.regular || pick?.urls?.small;
      if (url) return { dataUrl: await fetchImageAsDataUrl(url), source: "unsplash" };
    }
  } catch {
    down("unsplash");
  }
  return null;
}

/** Keyless generator — no credentials required, keeps quality high when keys run out. */
async function viaKeylessGenerator(prompt: string, facts: PromptFacts): Promise<EngineImage | null> {
  if (!available("keyless")) return null;
  const seed = 1000 + facts.variantIndex * 7;
  const model = facts.variantIndex % 2 === 0 ? "flux" : "turbo";
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt.slice(0, 700),
    )}?width=896&height=504&nologo=true&enhance=false&model=${model}&seed=${seed}`;
    return { dataUrl: await fetchImageAsDataUrl(url, 22_000), source: "generator" };
  } catch {
    down("keyless");
  }
  return null;
}

// ---------------------------------------------------------------------------
// Guaranteed local fallback: a real, labelled educational SVG diagram.
// ---------------------------------------------------------------------------

const PALETTES = [
  { bg: "#f5f9ff", a: "#2563eb", b: "#60a5fa", c: "#dbeafe", ink: "#0f172a" },
  { bg: "#f3fdf8", a: "#0f9d76", b: "#5eead4", c: "#d1fae5", ink: "#083344" },
  { bg: "#fff7f3", a: "#ea6a2c", b: "#fdba74", c: "#ffedd5", ink: "#431407" },
  { bg: "#faf5ff", a: "#7c3aed", b: "#c4b5fd", c: "#ede9fe", ink: "#2e1065" },
];

function esc(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function wrap(text: string, max: number, lines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      out.push(cur.trim());
      cur = w;
      if (out.length === lines) break;
    } else cur = `${cur} ${w}`;
  }
  if (out.length < lines && cur.trim()) out.push(cur.trim());
  return out.slice(0, lines);
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

/** Builds a concept map / flowchart / cycle diagram from the lesson facts. */
export function renderEducationalSvg(facts: PromptFacts): string {
  const p = PALETTES[facts.variantIndex % PALETTES.length];
  const layout = facts.variantIndex % 3; // 0 flowchart, 1 concept map, 2 cycle
  const heading = titleCase((facts.topic.split("—")[0] || facts.subject).trim()).slice(0, 58);
  const sub = titleCase((facts.chapter || facts.subject).trim()).slice(0, 60);
  const rawNodes = (facts.keywords.length ? facts.keywords : facts.topic.split(/[,·-]/))
    .map((k) => titleCase(k.trim()))
    .filter((k) => k.length > 1)
    .slice(0, 5);
  const nodes = rawNodes.length >= 3 ? rawNodes : [...rawNodes, "Definition", "Process", "Example", "Application"].slice(0, 4);

  const W = 1024;
  const H = 576;
  const parts: string[] = [];
  parts.push(
    `<rect width="${W}" height="${H}" fill="${p.bg}"/>`,
    `<rect x="0" y="0" width="${W}" height="86" fill="${p.a}"/>`,
    `<text x="40" y="46" font-family="Segoe UI,Arial,sans-serif" font-size="30" font-weight="700" fill="#ffffff">${esc(heading)}</text>`,
    `<text x="40" y="72" font-family="Segoe UI,Arial,sans-serif" font-size="17" fill="#e5edff">${esc(sub)}</text>`,
  );

  const label = (x: number, y: number, w: number, h: number, text: string, idx: number) => {
    const lines = wrap(text, Math.max(10, Math.floor(w / 10)), 2);
    const startY = y + h / 2 - (lines.length - 1) * 11;
    return [
      `<rect x="${x}" y="${y}" rx="16" width="${w}" height="${h}" fill="#ffffff" stroke="${p.a}" stroke-width="3"/>`,
      `<rect x="${x}" y="${y}" rx="16" width="10" height="${h}" fill="${p.b}"/>`,
      `<circle cx="${x + w - 22}" cy="${y + 22}" r="13" fill="${p.c}"/>`,
      `<text x="${x + w - 22}" y="${y + 27}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="14" font-weight="700" fill="${p.a}">${idx}</text>`,
      ...lines.map(
        (l, i) =>
          `<text x="${x + w / 2}" y="${startY + i * 22}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="19" font-weight="600" fill="${p.ink}">${esc(l)}</text>`,
      ),
    ].join("");
  };

  const arrow = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${p.a}" stroke-width="4" marker-end="url(#ah)"/>`;

  if (layout === 0) {
    // Vertical flowchart
    const bw = 560;
    const bh = 74;
    const x = (W - bw) / 2;
    nodes.forEach((n, i) => {
      const y = 128 + i * 100;
      parts.push(label(x, y, bw, bh, n, i + 1));
      if (i < nodes.length - 1) parts.push(arrow(W / 2, y + bh + 4, W / 2, y + 94));
    });
  } else if (layout === 1) {
    // Central concept map
    const cx = W / 2;
    const cy = 340;
    const spots = [
      [60, 130],
      [660, 130],
      [60, 430],
      [660, 430],
      [360, 500],
    ];
    // Connectors first so the hub label always sits on top of them.
    nodes.forEach((n, i) => {
      const [x, y] = spots[i % spots.length];
      parts.push(arrow(cx, cy, x + 150, y + 34), label(x, y, 300, 68, n, i + 1));
    });
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="96" fill="${p.a}"/>`,
      ...wrap(heading, 14, 3).map(
        (l, i, arr) =>
          `<text x="${cx}" y="${cy - (arr.length - 1) * 11 + i * 22}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="700" fill="#ffffff">${esc(l)}</text>`,
      ),
    );
  } else {
    // Cycle / process ring
    const cx = W / 2;
    const cy = 336;
    const r = 178;
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.b}" stroke-width="6" stroke-dasharray="14 10"/>`);
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      const x = Math.min(W - 246, Math.max(16, cx + Math.cos(angle) * r - 115));
      const y = Math.min(H - 100, Math.max(100, cy + Math.sin(angle) * r - 31));
      parts.push(label(x, y, 230, 62, n, i + 1));
    });
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="88" fill="#ffffff" stroke="${p.c}" stroke-width="4"/>`,
      ...wrap(heading, 13, 3).map(
        (l, i, arr) =>
          `<text x="${cx}" y="${cy - (arr.length - 1) * 11 + i * 22}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="700" fill="${p.a}">${esc(l)}</text>`,
      ),
    );
  }

  parts.push(
    `<rect x="0" y="${H - 34}" width="${W}" height="34" fill="${p.c}"/>`,
    `<text x="${W / 2}" y="${H - 12}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="15" font-weight="600" fill="${p.a}">${esc(
      `${facts.subject} · Educational diagram`,
    )}</text>`,
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><marker id="ah" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="${p.a}"/></marker></defs>${parts.join("")}</svg>`;
  return `data:image/svg+xml;base64,${bytesToBase64(new TextEncoder().encode(svg))}`;
}

// ---------------------------------------------------------------------------
// Public API — always resolves with an image.
// ---------------------------------------------------------------------------

export async function createEducationalImage(prompt: string): Promise<EngineImage> {
  const facts = parsePromptFacts(prompt);
  const chain: Array<() => Promise<EngineImage | null>> = [
    () => viaGemini(prompt, facts),
    () => viaOpenRouter(prompt),
    () => viaReplicate(prompt),
    () => viaPixabay(facts),
    () => viaPexels(facts),
    () => viaUnsplash(facts),
    () => viaKeylessGenerator(prompt, facts),
  ];
  for (const step of chain) {
    try {
      const result = await step();
      if (result?.dataUrl) return result;
    } catch (err) {
      // Internal logging only — never surfaced to the user.
      console.error("[imageEngine] provider failed:", err instanceof Error ? err.message : err);
    }
  }
  return { dataUrl: renderEducationalSvg(facts), source: "diagram" };
}
