import { jsPDF } from "jspdf";
import type { Deck, DeckSlide, SlideBlock } from "./deck.types";

/** Flatten rich blocks into export-friendly bullet lines. */
function linesOf(slide: DeckSlide): string[] {
  const out: string[] = [...(slide.bullets || [])];
  for (const b of (slide.blocks || []) as SlideBlock[]) {
    if (b.kind === "paragraph") out.push(b.text);
    else if (b.kind === "points") out.push(...b.items);
    else if (b.kind === "stats") out.push(...b.items.map((i) => `${i.value} — ${i.label}`));
    else if (b.kind === "timeline") out.push(...b.items.map((i) => `${i.when}: ${i.what}`));
    else if (b.kind === "table") out.push(b.headers.join(" | "), ...b.rows.map((r) => r.join(" | ")));
    else if (b.kind === "comparison")
      out.push(`${b.left.title}: ${b.left.items.join("; ")}`, `${b.right.title}: ${b.right.items.join("; ")}`);
    else out.push(`${b.title || b.variant.replace(/-/g, " ")}: ${b.text}`);
  }
  return out.filter(Boolean);
}
import { getTheme, DECK_FONTS } from "./deckThemes";

const safe = (s: string) => s.replace(/[^\w\d\-_ ]+/g, "").trim().slice(0, 60) || "presentation";

/** Real, fully editable PPTX — every title, bullet and note is a text object. */
export async function exportDeckToPptx(deck: Deck) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const theme = getTheme(deck.themeId);
  const font = DECK_FONTS.find((f) => f.id === deck.fontFamily)?.pptx ?? "Segoe UI";
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = deck.title;

  deck.slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: theme.pptx.bg };
    const isTitle = i === 0;
    const hasImage = Boolean(s.image);

    if (isTitle) {
      if (hasImage) slide.addImage({ data: s.image!, x: 5.4, y: 0.9, w: 4.3, h: 3.6, rounding: true });
      slide.addText(s.title, {
        x: 0.6, y: 1.5, w: hasImage ? 4.6 : 8.8, h: 1.8,
        fontSize: 40, bold: true, color: theme.pptx.title, fontFace: font, valign: "middle",
      });
      if (s.subtitle)
        slide.addText(s.subtitle, {
          x: 0.6, y: 3.3, w: hasImage ? 4.6 : 8.8, h: 0.8,
          fontSize: 20, color: theme.pptx.accent, fontFace: font,
        });
      if (linesOf(s).length)
        slide.addText(linesOf(s).map((t) => ({ text: t, options: { bullet: true } })), {
          x: 0.6, y: 4.0, w: hasImage ? 4.6 : 8.8, h: 1.2,
          fontSize: 14, color: theme.pptx.body, fontFace: font,
        });
    } else {
      slide.addText(s.title, {
        x: 0.6, y: 0.45, w: 8.8, h: 0.9,
        fontSize: 30, bold: true, color: theme.pptx.title, fontFace: font,
      });
      if (s.subtitle)
        slide.addText(s.subtitle, {
          x: 0.62, y: 1.25, w: 8.8, h: 0.4, fontSize: 14, color: theme.pptx.accent, fontFace: font,
        });
      const textW = hasImage ? 4.9 : 8.8;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.55, y: 1.75, w: textW, h: 3.3, fill: { color: theme.pptx.card }, line: { color: theme.pptx.card },
        rectRadius: 0.12,
      });
      slide.addText(
        linesOf(s).map((t) => ({ text: t, options: { bullet: true, breakLine: true } })),
        { x: 0.8, y: 1.95, w: textW - 0.45, h: 2.9, fontSize: 16, color: theme.pptx.body, fontFace: font, lineSpacingMultiple: 1.3 },
      );
      if (hasImage) slide.addImage({ data: s.image!, x: 5.65, y: 1.75, w: 3.8, h: 3.3, rounding: true });
    }
    if (s.speakerNotes) slide.addNotes(s.speakerNotes);
    slide.addText(`${i + 1}`, {
      x: 9.0, y: 5.15, w: 0.6, h: 0.3, fontSize: 10, color: theme.pptx.accent, fontFace: font, align: "right",
    });
  });

  await pptx.writeFile({ fileName: `${safe(deck.title)}.pptx` });
}

export function exportDeckToPdf(deck: Deck) {
  const theme = getTheme(deck.themeId);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [960, 540] });
  const hex = (h: string) => `#${h}`;

  deck.slides.forEach((s, i) => {
    if (i > 0) doc.addPage([960, 540], "landscape");
    doc.setFillColor(hex(theme.pptx.bg));
    doc.rect(0, 0, 960, 540, "F");
    doc.setTextColor(hex(theme.pptx.title));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(i === 0 ? 34 : 26);
    doc.text(doc.splitTextToSize(s.title, 820), 56, i === 0 ? 150 : 78);

    const hasImage = Boolean(s.image);
    const textW = hasImage ? 430 : 840;
    let y = i === 0 ? 210 : 150;
    if (s.subtitle) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(14);
      doc.setTextColor(hex(theme.pptx.accent));
      doc.text(doc.splitTextToSize(s.subtitle, textW), 56, y - 28);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(hex(theme.pptx.body));
    linesOf(s).forEach((b) => {
      const lines = doc.splitTextToSize(`•  ${b}`, textW);
      doc.text(lines, 56, y);
      y += lines.length * 20 + 8;
    });
    if (s.image) {
      try {
        const fmt = s.image.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(s.image, fmt, 530, 120, 380, 300, undefined, "FAST");
      } catch {
        /* image unsupported — skip silently */
      }
    }
    doc.setFontSize(10);
    doc.setTextColor(hex(theme.pptx.accent));
    doc.text(String(i + 1), 900, 505);
  });

  doc.save(`${safe(deck.title)}.pdf`);
}

export function exportDeckImages(deck: Deck) {
  deck.slides.forEach((s, i) => {
    if (!s.image) return;
    const a = document.createElement("a");
    a.href = s.image;
    a.download = `${safe(deck.title)}-slide-${i + 1}.${s.image.includes("image/png") ? "png" : "jpg"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}
/** Speaker notes as a plain-text handout. */
export function exportSpeakerNotes(deck: Deck) {
  const text = deck.slides
    .map((s, i) => `Slide ${i + 1} — ${s.title}\n${s.speakerNotes || "(no notes)"}\n`)
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  a.download = `${safe(deck.title)}-speaker-notes.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
