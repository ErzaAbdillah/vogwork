import { formatRupiah, formatTanggal, terbilangRupiah } from "@vogwork/formats";
import { embedDataUrlImage, hexToRgb, MM, PAGE_SIZES, PdfFlow } from "@vogwork/formats/pdf-flow";
import { degrees, rgb } from "pdf-lib";
import { computeTotals, invoiceNumber, METERAI_THRESHOLD, receiptNumber, type Business, type Invoice, type Receipt } from "./model";

const ACCENT = hexToRgb("#0f766e");
const MUTED = rgb(0.38, 0.4, 0.45);
const LIGHT = hexToRgb("#ecf5f3");

function formatQty(n: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n || 0);
}

export async function renderInvoicePdf(business: Business, invoice: Invoice): Promise<Uint8Array> {
  const flow = await PdfFlow.create({ size: PAGE_SIZES.A4, marginMm: { top: 18, right: 18, bottom: 18, left: 18 }, family: "helvetica", fontSize: 10, title: `Invoice ${invoiceNumber(invoice)}` });
  const left = flow.margin.left;
  const width = flow.contentWidth;
  const right = left + width;
  const top = flow.cursor;

  // Kepala: identitas usaha di kiri, judul dan nomor di kanan.
  let textLeft = left;
  if (business.logo) {
    const logo = await embedDataUrlImage(flow.doc, business.logo);
    const h = 16 * MM;
    const w = Math.min(h * (logo.width / logo.height), 34 * MM);
    flow.imageAt(logo, left, top, w, w / (logo.width / logo.height));
    textLeft = left + w + 4 * MM;
  }
  const leftWidth = width * 0.58 - (textLeft - left);
  flow.text(business.name, { x: textLeft, width: leftWidth, size: 14, bold: true, lineHeight: 1.2 });
  for (const line of [business.address, [business.phone, business.email].filter(Boolean).join(" · "), business.npwp ? `NPWP ${business.npwp}` : ""]) {
    if (line.trim()) flow.text(line, { x: textLeft, width: leftWidth, size: 9, color: MUTED, lineHeight: 1.3 });
  }
  const leftBottom = Math.max(flow.cursor, top + (business.logo ? 16 * MM : 0));

  flow.cursor = top;
  flow.text("INVOICE", { x: left, width, size: 22, bold: true, align: "right", color: ACCENT, lineHeight: 1.1 });
  flow.moveDown(1 * MM);
  for (const [label, value] of [
    ["No.", invoiceNumber(invoice)],
    ["Tanggal", formatTanggal(invoice.date)],
    ["Jatuh tempo", formatTanggal(invoice.dueDate)],
  ] as const) {
    flow.textAt(label, right - 70 * MM, flow.cursor, { size: 9, color: MUTED });
    flow.textAt(value, right - 45 * MM, flow.cursor, { size: 9, bold: true, width: 45 * MM, align: "right" });
    flow.moveDown(9 * 1.45);
  }
  flow.cursor = Math.max(flow.cursor, leftBottom) + 5 * MM;
  flow.rule({ thickness: 1.2, color: ACCENT });
  flow.moveDown(5 * MM);

  flow.text("DITAGIHKAN KEPADA", { size: 8, bold: true, color: MUTED });
  flow.moveDown(1);
  flow.text(invoice.clientName || "-", { size: 11, bold: true });
  if (invoice.clientAddress.trim()) flow.text(invoice.clientAddress, { size: 9, color: MUTED, width: width * 0.6 });
  flow.moveDown(5 * MM);

  const items = invoice.items.filter((i) => i.description.trim() || i.price);
  flow.table({
    size: 9.5,
    padding: 5,
    headerFill: LIGHT,
    borderColor: rgb(0.85, 0.87, 0.88),
    columns: [
      { header: "No", width: 0.06, align: "center" },
      { header: "Deskripsi", width: 0.44 },
      { header: "Jumlah", width: 0.14, align: "right" },
      { header: "Harga", width: 0.17, align: "right" },
      { header: "Total", width: 0.19, align: "right" },
    ],
    rows: items.map((item, i) => [
      String(i + 1),
      item.description,
      `${formatQty(item.qty)} ${item.unit}`.trim(),
      formatRupiah(item.price),
      formatRupiah(Math.round((item.qty || 0) * (item.price || 0))),
    ]),
  });

  // Ringkasan total di kanan.
  const totals = computeTotals(invoice);
  const summary: [string, string, boolean][] = [["Subtotal", formatRupiah(totals.subtotal), false]];
  if (totals.discount) summary.push([`Diskon ${invoice.discountPercent}%`, `- ${formatRupiah(totals.discount)}`, false]);
  if (invoice.taxPercent) summary.push([`${invoice.taxLabel || "Pajak"} ${invoice.taxPercent}%`, formatRupiah(totals.tax), false]);
  summary.push(["TOTAL", formatRupiah(totals.total), true]);

  flow.moveDown(4 * MM);
  flow.ensureSpace(summary.length * 16 + 30);
  const boxX = right - 80 * MM;
  for (const [label, value, strong] of summary) {
    if (strong) {
      flow.page.drawRectangle({ x: boxX, y: flow.pageHeight - flow.cursor - 18, width: 80 * MM, height: 20, color: ACCENT });
      flow.moveDown(3);
    }
    const color = strong ? rgb(1, 1, 1) : undefined;
    flow.textAt(label, boxX + 3 * MM, flow.cursor, { size: strong ? 11 : 9.5, bold: strong, color });
    flow.textAt(value, boxX, flow.cursor, { size: strong ? 11 : 9.5, bold: true, width: 77 * MM, align: "right", color });
    flow.moveDown(strong ? 19 : 15);
  }
  flow.moveDown(3 * MM);
  flow.text(`Terbilang: ${terbilangRupiah(totals.total)}`, { size: 9, italic: true, color: MUTED });

  flow.moveDown(6 * MM);
  const infoTop = flow.cursor;
  if (business.bank.trim()) {
    flow.text("PEMBAYARAN", { size: 8, bold: true, color: MUTED, width: width * 0.55 });
    flow.text(business.bank, { size: 9.5, width: width * 0.55 });
    flow.moveDown(3 * MM);
  }
  if (invoice.notes.trim()) {
    flow.text("CATATAN", { size: 8, bold: true, color: MUTED, width: width * 0.55 });
    flow.text(invoice.notes, { size: 9.5, width: width * 0.55 });
  }
  const infoBottom = flow.cursor;

  // Tanda tangan sejajar dengan info pembayaran.
  flow.cursor = infoTop;
  const signX = left + width * 0.62;
  const signW = width * 0.38;
  flow.ensureSpace(30 * MM);
  flow.text("Hormat kami,", { x: signX, width: signW, size: 10, align: "center" });
  flow.moveDown(18 * MM);
  flow.text(business.signer || business.name, { x: signX, width: signW, size: 10, align: "center", bold: true, underline: true });
  flow.cursor = Math.max(flow.cursor, infoBottom);

  if (invoice.paid) {
    const page = flow.doc.getPages()[0]!;
    const font = flow.fonts.bold;
    page.drawText("LUNAS", { x: flow.pageWidth / 2 - 70, y: flow.pageHeight / 2 - 10, size: 64, font, color: hexToRgb("#16a34a"), opacity: 0.18, rotate: degrees(25) });
  }

  flow.pageNumbers();
  return flow.save();
}

