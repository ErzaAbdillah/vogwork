import { embedDataUrlImage, MM, PAGE_SIZES, PdfFlow } from "@vogwork/formats/pdf-flow";
import { letterNumber, paragraphs, placeAndDate, tembusanList, type Kop, type Letter } from "./model";

const LOGO_HEIGHT = 24 * MM;
const INDENT = 12.5 * MM;

/** Menyusun surat dinas sebagai PDF: kop, nomor, isi, penandatangan, tembusan. */
export async function renderLetterPdf(kop: Kop, letter: Letter): Promise<Uint8Array> {
  const flow = await PdfFlow.create({
    size: PAGE_SIZES[letter.pageSize],
    marginMm: { top: 15, right: 20, bottom: 20, left: 25 },
    family: letter.font,
    fontSize: letter.fontSize,
    title: letter.hal || "Surat Dinas",
  });
  const size = letter.fontSize;
  const left = flow.margin.left;
  const width = flow.contentWidth;

  // Kop surat
  const kopTop = flow.cursor;
  let logoWidth = 0;
  if (kop.logo) {
    const logo = await embedDataUrlImage(flow.doc, kop.logo);
    logoWidth = Math.min(LOGO_HEIGHT * (logo.width / logo.height), 30 * MM);
    flow.imageAt(logo, left, kopTop, logoWidth, logoWidth / (logo.width / logo.height));
  }
  const textX = left + (logoWidth ? logoWidth + 3 * MM : 0);
  const textWidth = width - (logoWidth ? (logoWidth + 3 * MM) * 2 : 0);
  const lines = [
    { text: kop.line1, size: 14, bold: true },
    { text: kop.line2, size: 16, bold: true },
    { text: kop.line3, size: 14, bold: true },
    { text: kop.address, size: 10, bold: false },
    { text: kop.contact, size: 10, bold: false },
  ].filter((l) => l.text.trim());
  for (const line of lines) {
    flow.text(line.text, { x: textX, width: textWidth, size: line.size, bold: line.bold, align: "center", lineHeight: 1.2 });
  }
  flow.cursor = Math.max(flow.cursor, kopTop + (kop.logo ? LOGO_HEIGHT : 0)) + 2 * MM;
  flow.rule({ thickness: 2, double: true });
  flow.moveDown(6 * MM);

  // Tempat dan tanggal di kolom kanan, lalu blok nomor.
  const rightX = left + width * 0.55;
  const rightWidth = width * 0.45;
  flow.text(placeAndDate(letter), { x: rightX, width: rightWidth, size });
  flow.moveDown(2 * MM);
  flow.keyValue(
    [
      ["Nomor", letterNumber(letter)],
      ["Sifat", letter.sifat],
      ["Lampiran", letter.lampiran],
      ["Hal", letter.hal],
    ],
    { labelWidth: 22 * MM, size },
  );
  flow.moveDown(6 * MM);

  // Tujuan
  for (const line of letter.recipient.split("\n").filter((l) => l.trim())) flow.text(line, { size });
  if (letter.recipientAddress.trim()) flow.text(letter.recipientAddress, { size });
  flow.moveDown(6 * MM);

  // Isi
  if (letter.opening.trim()) {
    flow.text(letter.opening, { size });
    flow.moveDown(2 * MM);
  }
  const body = paragraphs(letter.body);
  body.forEach((p) => {
    flow.text(p, { size, align: "justify", indent: INDENT, lineHeight: 1.45 });
    flow.moveDown(2 * MM);
  });
  if (letter.details.length > 0) {
    flow.keyValue(
      letter.details.filter((d) => d.label.trim() || d.value.trim()).map((d) => [d.label, d.value]),
      { x: left + INDENT, width: width - INDENT, labelWidth: 32 * MM, size },
    );
    flow.moveDown(3 * MM);
  }
  for (const p of paragraphs(letter.closing)) {
    flow.text(p, { size, align: "justify", indent: INDENT, lineHeight: 1.45 });
    flow.moveDown(2 * MM);
  }

  // Penandatangan: dijaga tetap utuh di satu halaman.
  flow.moveDown(6 * MM);
  flow.ensureSpace(size * 1.3 * 4 + 22 * MM);
  flow.text(letter.signerTitle, { x: rightX, width: rightWidth, size, align: "center" });
  flow.moveDown(22 * MM);
  flow.text(letter.signerName, { x: rightX, width: rightWidth, size, align: "center", bold: true, underline: true });
  if (letter.signerRank.trim()) flow.text(letter.signerRank, { x: rightX, width: rightWidth, size, align: "center" });
  if (letter.signerNip.trim()) flow.text(letter.signerNip, { x: rightX, width: rightWidth, size, align: "center" });

  const tembusan = tembusanList(letter.tembusan);
  if (tembusan.length > 0) {
    flow.moveDown(8 * MM);
    flow.ensureSpace((tembusan.length + 1) * size * 1.3);
    flow.text("Tembusan:", { size: size - 1 });
    tembusan.forEach((item, i) => flow.text(`${i + 1}. ${item}`, { size: size - 1, hanging: 0 }));
  }

  flow.pageNumbers();
  return flow.save();
}
