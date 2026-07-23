import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { geminiGenerateText } from "@/lib/gemini";

export default defineTool({
  name: "generate_study_material",
  title: "Generate study material outline",
  description:
    "Generate a deep, textbook-quality study outline (title, subject, summary, pages with headings, paragraphs, and bullets) for a topic in notes, presentation, or pdf format.",
  inputSchema: {
    topic: z.string().min(2).max(2000).describe("Topic or study request."),
    format: z.enum(["notes", "presentation", "pdf"]).describe("Desired study material format."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ topic, format }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { content: [{ type: "text", text: "GEMINI_API_KEY not configured" }], isError: true };
    }
    const count =
      format === "presentation" ? "8 to 10 pages" : format === "pdf" ? "8 to 12 pages" : "6 to 8 pages";
    const userPrompt = `Topic: "${topic}"
Format: ${format}
Generate ${count} of deep, textbook-quality study material. Each page has a title and 2-4 sections with heading + paragraph and/or bullets. Include definitions, formulas, worked examples, applications, and exam tips.
Return ONLY JSON: { "title": string, "subject": string, "summary": string, "pages": [ { "title": string, "sections": [ { "heading": string, "paragraph"?: string, "bullets"?: string[] } ] } ], "keyQuestions": string[], "keyConcepts": string[] }`;
    let text: string;
    try {
      text = await geminiGenerateText(
        apiKey,
        [{ role: "user", parts: [{ text: userPrompt }] }],
        {
          system:
            "You are Nexora AI, a master educator. Produce deep, textbook-quality study material. Output ONLY valid JSON.",
          json: true,
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: msg }], isError: true };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { content: [{ type: "text", text: `Model returned invalid JSON: ${text.slice(0, 500)}` }], isError: true };
    }
    return { content: [{ type: "text", text }], structuredContent: parsed as Record<string, unknown> };
  },
});