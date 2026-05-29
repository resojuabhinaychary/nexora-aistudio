import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, GraduationCap, Microscope, Briefcase, FileBadge, Palette, BookOpen, NotebookPen } from "lucide-react";
import { generateContent } from "@/lib/ai.functions";
import { createProject } from "@/lib/projects";

const TEMPLATES = [
  { title: "School Notes", topic: "Chapter notes for Grade 10 Science — Light: Reflection and Refraction", format: "notes" as const, icon: NotebookPen, gradient: "from-violet/60 to-indigo/60" },
  { title: "Study Guide", topic: "Complete study guide for Cell Biology with diagrams and key terms", format: "document" as const, icon: BookOpen, gradient: "from-indigo/60 to-cyan/60" },
  { title: "Science Presentation", topic: "Presentation on Renewable Energy Sources", format: "presentation" as const, icon: Microscope, gradient: "from-fuchsia/60 to-violet/60" },
  { title: "Business Report", topic: "Quarterly business performance report with KPIs", format: "report" as const, icon: Briefcase, gradient: "from-cyan/60 to-violet/60" },
  { title: "Resume PDF", topic: "Professional resume for a Computer Science student applying for internships", format: "pdf" as const, icon: FileBadge, gradient: "from-violet/60 to-fuchsia/60" },
  { title: "Creative Portfolio", topic: "Creative design portfolio overview with project case studies", format: "webpage" as const, icon: Palette, gradient: "from-fuchsia/60 to-cyan/60" },
  { title: "Exam Revision Sheet", topic: "Exam revision sheet for Class 12 Physics — Electromagnetism", format: "slides" as const, icon: GraduationCap, gradient: "from-indigo/60 to-violet/60" },
];

export function TemplateGrid() {
  const navigate = useNavigate();
  const gen = useServerFn(generateContent);
  const [busy, setBusy] = useState<string | null>(null);

  const use = async (t: (typeof TEMPLATES)[number]) => {
    setBusy(t.title);
    try {
      const doc = await gen({ data: { topic: t.topic, format: t.format } });
      const p = createProject({ topic: t.topic, format: t.format, doc });
      navigate({ to: "/workspace/$id", params: { id: p.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {TEMPLATES.map((t, i) => {
        const Icon = t.icon;
        return (
          <motion.button
            key={t.title}
            onClick={() => use(t)}
            disabled={!!busy}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ y: -3 }}
            className="group glass relative overflow-hidden rounded-2xl p-5 text-left transition hover:bg-white/5 disabled:opacity-60"
          >
            <div className={`absolute inset-0 -z-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-20 ${t.gradient}`} />
            <div className={`mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${t.gradient}`}>
              {busy === t.title ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Icon className="h-5 w-5 text-white" />}
            </div>
            <div className="font-display text-base font-semibold">{t.title}</div>
            <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.topic}</div>
          </motion.button>
        );
      })}
    </div>
  );
}