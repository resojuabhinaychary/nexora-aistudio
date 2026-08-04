import type { GeneratedPage, GeneratedSection } from "@/lib/ai.functions";
import { buildEducationalImageKey, fetchVerifiedEducationalImage } from "@/lib/educationalImages";
import { motion, AnimatePresence } from "framer-motion";
import type { ElementType, FocusEvent } from "react";
import { useEffect, useMemo, useState } from "react";

function EditableText({
  value,
  onChange,
  as: As = "div",
  className,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
}) {
  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    onChange(multiline ? e.currentTarget.innerText : (e.currentTarget.textContent ?? ""));
  };

  return (
    <As
      className={`outline-none rounded-md transition focus:bg-primary/5 focus:ring-1 focus:ring-primary/40 ${className ?? ""}`}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
    >
      {value}
    </As>
  );
}

export function Canvas({
  page,
  pageIndex,
  subject,
  onChange,
}: {
  page: GeneratedPage;
  pageIndex: number;
  subject?: string;
  onChange: (next: GeneratedPage) => void;
}) {
  const [imageState, setImageState] = useState<"idle" | "loading" | "failed">("idle");
  const imageContext = useMemo(
    () => ({
      subject,
      chapter: page.subtitle,
      topic: page.imageQuery || page.title,
      keywords: page.sections.map((s) => s.heading).join(", "),
      variant: `page-${pageIndex + 1}-cover`,
    }),
    [page.imageQuery, page.sections, page.subtitle, page.title, subject, pageIndex],
  );
  const imageKey = useMemo(() => buildEducationalImageKey(imageContext, 1024, 576), [imageContext]);
  const verifiedImage =
    page.educationalImage?.key === imageKey ? page.educationalImage.dataUrl : null;
  const imageUnavailable = page.unavailableImageKey === imageKey;

  useEffect(() => {
    let cancelled = false;
    if (verifiedImage) {
      setImageState("idle");
      return () => {
        cancelled = true;
      };
    }
    if (imageUnavailable) {
      setImageState("failed");
      return () => {
        cancelled = true;
      };
    }
    setImageState("loading");
    fetchVerifiedEducationalImage(imageContext, 1024, 576).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setImageState("idle");
        onChange({
          ...page,
          educationalImage: {
            dataUrl: result.dataUrl,
            key: result.key,
            prompt: result.prompt,
            logs: result.logs,
            mimeType: result.mimeType,
            byteSize: result.byteSize,
            width: result.width,
            height: result.height,
          },
          unavailableImageKey: undefined,
          imageError: undefined,
          imageLogs: result.logs,
        });
      } else {
        setImageState("failed");
        onChange({
          ...page,
          educationalImage: undefined,
          unavailableImageKey: imageKey,
          imageLogs: result.logs,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [imageContext, imageKey, imageUnavailable, onChange, page, verifiedImage]);

  const updateSection = (i: number, patch: Partial<GeneratedSection>) => {
    const sections = page.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onChange({ ...page, sections, educationalImage: undefined, unavailableImageKey: undefined });
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
        {verifiedImage && (
          <div className="relative h-44 w-full overflow-hidden md:h-56">
            <img
              src={verifiedImage}
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
        )}

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
          {!verifiedImage && imageState === "loading" && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Preparing illustration for page {pageIndex + 1}…
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-1/2 animate-pulse rounded-full gradient-aurora" />
              </div>
            </div>
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
                {page.sectionImages?.[i]?.dataUrl && (
                  <figure className="mt-4 overflow-hidden rounded-2xl border border-border bg-secondary/40">
                    <img
                      src={page.sectionImages[i].dataUrl}
                      alt={s.heading}
                      className="h-56 w-full object-cover md:h-64"
                      loading="lazy"
                    />
                    <figcaption className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">
                      Fig. {s.heading}
                    </figcaption>
                  </figure>
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
