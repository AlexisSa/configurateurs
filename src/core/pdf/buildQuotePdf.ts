import { jsPDF } from "jspdf";
import { loadPdfImages, type PdfImageAsset } from "./loadPdfImage";
import type { PdfQuoteDocument, PdfQuoteLine } from "./types";

/** Palette alignée tokens Xeilom (--brand #363bc7, zinc). */
const COLORS = {
  brand: { r: 54, g: 59, b: 199 },
  brandTint: { r: 241, g: 242, b: 254 },
  text: { r: 24, g: 24, b: 27 },
  muted: { r: 113, g: 113, b: 122 },
  subtle: { r: 161, g: 161, b: 170 },
  border: { r: 228, g: 228, b: 231 },
  surface: { r: 250, g: 250, b: 251 },
  rowAlt: { r: 247, g: 247, b: 248 },
  skuBg: { r: 243, g: 244, b: 246 },
  white: { r: 255, g: 255, b: 255 },
} as const;

type Rgb = (typeof COLORS)[keyof typeof COLORS];

type Col = { x: number; w: number; align?: "left" | "center" | "right" };

type TableLayout = {
  img: Col;
  ref: Col;
  label: Col;
  qty: Col;
  unit: Col;
  total: Col;
};

const MARGIN = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_RIGHT = MARGIN + CONTENT_W;
const FOOTER_Y = 285;
const BODY_BOTTOM = 268;
const TABLE_PAD = 3;
const TABLE_LEFT = MARGIN + TABLE_PAD;
const TABLE_RIGHT = CONTENT_RIGHT - TABLE_PAD;
const COL_GAP = 3;
const IMG_COL_W = 18;
const IMG_FRAME = 14;
const IMG_PAD = 1.2;
const LINE_H = 4.2;

function setFill(doc: jsPDF, c: Rgb) {
  doc.setFillColor(c.r, c.g, c.b);
}
function setText(doc: jsPDF, c: Rgb) {
  doc.setTextColor(c.r, c.g, c.b);
}
function setDraw(doc: jsPDF, c: Rgb) {
  doc.setDrawColor(c.r, c.g, c.b);
}

function textW(doc: jsPDF, text: string): number {
  return doc.getTextWidth(text);
}

