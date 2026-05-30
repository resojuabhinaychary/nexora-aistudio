import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Sparkles, BookOpen, Library, User2 } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { ChatComposer } from "@/components/ChatComposer";
import { explainConcept, generateContent } from "@/lib/ai.functions";
import { createProject } from "@/lib/projects";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexora AI — Your AI Study Assistant" },
      { name: "description", content: "Solve doubts, generate beautiful notes, presentations and PDFs. Snap a photo of any question and let Nexora AI explain it." },
      { property: "og:title", content: "Nexora AI — AI Study Assistant for Students" },
      { property: "og:description", content: "Snap a question, get a step-by-step answer. Generate notes, slides and PDFs." },
    ],
  }),
  component: Home,
});

type Msg =
  | { id: string; role: "user"; text: string; image?: string }
  | { id: string; role: "assistant"; text: string; loading?: boolean };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const ask = useServerFn(explainConcept);
  const gen = useServerFn(generateContent);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handle = async ({ text, imageBase64, format }: { text: string; imageBase64?: string; format: string }) => {
    const userMsg: Msg = { id: uid(), role: "user", text, image: imageBase64 };
    setMessages((m) => [...m, userMsg]);

    if (format === "doubt") {
      const id = uid();
      setMessages((m) => [...m, { id, role: "assistant", text: "", loading: true }]);
      setBusy(true);
      try {
        const r = await ask({ data: { question: text, imageBase64 } });
        setMessages((m) => m.map((x) => (x.id === id ? { id, role: "assistant", text: r.answer } : x)));
      } catch (e) {
        const err = e instanceof Error ? e.message : "Failed";
        setMessages((m) => m.map((x) => (x.id === id ? { id, role: "assistant", text: `⚠️ ${err}` } : x)));
      } finally {
        setBusy(false);
      }
      return;
    }

    // Generation modes: notes / presentation / pdf
    setBusy(true);
    const id = uid();
    setMessages((m) => [
      ...m,
      { id, role: "assistant", text: `Generating your ${format}…`, loading: true },
    ]);
    try {
      const doc = await gen({ data: { topic: text || "Explain the uploaded content", format: format as any, imageBase64 } });
      const p = createProject({ topic: text || doc.title, format, doc });
      toast.success("Your study material is ready");
      navigate({ to: "/workspace/$id", params: { id: p.id } });
    } catch (e) {
      const err = e instanceof Error ? e.message : "Failed";
      setMessages((m) => m.map((x) => (x.id === id ? { id, role: "assistant", text: `⚠️ ${err}` } : x)));
      setBusy(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="relative flex min-h-screen flex-col">
      <AnimatedBackground />
      <Toaster position="top-center" richColors />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-2 text-xs font-bold text-ink transition hover:border-primary/40"
          >
            <Library className="h-3.5 w-3.5" /> Library
          </Link>
          <div className="grid h-9 w-9 place-items-center rounded-full border border-border bg-white text-ink">
            <User2 className="h-4 w-4" />
          </div>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-40">
        {empty ? (
          <Hero />
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin py-6">
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <Bubble key={m.id} msg={m} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-gradient-to-t from-background via-background to-background/70 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <ChatComposer onSubmit={handle} busy={busy} defaultFormat="doubt" />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Nexora AI can make mistakes. Verify important answers.
          </p>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const suggestions = [
    "Explain photosynthesis with examples",
    "Solve: 2x² + 5x − 3 = 0 step by step",
    "Notes on the French Revolution",
    "Presentation on Renewable Energy",
  ];
  return (
    <section className="flex flex-1 flex-col items-center justify-center py-14 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary shadow-soft"
      >
        <Sparkles className="h-3.5 w-3.5" /> AI Study Assistant
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink md:text-6xl"
      >
        Hey student, <br className="hidden md:block" />
        <span className="gradient-text">what should we learn today?</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-auto mt-4 max-w-xl text-base font-medium text-muted-foreground"
      >
        Ask any doubt, snap a photo of a question, or generate beautiful notes,
        presentations and PDFs — all in one place.
      </motion.p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {suggestions.map((s) => (
          <div
            key={s}
            className="rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold text-ink shadow-soft"
          >
            {s}
          </div>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { t: "Doubt Solver", d: "Step-by-step answers" },
          { t: "Smart Notes", d: "Structured & beautiful" },
          { t: "Presentations", d: "Slide-ready decks" },
          { t: "PDF Booklets", d: "Illustrated study PDFs" },
        ].map((f) => (
          <div
            key={f.t}
            className="rounded-2xl border border-border bg-white p-4 text-left shadow-soft"
          >
            <div className="mb-2 grid h-8 w-8 place-items-center rounded-lg gradient-aurora">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div className="font-display text-sm font-bold text-ink">{f.t}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{f.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[88%] rounded-3xl px-4 py-3 ${
          isUser
            ? "gradient-aurora text-white shadow-soft"
            : "border border-border bg-white text-ink shadow-soft"
        }`}
      >
        {isUser && msg.image && (
          <img
            src={msg.image}
            alt="uploaded"
            className="mb-2 max-h-64 rounded-xl border border-white/30"
          />
        )}
        {msg.role === "assistant" && msg.loading && !msg.text ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: "0.15s" }} />
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: "0.3s" }} />
            <span className="ml-2 text-xs font-semibold text-muted-foreground">Thinking…</span>
          </div>
        ) : isUser ? (
          <div className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed">{msg.text}</div>
        ) : (
          <div className="prose-chat text-[15px] leading-relaxed">
            <ReactMarkdown>{msg.text}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