/** Kwitansi ukuran A5 mendatar dengan terbilang dan kotak meterai bila perlu. */
export async function renderReceiptPdf(business: Business, receipt: Receipt): Promise<Uint8Array> {
  const size: [number, number] = [PAGE_SIZES.A5[1], PAGE_SIZES.A5[0]];
  const flow = await PdfFlow.create({ size, marginMm: { top: 12, right: 14, bottom: 12, left: 14 }, family: "helvetica", fontSize: 10, title: `Kwitansi ${receiptNumber(receipt)}` });
  const left = flow.margin.left;
  const width = flow.contentWidth;
  const right = left + width;

  flow.page.drawRectangle({ x: 7 * MM, y: 7 * MM, width: flow.pageWidth - 14 * MM, height: flow.pageHeight - 14 * MM, borderColor: ACCENT, borderWidth: 1.4 });
  flow.page.drawRectangle({ x: 7 * MM, y: 7 * MM, width: 5 * MM, height: flow.pageHeight - 14 * MM, color: ACCENT });

  flow.text(business.name, { size: 9, bold: true, color: MUTED });
  flow.cursor = flow.margin.top;
  flow.text(`No. ${receiptNumber(receipt)}`, { size: 9, align: "right", color: MUTED });
  flow.moveDown(2 * MM);
  flow.text("KWITANSI", { size: 20, bold: true, align: "center", color: ACCENT, lineHeight: 1.1 });
  flow.moveDown(6 * MM);

  const labelW = 38 * MM;
  const row = (label: string, draw: () => void) => {
    const y = flow.cursor;
    flow.textAt(label, left, y, { size: 10, color: MUTED });
    flow.textAt(":", left + labelW - 3 * MM, y, { size: 10, color: MUTED });
    draw();
    flow.moveDown(4 * MM);
  };
  row("Telah terima dari", () => flow.text(receipt.receivedFrom || "-", { x: left + labelW, width: width - labelW, size: 11, bold: true }));

  row("Uang sejumlah", () => {
    const words = terbilangRupiah(receipt.amount);
    const h = flow.measure(words, { size: 10.5, italic: true, width: width - labelW - 6 }) + 8;
    flow.page.drawRectangle({ x: left + labelW - 2, y: flow.pageHeight - flow.cursor - h + 3, width: width - labelW + 2, height: h, color: LIGHT });
    flow.moveDown(1.5);
    flow.text(words, { x: left + labelW + 3, width: width - labelW - 6, size: 10.5, italic: true, bold: true });
    flow.moveDown(3);
  });
  row("Untuk pembayaran", () => flow.text(receipt.purpose || "-", { x: left + labelW, width: width - labelW, size: 10.5 }));

  // Bagian bawah: nominal di kiri, tempat/tanggal dan penerima di kanan.
  const bottomTop = Math.max(flow.cursor + 4 * MM, flow.pageHeight - flow.margin.bottom - 38 * MM);
  flow.cursor = bottomTop;
  const amountText = formatRupiah(receipt.amount);
  const amountW = flow.textWidth(amountText, { size: 16, bold: true }) + 14 * MM;
  flow.page.drawRectangle({ x: left, y: flow.pageHeight - bottomTop - 14 * MM, width: amountW, height: 12 * MM, borderColor: ACCENT, borderWidth: 1.4, color: LIGHT });
  flow.textAt(amountText, left + 7 * MM, bottomTop + 2.6 * MM, { size: 16, bold: true, color: ACCENT });

  const signX = right - 62 * MM;
  const signW = 62 * MM;
  flow.text(`${receipt.place}, ${formatTanggal(receipt.date)}`, { x: signX, width: signW, size: 10, align: "center" });
  flow.text("Penerima,", { x: signX, width: signW, size: 10, align: "center" });
  if (receipt.amount > METERAI_THRESHOLD) {
    const boxTop = flow.cursor + 1.5 * MM;
    const boxW = 22 * MM;
    const boxH = 13 * MM;
    const bx = signX + 3 * MM;
    flow.page.drawRectangle({ x: bx, y: flow.pageHeight - boxTop - boxH, width: boxW, height: boxH, borderColor: MUTED, borderWidth: 0.6, borderDashArray: [2, 2] });
    flow.textAt("Meterai", bx, boxTop + 3.5 * MM, { size: 7, color: MUTED, width: boxW, align: "center" });
    flow.textAt("Rp10.000", bx, boxTop + 7 * MM, { size: 7, color: MUTED, width: boxW, align: "center" });
  }
  flow.moveDown(17 * MM);
  flow.text(receipt.receiverName || business.signer, { x: signX, width: signW, size: 10, align: "center", bold: true, underline: true });

  return flow.save();
}
