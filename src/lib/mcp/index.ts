import { auth, defineMcp } from "@lovable.dev/mcp-js";
import solveDoubtTool from "./tools/solve-doubt";
import generateMcqsTool from "./tools/generate-mcqs";
import generateStudyMaterialTool from "./tools/generate-study-material";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nexora-ai-mcp",
  title: "Nexora AI Studio",
  version: "0.1.0",
  instructions:
    "Nexora AI Studio tools for students: solve study doubts, generate MCQ quizzes, and produce deep textbook-quality study material outlines. Each caller is signed in as a Nexora user via OAuth.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [solveDoubtTool, generateMcqsTool, generateStudyMaterialTool],
});