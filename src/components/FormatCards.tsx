import { motion } from "framer-motion";
import { MessageCircleQuestion, BookOpen, Presentation, FileDown } from "lucide-react";

export type FormatKey = "doubt" | "notes" | "presentation" | "pdf";

export const FORMATS: {
  key: FormatKey;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "doubt", label: "Doubt Solver", desc: "Chat & solve any question", icon: MessageCircleQuestion },
  { key: "notes", label: "Smart Notes", desc: "Structured study notes", icon: BookOpen },
  { key: "presentation", label: "Presentation", desc: "AI-built slide deck", icon: Presentation },
  { key: "pdf", label: "PDF Booklet", desc: "Illustrated A4 study PDF", icon: FileDown },
];

export function FormatCards({
  selected,
  onSelect,
}: {
  selected: FormatKey;
  onSelect: (k: FormatKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {FORMATS.map((f, i) => {
        const Icon = f.icon;
        const active = f.key === selected;
        return (
          <motion.button
            key={f.key}
            type="button"
            onClick={() => onSelect(f.key)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            whileHover={{ y: -2 }}
            className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
              active
                ? "border-transparent gradient-aurora text-white shadow-glow"
                : "border-border bg-white hover:border-primary/40 hover:shadow-soft"
            }`}
          >
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                active ? "bg-white/20" : "bg-primary/10"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-white" : "text-primary"}`} />
            </div>
            <div className="min-w-0">
              <div className={`font-display text-sm font-bold ${active ? "text-white" : "text-ink"}`}>{f.label}</div>
              <div className={`mt-0.5 truncate text-[11px] ${active ? "text-white/85" : "text-muted-foreground"}`}>{f.desc}</div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
