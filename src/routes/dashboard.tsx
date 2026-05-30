import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { RecentProjects } from "@/components/RecentProjects";
import { Toaster } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Library — Nexora AI" },
      { name: "description", content: "Your saved study materials, notes, slides and PDFs." },
    ],
  }),
  component: Library,
});

function Library() {
  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <Toaster position="top-center" richColors />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Logo />
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-2 text-xs font-bold text-ink transition hover:border-primary/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to chat
        </Link>
      </header>
      <main className="mx-auto max-w-5xl space-y-10 px-5 pb-20">
        <section>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            Your <span className="gradient-text">Library</span>
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            Everything you've generated — open, edit, or download again.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-ink">Recent projects</h2>
          <RecentProjects />
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-ink">Favorites</h2>
          <RecentProjects favoritesOnly />
        </section>
      </main>
    </div>
  );
}
