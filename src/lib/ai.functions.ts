import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  topic: z.string().min(2).max(500),
  format: z.enum(["notes", "presentation", "pdf", "document", "slides", "report", "webpage"]),
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
};

export type GeneratedDoc = {
  title: string;
  subject: string;
  summary: string;
  pages: GeneratedPage[];
  keyQuestions: string[];
  keyConcepts: string[];
};

const systemPrompt = `You are Nexora AI, an expert educational content generator. Produce comprehensive, well-structured study material. Output ONLY valid JSON matching the requested schema. No prose, no markdown.`;

function buildUserPrompt(topic: string, format: string) {
  const count =
    format === "presentation" || format === "slides"
      ? "8 slide-style pages"
      : "5 to 7 rich pages";
  return `Topic / request: "${topic}"
Format: ${format}
Generate ${count}. Each page MUST contain real, educational content (not placeholders). Use clear headings, short paragraphs and bullet points. Include a title page, introduction, core concepts, examples, summary, key questions, and key concepts.
Return JSON of shape:
{
  "title": string,
  "subject": string,
  "summary": string (2-3 sentences),
  "pages": [ { "title": string, "subtitle"?: string, "sections": [ { "heading": string, "paragraph"?: string, "bullets"?: string[] } ] } ],
  "keyQuestions": string[] (5-8 exam-style questions),
  "keyConcepts": string[] (6-10 short concept names)
}`;
}

export const generateContent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

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
          { role: "user", content: buildUserPrompt(data.topic, data.format) },
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
    z.object({ question: z.string().min(2).max(800) }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are Nexora AI, a friendly tutor. Answer student questions clearly with short paragraphs, examples, and bullet points where useful. Use Markdown.",
          },
          { role: "user", content: data.question },
        ],
      }),
    });
    if (!res.ok) throw new Error("AI request failed");
    const json = await res.json();
    return { answer: (json.choices?.[0]?.message?.content as string) ?? "" };
  });