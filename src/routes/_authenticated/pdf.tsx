import { createFileRoute } from "@tanstack/react-router";
import { ToolPage } from "@/components/ToolPage";

export const Route = createFileRoute("/_authenticated/pdf")({
  head: () => ({
    meta: [
      { title: "PDF Booklet Builder — Nexora AI" },
      { name: "description", content: "Generate printable A4 study PDFs with illustrations and colored content boxes." },
    ],
  }),
  component: () => <ToolPage mode="pdf" />,
});