import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

type ChatResponse = { choices?: Array<{ message?: { content?: string } }> };

export default defineTool({
  name: "generate_mcqs",
  title: "Generate MCQ quiz",
  description:
    "Generate curriculum-aligned multiple-choice questions with detailed explanations and exam tips for a given subject, topic, and difficulty.",
  inputSchema: {
    subject: z.string().min(1).max(80).describe("Subject, e.g. Biology, Physics, History."),
    topic: z.string().max(200).optional().describe("Optional narrower topic."),
    grade: z.string().max(40).optional().describe("Optional class/grade level."),
    difficulty: z.enum(["easy", "medium", "hard"]).describe("Difficulty level."),
    count: z.number().int().min(3).max(25).describe("Number of questions (3-25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ subject, topic, grade, difficulty, count }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { content: [{ type: "text", text: "LOVABLE_API_KEY not configured" }], isError: true };
    }
    const userPrompt = `Generate ${count} MCQs.
Subject: ${subject}
${topic ? `Topic: ${topic}\n` : ""}${grade ? `Class/Grade: ${grade}\n` : ""}Difficulty: ${difficulty}

Rules: 4 options each, correctIndex 0..3, thorough explanation, short exam tip, no duplicates.
Return ONLY JSON: { "questions": [ { "question": string, "options": [string,string,string,string], "correctIndex": 0|1|2|3, "explanation": string, "tip": string } ] }`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are Nexora AI Exam Coach. Write accurate, curriculum-aligned MCQs with rigorous explanations. Output ONLY valid JSON.",
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