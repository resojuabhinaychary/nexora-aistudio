import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { GeminiContent } from "./gemini";
import { generateImageWithFallback, generateTextWithFallback } from "./ai-provider.server";

const inputSchema = z.object({
  topic: z.string().min(2).max(2000),
  format: z.enum(["notes", "presentation", "pdf"]),
  grade: z.string().max(40).optional(),
  imageBase64: z.string().optional(),
});

export type GeneratedSection = {
  heading: string;
  paragraph?: string;
  bullets?: string[];
  /** Optional simple table rendered in preview + PDF. First row = header. */
  table?: { caption?: string; rows: string[][] };
};

export type GeneratedPage = {
  title: string;
  subtitle?: string;
  sections: GeneratedSection[];
  imageQuery?: string;
  /** Presentation only — what the presenter says on this slide. */
  speakerNotes?: string;
  /** PDF booklet only — practice items at the end of a chapter page. */
  practice?: {
    mcqs?: { question: string; options: string[]; answer: string }[];
    trueFalse?: { statement: string; answer: string }[];
    fillBlanks?: { sentence: string; answer: string }[];
  };
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
  format?: "notes" | "presentation" | "pdf";
  /** PDF booklet only. */
  glossary?: { term: string; definition: string }[];
  references?: string[];
  /** Selected class level, e.g. "Class 10". */
  grade?: string;
  /** Which AI provider produced this document. */
  provider?: string;
  providerNotice?: string;
};

const systemPrompt = `You are Nexora AI, a master educator and exam coach. Produce accurate, well-structured, curriculum-grade educational material. Never output placeholders, "TBD", "lorem ipsum", empty strings, or incomplete sentences. Every field you emit must be finished, factually correct content. Adapt the SHAPE of your output strictly to the requested format — notes, presentation and booklet outputs must look and read completely differently. Output ONLY valid JSON matching the requested schema. No prose, no markdown fences.`;

