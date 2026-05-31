import { createFileRoute } from "@tanstack/react-router";
import { ToolPage } from "@/components/ToolPage";

export const Route = createFileRoute("/pdf")({
  head: () => ({
    meta: [
      { title: "PDF Booklet Builder — Nexora AI" },
      { name: "description", content: "Generate printable A4 study PDFs with illustrations and colored content boxes." },
      { property: "og:title", content: "AI PDF Booklet Builder — Nexora AI" },
      { property: "og:description", content: "Beautiful illustrated PDFs for studying, ready to download." },
    ],
  }),
  component: () => <ToolPage mode="pdf" />,
});