import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5">
      <div className="relative grid h-10 w-10 place-items-center rounded-2xl gradient-aurora shadow-glow">
        <Sparkles className="h-5 w-5 text-white" strokeWidth={2.4} />
      </div>
      <span className="font-display text-xl font-extrabold tracking-tight text-ink">
        Nexora<span className="gradient-text"> AI</span>
      </span>
    </Link>
  );
}