/** Prix lisibles jsPDF (virgule FR, pas d’espace fine Unicode). */
export function formatPdfPrice(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const [intPart, decPart] = amount.toFixed(2).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped},${decPart} €`;
}

function formatIssuedAt(value?: Date | string): string {
  const date =
    value instanceof Date
      ? value
      : value
        ? new Date(value)
        : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString("fr-FR");
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ensureSpace(doc: jsPDF, y: number, need: number): number {
  if (y + need <= BODY_BOTTOM) return y;
  doc.addPage();
  return MARGIN + 8;
}

function drawContainedImage(
  pdf: jsPDF,
  asset: PdfImageAsset,
  x: number,
  y: number,
  frame: number,
): void {
  const ratio = asset.width / Math.max(1, asset.height);
  let w = frame;
  let h = frame;
  if (ratio >= 1) {
    h = frame / ratio;
  } else {
    w = frame * ratio;
  }
  const ox = x + (frame - w) / 2;
  const oy = y + (frame - h) / 2;
  pdf.addImage(asset.dataUrl, "PNG", ox, oy, w, h);
}

function drawCol(doc: jsPDF, col: Col, y: number, text: string) {
  const align = col.align ?? "left";
  const x =
    align === "right"
      ? col.x + col.w
      : align === "center"
        ? col.x + col.w / 2
        : col.x;
  doc.text(text, x, y, { align });
}

/**
 * Colonnes mesurées pour éviter tout chevauchement SKU / libellé / prix.
 */
function measureTableLayout(doc: jsPDF, lines: PdfQuoteLine[]): TableLayout {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  let refW = textW(doc, "RÉF.");
  for (const line of lines) {
    refW = Math.max(refW, textW(doc, line.ref) + 6);
  }
  refW = Math.min(Math.max(refW, 22), 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  let qtyW = textW(doc, "QTÉ");
  for (const line of lines) {
    qtyW = Math.max(qtyW, textW(doc, String(line.qty)));
  }
  qtyW = Math.max(qtyW + 4, 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  let unitW = textW(doc, "PU HT");
  let totalW = textW(doc, "TOTAL HT");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  for (const line of lines) {
    unitW = Math.max(unitW, textW(doc, formatPdfPrice(line.unitPriceHT)));
    doc.setFont("helvetica", "bold");
    totalW = Math.max(totalW, textW(doc, formatPdfPrice(line.lineTotalHT)));
    doc.setFont("helvetica", "normal");
  }
  unitW += 4;
  totalW += 4;

  const total: Col = { x: TABLE_RIGHT - totalW, w: totalW, align: "right" };
  const unit: Col = {
    x: total.x - COL_GAP - unitW,
    w: unitW,
    align: "right",
  };
  const qty: Col = {
    x: unit.x - COL_GAP - qtyW,
    w: qtyW,
    align: "right",
  };
  const img: Col = { x: TABLE_LEFT, w: IMG_COL_W };
  const ref: Col = { x: img.x + img.w + COL_GAP, w: refW };
  const label: Col = {
    x: ref.x + ref.w + COL_GAP,
    w: Math.max(18, qty.x - COL_GAP - (ref.x + ref.w + COL_GAP)),
  };

  return { img, ref, label, qty, unit, total };
}

/**
 * Génère un Blob PDF (charge les images distantes si présentes).
 */
export async function buildQuotePdfBlob(
  docData: PdfQuoteDocument,
): Promise<Blob> {
  const imageUrls = [
    docData.heroImageUrl,
    ...docData.lines.map((line) => line.imageUrl),
  ];
  const images = await loadPdfImages(imageUrls);

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = drawHeader(pdf, docData, images);
  y = drawMeta(pdf, docData, y);
  y = drawTable(pdf, docData.lines, y, images);
  drawTotals(pdf, docData, y);
  drawFooters(pdf, docData);

  return pdf.output("blob");
}

function drawHeader(
  pdf: jsPDF,
  doc: PdfQuoteDocument,
  images: Map<string, PdfImageAsset>,
): number {
  setFill(pdf, COLORS.brand);
  pdf.rect(0, 0, PAGE_W, 28, "F");

  setText(pdf, COLORS.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("XEILOM", MARGIN, 12);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Cabling expert", MARGIN, 17.5);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  const titleLines = pdf.splitTextToSize(doc.title, 90) as string[];
  pdf.text(titleLines, PAGE_W - MARGIN, 11, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  const dateLabel = formatIssuedAt(doc.issuedAt);
  pdf.text(dateLabel, PAGE_W - MARGIN, 11 + titleLines.length * 4.2, {
    align: "right",
  });

  let y = 36;
  const hero = doc.heroImageUrl ? images.get(doc.heroImageUrl) : null;
  const heroSize = 28;
  const textLeft = hero ? MARGIN + heroSize + 6 : MARGIN;
  const textMaxW = CONTENT_W - (hero ? heroSize + 6 : 0);

  if (hero) {
    setFill(pdf, COLORS.surface);
    setDraw(pdf, COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y - 2, heroSize, heroSize, 1.5, 1.5, "FD");
    drawContainedImage(pdf, hero, MARGIN + 2, y, heroSize - 4);
  }

  let textY = y + 6;
  if (doc.subtitle) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    setText(pdf, COLORS.text);
    const subLines = pdf.splitTextToSize(doc.subtitle, textMaxW) as string[];
    pdf.text(subLines, textLeft, textY);
    textY += subLines.length * 5;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  setText(pdf, COLORS.muted);
  const tariff = doc.tariffLabel ?? `Grille ${doc.clientTariffCode}`;
  const tariffLines = pdf.splitTextToSize(
    `${tariff}  ·  ${doc.configuratorId}`,
    textMaxW,
  ) as string[];
  pdf.text(tariffLines, textLeft, textY);

  const textBlockH = textY - y + tariffLines.length * 4 + 2;
  return y + Math.max(hero ? heroSize + 4 : 8, textBlockH) + 4;
}

function drawMeta(
  pdf: jsPDF,
  doc: PdfQuoteDocument,
  startY: number,
): number {
  if (!doc.meta?.length) return startY;

  const labelW = 48;
  const valueMaxW = CONTENT_W - labelW - 12;
  const lineH = 5.5;

  const measured = doc.meta.map((entry) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const valueLines = pdf.splitTextToSize(entry.value, valueMaxW) as string[];
    return {
      entry,
      valueLines,
      h: Math.max(lineH, valueLines.length * 4.2),
    };
  });

  const boxH = 6 + measured.reduce((sum, row) => sum + row.h, 0) + 2;
  let y = ensureSpace(pdf, startY, boxH + 4);

  setFill(pdf, COLORS.brandTint);
  setDraw(pdf, COLORS.border);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(MARGIN, y, CONTENT_W, boxH, 1.5, 1.5, "FD");

  let rowY = y + 6;
  for (const row of measured) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    setText(pdf, COLORS.muted);
    pdf.text(row.entry.label.toUpperCase(), MARGIN + 4, rowY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    setText(pdf, COLORS.text);
    pdf.text(row.valueLines, MARGIN + 4 + labelW, rowY);
    rowY += row.h;
  }

  return y + boxH + 6;
}

function measureRowHeight(
  pdf: jsPDF,
  line: PdfQuoteLine,
  layout: TableLayout,
): number {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  const labelLines = pdf.splitTextToSize(line.label, layout.label.w) as string[];
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  const skuLines = pdf.splitTextToSize(line.ref, layout.ref.w - 4) as string[];
  const contentH = Math.max(
    skuLines.length * 3.6 + 4,
    labelLines.length * LINE_H + 2,
  );
  return Math.max(IMG_FRAME + 4, contentH);
}

function drawTable(
  pdf: jsPDF,
  lines: PdfQuoteLine[],
  startY: number,
  images: Map<string, PdfImageAsset>,
): number {
  if (lines.length === 0) return startY;

  const layout = measureTableLayout(pdf, lines);
  let y = ensureSpace(pdf, startY, 14);

  setFill(pdf, COLORS.surface);
  setDraw(pdf, COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.rect(MARGIN, y, CONTENT_W, 8, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  setText(pdf, COLORS.muted);
  pdf.text("RÉF.", layout.ref.x, y + 5.2);
  pdf.text("DÉSIGNATION", layout.label.x, y + 5.2);
  drawCol(pdf, layout.qty, y + 5.2, "QTÉ");
  drawCol(pdf, layout.unit, y + 5.2, "PU HT");
  drawCol(pdf, layout.total, y + 5.2, "TOTAL HT");
  y += 8;

  lines.forEach((line, index) => {
    const rowH = measureRowHeight(pdf, line, layout);
    y = ensureSpace(pdf, y, rowH + 1);

    if (index % 2 === 1) {
      setFill(pdf, COLORS.rowAlt);
      pdf.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }

    setDraw(pdf, COLORS.border);
    pdf.setLineWidth(0.15);
    pdf.line(MARGIN, y + rowH, CONTENT_RIGHT, y + rowH);

    // Photo
    const frameX = layout.img.x + (layout.img.w - IMG_FRAME) / 2;
    const frameY = y + (rowH - IMG_FRAME) / 2;
    setFill(pdf, COLORS.white);
    setDraw(pdf, COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(frameX, frameY, IMG_FRAME, IMG_FRAME, 1, 1, "FD");
    const asset = line.imageUrl ? images.get(line.imageUrl) : null;
    if (asset) {
      drawContainedImage(
        pdf,
        asset,
        frameX + IMG_PAD,
        frameY + IMG_PAD,
        IMG_FRAME - IMG_PAD * 2,
      );
    }

    // SKU (peut wraper dans la colonne dédiée)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    const skuLines = pdf.splitTextToSize(line.ref, layout.ref.w - 4) as string[];
    const skuBlockH = skuLines.length * 3.6 + 2.4;
    const skuTop = y + (rowH - skuBlockH) / 2;
    setFill(pdf, COLORS.skuBg);
    pdf.roundedRect(layout.ref.x, skuTop, layout.ref.w - 1, skuBlockH, 0.8, 0.8, "F");
    setText(pdf, COLORS.text);
    pdf.text(skuLines, layout.ref.x + 1.5, skuTop + 3.2);

    // Désignation
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    setText(pdf, COLORS.text);
    const labelLines = pdf.splitTextToSize(
      line.label,
      layout.label.w,
    ) as string[];
    const labelBlockH = labelLines.length * LINE_H;
    let labelY = y + (rowH - labelBlockH) / 2 + 3.2;
    for (const part of labelLines) {
      pdf.text(part, layout.label.x, labelY);
      labelY += LINE_H;
    }

    const numY = y + rowH / 2 + 1;
    setText(pdf, COLORS.text);
    drawCol(pdf, layout.qty, numY, String(line.qty));
    setText(pdf, COLORS.muted);
    drawCol(pdf, layout.unit, numY, formatPdfPrice(line.unitPriceHT));
    pdf.setFont("helvetica", "bold");
    setText(pdf, COLORS.text);
    drawCol(pdf, layout.total, numY, formatPdfPrice(line.lineTotalHT));

    y += rowH;
  });

  return y + 6;
}

function drawTotals(
  pdf: jsPDF,
  doc: PdfQuoteDocument,
  startY: number,
): number {
  const boxW = 78;
  const boxX = CONTENT_RIGHT - boxW;
  const hasTtc = doc.totals.totalTTC != null;
  const boxH = hasTtc ? 26 : 14;
  let y = ensureSpace(pdf, startY, boxH + 12);

  if (doc.totals.note) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    setText(pdf, COLORS.muted);
    const noteMaxW = Math.max(40, CONTENT_W - boxW - 10);
    const noteLines = pdf.splitTextToSize(doc.totals.note, noteMaxW) as string[];
    pdf.text(noteLines, MARGIN, y + 5);
  }

  setFill(pdf, COLORS.surface);
  setDraw(pdf, COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(boxX, y, boxW, boxH, 1.5, 1.5, "FD");

  let rowY = y + 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  setText(pdf, COLORS.muted);
  pdf.text("Total HT", boxX + 4, rowY);
  pdf.setFont("helvetica", "bold");
  setText(pdf, COLORS.text);
  pdf.text(formatPdfPrice(doc.totals.totalHT), boxX + boxW - 4, rowY, {
    align: "right",
  });

  if (hasTtc) {
    rowY += 4;
    setDraw(pdf, COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.line(boxX + 3, rowY, boxX + boxW - 3, rowY);

    rowY += 7;
    const vatPct =
      doc.totals.vatRate != null
        ? Math.round(doc.totals.vatRate * 100)
        : 20;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    setText(pdf, COLORS.brand);
    pdf.text(`TTC · TVA ${vatPct} %`, boxX + 4, rowY);
    pdf.setFontSize(11);
    pdf.text(formatPdfPrice(doc.totals.totalTTC), boxX + boxW - 4, rowY, {
      align: "right",
    });
  }

  return y + boxH + 8;
}

function drawFooters(pdf: jsPDF, doc: PdfQuoteDocument): void {
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    pdf.setPage(i);

    setDraw(pdf, COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, FOOTER_Y - 4, CONTENT_RIGHT, FOOTER_Y - 4);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    setText(pdf, COLORS.subtle);

    if (doc.footerNote) {
      const lines = pdf.splitTextToSize(
        doc.footerNote,
        CONTENT_W - 28,
      ) as string[];
      pdf.text(lines.slice(0, 2), MARGIN, FOOTER_Y);
    }

    pdf.text(`${i} / ${pageCount}`, CONTENT_RIGHT, FOOTER_Y, {
      align: "right",
    });
  }
}

/** Télécharge le PDF dans le navigateur (async : charge les images). */
export async function downloadQuotePdf(
  doc: PdfQuoteDocument,
  filename?: string,
): Promise<void> {
  const blob = await buildQuotePdfBlob(doc);
  const name =
    filename ??
    `${doc.configuratorId}-${doc.clientTariffCode}-${Date.now()}.pdf`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name.endsWith(".pdf") ? name : `${name}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
