import { createFileRoute } from "@tanstack/react-router";
import { DeckStudio } from "@/components/deck/DeckStudio";

export const Route = createFileRoute("/presentation")({
  head: () => ({
    meta: [
      { title: "AI Presentation Generator — Nexora AI" },
      { name: "description", content: "Watch an AI build your presentation live — outline, streamed slide text, and a unique AI image per slide. Export a real editable PPTX." },
      { property: "og:title", content: "AI Presentation Generator — Nexora AI" },
      { property: "og:description", content: "Gamma-style AI slide decks for students, exportable as editable PowerPoint." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeckStudio,
});