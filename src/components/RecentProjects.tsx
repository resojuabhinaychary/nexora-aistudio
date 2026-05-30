import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Clock, Star, Trash2 } from "lucide-react";
import { listProjects, deleteProject, toggleFavorite, type Project } from "@/lib/projects";

export function RecentProjects({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const [items, setItems] = useState<Project[]>([]);
  useEffect(() => {
    const sync = () => setItems(listProjects());
    sync();
    window.addEventListener("nexora:projects", sync);
    return () => window.removeEventListener("nexora:projects", sync);
  }, []);
  const visible = favoritesOnly ? items.filter((i) => i.favorite) : items;

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm font-medium text-muted-foreground">
        {favoritesOnly
          ? "No favorites yet — star a project to pin it here."
          : "No projects yet. Generate your first study material from the chat."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {visible.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="group relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-soft transition hover:border-primary/40 hover:shadow-card"
        >
          <div className="absolute inset-x-0 top-0 h-1 gradient-aurora" />
          <div className="flex items-start justify-between gap-3">
            <Link to="/workspace/$id" params={{ id: p.id }} className="block flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary">{p.format}</div>
              <div className="mt-1 font-display text-lg font-extrabold leading-snug text-ink line-clamp-2">
                {p.title}
              </div>
              <div className="mt-1 text-xs font-medium text-muted-foreground line-clamp-2">
                {p.doc.summary}
              </div>
            </Link>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => toggleFavorite(p.id)}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-ink"
                aria-label="Favorite"
              >
                <Star className={`h-4 w-4 ${p.favorite ? "fill-primary text-primary" : ""}`} />
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this project?")) deleteProject(p.id);
                }}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(p.updatedAt).toLocaleDateString()}
            <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-ink">
              {p.doc.pages.length} pages
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
