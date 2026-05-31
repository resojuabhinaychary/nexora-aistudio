import { createFileRoute } from "@tanstack/react-router";
import { ToolPage } from "@/components/ToolPage";

export const Route = createFileRoute("/presentation")({
  head: () => ({
    meta: [
      { title: "Presentation Builder — Nexora AI" },
      { name: "description", content: "Generate ready-to-present slide decks on any topic." },
      { property: "og:title", content: "AI Presentation Builder — Nexora AI" },
      { property: "og:description", content: "Auto-build slide decks for any topic in seconds." },
    ],
  }),
  component: () => <ToolPage mode="presentation" />,
});