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
    <aside className="glass-strong hidden h-full w-64 shrink-0 flex-col gap-2 overflow-y-auto p-3 scrollbar-thin lg:flex">
      <div className="px-2 py-1 text-xs uppercase tracking-widest text-muted-foreground">Pages</div>
      {project.doc.pages.map((p, i) => (
        <motion.button
          key={i}
          onClick={() => onSelect(i)}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className={`group flex items-start gap-3 rounded-xl p-3 text-left transition ${
            active === i ? "bg-violet/20 ring-1 ring-violet/50" : "hover:bg-white/5"
          }`}
        >
          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-semibold ${active === i ? "gradient-aurora text-white" : "bg-white/5 text-muted-foreground"}`}>
            {i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{p.title}</div>
            <div className="truncate text-xs text-muted-foreground">{p.sections.length} sections</div>
          </div>
        </motion.button>
      ))}
      <button
        onClick={onAdd}
        className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-white/15 p-3 text-sm text-muted-foreground transition hover:border-violet/60 hover:text-foreground"
      >
        <Plus className="h-4 w-4" /> Add page
      </button>
    </aside>
  );
}