function dataUrlToInlinePart(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

function buildUserPrompt(topic: string, format: string, grade?: string) {
  const gradeRule = grade
    ? `TARGET CLASS: ${grade}. This is mandatory. Match the ${grade} syllabus exactly — vocabulary, depth, examples, formulas, MCQs and image choices must all be appropriate for ${grade}. Never introduce concepts from higher classes.\n`
    : "";
  const common = `${gradeRule}Topic / request: "${topic}"

IMAGE QUERIES — for every page set "imageQuery" to a precise 4-8 word description of the single most useful EDUCATIONAL diagram for that page's exact content (e.g. "labeled chloroplast diagram light reactions", "free body diagram inclined plane friction", "benzene ring resonance structure", "binary search flowchart", "map of indian monsoon winds"). Never a generic scene, never a stock photo idea, never decorative. Also set a top-level "coverImageQuery" for the topic as a whole.
All content must be complete and factually accurate. No placeholders.`;

  if (format === "notes") {
    return `${common}

FORMAT: REVISION NOTES (for quick study before an exam).
Style rules — these make notes DIFFERENT from slides and booklets:
- 6 to 8 compact pages. Scannable, bullet-dominant, short.
- Each page: 3-5 sections. Sections are mostly BULLETS (4-7 crisp bullets each). Paragraphs are optional and never longer than 2 sentences.
- Must include, spread across pages: "Definitions" section, "Key Formulas" section (write formulas plainly, e.g. F = ma), "Memory Tricks / Mnemonics" section, "Quick Revision" section, and a final "Summary" page.
- No speaker notes, no practice questions, no tables of contents, no long prose.

Return JSON:
{"title":string,"subject":string,"summary":string,"coverImageQuery":string,
 "pages":[{"title":string,"subtitle"?:string,"imageQuery":string,
   "sections":[{"heading":string,"paragraph"?:string,"bullets":string[]}]}],
 "keyQuestions":string[],"keyConcepts":string[]}`;
  }

  if (format === "presentation") {
    return `${common}

FORMAT: CLASSROOM SLIDE DECK (like a professional PowerPoint).
Style rules — these make slides DIFFERENT from notes and booklets:
- 10 to 12 slides. ONE idea per slide. Very little text on the slide itself.
- Slide 1 = title slide (short punchy title + subtitle, ONE section with a 1-2 sentence hook).
- Slide 2 = "Agenda" (bullets only, one per upcoming slide).
- Content slides: exactly 1 section each, heading = a large statement, 3-5 SHORT bullets (max 10 words each). Paragraph must be absent or a single short line.
- Last two slides = "Key Takeaways" and "Thank You / Questions".
- EVERY slide MUST include "speakerNotes": 3-5 sentences the teacher says aloud, containing the depth that is deliberately kept off the slide.
- No practice questions, no glossary, no dense paragraphs.

Return JSON:
{"title":string,"subject":string,"summary":string,"coverImageQuery":string,
 "pages":[{"title":string,"subtitle"?:string,"imageQuery":string,"speakerNotes":string,
   "sections":[{"heading":string,"paragraph"?:string,"bullets":string[]}]}],
 "keyQuestions":string[],"keyConcepts":string[]}`;
  }

  return `${common}

FORMAT: PRINTABLE STUDY BOOKLET (a professional textbook chapter set).
Style rules — these make the booklet DIFFERENT from notes and slides:
- 9 to 12 chapter pages, each genuinely detailed.
- Each page: 3-5 sections with FULL paragraphs of 4-7 sentences PLUS supporting bullets. Cover context/history, definitions, mechanisms, derivations, formulas, worked examples with step-by-step solutions, applications, and common mistakes.
- Include at least 3 sections across the booklet that carry a "table" (comparison / data / properties). A table is {"caption":string,"rows":[[header cells...],[row cells...]]} with 2-4 columns and 3-6 rows.
- At least half the pages must include a "practice" object with 2 "mcqs" (4 options + answer), 2 "trueFalse", and 2 "fillBlanks".
- Also return a top-level "glossary" (8-12 term/definition pairs) and "references" (4-6 realistic textbook/source citations).

Return JSON:
{"title":string,"subject":string,"summary":string,"coverImageQuery":string,
 "pages":[{"title":string,"subtitle"?:string,"imageQuery":string,
   "sections":[{"heading":string,"paragraph":string,"bullets"?:string[],"table"?:{"caption":string,"rows":string[][]}}],
   "practice"?:{"mcqs":[{"question":string,"options":string[],"answer":string}],"trueFalse":[{"statement":string,"answer":string}],"fillBlanks":[{"sentence":string,"answer":string}]}}],
 "keyQuestions":string[],"keyConcepts":string[],
 "glossary":[{"term":string,"definition":string}],"references":string[]}`;
}

export const generateContent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const parts: GeminiContent["parts"] = [{ text: buildUserPrompt(data.topic, data.format, data.grade) }];
    if (data.imageBase64) {
      const inline = dataUrlToInlinePart(data.imageBase64);
      if (inline) parts.push(inline);
    }
    const generated = await generateTextWithFallback([{ role: "user", parts }], {
      system: systemPrompt,
      json: true,
      temperature: data.format === "pdf" ? 0.6 : 0.75,
      maxOutputTokens: data.format === "pdf" ? 16384 : 8192,
    });
    const content = generated.text;
    let parsed: GeneratedDoc;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    if (!parsed.pages || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      throw new Error("AI produced no pages");
    }
    // Validation: drop empty sections/pages so nothing renders as a placeholder.
    parsed.format = data.format;
    parsed.pages = parsed.pages
      .map((p) => ({
        ...p,
        sections: (p.sections || []).filter(
          (s) => s && s.heading && (s.paragraph?.trim() || s.bullets?.length || s.table?.rows?.length),
        ),
      }))
      .filter((p) => p.title && p.sections.length > 0);
    if (parsed.pages.length === 0) throw new Error("AI produced no usable pages");
    parsed.grade = data.grade;
    parsed.provider = generated.provider;
    parsed.providerNotice = generated.notice;
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
    const questionText =
      data.question ||
      "Read the question or content in this image carefully. If it is a problem, solve it step by step. If it is study material, explain it clearly with key takeaways.";
    const parts: GeminiContent["parts"] = [{ text: questionText }];
    if (data.imageBase64) {
      const inline = dataUrlToInlinePart(data.imageBase64);
      if (inline) parts.push(inline);
    }
    const solved = await generateTextWithFallback([{ role: "user", parts }], {
        system:
          "You are Nexora AI, an expert tutor giving DEEP, exam-ready explanations. Solve doubts thoroughly and rigorously. Use Markdown with bold section headings, short paragraphs, numbered steps, and bullet points. Always structure your response with these sections: **Answer** (one concise line), **Step-by-step Solution** (numbered, every step justified), **Concept Explained** (the underlying theory in depth — definitions, formulas, why it works), **Worked Example** (a similar example fully solved), **Common Mistakes** (pitfalls to avoid), and **Quick Recap** (3-5 bullets). Highlight key terms and final answers in **bold**. Show all working for math/physics. If an image is provided, first transcribe the question or describe the diagram, then solve.",
      temperature: 0.6,
      maxOutputTokens: 4096,
    });
    return { answer: solved.text, provider: solved.provider, providerNotice: solved.notice };
  });

// ============================================================================
// Educational image generation with automatic provider fallback
// (Lovable AI Gateway -> Gemini -> free generator). Returns either a base64
// data URL or a detailed error plus a `retryable` flag so the client-side
// queue can apply exponential backoff.
// ============================================================================

const geminiImageInputSchema = z.object({
  prompt: z.string().min(4).max(4000),
});

export const generateEducationalImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => geminiImageInputSchema.parse(input))
  .handler(async ({ data }) => {
    const startTime = new Date();
    const result = await generateImageWithFallback(data.prompt);
    const endTime = new Date();
    const logs: ImageRequestLog[] = [
      {
        model: result.ok ? `${result.provider}:${result.model}` : "image-generation",
        prompt: data.prompt,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMs: endTime.getTime() - startTime.getTime(),
        retryCount: 0,
        success: result.ok,
        errorMessage: result.ok ? undefined : result.error,
      },
    ];
    if (result.ok) {
      return {
        ok: true as const,
        dataUrl: result.dataUrl,
        provider: result.provider,
        notice: result.notice,
        logs,
      };
    }
    return { ok: false as const, error: result.error, retryable: result.retryable, logs };
  });
