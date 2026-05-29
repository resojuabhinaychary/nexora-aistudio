import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="group flex items-center gap-2">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl gradient-aurora shadow-[0_0_24px_-4px_oklch(0.68_0.22_295/_0.7)]">
        <Sparkles className="h-5 w-5 text-white" strokeWidth={2.2} />
      </div>
      <span className="font-display text-lg font-semibold tracking-tight">
        Nexora<span className="gradient-text"> AI</span>
      </span>
    </Link>
  );
}