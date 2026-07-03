import jsPDF from "jspdf";
import type { GeneratedDoc } from "./ai.functions";

// Soft pastel color palette for content boxes [bgR,bgG,bgB, borderR,borderG,borderB, textR,textG,textB]
const BOX_PALETTE: Array<{
  bg: [number, number, number];
  border: [number, number, number];
  accent: [number, number, number];
}> = [
  { bg: [235, 244, 255], border: [180, 206, 245], accent: [60, 110, 220] }, // sky
  { bg: [240, 235, 255], border: [200, 188, 240], accent: [110, 80, 210] }, // lavender
  { bg: [233, 248, 240], border: [176, 220, 196], accent: [40, 145, 110] }, // mint
  { bg: [255, 243, 232], border: [245, 210, 175], accent: [200, 120, 40] }, // peach
  { bg: [255, 235, 240], border: [245, 195, 210], accent: [210, 70, 120] }, // rose
  { bg: [240, 240, 245], border: [205, 205, 215], accent: [80, 90, 120] }, // slate
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

  const imageFormat = (img: string): "PNG" | "JPEG" | "WEBP" => {
    if (img.startsWith("data:image/jpeg") || img.startsWith("data:image/jpg")) return "JPEG";
    if (img.startsWith("data:image/webp")) return "WEBP";
    return "PNG";
  };

  const drawImageError = (y: number, msg?: string): number => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(180, 50, 60);
    const note = msg
      ? `Educational image could not be generated. ${msg}`
      : "Educational image could not be generated.";
    const lines = pdf.splitTextToSize(note, contentW);
    pdf.text(lines, margin, y + 8);
    return y + lines.length * 12 + 8;
  };

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

  // Draw a small inline image card below a paragraph only when a verified image exists.
  const drawInlineImageCard = (
    y: number,
    img: string | null,
    caption: string,
    palette: (typeof BOX_PALETTE)[number],
    subject: string,
  ): number => {
    if (!img) return y;
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
    try {
      pdf.addImage(img, imageFormat(img), margin + 8, y + 8, contentW - 16, imgH, undefined, "FAST");
    } catch {
      return y;
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
  // Cover hero — render only verified preview image data.
  let coverDrawn = false;
  if (coverImg) {
    try {
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(220, 228, 245);
      pdf.roundedRect(margin - 6, 54, contentW + 12, 220, 14, 14, "FD");
      pdf.addImage(coverImg, imageFormat(coverImg), margin, 60, contentW, 208, undefined, "FAST");
      coverDrawn = true;
    } catch {
      coverDrawn = false;
    }
  }
  if (!coverDrawn) {
    const firstErr = doc.pages.find((p) => p.imageError)?.imageError;
    if (firstErr) drawImageError(80, firstErr);
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

    // Illustration — only render after verified image data exists.
    {
      const img = pageImgs[pIdx];
      const imgH = 180;
      if (img) {
        try {
          pdf.setFillColor(248, 250, 255);
          pdf.setDrawColor(220, 228, 245);
          pdf.roundedRect(margin, y, contentW, imgH + 12, 12, 12, "FD");
          pdf.addImage(img, imageFormat(img), margin + 6, y + 6, contentW - 12, imgH, undefined, "FAST");
          y += imgH + 24;
        } catch {
          y = drawImageError(y, page.imageError || "Could not embed image into PDF.");
        }
      } else {
        y = drawImageError(
          y,
          page.imageError || "No image returned by the built-in image model for this topic.",
        );
      }
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

    // Do not fill empty space with decorative or placeholder images.
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
