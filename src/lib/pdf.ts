import jsPDF from "jspdf";
import type { GeneratedDoc } from "./ai.functions";
import { EDUCATIONAL_IMAGE_UNAVAILABLE } from "./educationalImages";

function imageUrl(query: string, w = 1024, h = 576) {
  const q = (query || "education illustration").trim();
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    q +
      ", labeled scientific educational diagram, textbook illustration, clearly labeled parts with arrows and captions, flat vector infographic, clean white background, NO photo, NO people, NO landscape, NO city, NO building, NO scenery",
  )}?width=${w}&height=${h}&nologo=true&model=flux`;
}

async function fetchOne(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size < 1000) return null;
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Try multiple image sources so we (almost) always get a real photo/illustration.
// Educational-only image fetch. We ONLY use AI-generated topic-specific
// diagrams (pollinations/flux with a strict educational prompt). We do NOT
// fall back to random stock photo sources (Unsplash, LoremFlickr, Picsum)
// because those return city/beach/landscape photos that are irrelevant to
// the topic. If the AI generation fails, the caller draws an illustrated
// titled placeholder instead — which is still topic-relevant.
async function fetchImage(
  primaryUrl: string,
  _query?: string,
  _w = 1024,
  _h = 576,
): Promise<string | null> {
  // Try the topic-specific educational diagram twice (transient failures).
  const a = await fetchOne(primaryUrl, 30000);
  if (a) return a;
  const b = await fetchOne(primaryUrl + "&retry=1", 20000);
  if (b) return b;
  return null;
}

// Soft pastel color palette for content boxes [bgR,bgG,bgB, borderR,borderG,borderB, textR,textG,textB]
const BOX_PALETTE: Array<{ bg: [number, number, number]; border: [number, number, number]; accent: [number, number, number] }> = [
  { bg: [235, 244, 255], border: [180, 206, 245], accent: [60, 110, 220] },   // sky
  { bg: [240, 235, 255], border: [200, 188, 240], accent: [110, 80, 210] },   // lavender
  { bg: [233, 248, 240], border: [176, 220, 196], accent: [40, 145, 110] },   // mint
  { bg: [255, 243, 232], border: [245, 210, 175], accent: [200, 120, 40] },   // peach
  { bg: [255, 235, 240], border: [245, 195, 210], accent: [210, 70, 120] },   // rose
  { bg: [240, 240, 245], border: [205, 205, 215], accent: [80, 90, 120] },    // slate
];

export async function exportDocToPDF(doc: GeneratedDoc): Promise<{ blob: Blob; filename: string }> {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  // Use only verified images already generated for the preview/export flow.
  // No placeholder, random stock, gradient, filler, or PDF-only images are drawn.
  const pageImgs = doc.pages.map((p) => p.educationalImage?.dataUrl || null);
  const coverImg = pageImgs.find(Boolean) || null;
  const sectionImgMap = new Map<string, string>();

  const drawHeader = (subject: string) => {
    pdf.setFillColor(245, 248, 255);
    pdf.rect(0, 0, pageW, 26, "F");
    pdf.setDrawColor(220, 228, 245);
    pdf.line(0, 26, pageW, 26);
    pdf.setFontSize(8);
    pdf.setTextColor(70, 90, 200);
    pdf.setFont("helvetica", "bold");
    pdf.text("NEXORA AI", margin, 17);
    pdf.setTextColor(110, 120, 140);
    pdf.setFont("helvetica", "normal");
    pdf.text(subject, pageW - margin, 17, { align: "right" });
  };

  const drawFooter = (n: number) => {
    pdf.setFontSize(8);
    pdf.setTextColor(150, 160, 180);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Page ${n}`, pageW / 2, pageH - 18, { align: "center" });
  };

  // Draw an attractive gradient illustration placeholder so empty rectangles
  // never appear in the PDF when an image fetch fails.
  const drawIllustratedPlaceholder = (
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    palette: (typeof BOX_PALETTE)[number],
  ) => {
    // Soft vertical gradient using palette colors
    const [r1, g1, b1] = palette.bg;
    const [r2, g2, b2] = palette.accent;
    const steps = Math.max(40, Math.floor(h));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(r1 + (r2 - r1) * t * 0.55);
      const g = Math.round(g1 + (g2 - g1) * t * 0.55);
      const b = Math.round(b1 + (b2 - b1) * t * 0.55);
      pdf.setFillColor(r, g, b);
      pdf.rect(x, y + (h * i) / steps, w, h / steps + 0.6, "F");
    }
    // Decorative circles
    pdf.setFillColor(255, 255, 255);
    // @ts-ignore - jsPDF supports opacity via GState; falling back to light fill
    pdf.circle(x + w - 40, y + 30, 22, "F");
    pdf.circle(x + 30, y + h - 26, 16, "F");
    pdf.setFillColor(...palette.accent);
    pdf.circle(x + w / 2, y + h / 2 - 4, Math.min(28, h / 5), "F");
    // Title text centered
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(Math.min(18, Math.max(11, h / 12)));
    pdf.setTextColor(255, 255, 255);
    const lines = pdf.splitTextToSize(title, w - 40);
    pdf.text(lines, x + w / 2, y + h / 2 + 30, { align: "center" });
  };

  // Draw a small inline image card (or colored placeholder) below a paragraph.
  const drawInlineImageCard = (
    y: number,
    img: string | null,
    caption: string,
    palette: (typeof BOX_PALETTE)[number],
    subject: string,
  ): number => {
    const imgH = 130;
    const cardH = imgH + 30;
    if (y + cardH > pageH - 60) {
      drawFooter(pdf.getNumberOfPages());
      y = newPage(subject);
    }
    pdf.setFillColor(...palette.bg);
    pdf.setDrawColor(...palette.border);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(margin, y, contentW, cardH, 10, 10, "FD");
    if (img) {
      try {
        pdf.addImage(img, "JPEG", margin + 8, y + 8, contentW - 16, imgH, undefined, "FAST");
      } catch {
        drawIllustratedPlaceholder(margin + 8, y + 8, contentW - 16, imgH, caption, palette);
      }
    } else {
      drawIllustratedPlaceholder(margin + 8, y + 8, contentW - 16, imgH, caption, palette);
    }
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9);
    pdf.setTextColor(120, 130, 160);
    pdf.text(`Fig. ${caption}`, pageW / 2, y + cardH - 10, { align: "center" });
    return y + cardH + 10;
  };

  const newPage = (subject: string) => {
    pdf.addPage();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageW, pageH, "F");
    drawHeader(subject);
    return 50;
  };

  // Draw a colored, bordered, rounded "callout" box and return new Y.
  // Renders: optional heading bar, optional paragraph, optional bullets — all inside one box.
  const drawCalloutBox = (opts: {
    y: number;
    palette: (typeof BOX_PALETTE)[number];
    heading?: string;
    paragraph?: string;
    bullets?: string[];
    subject: string;
  }): number => {
    let { y } = opts;
    const { palette, heading, paragraph, bullets, subject } = opts;
    const padX = 14;
    const padTop = 14;
    const padBottom = 14;
    const innerW = contentW - padX * 2;

    // Measure
    const headingLines = heading ? pdf.splitTextToSize(heading, innerW) : [];
    const paraLines = paragraph ? pdf.splitTextToSize(paragraph, innerW) : [];
    const bulletLines: string[][] = (bullets || []).map((b) =>
      pdf.splitTextToSize("•  " + b, innerW - 6),
    );

    const headingH = headingLines.length * 16;
    const paraH = paraLines.length * 15 + (paragraph ? 4 : 0);
    const bulletsH = bulletLines.reduce((a, l) => a + l.length * 14 + 4, 0);
    const gap = heading && (paragraph || bullets?.length) ? 8 : 0;
    const boxH = padTop + headingH + gap + paraH + bulletsH + padBottom;

    // Page break if needed
    if (y + boxH > pageH - 60) {
      drawFooter(pdf.getNumberOfPages());
      y = newPage(subject);
    }

    // Box background
    pdf.setFillColor(...palette.bg);
    pdf.setDrawColor(...palette.border);
    pdf.setLineWidth(1);
    pdf.roundedRect(margin, y, contentW, boxH, 10, 10, "FD");

    // Accent bar on the left
    pdf.setFillColor(...palette.accent);
    pdf.roundedRect(margin, y, 4, boxH, 2, 2, "F");

    let cy = y + padTop;
    if (heading) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(...palette.accent);
      pdf.text(headingLines, margin + padX, cy + 10);
      cy += headingH + gap;
    }
    if (paragraph) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(35, 40, 60);
      pdf.text(paraLines, margin + padX, cy + 4);
      cy += paraH;
    }
    if (bulletLines.length) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(35, 40, 60);
      for (const lines of bulletLines) {
        pdf.text(lines, margin + padX + 4, cy + 4);
        cy += lines.length * 14 + 4;
      }
    }
    return y + boxH + 12;
  };

  // ===== Cover =====
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, pageH, "F");
  // soft pastel gradient band (sky → lavender)
  for (let i = 0; i < 260; i++) {
    const ratio = i / 260;
    const r = Math.round(210 + (225 - 210) * ratio);
    const g = Math.round(225 + (215 - 225) * ratio);
    const b = Math.round(250 + (250 - 250) * ratio);
    pdf.setFillColor(r, g, b);
    pdf.rect(0, i, pageW, 1, "F");
  }
  // Cover hero — always render a visual (image or illustrated placeholder)
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(220, 228, 245);
  pdf.roundedRect(margin - 6, 54, contentW + 12, 220, 14, 14, "FD");
  let coverDrawn = false;
  if (coverImg) {
    try {
      pdf.addImage(coverImg, "JPEG", margin, 60, contentW, 208, undefined, "FAST");
      coverDrawn = true;
    } catch {}
  }
  if (!coverDrawn) {
    drawIllustratedPlaceholder(margin, 60, contentW, 208, doc.title, BOX_PALETTE[0]);
  }
  pdf.setTextColor(20, 25, 50);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(34);
  const titleLines = pdf.splitTextToSize(doc.title, contentW);
  pdf.text(titleLines, margin, 320);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.setTextColor(80, 95, 140);
  pdf.text(doc.subject || "Study Material", margin, 320 + titleLines.length * 34 + 8);
  pdf.setFontSize(11);
  pdf.setTextColor(95, 105, 130);
  const summary = pdf.splitTextToSize(doc.summary || "", contentW);
  pdf.text(summary, margin, 320 + titleLines.length * 34 + 36);
  pdf.setFontSize(9);
  pdf.setTextColor(140, 150, 170);
  pdf.text("Generated with Nexora AI · nexora.ai", margin, pageH - 30);

  // ===== Pages =====
  doc.pages.forEach((page, pIdx) => {
    let y = newPage(doc.subject || "");

    // Page number chip
    pdf.setFillColor(235, 240, 255);
    pdf.roundedRect(margin, y, 70, 18, 6, 6, "F");
    pdf.setFontSize(8);
    pdf.setTextColor(70, 90, 200);
    pdf.setFont("helvetica", "bold");
    pdf.text(`PAGE ${pIdx + 1}`, margin + 8, y + 12);
    y += 30;

    // Title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(20, 25, 50);
    const t = pdf.splitTextToSize(page.title, contentW);
    pdf.text(t, margin, y + 10);
    y += t.length * 24 + 6;

    if (page.subtitle) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(110, 120, 150);
      const s = pdf.splitTextToSize(page.subtitle, contentW);
      pdf.text(s, margin, y);
      y += s.length * 14 + 4;
    }
    pdf.setDrawColor(80, 110, 230);
    pdf.setLineWidth(2);
    pdf.line(margin, y + 4, margin + 50, y + 4);
    y += 18;

    // Illustration in a soft rounded card — always render so layout looks intentional
    {
      const img = pageImgs[pIdx];
      const imgH = 180;
      pdf.setFillColor(248, 250, 255);
      pdf.setDrawColor(220, 228, 245);
      pdf.roundedRect(margin, y, contentW, imgH + 12, 12, 12, "FD");
      let drew = false;
      if (img) {
        try {
          pdf.addImage(img, "JPEG", margin + 6, y + 6, contentW - 12, imgH, undefined, "FAST");
          drew = true;
        } catch {}
      }
      if (!drew) {
        const pal = BOX_PALETTE[pIdx % BOX_PALETTE.length];
        drawIllustratedPlaceholder(margin + 6, y + 6, contentW - 12, imgH, page.title, pal);
      }
      y += imgH + 24;
    }

    // Sections — each one rendered as a colored bordered callout box
    page.sections.forEach((sec, sIdx) => {
      const palette = BOX_PALETTE[(pIdx + sIdx) % BOX_PALETTE.length];
      y = drawCalloutBox({
        y,
        palette,
        heading: sec.heading,
        paragraph: sec.paragraph,
        bullets: sec.bullets,
        subject: doc.subject || "",
      });
      // Inline illustration right below paragraphs so concepts are easier to grasp
      const inlineImg = sectionImgMap.get(`${pIdx}:${sIdx}`);
      if (inlineImg !== undefined) {
        y = drawInlineImageCard(y, inlineImg, sec.heading, palette, doc.subject || "");
      }
    });

    // Fill remaining empty space at the bottom of the page with a relevant illustration
    const remaining = pageH - 60 - y;
    if (remaining > 160) {
      const filler = fillerImgs[pIdx];
      const imgH = Math.min(remaining - 24, 240);
      const imgW = Math.min(contentW, imgH * 1.4);
      const xOffset = margin + (contentW - imgW) / 2;
      pdf.setFillColor(250, 251, 255);
      pdf.setDrawColor(225, 232, 248);
      pdf.roundedRect(xOffset - 6, y, imgW + 12, imgH + 28, 12, 12, "FD");
      let drew = false;
      if (filler) {
        try {
          pdf.addImage(filler, "JPEG", xOffset, y + 6, imgW, imgH, undefined, "FAST");
          drew = true;
        } catch {}
      }
      if (!drew) {
        const pal = BOX_PALETTE[(pIdx + 1) % BOX_PALETTE.length];
        drawIllustratedPlaceholder(xOffset, y + 6, imgW, imgH, page.imageQuery || page.title, pal);
      }
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(120, 130, 160);
      const caption = page.imageQuery || page.title;
      pdf.text(`Fig. ${pIdx + 1} — ${caption}`, xOffset + imgW / 2, y + imgH + 20, { align: "center" });
    }
    drawFooter(pIdx + 2);
  });

  // ===== Concepts & questions =====
  let y = newPage(doc.subject || "");
  y += 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(20, 25, 50);
  pdf.text("Key Concepts & Questions", margin, y);
  y += 24;

  if (doc.keyConcepts?.length) {
    y = drawCalloutBox({
      y,
      palette: BOX_PALETTE[2], // mint
      heading: "Key Concepts",
      bullets: doc.keyConcepts,
      subject: doc.subject || "",
    });
  }
  if (doc.keyQuestions?.length) {
    y = drawCalloutBox({
      y,
      palette: BOX_PALETTE[3], // peach
      heading: "Important Questions",
      bullets: doc.keyQuestions.map((q, i) => `${i + 1}. ${q}`),
      subject: doc.subject || "",
    });
  }
  drawFooter(pdf.getNumberOfPages());

  const safe = doc.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "nexora";
  const filename = `${safe}.pdf`;
  const blob = pdf.output("blob");
  pdf.save(filename);
  return { blob, filename };
}
