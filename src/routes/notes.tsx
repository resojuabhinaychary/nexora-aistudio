import { createFileRoute } from "@tanstack/react-router";
import { ToolPage } from "@/components/ToolPage";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Smart Notes Generator — Nexora AI" },
      { name: "description", content: "Generate beautifully structured study notes on any topic, ready to learn from." },
      { property: "og:title", content: "AI Notes Generator — Nexora AI" },
      { property: "og:description", content: "Auto-generate clear, structured study notes." },
    ],
  }),
  component: () => <ToolPage mode="notes" />,
});