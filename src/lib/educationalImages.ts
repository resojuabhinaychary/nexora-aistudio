import type { GeneratedDoc, ImageRequestLog } from "./ai.functions";
import { generateEducationalImage } from "./ai.functions";

export type EducationalImageContext = {
  subject?: string;
  chapter?: string;
  topic: string;
  keywords?: string | string[];
  variant?: string;
};

const UNAVAILABLE = "Educational image unavailable for this topic";
// Small, queued concurrency keeps us far below provider rate limits.
const MAX_CONCURRENT_IMAGE_REQUESTS = 2;
const SERVER_FUNCTION_TIMEOUT_MS = 75_000;
// Backoff for HTTP 429 / timeout failures. Max 3 retries: 3s, 5s, 10s.
const RETRY_DELAYS_MS = [3_000, 5_000, 10_000];
// A booklet needs 5–6 great illustrations, not dozens.
const MAX_IMAGES_PER_DOC = 6;
const PERSIST_KEY = "nexora.imgcache.v2";
const PERSIST_LIMIT = 36;

type CachedImage = {
  dataUrl: string;
  key: string;
  prompt: string;
  logs?: ImageRequestLog[];
  mimeType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
};

const successfulImageCache = new Map<string, CachedImage>();
const inFlightImageCache = new Map<string, Promise<EducationalImageResult>>();

// ---------------------------------------------------------------------------
// Persistent (cross-session) image cache. Keeps regenerated documents instant
// and guarantees the PDF reuses exactly the bytes the preview showed.
// ---------------------------------------------------------------------------
let persistLoaded = false;

function loadPersistentCache() {
  if (persistLoaded || typeof localStorage === "undefined") return;
  persistLoaded = true;
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as [string, CachedImage][];
    for (const [k, v] of entries) {
      if (v?.dataUrl) successfulImageCache.set(k, v);
    }
  } catch {
    /* corrupt cache — ignore */
  }
}

