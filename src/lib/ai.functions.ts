import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  geminiGenerateImage,
  geminiGenerateText,
  requireGeminiKey,
  type GeminiContent,
} from "./gemini";

const inputSchema = z.object({
  topic: z.string().min(2).max(2000),
  format: z.enum(["notes", "presentation", "pdf"]),
  imageBase64: z.string().optional(),
});

export type GeneratedSection = {
  heading: string;
  paragraph?: string;
  bullets?: string[];
};

export type GeneratedPage = {
  title: string;
  subtitle?: string;
  sections: GeneratedSection[];
  imageQuery?: string;
  educationalImage?: {
    dataUrl: string;
    key: string;
    prompt?: string;
    logs?: ImageRequestLog[];
    mimeType?: string;
    byteSize?: number;
    width?: number;
    height?: number;
  };
  unavailableImageKey?: string;
  imageError?: string;
  imageLogs?: ImageRequestLog[];
  sectionImages?: Record<
    number,
    {
      dataUrl: string;
      key: string;
      prompt?: string;
      mimeType?: string;
      width?: number;
      height?: number;
    }
  >;
};

export type ImageRequestLog = {
  model: string;
  prompt: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  responseCode?: number;
  errorMessage?: string;
  retryCount: number;
  success: boolean;
};

export type GeneratedDoc = {
  title: string;
  subject: string;
  summary: string;
  pages: GeneratedPage[];
  keyQuestions: string[];
  keyConcepts: string[];
  coverImageQuery?: string;
};

const systemPrompt = `You are Nexora AI, a master educator and exam coach. Produce DEEP, COMPREHENSIVE, textbook-quality study material that goes far beyond surface-level summaries — include definitions, derivations, mechanisms, formulas, worked examples, real-world applications, common misconceptions, and exam tips. Write in clear simple language a student can understand, but never skimp on depth. Output ONLY valid JSON matching the requested schema. No prose, no markdown.`;

function dataUrlToInlinePart(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

function buildUserPrompt(topic: string, format: string) {
  const count =
    format === "presentation"
      ? "8 to 10 slide-style pages"
      : format === "pdf"
        ? "8 to 12 deeply detailed pages"
        : "6 to 8 rich pages";
  const depth =
    format === "pdf"
      ? "Treat this as a printable study booklet. Cover the topic exhaustively: history/context, key definitions, all sub-concepts, formulas with derivations, multiple worked examples (with step-by-step solutions), diagrams to imagine, applications, FAQs, common mistakes, and revision points."
      : "Cover the topic thoroughly with definitions, mechanisms, examples, applications, and exam tips.";
  return `Topic / request: "${topic}"
Format: ${format}
${depth}
Generate ${count}. Each page MUST contain rich, in-depth educational content (no placeholders, no fluff). Use clear headings, well-written paragraphs (3-6 sentences each) AND bullet points with concrete examples. Include a title page, introduction, multiple core-concept pages, worked examples, applications, summary, key questions, and key concepts. For EVERY page, add a precise, topic-specific "imageQuery" (4-7 words) describing the single most relevant educational illustration — be SPECIFIC to the page's content (e.g. "labeled diagram chloroplast photosynthesis", "newton second law free body diagram", "DNA double helix base pairing"). Also include a top-level "coverImageQuery" for the title page hero illustration that visually represents the overall topic.
Return JSON of shape:
{
  "title": string,
  "subject": string,
  "summary": string (2-3 sentences),
  "coverImageQuery": string,
  "pages": [ { "title": string, "subtitle"?: string, "imageQuery": string, "sections": [ { "heading": string, "paragraph"?: string, "bullets"?: string[] } ] } ],
  "keyQuestions": string[] (5-8 exam-style questions),
  "keyConcepts": string[] (6-10 short concept names)
}`;
}

export const generateContent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = requireGeminiKey();
    const parts: GeminiContent["parts"] = [{ text: buildUserPrompt(data.topic, data.format) }];
    if (data.imageBase64) {
      const inline = dataUrlToInlinePart(data.imageBase64);
      if (inline) parts.push(inline);
    }
    const content = await geminiGenerateText(
      apiKey,
      [{ role: "user", parts }],
      { system: systemPrompt, json: true, temperature: 0.7, maxOutputTokens: 8192 },
    );
    let parsed: GeneratedDoc;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    if (!parsed.pages || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      throw new Error("AI produced no pages");
    }
    return parsed;
  });

export const explainConcept = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().min(1).max(2000),
        imageBase64: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = requireGeminiKey();
    const questionText =
      data.question ||
      "Read the question or content in this image carefully. If it is a problem, solve it step by step. If it is study material, explain it clearly with key takeaways.";
    const parts: GeminiContent["parts"] = [{ text: questionText }];
    if (data.imageBase64) {
      const inline = dataUrlToInlinePart(data.imageBase64);
      if (inline) parts.push(inline);
    }
    const answer = await geminiGenerateText(
      apiKey,
      [{ role: "user", parts }],
      {
        system:
          "You are Nexora AI, an expert tutor giving DEEP, exam-ready explanations. Solve doubts thoroughly and rigorously. Use Markdown with bold section headings, short paragraphs, numbered steps, and bullet points. Always structure your response with these sections: **Answer** (one concise line), **Step-by-step Solution** (numbered, every step justified), **Concept Explained** (the underlying theory in depth — definitions, formulas, why it works), **Worked Example** (a similar example fully solved), **Common Mistakes** (pitfalls to avoid), and **Quick Recap** (3-5 bullets). Highlight key terms and final answers in **bold**. Show all working for math/physics. If an image is provided, first transcribe the question or describe the diagram, then solve.",
        temperature: 0.6,
        maxOutputTokens: 4096,
      },
    );
    return { answer };
  });

// ============================================================================
// Educational image generation via the Google Gemini API directly.
// Uses GEMINI_API_KEY to call Gemini image models
// (https://generativelanguage.googleapis.com/v1beta).
// Retries up to 3 times. Returns either a base64 PNG data URL or a detailed
// error string so the UI can show the real cause.
// ============================================================================

const geminiImageInputSchema = z.object({
  prompt: z.string().min(4).max(4000),
});

const MAX_IMAGE_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const generateEducationalImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => geminiImageInputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return {
        ok: false as const,
        error: "GEMINI_API_KEY is not configured on the server.",
        logs: [],
      };
    }
    const errors: string[] = [];
    const logs: ImageRequestLog[] = [];
    for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt += 1) {
      const startTime = new Date();
      try {
        const result = await geminiGenerateImage(key, data.prompt, attempt - 1);
        const endTime = new Date();
        const baseLog: ImageRequestLog = {
          model: result.ok ? result.model : `gemini-image-attempt-${attempt}`,
          prompt: data.prompt,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: endTime.getTime() - startTime.getTime(),
          retryCount: attempt - 1,
          success: result.ok,
          errorMessage: result.ok ? undefined : result.error,
        };
        logs.push(baseLog);
        if (result.ok) return { ok: true as const, dataUrl: result.dataUrl, logs };
        errors.push(`Attempt ${attempt}: ${result.error}`);
        if (!result.retryable) break;
        if (attempt < MAX_IMAGE_ATTEMPTS) await sleep(attempt * 1200);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Attempt ${attempt} threw: ${msg}`);
        if (attempt < MAX_IMAGE_ATTEMPTS) await sleep(attempt * 1200);
      }
    }
    return { ok: false as const, error: errors.join(" | "), logs };
  });
