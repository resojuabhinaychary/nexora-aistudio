import { motion } from "framer-motion";
import type { DeckSlide, SlideBlock } from "@/lib/deck.types";
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

          {slide.blocks && slide.blocks.length > 0 && (
            <div className="mt-[3%] space-y-[2.5%]">
              {slide.blocks.map((b, i) => (
                <Block key={i} block={b} t={t} s={s} />
              ))}
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
function Block({ block, t, s }: { block: SlideBlock; t: any; s: (px: number) => string }) {
  const card = { background: t.card, border: `1px solid ${t.border}` };
  if (block.kind === "paragraph")
    return (
      <p className="leading-relaxed" style={{ color: t.body, fontSize: s(16) }}>
        {block.text}
      </p>
    );
  if (block.kind === "points")
    return (
      <ul className="space-y-[2%] rounded-2xl px-[4%] py-[3%]" style={card}>
        {block.items.map((it, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-2 leading-snug"
            style={{ color: t.body, fontSize: s(15) }}
          >
            <span style={{ color: t.accent }}>◆</span>
            <span className="min-w-0">{it}</span>
          </motion.li>
        ))}
      </ul>
    );
  if (block.kind === "stats")
    return (
      <div className="grid gap-[2%]" style={{ gridTemplateColumns: `repeat(${block.items.length},minmax(0,1fr))` }}>
        {block.items.map((it, i) => (
          <div key={i} className="rounded-2xl px-[6%] py-[5%] text-center" style={card}>
            <div className="font-display font-extrabold" style={{ color: t.accent, fontSize: s(24) }}>
              {it.value}
            </div>
            <div style={{ color: t.muted, fontSize: s(11) }}>{it.label}</div>
          </div>
        ))}
      </div>
    );
  if (block.kind === "table")
    return (
      <div className="overflow-hidden rounded-2xl" style={card}>
        <table className="w-full" style={{ fontSize: s(13), color: t.body }}>
          <thead>
            <tr>
              {block.headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-bold" style={{ color: t.title, borderBottom: `1px solid ${t.border}` }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1.5" style={{ borderTop: `1px solid ${t.border}` }}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (block.kind === "timeline")
    return (
      <div className="space-y-[1.5%] rounded-2xl px-[4%] py-[3%]" style={card}>
        {block.items.map((it, i) => (
          <div key={i} className="flex gap-3" style={{ fontSize: s(14), color: t.body }}>
            <span className="shrink-0 font-bold" style={{ color: t.accent }}>{it.when}</span>
            <span className="min-w-0">{it.what}</span>
          </div>
        ))}
      </div>
    );
  if (block.kind === "comparison")
    return (
      <div className="grid grid-cols-2 gap-[2%]">
        {[block.left, block.right].map((side, i) => (
          <div key={i} className="rounded-2xl px-[5%] py-[4%]" style={card}>
            <div className="font-bold" style={{ color: t.title, fontSize: s(13) }}>{side.title}</div>
            <ul className="mt-1 space-y-1">
              {side.items.map((it, j) => (
                <li key={j} style={{ color: t.body, fontSize: s(13) }}>• {it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  return (
    <div className="rounded-2xl px-[5%] py-[4%]" style={{ background: t.card, borderLeft: `4px solid ${t.accent}`, border: `1px solid ${t.border}` }}>
      <div className="font-bold uppercase tracking-wide" style={{ color: t.accent, fontSize: s(10) }}>
        {block.title || block.variant.replace(/-/g, " ")}
      </div>
      <p className="mt-1 leading-relaxed" style={{ color: t.body, fontSize: s(14) }}>{block.text}</p>
    </div>
  );
}
