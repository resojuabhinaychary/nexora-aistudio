import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Toaster, toast } from "sonner";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { TopBar } from "@/components/workspace/TopBar";
import { PagesSidebar } from "@/components/workspace/PagesSidebar";
import { Canvas } from "@/components/workspace/Canvas";
import { AIPanel } from "@/components/workspace/AIPanel";
import { getProject, saveProject, type Project } from "@/lib/projects";
import { exportDocToPDF } from "@/lib/pdf";
import { explainConcept } from "@/lib/ai.functions";
import type { GeneratedPage } from "@/lib/ai.functions";

export const Route = createFileRoute("/workspace/$id")({
  head: () => ({ meta: [{ title: "Workspace — Nexora AI" }] }),
  component: Workspace,
});

function Workspace() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [theme, setTheme] = useState<"light" | "violet" | "ink">("light");
  const [presenting, setPresenting] = useState(false);
  const ask = useServerFn(explainConcept);

  useEffect(() => {
    const p = getProject(id);
    if (!p) {
      toast.error("Project not found");
      navigate({ to: "/dashboard" });
      return;
    }
    setProject(p);
  }, [id, navigate]);

  // autosave
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(() => saveProject(project), 600);
    return () => clearTimeout(t);
  }, [project]);

  const update = (updater: (p: Project) => Project) => setProject((p) => (p ? updater(p) : p));

  const updatePage = (next: GeneratedPage) =>
    update((p) => {
      const pages = p.doc.pages.map((pg, i) => (i === activePage ? next : pg));
      return { ...p, doc: { ...p.doc, pages } };
    });

  const addPage = () =>
    update((p) => {
      const pages = [
        ...p.doc.pages,
        { title: "New Page", sections: [{ heading: "Heading", paragraph: "Click to edit." }] },
      ];
      return { ...p, doc: { ...p.doc, pages } };
    });

  const aiAct = async (prompt: string, transform: (a: string) => GeneratedPage) => {
    if (!project) return;
    toast.loading("AI is working…", { id: "ai" });
    try {
      const r = await ask({ data: { question: prompt } });
      updatePage(transform(r.answer));
      toast.success("Done", { id: "ai" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed", { id: "ai" });
    }
  };

  const beautify = () => {
    if (!project) return;
    const pg = project.doc.pages[activePage];
    aiAct(
      `Rewrite this study page with clearer structure, polished prose, and better bullet hierarchy. Keep meaning. Return plain text.\n\nTitle: ${pg.title}\n` +
        pg.sections.map((s) => `${s.heading}\n${s.paragraph ?? ""}\n${(s.bullets ?? []).map((b) => "- " + b).join("\n")}`).join("\n\n"),
      (answer) => ({ ...pg, sections: [{ heading: pg.sections[0]?.heading ?? "Overview", paragraph: answer }] }),
    );
  };
  const rewrite = () => beautify();
  const summarize = () => {
    if (!project) return;
    const pg = project.doc.pages[activePage];
    aiAct(
      `Summarize the following page into 5 crisp bullet points.\n\n${pg.sections.map((s) => s.heading + ": " + (s.paragraph ?? "") + " " + (s.bullets ?? []).join("; ")).join("\n")}`,
      (answer) => ({
        ...pg,
        sections: [
          {
            heading: "Summary",
            bullets: answer.split("\n").map((l) => l.replace(/^[-*•\d.\s]+/, "").trim()).filter(Boolean).slice(0, 8),
          },
        ],
      }),
    );
  };

  const totalPages = project?.doc.pages.length ?? 0;

  if (!project) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">Loading workspace…</div>
      </div>
    );
  }

  if (presenting) {
    const pg = project.doc.pages[activePage];
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black p-8" onClick={() => setPresenting(false)}>
        <div className="max-w-5xl w-full">
          <Canvas page={pg} pageIndex={activePage} onChange={updatePage} theme="ink" />
          <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <button
              onClick={(e) => { e.stopPropagation(); setActivePage((i) => Math.max(0, i - 1)); }}
              className="rounded-lg bg-white/10 px-3 py-1.5"
            >Prev</button>
            <span>{activePage + 1} / {totalPages}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setActivePage((i) => Math.min(totalPages - 1, i + 1)); }}
              className="rounded-lg bg-white/10 px-3 py-1.5"
            >Next</button>
            <button onClick={() => setPresenting(false)} className="ml-4 rounded-lg bg-violet/30 px-3 py-1.5">Exit</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <AnimatedBackground />
      <Toaster theme="dark" position="top-center" richColors />
      <TopBar
        title={project.title}
        onExportPDF={() => exportDocToPDF(project.doc)}
        onPresent={() => setPresenting(true)}
      />
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        <PagesSidebar
          project={project}
          active={activePage}
          onSelect={setActivePage}
          onAdd={addPage}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin py-6">
          <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto px-2 scrollbar-thin">
            {project.doc.pages.map((p, i) => (
              <button
                key={i}
                onClick={() => setActivePage(i)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${activePage === i ? "gradient-aurora text-white" : "glass"}`}
              >
                {i + 1}. {p.title.slice(0, 24)}
              </button>
            ))}
          </div>
          <Canvas
            page={project.doc.pages[activePage]}
            pageIndex={activePage}
            onChange={updatePage}
            theme={theme}
          />
          <div className="mx-auto mt-6 flex max-w-[820px] items-center justify-between text-xs text-muted-foreground">
            <button
              disabled={activePage === 0}
              onClick={() => setActivePage((i) => i - 1)}
              className="rounded-lg bg-white/5 px-3 py-1.5 disabled:opacity-40"
            >
              ← Previous
            </button>
            <div>Page {activePage + 1} of {totalPages} · autosaved</div>
            <button
              disabled={activePage === totalPages - 1}
              onClick={() => setActivePage((i) => i + 1)}
              className="rounded-lg bg-white/5 px-3 py-1.5 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </main>
        <AIPanel
          theme={theme}
          onThemeChange={setTheme}
          onBeautify={beautify}
          onRewrite={rewrite}
          onSummarize={summarize}
        />
      </div>
    </div>
  );
}
