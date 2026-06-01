import { createFileRoute } from "@tanstack/react-router";
import { ToolPage } from "@/components/ToolPage";

export const Route = createFileRoute("/_authenticated/doubt")({
  head: () => ({
    meta: [
      { title: "Doubt Solver — Nexora AI" },
      { name: "description", content: "Snap a photo or type any academic question and get clear step-by-step answers instantly." },
    ],
  }),
  component: () => <ToolPage mode="doubt" />,
});