import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Loader2, Moon, Play, Share2, Sparkles, Sun } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

export function TopBar({
  title,
  onExportPDF,
  onPresent,
  onToggleAI,
  busy,
  busyLabel,
}: {
  title: string;
  onExportPDF: () => void;
  onPresent: () => void;
  onToggleAI?: () => void;
  busy?: boolean;
  busyLabel?: string;
}) {
  const { theme, toggle } = useTheme();
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Shareable link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white/90 px-4 py-3 backdrop-blur">
      <Link
        to="/"
        className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-white transition hover:border-primary/40"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4 text-ink" />
      </Link>
      <div className="hidden md:block">
        <Logo to="/" />
      </div>
      <div className="mx-3 hidden h-6 w-px bg-border md:block" />
      <div className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{title}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-white text-ink transition hover:border-primary/40 dark:bg-card dark:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {onToggleAI && (
          <button
            onClick={onToggleAI}
            className="hidden items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-ink transition hover:border-primary/40 md:inline-flex"
          >
            <Sparkles className="h-4 w-4 text-primary" /> AI
          </button>
        )}
        <button
          onClick={onPresent}
          className="hidden items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-ink transition hover:border-primary/40 md:inline-flex"
        >
          <Play className="h-4 w-4" /> Present
        </button>
        <button
          onClick={share}
          className="hidden items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-ink transition hover:border-primary/40 md:inline-flex"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
        <button
          onClick={onExportPDF}
          disabled={busy}
          title={busy ? busyLabel : "Export PDF"}
          className="inline-flex items-center gap-1.5 rounded-xl gradient-aurora px-4 py-2 text-xs font-bold text-white shadow-glow transition hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? busyLabel || "Preparing educational illustrations…" : "Export PDF"}
        </button>
      </div>
    </header>
  );
}
