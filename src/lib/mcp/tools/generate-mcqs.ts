import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { geminiGenerateText } from "@/lib/gemini";

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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { content: [{ type: "text", text: "GEMINI_API_KEY not configured" }], isError: true };
    }
    const userPrompt = `Generate ${count} MCQs.
Subject: ${subject}
${topic ? `Topic: ${topic}\n` : ""}${grade ? `Class/Grade: ${grade}\n` : ""}Difficulty: ${difficulty}

Rules: 4 options each, correctIndex 0..3, thorough explanation, short exam tip, no duplicates.
Return ONLY JSON: { "questions": [ { "question": string, "options": [string,string,string,string], "correctIndex": 0|1|2|3, "explanation": string, "tip": string } ] }`;
    let text: string;
    try {
      text = await geminiGenerateText(
        apiKey,
        [{ role: "user", parts: [{ text: userPrompt }] }],
        {
          system:
            "You are Nexora AI Exam Coach. Write accurate, curriculum-aligned MCQs with rigorous explanations. Output ONLY valid JSON.",
          json: true,
          temperature: 0.6,
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