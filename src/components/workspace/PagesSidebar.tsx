import type { Project } from "@/lib/projects";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export function PagesSidebar({
  project,
  active,
  onSelect,
  onAdd,
}: {
  project: Project;
  active: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
}) {
  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-border bg-white/80 p-3 scrollbar-thin lg:flex">
      <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Pages</div>
      {project.doc.pages.map((p, i) => (
        <motion.button
          key={i}
          onClick={() => onSelect(i)}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className={`group flex items-start gap-3 rounded-xl p-2.5 text-left transition ${
            active === i
              ? "bg-primary/10 ring-1 ring-primary/40"
              : "hover:bg-secondary"
          }`}
        >
          <div
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${
              active === i ? "gradient-aurora text-white" : "bg-secondary text-ink"
            }`}
          >
            {i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-ink">{p.title}</div>
            <div className="truncate text-[11px] font-medium text-muted-foreground">{p.sections.length} sections</div>
          </div>
        </motion.button>
      ))}
      <button
        onClick={onAdd}
        className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-border p-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-ink"
      >
        <Plus className="h-4 w-4" /> Add page
      </button>
    </aside>
  );
}
