import type { GeneratedDoc } from "./ai.functions";

export type EducationalImageContext = {
  subject?: string;
  chapter?: string;
  topic: string;
  keywords?: string | string[];
};

const UNAVAILABLE = "Educational image unavailable for this topic";

function clean(input?: string) {
  return (input || "").replace(/\s+/g, " ").trim();
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function subjectSpecificRequirements(text: string) {
  const t = text.toLowerCase();
  if (/ideal|government|democracy|constitution|civics|rights|duties|election|governance/.test(t)) {
    return "democracy infographic, government structure chart, constitution illustration, citizen rights and duties infographic, election or governance flowchart where relevant";
  }
  if (/biology|cell|mitochondria|photosynthesis|respiration|krebs|dna|enzyme|plant|animal|pyruvate/.test(t)) {
    return "labeled biology diagram with structures, arrows, pathways, molecules, organelles, inputs and outputs where relevant";
  }
  if (/physics|force|motion|electric|magnet|light|wave|energy|newton|circuit/.test(t)) {
    return "physics concept diagram with vectors, labels, formulas, apparatus or process arrows where relevant";
  }
  if (/chemistry|atom|bond|reaction|acid|base|molecule|periodic|compound/.test(t)) {
    return "chemistry diagram with molecules, reaction arrows, labels, equations and particle-level representation where relevant";
  }
  if (/math|algebra|geometry|trigonometry|calculus|graph|equation|probability/.test(t)) {
    return "mathematical diagram with graph, coordinate axes, geometric construction, formula labels or step annotations where relevant";
  }
  return "topic-specific educational infographic with labeled concepts, arrows, captions and a clear learning diagram";
}

export function buildEducationalImagePrompt(context: EducationalImageContext) {
  const keywords = Array.isArray(context.keywords) ? context.keywords.join(", ") : clean(context.keywords);
  const subject = clean(context.subject) || "General education";
  const chapter = clean(context.chapter);
  const topic = clean(context.topic) || "educational topic";
  const analysis = [subject, chapter, topic, keywords].filter(Boolean).join(" | ");
  const requirements = subjectSpecificRequirements(analysis);

  return [
    `Subject: ${subject}`,
    chapter ? `Chapter: ${chapter}` : "",
    `Topic: ${topic}`,
    keywords ? `Keywords: ${keywords}` : "",
    `Create a real topic-specific educational image: ${requirements}.`,
    "Textbook-quality labeled diagram or infographic, clear labels, arrows, captions, white classroom background, accurate educational content.",
    "No placeholder, no blank card, no dummy image, no decorative gradient, no title-page graphic, no random stock photo, no scenery, no city, no beach, no road, no building, no people, no unrelated background.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildEducationalImageKey(context: EducationalImageContext, w = 1024, h = 576) {
  return `${buildEducationalImagePrompt(context)}|${w}x${h}`;
}

function pollinationsUrl(prompt: string, w: number, h: number, attempt: number, key: string) {
  const seed = hashString(`${key}:${attempt}`);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&model=flux&seed=${seed}&enhance=true`;
}

async function fetchDataUrl(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timeout = window.setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    window.clearTimeout(timeout);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size < 2500 || !blob.type.startsWith("image/")) return null;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function normalizeIfNotBlank(dataUrl: string, w: number, h: number): Promise<string | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        if (img.naturalWidth < 64 || img.naturalHeight < 64) {
          resolve(null);
          return;
        }
        const canvas = document.createElement("canvas");
        const maxW = Math.min(w, 1024);
        const scale = Math.min(1, maxW / img.naturalWidth);
        canvas.width = Math.max(64, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(64, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const stride = Math.max(4, Math.floor(data.length / 4 / 1500) * 4);
        let samples = 0;
        let alphaPixels = 0;
        let sum = 0;
        let sumSq = 0;
        let darkOrColored = 0;
        for (let i = 0; i < data.length; i += stride) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a > 20) alphaPixels += 1;
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const chroma = Math.max(r, g, b) - Math.min(r, g, b);
          if (lum < 238 || chroma > 18) darkOrColored += 1;
          sum += lum;
          sumSq += lum * lum;
          samples += 1;
        }
        const mean = sum / Math.max(samples, 1);
        const variance = sumSq / Math.max(samples, 1) - mean * mean;
        const visibleRatio = alphaPixels / Math.max(samples, 1);
        const contentRatio = darkOrColored / Math.max(samples, 1);
        if (visibleRatio < 0.8 || (variance < 18 && contentRatio < 0.035)) {
          resolve(null);
          return;
        }
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function fetchVerifiedEducationalImage(
  context: EducationalImageContext,
  w = 1024,
  h = 576,
): Promise<{ dataUrl: string; key: string; prompt: string } | null> {
  const prompt = buildEducationalImagePrompt(context);
  const key = buildEducationalImageKey(context, w, h);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const dataUrl = await fetchDataUrl(pollinationsUrl(prompt, w, h, attempt, key), attempt === 1 ? 30000 : 22000);
    if (!dataUrl) continue;
    const verified = await normalizeIfNotBlank(dataUrl, w, h);
    if (verified) return { dataUrl: verified, key, prompt };
  }
  return null;
}

export async function ensureDocEducationalImages(doc: GeneratedDoc): Promise<GeneratedDoc> {
  const pages = await Promise.all(
    doc.pages.map(async (page) => {
      const context = {
        subject: doc.subject,
        chapter: page.title,
        topic: page.imageQuery || page.title,
        keywords: page.sections.map((s) => s.heading).join(", "),
      };
      const key = buildEducationalImageKey(context, 1024, 576);
      if (page.educationalImage?.key === key || page.unavailableImageKey === key) return page;
      const result = await fetchVerifiedEducationalImage(context, 1024, 576);
      if (result) return { ...page, educationalImage: result, unavailableImageKey: undefined };
      return { ...page, educationalImage: undefined, unavailableImageKey: key };
    }),
  );
  return { ...doc, pages };
}

export { UNAVAILABLE as EDUCATIONAL_IMAGE_UNAVAILABLE };