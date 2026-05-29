import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Play, Share2, Globe } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export function TopBar({
  title,
  onExportPDF,
  onPresent,
}: {
  title: string;
  onExportPDF: () => void;
  onPresent: () => void;
}) {
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Shareable link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <header className="glass-strong sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 px-4 py-3">
      <Link
        to="/dashboard"
        className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 transition hover:bg-white/10"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div className="hidden md:block">
        <Logo to="/dashboard" />
      </div>
      <div className="mx-3 hidden h-6 w-px bg-white/10 md:block" />
      <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground/90">{title}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPresent}
          className="hidden items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10 md:inline-flex"
        >
          <Play className="h-4 w-4" /> Present
        </button>
        <button
          onClick={share}
          className="hidden items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10 md:inline-flex"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
        <button
          onClick={() => toast("Webpage export coming soon — your project is already shareable via link.")}
          className="hidden items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10 lg:inline-flex"
        >
          <Globe className="h-4 w-4" /> Web
        </button>
        <button
          onClick={onExportPDF}
          className="inline-flex items-center gap-2 rounded-lg gradient-aurora px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet/30 transition hover:scale-[1.02]"
        >
          <Download className="h-4 w-4" /> Export PDF
        </button>
      </div>
    </header>
  );
}