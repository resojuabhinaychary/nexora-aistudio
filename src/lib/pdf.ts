import jsPDF from "jspdf";
import type { GeneratedDoc } from "./ai.functions";

export function exportDocToPDF(doc: GeneratedDoc) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 56;
  const contentW = pageW - margin * 2;

  const drawHeader = (subject: string) => {
    pdf.setFillColor(15, 12, 28);
    pdf.rect(0, 0, pageW, 28, "F");
    pdf.setFontSize(9);
    pdf.setTextColor(180, 170, 220);
    pdf.text("NEXORA AI", margin, 18);
    pdf.text(subject, pageW - margin, 18, { align: "right" });
  };

  // Cover
  pdf.setFillColor(15, 12, 28);
  pdf.rect(0, 0, pageW, pageH, "F");
  pdf.setFillColor(110, 70, 220);
  pdf.circle(pageW - 60, 80, 120, "F");
  pdf.setFillColor(60, 90, 220);
  pdf.circle(40, pageH - 80, 100, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(34);
  const titleLines = pdf.splitTextToSize(doc.title, contentW);
  pdf.text(titleLines, margin, pageH / 2 - 40);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.setTextColor(200, 190, 230);
  pdf.text(doc.subject, margin, pageH / 2 + 20);
  pdf.setFontSize(10);
  pdf.setTextColor(160, 150, 200);
  const summary = pdf.splitTextToSize(doc.summary, contentW);
  pdf.text(summary, margin, pageH / 2 + 50);

  for (const page of doc.pages) {
    pdf.addPage();
    pdf.setFillColor(252, 251, 255);
    pdf.rect(0, 0, pageW, pageH, "F");
    drawHeader(doc.subject);
    let y = 70;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(30, 25, 55);
    const t = pdf.splitTextToSize(page.title, contentW);
    pdf.text(t, margin, y);
    y += t.length * 26 + 6;
    if (page.subtitle) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(110, 100, 140);
      const s = pdf.splitTextToSize(page.subtitle, contentW);
      pdf.text(s, margin, y);
      y += s.length * 14 + 8;
    }
    // accent rule
    pdf.setDrawColor(140, 100, 230);
    pdf.setLineWidth(2);
    pdf.line(margin, y, margin + 60, y);
    y += 18;

    for (const sec of page.sections) {
      if (y > pageH - 80) {
        pdf.addPage();
        pdf.setFillColor(252, 251, 255);
        pdf.rect(0, 0, pageW, pageH, "F");
        drawHeader(doc.subject);
        y = 70;
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(60, 40, 140);
      const h = pdf.splitTextToSize(sec.heading, contentW);
      pdf.text(h, margin, y);
      y += h.length * 16 + 4;
      if (sec.paragraph) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(40, 35, 60);
        const p = pdf.splitTextToSize(sec.paragraph, contentW);
        pdf.text(p, margin, y);
        y += p.length * 15 + 6;
      }
      if (sec.bullets?.length) {
        pdf.setFontSize(11);
        pdf.setTextColor(40, 35, 60);
        for (const b of sec.bullets) {
          const wrapped = pdf.splitTextToSize("•  " + b, contentW - 10);
          if (y + wrapped.length * 14 > pageH - 60) {
            pdf.addPage();
            pdf.setFillColor(252, 251, 255);
            pdf.rect(0, 0, pageW, pageH, "F");
            drawHeader(doc.subject);
            y = 70;
          }
          pdf.text(wrapped, margin + 6, y);
          y += wrapped.length * 14 + 2;
        }
        y += 6;
      }
    }
  }

  // Key concepts / questions page
  pdf.addPage();
  pdf.setFillColor(252, 251, 255);
  pdf.rect(0, 0, pageW, pageH, "F");
  drawHeader(doc.subject);
  let y = 70;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(30, 25, 55);
  pdf.text("Key Concepts & Questions", margin, y);
  y += 30;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(60, 40, 140);
  pdf.text("Key Concepts", margin, y);
  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(40, 35, 60);
  for (const c of doc.keyConcepts || []) {
    const w = pdf.splitTextToSize("•  " + c, contentW - 10);
    pdf.text(w, margin + 6, y);
    y += w.length * 14 + 2;
  }
  y += 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(60, 40, 140);
  pdf.text("Important Questions", margin, y);
  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(40, 35, 60);
  (doc.keyQuestions || []).forEach((q, i) => {
    const w = pdf.splitTextToSize(`${i + 1}.  ${q}`, contentW - 10);
    if (y + w.length * 14 > pageH - 60) {
      pdf.addPage();
      pdf.setFillColor(252, 251, 255);
      pdf.rect(0, 0, pageW, pageH, "F");
      drawHeader(doc.subject);
      y = 70;
    }
    pdf.text(w, margin + 6, y);
    y += w.length * 14 + 4;
  });

  const safe = doc.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "nexora";
  pdf.save(`${safe}.pdf`);
}