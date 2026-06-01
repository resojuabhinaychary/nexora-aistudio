import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || "/",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Nexora AI" },
      { name: "description", content: "Sign in to unlock the Doubt Solver and PDF Booklet builder." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp, isAuthenticated } = useAuth();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate({ to: redirect || "/", replace: true });
  }, [isAuthenticated, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast.success("Welcome back!");
      } else {
        await signUp(email, password);
        toast.success("Account created — you're in!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
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
      </header>

      <main className="mx-auto grid w-full max-w-md place-items-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-3xl border border-border bg-white p-7 shadow-card"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Sign in required
          </div>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Login to use the Doubt Solver and PDF Booklet builder.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl bg-secondary px-4 py-3 text-[15px] font-medium text-ink outline-none ring-1 ring-transparent focus:ring-primary/40"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-secondary px-4 py-3 text-[15px] font-medium text-ink outline-none ring-1 ring-transparent focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full gradient-aurora px-5 py-3 text-sm font-bold text-white shadow-glow transition hover:scale-[1.01] disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-xs font-semibold text-muted-foreground hover:text-ink"
          >
            {mode === "signin"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </motion.div>
      </main>
    </div>
  );
}