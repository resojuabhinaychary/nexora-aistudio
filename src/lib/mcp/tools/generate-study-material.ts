import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

type ChatResponse = { choices?: Array<{ message?: { content?: string } }> };

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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { content: [{ type: "text", text: "LOVABLE_API_KEY not configured" }], isError: true };
    }
    const count =
      format === "presentation" ? "8 to 10 pages" : format === "pdf" ? "8 to 12 pages" : "6 to 8 pages";
    const userPrompt = `Topic: "${topic}"
Format: ${format}
Generate ${count} of deep, textbook-quality study material. Each page has a title and 2-4 sections with heading + paragraph and/or bullets. Include definitions, formulas, worked examples, applications, and exam tips.
Return ONLY JSON: { "title": string, "subject": string, "summary": string, "pages": [ { "title": string, "sections": [ { "heading": string, "paragraph"?: string, "bullets"?: string[] } ] } ], "keyQuestions": string[], "keyConcepts": string[] }`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are Nexora AI, a master educator. Produce deep, textbook-quality study material. Output ONLY valid JSON.",
          },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { content: [{ type: "text", text: `AI request failed (${res.status}): ${body.slice(0, 500)}` }], isError: true };
    }
    const json = (await res.json()) as ChatResponse;
    const text = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { content: [{ type: "text", text: `Model returned invalid JSON: ${text.slice(0, 500)}` }], isError: true };
    }
    return { content: [{ type: "text", text }], structuredContent: parsed as Record<string, unknown> };
  },
});