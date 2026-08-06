import { motion } from "framer-motion";
import type { DeckSlide } from "@/lib/deck.types";
import { getTheme } from "@/lib/deckThemes";

type Props = {
  slide: DeckSlide;
  index: number;
  total: number;
  themeId: string;
  fontFamily: string;
  fontScale: number;
  imageLoading?: boolean;
  editable?: boolean;
  onChange?: (next: DeckSlide) => void;
};

export function SlideView({
  slide, index, total, themeId, fontFamily, fontScale, imageLoading, editable, onChange,
}: Props) {
  const t = getTheme(themeId);
  const isTitle = index === 0;
  const s = (px: number) => `${Math.round(px * fontScale)}px`;
  const edit = (patch: Partial<DeckSlide>) => onChange?.({ ...slide, ...patch });

  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl shadow-card"
      style={{ background: t.surface, fontFamily, border: `1px solid ${t.border}` }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ background: t.accent, opacity: 0.9 }}
      />
      <div className={`flex h-full w-full gap-[3%] p-[4.5%] ${isTitle ? "items-center" : "items-stretch"}`}>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h2
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={(e) => edit({ title: e.currentTarget.textContent || "" })}
            className="font-display font-extrabold leading-[1.08] tracking-tight outline-none"
            style={{ color: t.title, fontSize: s(isTitle ? 44 : 32) }}
          >
            {slide.title}
          </h2>
          {(slide.subtitle || editable) && (
            <p
              contentEditable={editable}
              suppressContentEditableWarning
              onBlur={(e) => edit({ subtitle: e.currentTarget.textContent || "" })}
              className="mt-[1.5%] font-semibold outline-none"
              style={{ color: t.accent, fontSize: s(16) }}
            >
              {slide.subtitle}
            </p>
          )}
          {slide.bullets.length > 0 && (
            <div
              className="mt-[3%] rounded-2xl px-[5%] py-[4%]"
              style={{ background: t.card, border: `1px solid ${t.border}` }}
            >
              <ul className="space-y-[2.5%]">
                {slide.bullets.map((b, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex gap-2 leading-snug"
                    style={{ color: t.body, fontSize: s(17) }}
                  >
                    <span style={{ color: t.accent }}>◆</span>
                    <span
                      contentEditable={editable}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const next = [...slide.bullets];
                        next[i] = e.currentTarget.textContent || "";
                        edit({ bullets: next.filter(Boolean) });
                      }}
                      className="min-w-0 outline-none"
                    >
                      {b}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {(slide.image || imageLoading) && (
          <div className="relative w-[38%] shrink-0 self-center">
            {slide.image ? (
              <motion.img
                key={slide.image.slice(-24)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                src={slide.image}
                alt={slide.title}
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-soft"
                style={{ border: `1px solid ${t.border}` }}
              />
            ) : (
              <div
                className="aspect-[4/3] w-full animate-pulse rounded-2xl"
                style={{ background: t.card, border: `1px solid ${t.border}`, boxShadow: `0 0 40px -8px ${t.accent}` }}
              />
            )}
          </div>
        )}
      </div>

      <div
        className="absolute bottom-3 right-5 text-[11px] font-bold"
        style={{ color: t.muted }}
      >
        {index + 1} / {total}
      </div>
    </div>
  );
}