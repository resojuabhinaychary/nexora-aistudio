import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { geminiGenerateText } from "@/lib/gemini";

export default defineTool({
  name: "solve_doubt",
  title: "Solve a study doubt",
  description:
    "Ask Nexora AI to solve a student's study question and return a deep, exam-ready explanation with steps, worked example, and quick recap.",
  inputSchema: {
    question: z.string().min(1).max(2000).describe("The student's question or doubt."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ question }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { content: [{ type: "text", text: "GEMINI_API_KEY not configured" }], isError: true };
    }
    try {
      const answer = await geminiGenerateText(
        apiKey,
        [{ role: "user", parts: [{ text: question }] }],
        {
          system:
            "You are Nexora AI, an expert tutor. Give a DEEP, exam-ready explanation in Markdown with sections: **Answer**, **Step-by-step Solution**, **Concept Explained**, **Worked Example**, **Common Mistakes**, **Quick Recap**.",
          temperature: 0.6,
          maxOutputTokens: 4096,
        },
      );
      return { content: [{ type: "text", text: answer }], structuredContent: { answer } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: msg }], isError: true };
    }
  },
});