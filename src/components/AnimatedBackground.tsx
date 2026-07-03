export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full bg-[oklch(0.86_0.12_250/_0.55)] blur-3xl animate-aurora" />
      <div className="absolute top-1/4 -right-32 h-[500px] w-[500px] rounded-full bg-[oklch(0.88_0.11_200/_0.5)] blur-3xl animate-float-orb" />
      <div className="absolute bottom-[-14rem] left-1/4 h-[600px] w-[600px] rounded-full bg-[oklch(0.86_0.11_295/_0.45)] blur-3xl animate-aurora" />
      <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-[oklch(0.9_0.1_165/_0.35)] blur-3xl animate-float-orb" />
      <div className="absolute inset-0 bg-[radial-gradient(oklch(0.5_0.05_260/_0.05)_1px,transparent_1px)] [background-size:28px_28px] opacity-40" />
      <EducationalOverlay />
    </div>
  );
}

// Subtle, semi-transparent educational SVG icons scattered across the viewport.
// Non-interactive, responsive, kept faint so readability is unaffected.
function EducationalOverlay() {
  const items = [
    { top: "8%", left: "6%", size: 44, icon: "book" },
    { top: "18%", right: "12%", size: 52, icon: "atom" },
    { top: "40%", left: "3%", size: 40, icon: "flask" },
    { top: "55%", right: "6%", size: 46, icon: "graduation" },
    { top: "72%", left: "18%", size: 42, icon: "bulb" },
    { top: "82%", right: "22%", size: 48, icon: "dna" },
    { top: "28%", left: "48%", size: 38, icon: "compass" },
    { top: "65%", left: "58%", size: 40, icon: "calculator" },
  ] as const;
  return (
    <div className="absolute inset-0 opacity-[0.09] dark:opacity-[0.14]">
      {items.map((it, i) => (
        <div
          key={i}
          className="absolute text-primary"
          style={{
            top: it.top,
            left: "left" in it ? it.left : undefined,
            right: "right" in it ? it.right : undefined,
            width: it.size,
            height: it.size,
          }}
        >
          <EduIcon name={it.icon} />
        </div>
      ))}
    </div>
  );
}

function EduIcon({ name }: { name: string }) {
  const common = {
    width: "100%",
    height: "100%",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z" />
          <path d="M4 19h15" />
        </svg>
      );
    case "atom":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="1.6" />
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
        </svg>
      );
    case "flask":
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v6L4 20a1 1 0 0 0 .9 1.5h14.2A1 1 0 0 0 20 20l-6-11V3" />
        </svg>
      );
    case "graduation":
      return (
        <svg {...common}>
          <path d="M2 10 12 5l10 5-10 5z" />
          <path d="M6 12v4c0 1.5 3 3 6 3s6-1.5 6-3v-4" />
        </svg>
      );
    case "bulb":
      return (
        <svg {...common}>
          <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
        </svg>
      );
    case "dna":
      return (
        <svg {...common}>
          <path d="M4 3c4 4 12 14 16 18M20 3C16 7 8 17 4 21M7 6h10M7 18h10M9 10h6M9 14h6" />
        </svg>
      );
    case "compass":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m14.5 9.5-2.5 5-5 2.5 2.5-5z" />
        </svg>
      );
    case "calculator":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
        </svg>
      );
    default:
      return null;
  }
}
