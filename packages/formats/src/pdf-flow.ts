import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { toWinAnsi } from "./winansi";

/** 1 milimeter dalam satuan poin PDF. */
export const MM = 72 / 25.4;

export const PAGE_SIZES = {
  A4: [210 * MM, 297 * MM],
  F4: [215 * MM, 330 * MM],
  Letter: [612, 792],
  A5: [148 * MM, 210 * MM],
} as const satisfies Record<string, readonly [number, number]>;

export type PageSizeName = keyof typeof PAGE_SIZES;
export type FontFamily = "times" | "helvetica" | "courier";
export type Align = "left" | "center" | "right" | "justify";

export interface FontSet {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}

const FAMILIES: Record<FontFamily, [StandardFonts, StandardFonts, StandardFonts, StandardFonts]> = {
  times: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold, StandardFonts.TimesRomanItalic, StandardFonts.TimesRomanBoldItalic],
  helvetica: [StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.HelveticaOblique, StandardFonts.HelveticaBoldOblique],
  courier: [StandardFonts.Courier, StandardFonts.CourierBold, StandardFonts.CourierOblique, StandardFonts.CourierBoldOblique],
};

export async function embedFamily(doc: PDFDocument, family: FontFamily): Promise<FontSet> {
  const [regular, bold, italic, boldItalic] = await Promise.all(FAMILIES[family].map((f) => doc.embedFont(f)));
  return { regular: regular!, bold: bold!, italic: italic!, boldItalic: boldItalic! };
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join("") : clean.padEnd(6, "0");
  const n = Number.parseInt(full.slice(0, 6), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const [header, body = ""] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(header ?? "")?.[1] ?? "application/octet-stream";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime };
}

/** Menyematkan gambar PNG atau JPEG dari data URL. Format lain harus dikonversi ke PNG dulu. */
export async function embedDataUrlImage(doc: PDFDocument, dataUrl: string): Promise<PDFImage> {
  const { bytes, mime } = dataUrlToBytes(dataUrl);
  if (mime === "image/png") return doc.embedPng(bytes);
  if (mime === "image/jpeg" || mime === "image/jpg") return doc.embedJpg(bytes);
  throw new Error(`Format gambar ${mime} tidak didukung untuk PDF; gunakan PNG atau JPG`);
}

export interface TextStyle {
  size?: number;
  bold?: boolean;
  italic?: boolean;
  color?: RGB;
  align?: Align;
  lineHeight?: number;
  /** Inden baris pertama (pt). */
  indent?: number;
  /** Inden seluruh paragraf (pt), mis. untuk isi daftar. */
  hanging?: number;
  /** Posisi dan lebar kolom teks; bawaan = area di dalam margin. */
  x?: number;
  width?: number;
  underline?: boolean;
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TableColumn {
  header: string;
  /** Pecahan dari lebar tabel; total semua kolom = 1. */
  width: number;
  align?: "left" | "center" | "right";
}

export interface TableOptions {
  columns: TableColumn[];
  rows: string[][];
  size?: number;
  padding?: number;
  headerFill?: RGB;
  borderColor?: RGB;
  x?: number;
  width?: number;
}

/**
 * Penata letak sederhana di atas pdf-lib: menulis paragraf dari atas ke bawah,
 * membungkus baris, rata kanan-kiri, dan berpindah halaman otomatis.
 * Posisi `cursor` dihitung dari tepi atas halaman.
 */
export class PdfFlow {
  page: PDFPage;
  cursor: number;

  private constructor(
    readonly doc: PDFDocument,
    readonly fonts: FontSet,
    readonly size: readonly [number, number],
    readonly margin: Margins,
    readonly baseSize: number,
  ) {
    this.page = doc.addPage([size[0], size[1]]);
    this.cursor = margin.top;
  }

  static async create(options: {
    size?: readonly [number, number];
    /** Margin dalam milimeter. */
    marginMm?: Partial<Margins>;
    family?: FontFamily;
    fontSize?: number;
    title?: string;
  } = {}): Promise<PdfFlow> {
    const doc = await PDFDocument.create();
    if (options.title) doc.setTitle(toWinAnsi(options.title));
    doc.setProducer("VogWork");
    doc.setCreator("VogWork");
    const fonts = await embedFamily(doc, options.family ?? "times");
    const m = { top: 20, right: 20, bottom: 20, left: 25, ...options.marginMm };
    const margin = { top: m.top * MM, right: m.right * MM, bottom: m.bottom * MM, left: m.left * MM };
    return new PdfFlow(doc, fonts, options.size ?? PAGE_SIZES.A4, margin, options.fontSize ?? 12);
  }

