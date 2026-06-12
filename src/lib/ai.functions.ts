import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  };
  unavailableImageKey?: string;
  imageError?: string;
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const userContent: any = data.imageBase64
      ? [
          { type: "text", text: buildUserPrompt(data.topic, data.format) },
          { type: "image_url", image_url: { url: data.imageBase64 } },
        ]
      : buildUserPrompt(data.topic, data.format);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace Settings.");
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      throw new Error("AI generation failed");
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content as string | undefined;
    if (!content) throw new Error("Empty AI response");

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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const userContent: any = data.imageBase64
      ? [
          {
            type: "text",
            text:
              data.question ||
              "Read the question or content in this image carefully. If it is a problem, solve it step by step. If it is study material, explain it clearly with key takeaways.",
          },
          { type: "image_url", image_url: { url: data.imageBase64 } },
        ]
      : data.question;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are Nexora AI, an expert tutor giving DEEP, exam-ready explanations. Solve doubts thoroughly and rigorously. Use Markdown with bold section headings, short paragraphs, numbered steps, and bullet points. Always structure your response with these sections: **Answer** (one concise line), **Step-by-step Solution** (numbered, every step justified), **Concept Explained** (the underlying theory in depth — definitions, formulas, why it works), **Worked Example** (a similar example fully solved), **Common Mistakes** (pitfalls to avoid), and **Quick Recap** (3-5 bullets). Highlight key terms and final answers in **bold**. Show all working for math/physics. If an image is provided, first transcribe the question or describe the diagram, then solve.",
          },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace Settings.");
      throw new Error("AI request failed");
    }
    const json = await res.json();
    return { answer: (json.choices?.[0]?.message?.content as string) ?? "" };
  });

// ============================================================================
// Educational image generation via the built-in Lovable AI Gateway.
// Uses LOVABLE_API_KEY (auto-provisioned, no user-supplied key needed) to call
// built-in image models through https://ai.gateway.lovable.dev/v1/images/generations.
// Retries up to 3 times. Returns either a base64 PNG data URL or a detailed
// error string so the UI can show the real cause.
// ============================================================================

const geminiImageInputSchema = z.object({
  prompt: z.string().min(4).max(4000),
});

const LOVABLE_IMAGE_MODELS = [
  "openai/gpt-image-2",
  "openai/gpt-image-1-mini",
  "google/gemini-3.1-flash-image-preview",
] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGatewayError(status: number, text: string) {
  try {
    const json = JSON.parse(text);
    const message = json?.error?.message || json?.message || text;
    const code = json?.error?.code || json?.type || "gateway_error";
    return { message: `${code}: ${message}`, retryable: status === 429 || status >= 500 };
  } catch {
    return { message: text || `HTTP ${status}`, retryable: status === 429 || status >= 500 };
  }
}

async function callLovableImageOnce(prompt: string, key: string, model: (typeof LOVABLE_IMAGE_MODELS)[number]) {
  const isGemini = model.startsWith("google/");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      isGemini
        ? {
            model,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }
        : {
            model,
            prompt,
            size: "1024x1024",
            quality: "low",
            n: 1,
          },
    ),
  });
  const text = await res.text();
  if (!res.ok) {
    const parsed = parseGatewayError(res.status, text);
    return {
      ok: false as const,
      retryable: parsed.retryable,
      error: `Lovable AI ${model} HTTP ${res.status}: ${parsed.message.slice(0, 600)}`,
    };
  }
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false as const, retryable: false, error: `Lovable AI ${model} returned non-JSON: ${text.slice(0, 300)}` };
  }
  const b64 = json?.data?.[0]?.b64_json;
  if (b64) {
    return { ok: true as const, dataUrl: `data:image/png;base64,${b64}` };
  }
  return {
    ok: false as const,
    retryable: false,
    error: `Lovable AI ${model} returned no image. Raw: ${JSON.stringify(json).slice(0, 400)}`,
  };
}

export const generateEducationalImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => geminiImageInputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        ok: false as const,
        error: "LOVABLE_API_KEY is not configured on the server.",
      };
    }
    const errors: string[] = [];
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const model = LOVABLE_IMAGE_MODELS[Math.min(attempt - 1, LOVABLE_IMAGE_MODELS.length - 1)];
      try {
        const result = await callLovableImageOnce(data.prompt, key, model);
        if (result.ok) return { ok: true as const, dataUrl: result.dataUrl };
        errors.push(`Attempt ${attempt}: ${result.error}`);
        console.error("[generateEducationalImage]", result.error);
        if (!result.retryable) break;
        if (attempt < 3) await sleep(attempt * 4500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Attempt ${attempt} threw: ${msg}`);
        console.error("[generateEducationalImage] threw", err);
        if (attempt < 3) await sleep(attempt * 4500);
      }
    }
    return { ok: false as const, error: errors.join(" | ") };
  });