function persistCache() {
  if (typeof localStorage === "undefined") return;
  try {
    const entries = Array.from(successfulImageCache.entries())
      .slice(-PERSIST_LIMIT)
      .map(([k, v]) => [k, { key: v.key, prompt: v.prompt, dataUrl: v.dataUrl, mimeType: v.mimeType, width: v.width, height: v.height }] as [string, CachedImage]);
    localStorage.setItem(PERSIST_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded — drop the oldest half and retry once.
    try {
      const keys = Array.from(successfulImageCache.keys());
      keys.slice(0, Math.floor(keys.length / 2)).forEach((k) => successfulImageCache.delete(k));
      localStorage.removeItem(PERSIST_KEY);
    } catch {
      /* ignore */
    }
  }
}

export type ImageGenerationProgress = {
  completed: number;
  total: number;
  /** Not started yet. */
  queued: number;
  /** Currently generating. */
  active: number;
  success: number;
  failed: number;
  currentPage?: number;
  /** True while any image is still generating or retrying. */
  running: boolean;
  message: string;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

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
  if (
    /biology|cell|mitochondria|photosynthesis|respiration|krebs|dna|enzyme|plant|animal|pyruvate/.test(
      t,
    )
  ) {
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
  const keywords = Array.isArray(context.keywords)
    ? context.keywords.join(", ")
    : clean(context.keywords);
  const subject = clean(context.subject) || "General education";
  const chapter = clean(context.chapter);
  const topic = clean(context.topic) || "educational topic";
  const analysis = [subject, chapter, topic, keywords].filter(Boolean).join(" | ");
  const requirements = subjectSpecificRequirements(analysis);
  const variant = clean(context.variant);
  const styles = [
    "flat vector infographic, bold outlines, pastel palette",
    "isometric 3D illustration, soft shadows, blue-teal palette",
    "hand-drawn chalkboard sketch on white, colored accents",
    "cross-section cutaway diagram with numbered callouts",
    "step-by-step flowchart, arrows, minimal color blocks",
    "annotated scientific illustration, warm accent palette",
    "cartoon-style educational poster, playful icons, high contrast",
  ];
  const styleIdx = variant ? hashString(variant) % styles.length : 0;
  const styleHint = styles[styleIdx];

  return [
    `Subject: ${subject}`,
    chapter ? `Chapter: ${chapter}` : "",
    `Topic: ${topic}`,
    keywords ? `Keywords: ${keywords}` : "",
    variant ? `Unique variant: ${variant} (must differ in composition, angle, and color from other images in this document)` : "",
    `Visual style: ${styleHint}.`,
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

function parseImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const [, mimeType, base64] = match;
  let byteSize = 0;
  try {
    byteSize =
      typeof atob === "function" ? atob(base64).length : Math.floor((base64.length * 3) / 4);
  } catch {
    return null;
  }
  return byteSize > 0 ? { mimeType, byteSize } : null;
}

async function normalizeIfValid(dataUrl: string, w: number, h: number): Promise<
  | {
      dataUrl: string;
      mimeType: string;
      byteSize: number;
      width: number;
      height: number;
    }
  | null
> {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return null;
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return { dataUrl, mimeType: parsed.mimeType, byteSize: parsed.byteSize, width: 1, height: 1 };
  }
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
        const normalized = canvas.toDataURL("image/jpeg", 0.88);
        const normalizedParsed = parseImageDataUrl(normalized);
        if (!normalizedParsed) {
          resolve(null);
          return;
        }
        resolve({
          dataUrl: normalized,
          mimeType: normalizedParsed.mimeType,
          byteSize: normalizedParsed.byteSize,
          width: canvas.width,
          height: canvas.height,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export type EducationalImageResult =
  | {
      ok: true;
      dataUrl: string;
      key: string;
      prompt: string;
      logs?: ImageRequestLog[];
      mimeType?: string;
      byteSize?: number;
      width?: number;
      height?: number;
    }
  | { ok: false; error: string; key: string; prompt: string; logs?: ImageRequestLog[] };

export async function fetchVerifiedEducationalImage(
  context: EducationalImageContext,
  w = 1024,
  h = 576,
): Promise<EducationalImageResult> {
  const prompt = buildEducationalImagePrompt(context);
  const key = buildEducationalImageKey(context, w, h);
  loadPersistentCache();
  const cached = successfulImageCache.get(key);
  if (cached) return { ok: true, ...cached };
  const inFlight = inFlightImageCache.get(key);
  if (inFlight) return inFlight;

  const request = (async (): Promise<EducationalImageResult> => {
    let lastError = "Image generation failed";
    let lastLogs: ImageRequestLog[] | undefined;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const result = await withTimeout(
          generateEducationalImage({ data: { prompt } }),
          SERVER_FUNCTION_TIMEOUT_MS,
          `Image generation exceeded ${Math.round(SERVER_FUNCTION_TIMEOUT_MS / 1000)} seconds.`,
        );
        lastLogs = result.logs;
        if (result.ok) {
          const verified = await normalizeIfValid(result.dataUrl, w, h);
          if (verified) {
            const success: CachedImage = { key, prompt, logs: result.logs, ...verified };
            successfulImageCache.set(key, success);
            persistCache();
            return { ok: true, ...success };
          }
          lastError =
            "Generated image failed validation: blank, too small, or invalid image data.";
        } else {
          lastError = result.error;
          // Only 429 / timeout / transient failures are worth retrying.
          if (!result.retryable && !/429|rate limit|timeout|abort/i.test(result.error)) {
            return { ok: false, error: lastError, key, prompt, logs: result.logs };
          }
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await new Promise((r) => setTimeout(r, delay));
    }

    console.error("[educationalImages] all retries failed:", lastError);
    return { ok: false, error: lastError, key, prompt, logs: lastLogs };
  })();

  inFlightImageCache.set(key, request);
  request.finally(() => inFlightImageCache.delete(key));
  return request;
}

export async function ensureDocEducationalImages(
  doc: GeneratedDoc,
  options: {
    concurrency?: number;
    format?: "notes" | "presentation" | "pdf";
    onProgress?: (progress: ImageGenerationProgress) => void;
  } = {},
): Promise<GeneratedDoc> {
  const pages: GeneratedDoc["pages"] = doc.pages.map((p) => ({ ...p }));
  // Image density is format-specific: notes stay light and fast, slides get one
  // diagram per idea, booklets get rich per-section illustration.
  const format = options.format || doc.format || "pdf";
  const sectionsPerPage = format === "notes" ? 1 : format === "presentation" ? 1 : 3;
  type Task =
    | { kind: "page"; pageIndex: number }
    | { kind: "section"; pageIndex: number; sectionIndex: number };
  const tasks: Task[] = [];
  // Cover images for the earliest pages first, then per-section diagrams, so a
  // capped budget still spreads illustrations across the whole document.
  doc.pages.forEach((_page, pageIndex) => tasks.push({ kind: "page", pageIndex }));
  doc.pages.forEach((page, pageIndex) => {
    const sectionCount = Math.min(sectionsPerPage, page.sections.length);
    for (let s = 0; s < sectionCount; s += 1) {
      tasks.push({ kind: "section", pageIndex, sectionIndex: s });
    }
  });
  // Cap the number of images so generation stays fast and inside rate limits.
  if (tasks.length > MAX_IMAGES_PER_DOC) tasks.length = MAX_IMAGES_PER_DOC;
  const total = tasks.length;
  const concurrency = Math.max(
    1,
    Math.min(options.concurrency ?? MAX_CONCURRENT_IMAGE_REQUESTS, MAX_CONCURRENT_IMAGE_REQUESTS, total || 1),
  );
  let cursor = 0;
  let active = 0;
  let completed = 0;
  let success = 0;
  let failed = 0;

  const emit = (currentPage?: number) => {
    const queued = Math.max(0, total - completed - active);
    options.onProgress?.({
      completed,
      total,
      queued,
      active,
      success,
      failed,
      currentPage,
      running: completed < total,
      message: !total
        ? "No images required"
        : completed >= total
          ? `Educational illustrations ready — ${success} of ${total}`
          : `Generating image ${Math.min(completed + 1, total)} of ${total} · ${Math.round((completed / total) * 100)}% — finding the best educational resources…`,
    });
  };

  emit();

  const worker = async () => {
    while (cursor < total) {
      const taskIndex = cursor;
      cursor += 1;
      active += 1;
      const task = tasks[taskIndex];
      emit(task.pageIndex + 1);

      if (task.kind === "page") {
        const srcPage = doc.pages[task.pageIndex];
        const context = {
          subject: doc.subject,
          chapter: srcPage.title,
          topic: srcPage.imageQuery || srcPage.title,
          keywords: srcPage.sections.map((s) => s.heading).join(", "),
          variant: `page-${task.pageIndex + 1}-cover`,
        };
        const key = buildEducationalImageKey(context, 1024, 576);
        const existing = pages[task.pageIndex];
        if (existing.educationalImage?.key === key) {
          successfulImageCache.set(key, {
            key,
            prompt: existing.educationalImage.prompt || buildEducationalImagePrompt(context),
            dataUrl: existing.educationalImage.dataUrl,
            logs: existing.educationalImage.logs || existing.imageLogs,
            mimeType: existing.educationalImage.mimeType,
            byteSize: existing.educationalImage.byteSize,
            width: existing.educationalImage.width,
            height: existing.educationalImage.height,
          });
          success += 1;
        } else {
          const result = await fetchVerifiedEducationalImage(context, 1024, 576);
          if (result.ok) {
            pages[task.pageIndex] = {
              ...existing,
              educationalImage: {
                dataUrl: result.dataUrl,
                key: result.key,
                prompt: result.prompt,
                logs: result.logs,
                mimeType: result.mimeType,
                byteSize: result.byteSize,
                width: result.width,
                height: result.height,
              },
              unavailableImageKey: undefined,
              imageError: undefined,
              imageLogs: result.logs,
            };
            success += 1;
          } else {
            pages[task.pageIndex] = {
              ...existing,
              educationalImage: undefined,
              unavailableImageKey: key,
              imageError: result.error,
              imageLogs: result.logs,
            };
            failed += 1;
          }
        }
      } else {
        const srcPage = doc.pages[task.pageIndex];
        const sec = srcPage.sections[task.sectionIndex];
        const paraSnippet = (sec.paragraph || (sec.bullets || []).join("; ") || "").slice(0, 200);
        const context = {
          subject: doc.subject,
          chapter: srcPage.title,
          topic: `${sec.heading} — ${paraSnippet}`,
          keywords: sec.heading,
          variant: `page-${task.pageIndex + 1}-section-${task.sectionIndex + 1}`,
        };
        const key = buildEducationalImageKey(context, 900, 500);
        const existing = pages[task.pageIndex];
        const existingSection = existing.sectionImages?.[task.sectionIndex];
        if (existingSection?.key === key) {
          success += 1;
        } else {
          const result = await fetchVerifiedEducationalImage(context, 900, 500);
          if (result.ok) {
            pages[task.pageIndex] = {
              ...existing,
              sectionImages: {
                ...(existing.sectionImages || {}),
                [task.sectionIndex]: {
                  dataUrl: result.dataUrl,
                  key: result.key,
                  prompt: result.prompt,
                  mimeType: result.mimeType,
                  width: result.width,
                  height: result.height,
                },
              },
            };
            success += 1;
          } else {
            failed += 1;
          }
        }
      }
      completed += 1;
      active -= 1;
      emit(task.pageIndex + 1);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { ...doc, pages };
}

export { UNAVAILABLE as EDUCATIONAL_IMAGE_UNAVAILABLE };
