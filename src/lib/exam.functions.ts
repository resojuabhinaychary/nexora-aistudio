import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { geminiGenerateText, requireGeminiKey } from "./gemini";

const inputSchema = z.object({
  subject: z.string().min(1).max(80),
  topic: z.string().max(200).optional(),
  grade: z.string().max(40).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  count: z.number().int().min(3).max(25),
  exclude: z.array(z.string().max(300)).max(50).optional(),
});

export type MCQ = {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  tip?: string;
};

export type QuizPayload = { questions: MCQ[] };

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => inputSchema.parse(i))
  .handler(async ({ data }) => {
    const apiKey = requireGeminiKey();
    const exclude = data.exclude?.length
      ? `\nDO NOT repeat any of these previously-asked questions: ${data.exclude.map((q) => `"${q.slice(0, 120)}"`).join("; ")}.`
      : "";

    const userPrompt = `Generate ${data.count} high-quality multiple-choice questions for a student.
Subject: ${data.subject}
${data.topic ? `Topic: ${data.topic}\n` : ""}${data.grade ? `Class/Grade: ${data.grade}\n` : ""}Difficulty: ${data.difficulty}

Rules:
- Each question has EXACTLY 4 options (A, B, C, D).
- correctIndex is 0..3.
- Explanation must be thorough: state the correct answer, WHY it is right, and briefly WHY the other options are wrong.
- tip is a short memory trick or exam tip (one sentence).
- Vary question types: definitions, application, calculation, true scenarios.
- No duplicates. No options like "All of the above".${exclude}

Return ONLY JSON of shape: { "questions": [ { "question": string, "options": [string, string, string, string], "correctIndex": 0|1|2|3, "explanation": string, "tip": string } ] }`;

    const content = await geminiGenerateText(
      apiKey,
      [{ role: "user", parts: [{ text: userPrompt }] }],
      {
        system:
          "You are Nexora AI Exam Coach. You write accurate, curriculum-aligned MCQs with rigorous explanations. Output ONLY valid JSON matching the requested schema. No markdown, no prose.",
        json: true,
        temperature: 0.6,
        maxOutputTokens: 8192,
      },
    );
    let parsed: QuizPayload;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("AI produced no questions");
    }
    // Hard-validate shape so the client never crashes on bad data.
    parsed.questions = parsed.questions
      .filter(
        (q) =>
          q &&
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          q.options.every((o) => typeof o === "string") &&
          Number.isInteger(q.correctIndex) &&
          q.correctIndex >= 0 &&
          q.correctIndex <= 3,
      )
      .map((q) => ({
        question: q.question,
        options: q.options as [string, string, string, string],
        correctIndex: q.correctIndex as 0 | 1 | 2 | 3,
        explanation: typeof q.explanation === "string" ? q.explanation : "",
        tip: typeof q.tip === "string" ? q.tip : undefined,
      }));
    if (parsed.questions.length === 0) throw new Error("AI returned malformed questions");
    return parsed;
  });