  get pageWidth() {
    return this.size[0];
  }
  get pageHeight() {
    return this.size[1];
  }
  get contentWidth() {
    return this.size[0] - this.margin.left - this.margin.right;
  }
  get bottomLimit() {
    return this.size[1] - this.margin.bottom;
  }

  font(style: Pick<TextStyle, "bold" | "italic">): PDFFont {
    if (style.bold && style.italic) return this.fonts.boldItalic;
    if (style.bold) return this.fonts.bold;
    if (style.italic) return this.fonts.italic;
    return this.fonts.regular;
  }

  newPage() {
    this.page = this.doc.addPage([this.size[0], this.size[1]]);
    this.cursor = this.margin.top;
  }

  ensureSpace(height: number) {
    if (this.cursor + height > this.bottomLimit) this.newPage();
  }

  moveDown(pt: number) {
    this.cursor += pt;
  }

  textWidth(text: string, style: TextStyle = {}) {
    return this.font(style).widthOfTextAtSize(toWinAnsi(text), style.size ?? this.baseSize);
  }

  /** Membungkus teks ke beberapa baris sesuai lebar; baris baru eksplisit dihormati. */
  wrap(text: string, font: PDFFont, size: number, maxWidth: number, firstIndent = 0): string[][] {
    const paragraphs = toWinAnsi(text).split("\n");
    return paragraphs.map((paragraph) => {
      const words = paragraph.split(/ +/).filter((w, i, all) => w !== "" || all.length === 1);
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const limit = lines.length === 0 ? maxWidth - firstIndent : maxWidth;
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= limit || !line) {
          line = candidate;
          // Kata yang lebih panjang dari satu baris dipotong paksa.
          while (font.widthOfTextAtSize(line, size) > limit && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > limit) cut--;
            lines.push(line.slice(0, cut));
            line = line.slice(cut);
          }
        } else {
          lines.push(line);
          line = word;
        }
      }
      lines.push(line);
      return lines;
    });
  }

  /** Tinggi yang dibutuhkan sebuah paragraf tanpa menggambarnya. */
  measure(text: string, style: TextStyle = {}): number {
    const size = style.size ?? this.baseSize;
    const width = (style.width ?? this.contentWidth) - (style.hanging ?? 0);
    const lines = this.wrap(text, this.font(style), size, width, style.indent ?? 0).flat().length;
    return lines * size * (style.lineHeight ?? 1.3);
  }

  /** Menulis paragraf pada posisi cursor lalu menggeser cursor ke bawah. */
  text(text: string, style: TextStyle = {}): void {
    const size = style.size ?? this.baseSize;
    const font = this.font(style);
    const lineHeight = size * (style.lineHeight ?? 1.3);
    const left = (style.x ?? this.margin.left) + (style.hanging ?? 0);
    const width = (style.width ?? this.contentWidth) - (style.hanging ?? 0);
    const align = style.align ?? "left";
    const color = style.color ?? rgb(0, 0, 0);

    for (const lines of this.wrap(text, font, size, width, style.indent ?? 0)) {
      lines.forEach((line, index) => {
        this.ensureSpace(lineHeight);
        const indent = index === 0 ? (style.indent ?? 0) : 0;
        const baseline = this.pageHeight - this.cursor - size * 0.82;
        const lineWidth = font.widthOfTextAtSize(line, size);
        const available = width - indent;
        const isLast = index === lines.length - 1;

        if (align === "justify" && !isLast && line.includes(" ")) {
          const words = line.split(" ");
          const wordsWidth = words.reduce((sum, w) => sum + font.widthOfTextAtSize(w, size), 0);
          const gap = (available - wordsWidth) / (words.length - 1);
          let x = left + indent;
          for (const word of words) {
            this.page.drawText(word, { x, y: baseline, size, font, color });
            x += font.widthOfTextAtSize(word, size) + gap;
          }
        } else {
          let x = left + indent;
          if (align === "center") x = left + indent + (available - lineWidth) / 2;
          if (align === "right") x = left + indent + available - lineWidth;
          this.page.drawText(line, { x, y: baseline, size, font, color });
          if (style.underline && line) {
            this.page.drawLine({
              start: { x, y: baseline - size * 0.12 },
              end: { x: x + lineWidth, y: baseline - size * 0.12 },
              thickness: Math.max(0.5, size / 20),
              color,
            });
          }
        }
        this.cursor += lineHeight;
      });
    }
  }

  /** Garis horizontal; `double` membuat garis tebal-tipis khas kop surat. */
  rule(options: { thickness?: number; double?: boolean; color?: RGB; x?: number; width?: number } = {}) {
    const x = options.x ?? this.margin.left;
    const width = options.width ?? this.contentWidth;
    const color = options.color ?? rgb(0, 0, 0);
    const thickness = options.thickness ?? 1;
    const y = this.pageHeight - this.cursor;
    this.page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness, color });
    if (options.double) {
      const y2 = y - thickness - 1.6;
      this.page.drawLine({ start: { x, y: y2 }, end: { x: x + width, y: y2 }, thickness: 0.6, color });
      this.cursor += thickness + 2.5;
    }
    this.cursor += thickness;
  }

  /** Menggambar gambar dengan sudut kiri atas di (x, top). */
  imageAt(image: PDFImage, x: number, top: number, width: number, height: number) {
    this.page.drawImage(image, { x, y: this.pageHeight - top - height, width, height });
  }

  /** Teks satu baris pada posisi absolut; `top` dihitung dari tepi atas halaman. */
  textAt(text: string, x: number, top: number, style: TextStyle & { width?: number } = {}) {
    const size = style.size ?? this.baseSize;
    const font = this.font(style);
    const safe = toWinAnsi(text);
    const lineWidth = font.widthOfTextAtSize(safe, size);
    let left = x;
    if (style.align === "center" && style.width) left = x + (style.width - lineWidth) / 2;
    if (style.align === "right" && style.width) left = x + style.width - lineWidth;
    this.page.drawText(safe, { x: left, y: this.pageHeight - top - size * 0.82, size, font, color: style.color ?? rgb(0, 0, 0) });
    return lineWidth;
  }

  /** Daftar "Label : Isi" yang rapi, mis. Nomor, Sifat, Lampiran, Hal. */
  keyValue(rows: [string, string][], options: { labelWidth?: number; size?: number; x?: number; width?: number; bold?: boolean } = {}) {
    const size = options.size ?? this.baseSize;
    const x = options.x ?? this.margin.left;
    const total = options.width ?? this.contentWidth;
    const labelWidth = options.labelWidth ?? 28 * MM;
    const colonWidth = this.fonts.regular.widthOfTextAtSize(" : ", size);
    for (const [label, value] of rows) {
      this.ensureSpace(size * 1.3);
      this.textAt(label, x, this.cursor, { size });
      this.textAt(":", x + labelWidth, this.cursor, { size });
      this.text(value || " ", { x: x + labelWidth + colonWidth, width: total - labelWidth - colonWidth, size, bold: options.bold });
    }
  }

  table(options: TableOptions) {
    const size = options.size ?? this.baseSize - 1;
    const padding = options.padding ?? 4;
    const x = options.x ?? this.margin.left;
    const width = options.width ?? this.contentWidth;
    const lineHeight = size * 1.25;
    const border = options.borderColor ?? rgb(0.75, 0.75, 0.75);
    const widths = options.columns.map((c) => c.width * width);

    const drawRow = (cells: string[], header: boolean) => {
      const font = header ? this.fonts.bold : this.fonts.regular;
      const wrapped = cells.map((cell, i) => this.wrap(cell ?? "", font, size, widths[i]! - padding * 2).flat());
      const height = Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + padding * 2;
      if (this.cursor + height > this.bottomLimit) {
        this.newPage();
        if (!header) drawRow(options.columns.map((c) => c.header), true);
      }
      const top = this.cursor;
      const yBottom = this.pageHeight - top - height;
      if (header && options.headerFill) {
        this.page.drawRectangle({ x, y: yBottom, width, height, color: options.headerFill });
      }
      let cx = x;
      wrapped.forEach((lines, i) => {
        const colWidth = widths[i]!;
        const align = header ? "left" : (options.columns[i]?.align ?? "left");
        lines.forEach((line, li) => {
          const lw = font.widthOfTextAtSize(line, size);
          let tx = cx + padding;
          if (align === "right") tx = cx + colWidth - padding - lw;
          if (align === "center") tx = cx + (colWidth - lw) / 2;
          this.page.drawText(line, { x: tx, y: this.pageHeight - top - padding - li * lineHeight - size * 0.82, size, font });
        });
        this.page.drawRectangle({ x: cx, y: yBottom, width: colWidth, height, borderColor: border, borderWidth: 0.6 });
        cx += colWidth;
      });
      this.cursor += height;
    };

    drawRow(options.columns.map((c) => c.header), true);
    for (const row of options.rows) drawRow(row, false);
  }

  /** Nomor halaman "1/3" di tengah bawah setiap halaman. */
  pageNumbers(size = 9) {
    const pages = this.doc.getPages();
    if (pages.length < 2) return;
    pages.forEach((page, i) => {
      const label = `${i + 1}/${pages.length}`;
      const w = this.fonts.regular.widthOfTextAtSize(label, size);
      page.drawText(label, { x: (this.pageWidth - w) / 2, y: this.margin.bottom / 2, size, font: this.fonts.regular, color: rgb(0.4, 0.4, 0.4) });
    });
  }

  save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}
