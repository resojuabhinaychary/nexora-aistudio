import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateContent } from "@/lib/ai.functions";
import { createProject } from "@/lib/projects";
import { FormatCards, type FormatKey } from "./FormatCards";

const SUGGESTIONS = [
  "Explain Photosynthesis",
  "Create notes for French Revolution",
  "Presentation on Climate Change",
  "10th class Biology PDF notes",
  "Newton's laws of motion",
];

export function GenerateInput({ defaultFormat = "notes" as FormatKey }) {
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<FormatKey>(defaultFormat);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const gen = useServerFn(generateContent);

  const run = async (t?: string) => {
    const value = (t ?? topic).trim();
    if (!value) {
      toast.error("Type a topic to generate");
      return;
    }
    setBusy(true);
    try {
      const doc = await gen({ data: { topic: value, format } });
      const p = createProject({ topic: value, format, doc });
      toast.success("Generated successfully");
      navigate({ to: "/workspace/$id", params: { id: p.id } });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-strong glow rounded-3xl p-5 md:p-6"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-violet" />
        Generate with Nexora AI
      </div>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Ask anything, e.g. Explain photosynthesis…"
          className="flex-1 rounded-2xl bg-black/30 px-5 py-4 text-base outline-none ring-1 ring-white/10 transition focus:ring-violet/60"
        />
        <button
          onClick={() => run()}
          disabled={busy}
          className="group inline-flex items-center justify-center gap-2 rounded-2xl gradient-aurora px-6 py-4 font-medium text-white shadow-lg shadow-violet/30 transition hover:scale-[1.02] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Generating…" : "Generate"}
          {!busy && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setTopic(s);
              run(s);
            }}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-violet/50 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <FormatCards selected={format} onSelect={setFormat} />
      </div>
    </motion.div>
  );
}