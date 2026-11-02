import { dataUrlToBytes } from "@vogwork/formats/pdf-flow";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  type IBorderOptions,
  type ParagraphChild,
} from "docx";
import { letterNumber, paragraphs, placeAndDate, tembusanList, type Kop, type Letter } from "./model";

const TWIP_PER_MM = 56.693;
const mm = (v: number) => Math.round(v * TWIP_PER_MM);
const PAGE = { A4: { width: mm(210), height: mm(297) }, F4: { width: mm(215), height: mm(330) } };
const MARGIN = { top: mm(15), right: mm(20), bottom: mm(20), left: mm(25) };

const none: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };

/**
 * Surat dinas sebagai DOCX yang bisa disunting di Word. Tata letaknya mengikuti
 * versi PDF; tabel tanpa garis dipakai untuk kop dan blok "Nomor : …".
 */
export async function renderLetterDocx(kop: Kop, letter: Letter): Promise<Blob> {
  const font = letter.font === "times" ? "Times New Roman" : "Arial";
  const size = letter.fontSize * 2;
  const contentWidth = PAGE[letter.pageSize].width - MARGIN.left - MARGIN.right;
  const rightIndent = Math.round(contentWidth * 0.55);
  const run = (text: string, opts: { bold?: boolean; underline?: boolean; size?: number } = {}) =>
    new TextRun({ text, bold: opts.bold, underline: opts.underline ? {} : undefined, size: opts.size ?? size, font });
  const para = (children: ParagraphChild[], opts: ConstructorParameters<typeof Paragraph>[0] & object = {}) =>
    new Paragraph({ spacing: { after: 0, line: 276 }, ...opts, children });

  const kopLines = [
    { text: kop.line1, size: 28, bold: true },
    { text: kop.line2, size: 32, bold: true },
    { text: kop.line3, size: 28, bold: true },
    { text: kop.address, size: 20, bold: false },
    { text: kop.contact, size: 20, bold: false },
  ].filter((l) => l.text.trim());
  const kopText = kopLines.map((l) => para([run(l.text, { bold: l.bold, size: l.size })], { alignment: AlignmentType.CENTER }));

  const blocks: (Paragraph | Table)[] = [];
  if (kop.logo) {
    const { bytes } = dataUrlToBytes(kop.logo);
    const img = await createImageBitmap(new Blob([bytes as Uint8Array<ArrayBuffer>]));
    const ratio = img.width / img.height;
    img.close();
    const width = Math.min(115, Math.round(90 * ratio));
    const logoCell = mm(30);
    blocks.push(
      new Table({
        width: { size: contentWidth, type: WidthType.DXA },
        columnWidths: [logoCell, contentWidth - logoCell * 2, logoCell],
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: logoCell, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                children: [para([new ImageRun({ type: "png", data: bytes, transformation: { width, height: Math.round(width / ratio) } })])],
              }),
              new TableCell({ width: { size: contentWidth - logoCell * 2, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children: kopText }),
              new TableCell({ width: { size: logoCell, type: WidthType.DXA }, children: [para([])] }),
            ],
          }),
        ],
      }),
    );
  } else {
    blocks.push(...kopText);
  }
  // Garis ganda tebal-tipis di bawah kop.
  blocks.push(para([], { border: { bottom: { style: BorderStyle.THICK_THIN_SMALL_GAP, size: 18, color: "000000", space: 1 } }, spacing: { after: 240 } }));

  blocks.push(para([run(placeAndDate(letter))], { indent: { left: rightIndent }, spacing: { after: 120 } }));

  const kv = (rows: [string, string][], labelWidth: number, indent = 0) =>
    new Table({
      width: { size: contentWidth - indent, type: WidthType.DXA },
      columnWidths: [labelWidth, mm(4), contentWidth - indent - labelWidth - mm(4)],
      indent: indent ? { size: indent, type: WidthType.DXA } : undefined,
      borders: noBorders,
      rows: rows.map(
        ([label, value]) =>
          new TableRow({
            children: [label, ":", value].map((text, i) => new TableCell({ width: { size: [labelWidth, mm(4), contentWidth - indent - labelWidth - mm(4)][i]!, type: WidthType.DXA }, children: [para([run(text)])] })),
          }),
      ),
    });

  blocks.push(
    kv(
      [
        ["Nomor", letterNumber(letter)],
        ["Sifat", letter.sifat],
        ["Lampiran", letter.lampiran],
        ["Hal", letter.hal],
      ],
      mm(22),
    ),
  );
  blocks.push(para([], { spacing: { after: 240 } }));

  for (const line of letter.recipient.split("\n").filter((l) => l.trim())) blocks.push(para([run(line)]));
  if (letter.recipientAddress.trim()) blocks.push(para([run(letter.recipientAddress)]));
  blocks.push(para([], { spacing: { after: 240 } }));

  const bodyPara = (text: string) => para([run(text)], { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: mm(12.5) }, spacing: { after: 120, line: 336 } });
  if (letter.opening.trim()) blocks.push(para([run(letter.opening)], { spacing: { after: 120 } }));
  paragraphs(letter.body).forEach((p) => blocks.push(bodyPara(p)));
  const details = letter.details.filter((d) => d.label.trim() || d.value.trim());
  if (details.length > 0) {
    blocks.push(kv(details.map((d) => [d.label, d.value]), mm(32), mm(12.5)));
    blocks.push(para([], { spacing: { after: 120 } }));
  }
  paragraphs(letter.closing).forEach((p) => blocks.push(bodyPara(p)));

  const sign = (children: ParagraphChild[], after = 0) =>
    para(children, { alignment: AlignmentType.CENTER, indent: { left: rightIndent }, spacing: { after }, keepNext: true });
  blocks.push(para([], { spacing: { after: 240 } }));
  blocks.push(sign([run(letter.signerTitle)], mm(22)));
  blocks.push(sign([run(letter.signerName, { bold: true, underline: true })]));
  if (letter.signerRank.trim()) blocks.push(sign([run(letter.signerRank)]));
  if (letter.signerNip.trim()) blocks.push(sign([run(letter.signerNip)]));

  const tembusan = tembusanList(letter.tembusan);
  if (tembusan.length > 0) {
    blocks.push(para([], { spacing: { after: 360 } }));
    blocks.push(para([run("Tembusan:", { size: size - 2 })]));
    tembusan.forEach((item, i) => blocks.push(para([run(`${i + 1}. ${item}`, { size: size - 2 })])));
  }

  const doc = new Document({
    creator: "VogWork",
    title: letter.hal || "Surat Dinas",
    styles: { default: { document: { run: { font, size } } } },
    sections: [{ properties: { page: { size: PAGE[letter.pageSize], margin: MARGIN } }, children: blocks }],
  });
  return Packer.toBlob(doc);
}
