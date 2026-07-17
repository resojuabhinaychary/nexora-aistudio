import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

type ChatResponse = { choices?: Array<{ message?: { content?: string } }> };

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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { content: [{ type: "text", text: "LOVABLE_API_KEY not configured" }], isError: true };
    }
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are Nexora AI, an expert tutor. Give a DEEP, exam-ready explanation in Markdown with sections: **Answer**, **Step-by-step Solution**, **Concept Explained**, **Worked Example**, **Common Mistakes**, **Quick Recap**.",
          },
          { role: "user", content: question },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { content: [{ type: "text", text: `AI request failed (${res.status}): ${body.slice(0, 500)}` }], isError: true };
    }
    const json = (await res.json()) as ChatResponse;
    const answer = json.choices?.[0]?.message?.content ?? "";
    return { content: [{ type: "text", text: answer }], structuredContent: { answer } };
  },
});