import { createFileRoute } from "@tanstack/react-router";
import { ToolPage } from "@/components/ToolPage";

export const Route = createFileRoute("/doubt")({
  head: () => ({
    meta: [
      { title: "Doubt Solver — Nexora AI" },
      { name: "description", content: "Snap a photo or type any academic question and get clear step-by-step answers instantly." },
      { property: "og:title", content: "AI Doubt Solver — Nexora AI" },
      { property: "og:description", content: "Get step-by-step explanations for any homework question." },
    ],
  }),
  component: () => <ToolPage mode="doubt" />,
});