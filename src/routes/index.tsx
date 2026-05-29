import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Wand2, FileDown, Presentation, BookOpen, Zap, Layers } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexora AI — Generate Notes, Slides & PDFs in Seconds" },
      { name: "description", content: "Nexora AI is a futuristic AI study workspace for students. Generate notes, presentations and downloadable PDFs from any topic." },
      { property: "og:title", content: "Nexora AI — AI Study Workspace" },
      { property: "og:description", content: "Generate beautiful notes, slides and PDFs from any topic." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition hover:text-foreground">Features</a>
          <a href="#formats" className="transition hover:text-foreground">Formats</a>
          <a href="#how" className="transition hover:text-foreground">How it works</a>
        </nav>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-full gradient-aurora px-5 py-2 text-sm font-medium text-white shadow-lg shadow-violet/30 transition hover:scale-[1.02]"
        >
          Launch app <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="relative pt-16 pb-24 text-center md:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet" />
            The AI workspace that thinks like a student
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
          >
            Study material,
            <br />
            <span className="gradient-text">generated in seconds.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg"
          >
            Type any topic. Nexora AI instantly explains it, builds beautiful
            notes, slides, and downloadable PDFs — all inside one cinematic
            workspace.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full gradient-aurora px-6 py-3 text-sm font-medium text-white shadow-glow transition hover:scale-[1.03]"
            >
              Start generating free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium transition hover:bg-white/10"
            >
              See how it works
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="relative mx-auto mt-16 max-w-4xl"
          >
            <div className="glass-strong glow-strong overflow-hidden rounded-3xl p-1.5">
              <div className="rounded-[20px] bg-gradient-to-br from-black/40 to-black/10 p-6 text-left">
                <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-3">nexora.ai / workspace</span>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_280px]">
                  <div className="rounded-xl bg-white p-6 text-left text-[oklch(0.18_0.02_280)] shadow-card">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-violet">Page 1</div>
                    <h3 className="mt-1 font-display text-2xl font-bold">Photosynthesis</h3>
                    <div className="mt-2 h-px w-12 gradient-aurora rounded-full" />
                    <p className="mt-3 text-sm opacity-80">
                      The process by which green plants convert light energy
                      into chemical energy stored in glucose.
                    </p>
                    <ul className="mt-3 space-y-1 text-sm">
                      <li>• Occurs in chloroplasts containing chlorophyll</li>
                      <li>• Equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</li>
                      <li>• Two stages: light-dependent &amp; Calvin cycle</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <div className="glass rounded-xl p-3 text-xs">
                      <div className="mb-2 flex items-center gap-2 text-violet">
                        <Sparkles className="h-3 w-3" /> AI Assistant
                      </div>
                      <div className="text-muted-foreground">Suggest a clearer intro for this topic.</div>
                    </div>
                    <div className="glass rounded-xl p-3 text-xs">
                      <div className="mb-1 text-muted-foreground">Pages</div>
                      <div className="space-y-1">
                        {["Title", "Introduction", "Process", "Diagram", "Summary"].map((p, i) => (
                          <div key={p} className={`rounded-md px-2 py-1 ${i === 0 ? "bg-violet/20" : "hover:bg-white/5"}`}>{p}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="py-20">
          <div className="mb-12 text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-violet">Features</div>
            <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Everything you need to learn faster</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: Zap, title: "Instant doubt solving", desc: "Ask any academic question and get a clear answer in seconds." },
              { icon: BookOpen, title: "Smart notes", desc: "Structured, exam-ready notes with bullets, summaries and key questions." },
              { icon: Presentation, title: "AI presentations", desc: "Beautiful slide decks generated from a single prompt." },
              { icon: FileDown, title: "One-click PDF", desc: "Premium A4 layouts ready to print or share." },
              { icon: Wand2, title: "Live editing", desc: "Refine every page in a real-time editable canvas." },
              { icon: Layers, title: "Multi-page system", desc: "Smooth page navigation, switching and reordering." },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="glass group rounded-2xl p-6 transition hover:bg-white/5"
                >
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl gradient-aurora">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-display text-lg font-semibold">{f.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section id="how" className="pb-28">
          <div className="glass-strong rounded-3xl p-10 text-center">
            <h2 className="font-display text-3xl font-semibold md:text-4xl">Ready to learn the Nexora way?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Generate your first AI study material in under 10 seconds. No
              setup. No friction.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-full gradient-aurora px-7 py-3 text-sm font-medium text-white shadow-glow transition hover:scale-[1.03]"
            >
              Open the workspace <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nexora AI — built for curious minds.
      </footer>
    </div>
  );
}
