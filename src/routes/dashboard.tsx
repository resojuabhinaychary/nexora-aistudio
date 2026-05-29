import { createFileRoute } from "@tanstack/react-router";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { GenerateInput } from "@/components/GenerateInput";
import { RecentProjects } from "@/components/RecentProjects";
import { TemplateGrid } from "@/components/TemplateGrid";
import { Toaster } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nexora AI" },
      { name: "description", content: "Your AI study workspace. Generate notes, slides and PDFs." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <Toaster theme="dark" position="top-center" richColors />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="text-xs text-muted-foreground">Welcome back, student ✨</div>
      </header>
      <main className="mx-auto max-w-6xl space-y-12 px-6 pb-20">
        <section>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            What do you want to <span className="gradient-text">learn today?</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Type a topic and choose a format. Nexora AI does the rest.
          </p>
          <div className="mt-6">
            <GenerateInput />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">Recent projects</h2>
              <p className="text-sm text-muted-foreground">Your generated materials.</p>
            </div>
          </div>
          <RecentProjects />
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">Favorites</h2>
              <p className="text-sm text-muted-foreground">Quick access to starred projects.</p>
            </div>
          </div>
          <RecentProjects favoritesOnly />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="font-display text-2xl font-semibold">Templates</h2>
            <p className="text-sm text-muted-foreground">Start from a curated template.</p>
          </div>
          <TemplateGrid />
        </section>
      </main>
    </div>
  );
}
