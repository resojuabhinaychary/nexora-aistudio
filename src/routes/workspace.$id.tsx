import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Toaster, toast } from "sonner";
import { Share2, Sparkles } from "lucide-react";
import { TopBar } from "@/components/workspace/TopBar";
import { PagesSidebar } from "@/components/workspace/PagesSidebar";
import { Canvas } from "@/components/workspace/Canvas";
import { AIPanel } from "@/components/workspace/AIPanel";
import { AnimatedBackground } from "@/components/AnimatedBackground";
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
  const [presenting, setPresenting] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastPdf, setLastPdf] = useState<{ blob: Blob; filename: string } | null>(null);
  const ask = useServerFn(explainConcept);

  useEffect(() => {
    const p = getProject(id);
    if (!p) {
      toast.error("Project not found");
      navigate({ to: "/" });
      return;
    }
    setProject(p);
  }, [id, navigate]);

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

  const handleExport = async () => {
    if (!project) return;
    setExporting(true);
    toast.loading("Building illustrated PDF…", { id: "pdf" });
    try {
      const out = await exportDocToPDF(project.doc);
      setLastPdf(out);
      toast.success("PDF downloaded — share it below", { id: "pdf" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed", { id: "pdf" });
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!lastPdf) return;
    const file = new File([lastPdf.blob], lastPdf.filename, { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: project?.title, text: `Study material: ${project?.title}` });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: project?.title, text: `Study material: ${project?.title}`, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Workspace link copied to clipboard");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error("Couldn't open share sheet");
    }
  };

  const totalPages = project?.doc.pages.length ?? 0;

  if (!project) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="rounded-2xl border border-border bg-white p-6 text-sm font-medium text-muted-foreground shadow-soft">
          Loading workspace…
        </div>
      </div>
    );
  }

  if (presenting) {
    const pg = project.doc.pages[activePage];
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-4 md:p-8" onClick={() => setPresenting(false)}>
        <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
          <Canvas page={pg} pageIndex={activePage} onChange={updatePage} />
          <div className="mt-6 flex items-center justify-center gap-3 text-sm font-bold text-ink">
            <button onClick={() => setActivePage((i) => Math.max(0, i - 1))} className="rounded-xl border border-border bg-white px-4 py-2">← Prev</button>
            <span className="px-2">{activePage + 1} / {totalPages}</span>
            <button onClick={() => setActivePage((i) => Math.min(totalPages - 1, i + 1))} className="rounded-xl border border-border bg-white px-4 py-2">Next →</button>
            <button onClick={() => setPresenting(false)} className="ml-4 rounded-xl gradient-aurora px-4 py-2 text-white">Exit</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <AnimatedBackground />
      <Toaster position="top-center" richColors />
      <TopBar title={project.title} onExportPDF={handleExport} onPresent={() => setPresenting(true)} onToggleAI={() => setAiOpen((o) => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <PagesSidebar project={project} active={activePage} onSelect={setActivePage} onAdd={addPage} />
        <main className="flex-1 overflow-y-auto scrollbar-thin px-3 py-6 md:px-8 md:py-10">
          <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto px-1 scrollbar-thin">
            {project.doc.pages.map((p, i) => (
              <button key={i} onClick={() => setActivePage(i)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${activePage === i ? "gradient-aurora text-white shadow-soft" : "border border-border bg-white text-ink"}`}>
                {i + 1}. {p.title.slice(0, 24)}
              </button>
            ))}
          </div>
          <Canvas page={project.doc.pages[activePage]} pageIndex={activePage} onChange={updatePage} />
          <div className="mx-auto mt-6 flex max-w-[860px] items-center justify-between text-xs font-bold text-muted-foreground">
            <button disabled={activePage === 0} onClick={() => setActivePage((i) => i - 1)} className="rounded-xl border border-border bg-white px-3 py-1.5 text-ink disabled:opacity-40">← Previous</button>
            <div>Page {activePage + 1} of {totalPages} · autosaved</div>
            <button disabled={activePage === totalPages - 1} onClick={() => setActivePage((i) => i + 1)} className="rounded-xl border border-border bg-white px-3 py-1.5 text-ink disabled:opacity-40">Next →</button>
          </div>
        </main>
      </div>

      {!aiOpen && (
        <button onClick={() => setAiOpen(true)} className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full gradient-aurora px-5 py-3 text-sm font-bold text-white shadow-glow-strong transition hover:scale-[1.03]">
          <Sparkles className="h-4 w-4" /> AI tools
        </button>
      )}

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} onBeautify={beautify} onRewrite={rewrite} onSummarize={summarize} />

      {exporting && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center">
          <div className="rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-ink shadow-soft">Preparing your illustrated PDF…</div>
        </div>
      )}

      {lastPdf && !exporting && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-white px-4 py-2 shadow-card">
            <span className="text-xs font-bold text-ink">PDF ready · {lastPdf.filename}</span>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full gradient-aurora px-4 py-1.5 text-xs font-bold text-white shadow-glow transition hover:scale-[1.03]"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <button
              onClick={() => setLastPdf(null)}
              className="text-xs font-semibold text-muted-foreground hover:text-ink"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}