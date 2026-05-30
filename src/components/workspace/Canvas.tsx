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
      className={`outline-none rounded-md transition focus:bg-primary/5 focus:ring-1 focus:ring-primary/40 ${className ?? ""}`}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: any) => onChange(multiline ? e.currentTarget.innerText : e.currentTarget.textContent ?? "")}
    >
      {value}
    </As>
  );
}

export function imageUrl(query?: string, w = 1024, h = 576) {
  const q = (query || "education study illustration").trim();
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    q + ", clean educational illustration, flat vector, soft pastel colors, white background",
  )}?width=${w}&height=${h}&nologo=true&model=flux`;
}

export function Canvas({
  page,
  pageIndex,
  onChange,
}: {
  page: GeneratedPage;
  pageIndex: number;
  onChange: (next: GeneratedPage) => void;
}) {
  const updateSection = (i: number, patch: Partial<GeneratedSection>) => {
    const sections = page.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onChange({ ...page, sections });
  };

  return (
    <AnimatePresence mode="wait">
      <motion.article
        key={pageIndex}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mx-auto w-full max-w-[860px] overflow-hidden rounded-3xl border border-border bg-white text-ink shadow-card"
      >
        <div className="relative h-44 w-full overflow-hidden md:h-56">
          <img
            src={imageUrl(page.imageQuery || page.title)}
            alt={page.imageQuery || page.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
          <div className="absolute left-6 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Page {pageIndex + 1}
          </div>
        </div>

        <div className="p-7 md:p-12">
          <EditableText
            value={page.title}
            onChange={(v) => onChange({ ...page, title: v })}
            as="h1"
            className="font-display text-3xl font-extrabold leading-tight tracking-tight md:text-5xl"
          />
          {page.subtitle && (
            <EditableText
              value={page.subtitle}
              onChange={(v) => onChange({ ...page, subtitle: v })}
              as="p"
              className="mt-3 text-base font-medium text-muted-foreground md:text-lg"
            />
          )}
          <div className="mt-5 h-1 w-16 rounded-full gradient-aurora" />

          <div className="mt-8 space-y-7">
            {page.sections.map((s, i) => (
              <section key={i}>
                <EditableText
                  value={s.heading}
                  onChange={(v) => updateSection(i, { heading: v })}
                  as="h2"
                  className="font-display text-xl font-extrabold md:text-2xl"
                />
                {s.paragraph && (
                  <EditableText
                    multiline
                    value={s.paragraph}
                    onChange={(v) => updateSection(i, { paragraph: v })}
                    className="mt-2 whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-ink/85"
                  />
                )}
                {s.bullets && s.bullets.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {s.bullets.map((b, bi) => (
                      <li key={bi} className="flex gap-3 text-[15px] font-medium leading-relaxed">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full gradient-aurora" />
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
        </div>
      </motion.article>
    </AnimatePresence>
  );
}
