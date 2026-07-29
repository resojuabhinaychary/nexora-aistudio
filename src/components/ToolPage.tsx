import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ArrowLeft, Library, Loader2, Send, Camera, ImagePlus, X, Sparkles } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { explainConcept, generateContent } from "@/lib/ai.functions";
import { createProject } from "@/lib/projects";

type Mode = "doubt" | "notes" | "presentation" | "pdf";

const COPY: Record<Mode, { title: string; subtitle: string; placeholder: string; cta: string; gradient: string; emoji: string; suggestions: string[] }> = {
  doubt: {
    title: "Doubt Solver",
    subtitle: "Snap a photo, type a question, or paste anything — get clear step-by-step answers.",
    placeholder: "Ask any doubt — e.g. Solve 2x² + 5x − 3 = 0",
    cta: "Solve",
    gradient: "gradient-sky",
    emoji: "🧠",
    suggestions: [
      "Explain Newton's third law with examples",
      "Solve: ∫ x·sin(x) dx",
      "Difference between mitosis and meiosis",
      "What caused World War 1?",
    ],
  },
  notes: {
    title: "Smart Notes Generator",
    subtitle: "Beautifully structured, classroom-ready study notes on any topic.",
    placeholder: "Topic — e.g. Photosynthesis for grade 10",
    cta: "Generate notes",
    gradient: "gradient-mint",
    emoji: "📓",
    suggestions: [
      "Cell structure & functions",
      "Indian Independence movement",
      "Trigonometric identities",
      "Climate change basics",
    ],
  },
  presentation: {
    title: "Presentation Builder",
    subtitle: "AI-generated slide decks ready to present in seconds.",
    placeholder: "Topic for your slides — e.g. Renewable energy",
    cta: "Build presentation",
    gradient: "gradient-lavender",
    emoji: "🎞️",
    suggestions: [
      "Introduction to Machine Learning",
      "The Solar System",
      "Photosynthesis explained",
      "World War 2 timeline",
    ],
  },
  pdf: {
    title: "PDF Booklet Builder",
    subtitle: "Generate a printable A4 study booklet with illustrations and colored content boxes.",
    placeholder: "What should the PDF cover? e.g. Algebra basics",
    cta: "Generate PDF",
    gradient: "gradient-peach",
    emoji: "📘",
    suggestions: [
      "Periodic table summary",
      "Quadratic equations worksheet",
      "Indian Constitution highlights",
      "Human digestive system",
    ],
  },
};

export function ToolPage({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const navigate = useNavigate();
  const ask = useServerFn(explainConcept);
  const gen = useServerFn(generateContent);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast.error("Image too large (max 8MB)");
    const r = new FileReader();
    r.onload = () => setImage(r.result as string);
    r.readAsDataURL(f);
  };

  const run = async () => {
    const t = text.trim();
    if (!t && !image) return;
    setBusy(true);
    setAnswer("");
    try {
      if (mode === "doubt") {
        const r = await ask({ data: { question: t || "Read the question in the image and solve it step by step.", imageBase64: image } });
        setAnswer(r.answer);
      } else {
        toast.loading(`Generating your ${mode}…`, { id: "gen" });
        const doc = await gen({ data: { topic: t || "Explain the uploaded content", format: mode, imageBase64: image } });
        const p = createProject({ topic: t || doc.title, format: mode, doc });
        toast.success("Ready!", { id: "gen" });
        navigate({ to: "/workspace/$id", params: { id: p.id } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <Toaster position="top-center" richColors />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-white/80 backdrop-blur transition hover:border-primary/40">
            <ArrowLeft className="h-4 w-4 text-ink" />
          </Link>
          <Logo />
        </div>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/80 px-3.5 py-2 text-xs font-bold text-ink backdrop-blur transition hover:border-primary/40">
          <Library className="h-3.5 w-3.5" /> Library
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 pb-32">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-3xl border border-border ${copy.gradient} p-7 shadow-card md:p-10`}
        >
          <div className="text-5xl">{copy.emoji}</div>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink md:text-5xl">{copy.title}</h1>
          <p className="mt-2 max-w-xl text-sm font-medium text-ink/70 md:text-base">{copy.subtitle}</p>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 rounded-3xl border border-border bg-white p-4 shadow-card md:p-5"
        >
          {image && (
            <div className="mb-3">
              <div className="relative inline-block">
                <img src={image} alt="upload" className="h-32 rounded-xl border border-border object-cover" />
                <button onClick={() => setImage(undefined)} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-white shadow"><X className="h-3 w-3" /></button>
              </div>
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
            placeholder={copy.placeholder}
            rows={3}
            className="w-full resize-none rounded-2xl bg-secondary px-4 py-3 text-[15px] font-medium text-ink outline-none ring-1 ring-transparent focus:ring-primary/40"
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button onClick={() => cameraRef.current?.click()} title="Camera" className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-white text-ink hover:border-primary/40">
                <Camera className="h-4 w-4" />
              </button>
              <button onClick={() => fileRef.current?.click()} title="Upload image" className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-white text-ink hover:border-primary/40">
                <ImagePlus className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
            </div>
            <button
              onClick={run}
              disabled={busy || (!text.trim() && !image)}
              className="inline-flex items-center gap-2 rounded-full gradient-aurora px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? "Working…" : copy.cta}
            </button>
          </div>
        </motion.div>

        {!answer && !busy && (
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Try these
            </div>
            <div className="flex flex-wrap gap-2">
              {copy.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setText(s)}
                  className="rounded-full border border-border bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink shadow-soft backdrop-blur transition hover:border-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "doubt" && answer && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="prose-chat mt-6 rounded-3xl border border-border bg-white p-6 shadow-card"
          >
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {answer}
            </ReactMarkdown>
          </motion.div>
        )}
      </main>
    </div>
  );
}