import jsPDF from "jspdf";
import type { GeneratedDoc } from "./ai.functions";

function imageUrl(query: string, w = 1024, h = 576) {
  const q = (query || "education illustration").trim();
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    q + ", clean educational illustration, flat vector, soft pastel colors, white background",
  )}?width=${w}&height=${h}&nologo=true&model=flux`;
}

async function fetchImage(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const blob = await res.blob();
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

export async function exportDocToPDF(doc: GeneratedDoc) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  // Pre-fetch all images in parallel
  const coverQ = doc.coverImageQuery || doc.title;
  const imagePromises = [
    fetchImage(imageUrl(coverQ, 1024, 768)),
    ...doc.pages.map((p) => fetchImage(imageUrl(p.imageQuery || p.title, 1024, 480))),
  ];
  const [coverImg, ...pageImgs] = await Promise.all(imagePromises);

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

  // ===== Cover =====
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, pageH, "F");
  // top gradient band
  for (let i = 0; i < 220; i++) {
    const ratio = i / 220;
    const r = Math.round(80 + (40 - 80) * ratio);
    const g = Math.round(120 + (90 - 120) * ratio);
    const b = Math.round(240 + (220 - 240) * ratio);
    pdf.setFillColor(r, g, b);
    pdf.rect(0, i, pageW, 1, "F");
  }
  if (coverImg) {
    try {
      pdf.addImage(coverImg, "JPEG", margin, 60, contentW, 200, undefined, "FAST");
    } catch {}
  }
  pdf.setTextColor(20, 25, 50);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(32);
  const titleLines = pdf.splitTextToSize(doc.title, contentW);
  pdf.text(titleLines, margin, 300);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.setTextColor(80, 95, 140);
  pdf.text(doc.subject || "Study Material", margin, 300 + titleLines.length * 32 + 8);
  pdf.setFontSize(11);
  pdf.setTextColor(95, 105, 130);
  const summary = pdf.splitTextToSize(doc.summary || "", contentW);
  pdf.text(summary, margin, 300 + titleLines.length * 32 + 36);
  pdf.setFontSize(9);
  pdf.setTextColor(140, 150, 170);
  pdf.text("Generated with Nexora AI · nexora.ai", margin, pageH - 30);

  // ===== Pages =====
  doc.pages.forEach((page, pIdx) => {
    pdf.addPage();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageW, pageH, "F");
    drawHeader(doc.subject || "");
    let y = 50;

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

    // Illustration
    const img = pageImgs[pIdx];
    if (img) {
      try {
        const imgH = 170;
        pdf.addImage(img, "JPEG", margin, y, contentW, imgH, undefined, "FAST");
        y += imgH + 16;
      } catch {}
    }

    // Sections
    for (const sec of page.sections) {
      if (y > pageH - 100) {
        pdf.addPage();
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageW, pageH, "F");
        drawHeader(doc.subject || "");
        y = 50;
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(50, 70, 180);
      const h = pdf.splitTextToSize(sec.heading, contentW);
      pdf.text(h, margin, y);
      y += h.length * 16 + 4;
      if (sec.paragraph) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(40, 45, 70);
        const p = pdf.splitTextToSize(sec.paragraph, contentW);
        if (y + p.length * 15 > pageH - 60) {
          pdf.addPage();
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pageW, pageH, "F");
          drawHeader(doc.subject || "");
          y = 50;
        }
        pdf.text(p, margin, y);
        y += p.length * 15 + 6;
      }
      if (sec.bullets?.length) {
        pdf.setFontSize(11);
        pdf.setTextColor(40, 45, 70);
        for (const b of sec.bullets) {
          const wrapped = pdf.splitTextToSize("•  " + b, contentW - 10);
          if (y + wrapped.length * 14 > pageH - 60) {
            pdf.addPage();
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageW, pageH, "F");
            drawHeader(doc.subject || "");
            y = 50;
          }
          pdf.text(wrapped, margin + 6, y);
          y += wrapped.length * 14 + 2;
        }
        y += 6;
      }
    }
    drawFooter(pIdx + 2);
  });

  // ===== Concepts & questions =====
  pdf.addPage();
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, pageH, "F");
  drawHeader(doc.subject || "");
  let y = 60;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(20, 25, 50);
  pdf.text("Key Concepts & Questions", margin, y);
  y += 30;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(50, 70, 180);
  pdf.text("Key Concepts", margin, y);
  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(40, 45, 70);
  for (const c of doc.keyConcepts || []) {
    const w = pdf.splitTextToSize("•  " + c, contentW - 10);
    pdf.text(w, margin + 6, y);
    y += w.length * 14 + 2;
  }
  y += 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(50, 70, 180);
  pdf.text("Important Questions", margin, y);
  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(40, 45, 70);
  (doc.keyQuestions || []).forEach((q, i) => {
    const w = pdf.splitTextToSize(`${i + 1}.  ${q}`, contentW - 10);
    if (y + w.length * 14 > pageH - 60) {
      pdf.addPage();
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageW, pageH, "F");
      drawHeader(doc.subject || "");
      y = 60;
    }
    pdf.text(w, margin + 6, y);
    y += w.length * 14 + 4;
  });

  const safe = doc.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "nexora";
  pdf.save(`${safe}.pdf`);
}
