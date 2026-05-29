import { motion } from "framer-motion";
import {
  FileText,
  Presentation,
  FileDown,
  BookOpen,
  LayoutTemplate,
  ClipboardList,
  Globe,
} from "lucide-react";

export type FormatKey =
  | "notes"
  | "presentation"
  | "pdf"
  | "document"
  | "slides"
  | "report"
  | "webpage";

export const FORMATS: {
  key: FormatKey;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}[] = [
  { key: "notes", label: "Smart Notes", desc: "Structured study notes", icon: BookOpen, gradient: "from-violet/80 to-indigo/60" },
  { key: "presentation", label: "Presentation", desc: "AI-built slide deck", icon: Presentation, gradient: "from-fuchsia/80 to-violet/60" },
  { key: "pdf", label: "PDF Booklet", desc: "Printable A4 layout", icon: FileDown, gradient: "from-indigo/80 to-cyan/60" },
  { key: "document", label: "Document", desc: "Long-form essay", icon: FileText, gradient: "from-cyan/70 to-indigo/70" },
  { key: "slides", label: "Study Slides", desc: "Quick revision cards", icon: LayoutTemplate, gradient: "from-violet/70 to-fuchsia/70" },
  { key: "report", label: "Report", desc: "Professional report", icon: ClipboardList, gradient: "from-indigo/80 to-violet/70" },
  { key: "webpage", label: "Webpage", desc: "Shareable web view", icon: Globe, gradient: "from-cyan/80 to-fuchsia/60" },
];

export function FormatCards({
  selected,
  onSelect,
}: {
  selected: FormatKey;
  onSelect: (k: FormatKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      {FORMATS.map((f, i) => {
        const Icon = f.icon;
        const active = f.key === selected;
        return (
          <motion.button
            key={f.key}
            type="button"
            onClick={() => onSelect(f.key)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.4 }}
            whileHover={{ y: -4 }}
            className={`group relative overflow-hidden rounded-2xl p-4 text-left transition-all ${
              active
                ? "glass-strong glow ring-1 ring-violet/60"
                : "glass hover:bg-white/5"
            }`}
          >
            <div
              className={`absolute inset-0 -z-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-30 ${f.gradient}`}
            />
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${f.gradient} shadow-lg`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="font-display text-sm font-semibold">{f.label}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{f.desc}</div>
          </motion.button>
        );
      })}
    </div>
  );
}