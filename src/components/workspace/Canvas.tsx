import type { GeneratedPage, GeneratedSection } from "@/lib/ai.functions";
import { motion, AnimatePresence } from "framer-motion";

function EditableText({
  value,
  onChange,
  as: As = "div",
  className,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  as?: any;
  className?: string;
  multiline?: boolean;
}) {
  return (
    <As
      className={`outline-none rounded-md transition focus:bg-violet/5 focus:ring-1 focus:ring-violet/40 ${className ?? ""}`}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: any) => onChange(multiline ? e.currentTarget.innerText : e.currentTarget.textContent ?? "")}
    >
      {value}
    </As>
  );
}

export function Canvas({
  page,
  pageIndex,
  onChange,
  theme,
}: {
  page: GeneratedPage;
  pageIndex: number;
  onChange: (next: GeneratedPage) => void;
  theme: "light" | "violet" | "ink";
}) {
  const updateSection = (i: number, patch: Partial<GeneratedSection>) => {
    const sections = page.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onChange({ ...page, sections });
  };

  const themeClass =
    theme === "violet"
      ? "bg-gradient-to-br from-[oklch(0.96_0.04_295)] to-[oklch(0.92_0.06_265)] text-[oklch(0.2_0.04_280)]"
      : theme === "ink"
      ? "bg-[oklch(0.18_0.02_280)] text-[oklch(0.96_0.01_280)] ring-1 ring-white/10"
      : "bg-white text-[oklch(0.16_0.02_280)]";

  return (
    <AnimatePresence mode="wait">
      <motion.article
        key={pageIndex}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`mx-auto w-full max-w-[820px] rounded-3xl p-8 md:p-14 shadow-card ${themeClass}`}
        style={{ minHeight: "calc(100vw * 0.5)", aspectRatio: "1 / 1.414" }}
      >
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] opacity-60">
          <span className="inline-block h-1.5 w-6 rounded-full" style={{ background: "var(--gradient-aurora)" }} />
          Page {pageIndex + 1}
        </div>
        <EditableText
          value={page.title}
          onChange={(v) => onChange({ ...page, title: v })}
          as="h1"
          className="font-display text-3xl md:text-5xl font-bold leading-tight"
        />
        {page.subtitle && (
          <EditableText
            value={page.subtitle}
            onChange={(v) => onChange({ ...page, subtitle: v })}
            as="p"
            className="mt-2 text-base opacity-70"
          />
        )}
        <div className="mt-6 h-px w-16 rounded-full" style={{ background: "var(--gradient-aurora)" }} />

        <div className="mt-8 space-y-7">
          {page.sections.map((s, i) => (
            <section key={i}>
              <EditableText
                value={s.heading}
                onChange={(v) => updateSection(i, { heading: v })}
                as="h2"
                className="font-display text-xl md:text-2xl font-semibold"
              />
              {s.paragraph && (
                <EditableText
                  multiline
                  value={s.paragraph}
                  onChange={(v) => updateSection(i, { paragraph: v })}
                  className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed opacity-90"
                />
              )}
              {s.bullets && s.bullets.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {s.bullets.map((b, bi) => (
                    <li key={bi} className="flex gap-3 text-[15px] leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--gradient-aurora)" }} />
                      <EditableText
                        value={b}
                        onChange={(v) => {
                          const bullets = s.bullets!.map((x, xi) => (xi === bi ? v : x));
                          updateSection(i, { bullets });
                        }}
                        className="flex-1"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </motion.article>
    </AnimatePresence>
  );
}