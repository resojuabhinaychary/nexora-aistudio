import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, MessageCircleQuestion, BookOpen, Presentation, Library, ArrowRight, User2, Instagram, GraduationCap } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { InfoCenterButton } from "@/components/InfoCenter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexora AI — Your AI Study Assistant" },
      { name: "description", content: "Solve doubts, generate beautiful notes, slide presentations, and illustrated PDF booklets — all in one place." },
      { property: "og:title", content: "Nexora AI — AI Study Assistant for Students" },
      { property: "og:description", content: "Doubt solver, notes generator, presentation builder, and PDF booklet builder." },
    ],
  }),
  component: Home,
});

const TOOLS = [
  {
    key: "doubt",
    to: "/doubt" as const,
    label: "Doubt Solver",
    desc: "Snap a photo or type any question — get clear step-by-step answers.",
    icon: MessageCircleQuestion,
    bg: "gradient-sky",
    emoji: "🧠",
  },
  {
    key: "notes",
    to: "/notes" as const,
    label: "Smart Notes",
    desc: "Beautifully structured study notes on any topic, ready to learn.",
    icon: BookOpen,
    bg: "gradient-mint",
    emoji: "📓",
  },
  {
    key: "presentation",
    to: "/presentation" as const,
    label: "AI Presentation",
    desc: "Watch slides build live — streamed text, AI image per slide, real editable PPTX.",
    icon: Presentation,
    bg: "gradient-lavender",
    emoji: "🎞️",
  },
  {
    key: "exam",
    to: "/exam" as const,
    label: "Exam Preparer",
    desc: "Practice unlimited MCQs with instant feedback and a downloadable report.",
    icon: GraduationCap,
    bg: "gradient-rose",
    emoji: "🎯",
  },
];

function Home() {
  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/80 px-3.5 py-2 text-xs font-bold text-ink backdrop-blur transition hover:border-primary/40">
            <Library className="h-3.5 w-3.5" /> Library
          </Link>
          <InfoCenterButton />
          <div className="grid h-9 w-9 place-items-center rounded-full border border-border bg-white/80 text-ink backdrop-blur">
            <User2 className="h-4 w-4" />
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-24">
        <section className="py-10 text-center md:py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary shadow-soft backdrop-blur"
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
            Pick a tool — solve doubts, generate notes, build presentations, or
            download a beautifully illustrated PDF booklet.
          </motion.p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {TOOLS.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
              >
                <Link
                  to={t.to}
                  className={`group relative block overflow-hidden rounded-3xl border border-border ${t.bg} p-7 shadow-card transition hover:shadow-glow md:p-8`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-5xl">{t.emoji}</div>
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 text-ink shadow-soft backdrop-blur transition group-hover:bg-white">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink md:text-3xl">{t.label}</h2>
                  <p className="mt-2 max-w-sm text-sm font-medium text-ink/70">{t.desc}</p>
                  <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink shadow-soft backdrop-blur transition group-hover:gap-2.5">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </section>
      </main>

      <footer className="relative z-10 flex w-full flex-col items-center gap-1.5 pb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Made by <span className="text-ink">ABHINAYCHARY</span>
        </p>
        <a
          href="https://instagram.com/abhinay_chary_"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram @abhinay_chary_"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/80 px-3 py-1 text-[10px] font-bold text-ink shadow-soft backdrop-blur transition hover:border-primary/40"
        >
          <Instagram className="h-3.5 w-3.5 text-primary" />
          @abhinay_chary_
        </a>
      </footer>

    </div>
  );
}