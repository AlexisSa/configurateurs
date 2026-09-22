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

const MARGIN = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 285;
const BODY_BOTTOM = 268;
const IMG_COL_W = 16;
const IMG_FRAME = 12;

function setFill(doc: jsPDF, c: Rgb) {
  doc.setFillColor(c.r, c.g, c.b);
}
function setText(doc: jsPDF, c: Rgb) {
  doc.setTextColor(c.r, c.g, c.b);
}
function setDraw(doc: jsPDF, c: Rgb) {
  doc.setDrawColor(c.r, c.g, c.b);
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
  const titleWidth = pdf.getTextWidth(doc.title);
  pdf.text(doc.title, PAGE_W - MARGIN - titleWidth, 12);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  const dateLabel = formatIssuedAt(doc.issuedAt);
  const dateWidth = pdf.getTextWidth(dateLabel);
  pdf.text(dateLabel, PAGE_W - MARGIN - dateWidth, 17.5);

  let y = 36;
  const hero = doc.heroImageUrl ? images.get(doc.heroImageUrl) : null;
  const heroSize = 28;
  const textLeft = hero ? MARGIN + heroSize + 6 : MARGIN;

  if (hero) {
    setFill(pdf, COLORS.surface);
    setDraw(pdf, COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y - 2, heroSize, heroSize, 1.5, 1.5, "FD");
    drawContainedImage(pdf, hero, MARGIN + 2, y, heroSize - 4);
  }

  if (doc.subtitle) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    setText(pdf, COLORS.text);
    pdf.text(doc.subtitle, textLeft, y + 6);
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  setText(pdf, COLORS.muted);
  const tariff = doc.tariffLabel ?? `Grille ${doc.clientTariffCode}`;
  pdf.text(`${tariff}  ·  ${doc.configuratorId}`, textLeft, y + 12);

  return y + (hero ? heroSize + 6 : 10);
}

function drawMeta(
  pdf: jsPDF,
  doc: PdfQuoteDocument,
  startY: number,
): number {
  if (!doc.meta?.length) return startY;

  const rows = doc.meta;
  const lineH = 5.5;
  const boxH = 8 + rows.length * lineH;
  let y = ensureSpace(pdf, startY, boxH + 4);

  setFill(pdf, COLORS.brandTint);
  setDraw(pdf, COLORS.border);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(MARGIN, y, CONTENT_W, boxH, 1.5, 1.5, "FD");

  let rowY = y + 6;
  for (const entry of rows) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    setText(pdf, COLORS.muted);
    pdf.text(entry.label.toUpperCase(), MARGIN + 4, rowY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    setText(pdf, COLORS.text);
    const labelW = 48;
    const valueLines = pdf.splitTextToSize(
      entry.value,
      CONTENT_W - labelW - 10,
    ) as string[];
    pdf.text(valueLines, MARGIN + 4 + labelW, rowY);
    rowY += Math.max(lineH, valueLines.length * 4);
  }

  return y + boxH + 6;
}

function drawTable(
  pdf: jsPDF,
  lines: PdfQuoteLine[],
  startY: number,
  images: Map<string, PdfImageAsset>,
): number {
  const colImg = MARGIN + 2;
  const colSku = MARGIN + IMG_COL_W + 2;
  const colSkuW = 34;
  const colLabel = colSku + colSkuW + 2;
  const colQty = MARGIN + CONTENT_W - 58;
  const colUnit = MARGIN + CONTENT_W - 40;
  const colTotal = MARGIN + CONTENT_W - 3;
  const labelW = colQty - colLabel - 4;

  let y = ensureSpace(pdf, startY, 14);

  setFill(pdf, COLORS.surface);
  setDraw(pdf, COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.rect(MARGIN, y, CONTENT_W, 8, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  setText(pdf, COLORS.muted);
  pdf.text("RÉF.", colSku, y + 5.2);
  pdf.text("DÉSIGNATION", colLabel, y + 5.2);
  pdf.text("QTÉ", colQty, y + 5.2, { align: "right" });
  pdf.text("PU HT", colUnit, y + 5.2, { align: "right" });
  pdf.text("TOTAL HT", colTotal, y + 5.2, { align: "right" });
  y += 8;

  lines.forEach((line, index) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    const labelLines = pdf.splitTextToSize(line.label, labelW) as string[];
    const rowH = Math.max(IMG_FRAME + 4, 4 + labelLines.length * 4);

    y = ensureSpace(pdf, y, rowH + 1);

    if (index % 2 === 1) {
      setFill(pdf, COLORS.rowAlt);
      pdf.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }

    setDraw(pdf, COLORS.border);
    pdf.setLineWidth(0.15);
    pdf.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH);

    // Photo produit
    const asset = line.imageUrl ? images.get(line.imageUrl) : null;
    setFill(pdf, COLORS.white);
    setDraw(pdf, COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(colImg, y + (rowH - IMG_FRAME) / 2, IMG_FRAME, IMG_FRAME, 1, 1, "FD");
    if (asset) {
      drawContainedImage(
        pdf,
        asset,
        colImg + 1,
        y + (rowH - IMG_FRAME) / 2 + 1,
        IMG_FRAME - 2,
      );
    }

    // Pastille SKU
    const sku = line.ref;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    const skuW = Math.min(colSkuW - 2, pdf.getTextWidth(sku) + 3.5);
    setFill(pdf, COLORS.skuBg);
    pdf.roundedRect(colSku, y + rowH / 2 - 2.2, skuW, 4.4, 0.8, 0.8, "F");
    setText(pdf, COLORS.text);
    pdf.text(sku, colSku + 1.6, y + rowH / 2 + 0.9);

    // Désignation
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    setText(pdf, COLORS.text);
    pdf.text(labelLines, colLabel, y + 5);

    pdf.text(String(line.qty), colQty, y + 5, { align: "right" });
    setText(pdf, COLORS.muted);
    pdf.text(formatPdfPrice(line.unitPriceHT), colUnit, y + 5, {
      align: "right",
    });
    pdf.setFont("helvetica", "bold");
    setText(pdf, COLORS.text);
    pdf.text(formatPdfPrice(line.lineTotalHT), colTotal, y + 5, {
      align: "right",
    });

    y += rowH;
  });

  return y + 6;
}

function drawTotals(
  pdf: jsPDF,
  doc: PdfQuoteDocument,
  startY: number,
): number {
  const boxW = 74;
  const boxX = MARGIN + CONTENT_W - boxW;
  const hasTtc = doc.totals.totalTTC != null;
  const boxH = hasTtc ? 26 : 14;
  let y = ensureSpace(pdf, startY, boxH + 10);

  if (doc.totals.note) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    setText(pdf, COLORS.muted);
    const noteLines = pdf.splitTextToSize(
      doc.totals.note,
      CONTENT_W - boxW - 8,
    ) as string[];
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
    pdf.line(MARGIN, FOOTER_Y - 4, MARGIN + CONTENT_W, FOOTER_Y - 4);

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

    pdf.text(`${i} / ${pageCount}`, MARGIN + CONTENT_W, FOOTER_Y, {
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
