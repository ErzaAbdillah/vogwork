import fontkit from "@pdf-lib/fontkit";
import { zipSync } from "fflate";
import { PDFDocument, StandardFonts, rgb, type PDFEmbeddedPage, type PDFFont, type PDFImage } from "pdf-lib";
import type { Report } from "./types";

async function load(bytes: Uint8Array): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new Error("File ini bukan PDF yang valid atau sudah rusak.");
  }
  if (doc.isEncrypted) throw new Error("PDF ini dikunci kata sandi. Buka kuncinya dulu, lalu coba lagi.");
  return doc;
}

function stamp(doc: PDFDocument) {
  doc.setProducer("VogWork");
  doc.setModificationDate(new Date());
}

export interface MergeInput {
  files: { bytes: Uint8Array; pages?: number[] }[];
}

export async function merge({ files }: MergeInput, report: Report): Promise<Uint8Array> {
  if (files.length === 0) throw new Error("Pilih minimal satu PDF.");
  const out = await PDFDocument.create();
  for (const [i, file] of files.entries()) {
    const src = await load(file.bytes);
    const indices = file.pages ?? src.getPageIndices();
    const pages = await out.copyPages(src, indices);
    pages.forEach((p) => out.addPage(p));
    report((i + 1) / files.length);
  }
  stamp(out);
  return out.save({ useObjectStreams: true });
}

export interface SplitInput {
  bytes: Uint8Array;
  groups: number[][];
}

export async function split({ bytes, groups }: SplitInput, report: Report): Promise<Uint8Array[]> {
  const src = await load(bytes);
  const result: Uint8Array[] = [];
  for (const [i, group] of groups.entries()) {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, group);
    pages.forEach((p) => out.addPage(p));
    stamp(out);
    result.push(await out.save({ useObjectStreams: true }));
    report((i + 1) / groups.length);
  }
  return result;
}

/**
 * Kompresi ringan tanpa mengubah isi: menyalin halaman ke dokumen baru
 * (membuang objek yatim dan riwayat simpan bertahap) lalu memakai object stream.
 */
export async function optimize({ bytes }: { bytes: Uint8Array }, report: Report): Promise<Uint8Array> {
  const src = await load(bytes);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((p) => out.addPage(p));
  const title = src.getTitle();
  if (title) out.setTitle(title);
  stamp(out);
  report(0.8);
  const saved = await out.save({ useObjectStreams: true });
  report(1);
  // Bila hasilnya malah lebih besar, kembalikan file asli.
  return saved.byteLength < bytes.byteLength ? saved : bytes;
}

export interface ImagesToPdfInput {
  images: {
    bytes: Uint8Array;
    type: string;
    /** Ukuran piksel gambar. */
    width: number;
    height: number;
    /** Ukuran halaman (pt); bila kosong, mengikuti `pageSize`. */
    pageWidth?: number;
    pageHeight?: number;
  }[];
  /** "fit" = halaman seukuran gambar; atau [lebar, tinggi] dalam pt. */
  pageSize?: "fit" | [number, number];
  /** Margin (pt) untuk halaman berukuran tetap. */
  margin?: number;
  title?: string;
}

export async function imagesToPdf(input: ImagesToPdfInput, report: Report): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  if (input.title) doc.setTitle(input.title);
  for (const [i, img] of input.images.entries()) {
    const embedded = img.type === "image/png" ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
    let pageW: number;
    let pageH: number;
    if (img.pageWidth && img.pageHeight) {
      pageW = img.pageWidth;
      pageH = img.pageHeight;
    } else if (input.pageSize && input.pageSize !== "fit") {
      [pageW, pageH] = input.pageSize;
      // Putar halaman bila orientasi gambar berbeda.
      if (img.width > img.height !== pageW > pageH) [pageW, pageH] = [pageH, pageW];
    } else {
      // 1 piksel = 1 pt, dibatasi sisi terpanjang A4 supaya foto besar tidak menjadi halaman raksasa.
      const scale = Math.min(1, 842 / Math.max(img.width, img.height));
      pageW = img.width * scale;
      pageH = img.height * scale;
    }
    const page = doc.addPage([pageW, pageH]);
    const margin = img.pageWidth || input.pageSize === "fit" || !input.pageSize ? 0 : (input.margin ?? 0);
    const boxW = pageW - margin * 2;
    const boxH = pageH - margin * 2;
    const scale = Math.min(boxW / embedded.width, boxH / embedded.height);
    const drawW = img.pageWidth ? pageW : embedded.width * scale;
    const drawH = img.pageHeight ? pageH : embedded.height * scale;
    page.drawImage(embedded, { x: (pageW - drawW) / 2, y: (pageH - drawH) / 2, width: drawW, height: drawH });
    report((i + 1) / input.images.length);
  }
  stamp(doc);
  return doc.save({ useObjectStreams: true });
}

export type StandardFontKey =
  | "helvetica"
  | "helvetica-bold"
  | "times"
  | "times-bold"
  | "times-italic"
  | "times-bolditalic"
  | "courier"
  | "courier-bold";

const STANDARD_FONTS: Record<StandardFontKey, { font: StandardFonts; cap: number }> = {
  helvetica: { font: StandardFonts.Helvetica, cap: 0.718 },
  "helvetica-bold": { font: StandardFonts.HelveticaBold, cap: 0.718 },
  times: { font: StandardFonts.TimesRoman, cap: 0.662 },
  "times-bold": { font: StandardFonts.TimesRomanBold, cap: 0.662 },
  "times-italic": { font: StandardFonts.TimesRomanItalic, cap: 0.662 },
  "times-bolditalic": { font: StandardFonts.TimesRomanBoldItalic, cap: 0.662 },
  courier: { font: StandardFonts.Courier, cap: 0.571 },
  "courier-bold": { font: StandardFonts.CourierBold, cap: 0.571 },
};

export interface StampField {
  /** Titik jangkar relatif terhadap halaman (0–1), diukur dari kiri atas. */
  x: number;
  y: number;
  align: "left" | "center" | "right";
  /** Ukuran huruf relatif terhadap lebar halaman. */
  size: number;
  font: StandardFontKey | `custom:${string}`;
  color: string;
  /** Lebar maksimum relatif; teks lebih panjang diperkecil otomatis. */
  maxWidth?: number;
}

export interface StampInput {
  template: { kind: "image" | "pdf"; bytes: Uint8Array; mime?: string };
  /** Ukuran halaman (pt) untuk template gambar. */
  pageSize?: [number, number];
  fields: StampField[];
  records: { name: string; values: string[] }[];
  fonts?: { id: string; bytes: Uint8Array }[];
  mode: "single" | "separate";
  title?: string;
}

function hexColor(hex: string) {
  const n = Number.parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function sanitizeFor(font: PDFFont, text: string): string {
  // Karakter yang tidak ada di font diganti "?" supaya satu nama aneh tidak menggagalkan semuanya.
  const supported = new Set(font.getCharacterSet());
  return [...text].map((ch) => (supported.has(ch.codePointAt(0)!) ? ch : "?")).join("");
}

async function prepareDoc(input: StampInput) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  if (input.title) doc.setTitle(input.title);
  stamp(doc);

  let background: { image?: PDFImage; page?: PDFEmbeddedPage; width: number; height: number };
  if (input.template.kind === "pdf") {
    const [page] = await doc.embedPdf(input.template.bytes, [0]);
    if (!page) throw new Error("Template PDF tidak punya halaman.");
    background = { page, width: page.width, height: page.height };
  } else {
    const image =
      input.template.mime === "image/png" ? await doc.embedPng(input.template.bytes) : await doc.embedJpg(input.template.bytes);
    const [w, h] = input.pageSize ?? [842, (842 * image.height) / image.width];
    background = { image, width: w, height: h };
  }

  const fonts = new Map<string, { font: PDFFont; cap: number }>();
  for (const field of input.fields) {
    if (fonts.has(field.font)) continue;
    if (field.font.startsWith("custom:")) {
      const bytes = input.fonts?.find((f) => `custom:${f.id}` === field.font)?.bytes;
      if (!bytes) throw new Error("Font kustom tidak ditemukan.");
      const font = await doc.embedFont(bytes, { subset: true });
      fonts.set(field.font, { font, cap: (font.heightAtSize(1, { descender: false }) || 0.9) * 0.72 });
    } else {
      const spec = STANDARD_FONTS[field.font as StandardFontKey] ?? STANDARD_FONTS.helvetica;
      fonts.set(field.font, { font: await doc.embedFont(spec.font), cap: spec.cap });
    }
  }
  return { doc, background, fonts };
}

function drawRecord(prepared: Awaited<ReturnType<typeof prepareDoc>>, input: StampInput, values: string[]) {
  const { doc, background, fonts } = prepared;
  const { width: W, height: H } = background;
  const page = doc.addPage([W, H]);
  if (background.page) page.drawPage(background.page, { x: 0, y: 0, width: W, height: H });
  if (background.image) page.drawImage(background.image, { x: 0, y: 0, width: W, height: H });

  input.fields.forEach((field, i) => {
    const entry = fonts.get(field.font)!;
    const text = sanitizeFor(entry.font, values[i] ?? "");
    if (!text.trim()) return;
    let size = field.size * W;
    let textWidth = entry.font.widthOfTextAtSize(text, size);
    if (field.maxWidth && textWidth > field.maxWidth * W) {
      size *= (field.maxWidth * W) / textWidth;
      textWidth = entry.font.widthOfTextAtSize(text, size);
    }
    const anchorX = field.x * W;
    const x = field.align === "center" ? anchorX - textWidth / 2 : field.align === "right" ? anchorX - textWidth : anchorX;
    // Jangkar vertikal = tengah huruf kapital, sama seperti pratinjau di layar.
    const baseline = H - field.y * H - (entry.cap * size) / 2;
    page.drawText(text, { x, y: baseline, size, font: entry.font, color: hexColor(field.color) });
  });
}

/** Mengisi template (gambar atau PDF) dengan teks per baris data, mis. sertifikat massal. */
export async function stampRecords(input: StampInput, report: Report): Promise<{ kind: "pdf" | "zip"; bytes: Uint8Array }> {
  if (input.records.length === 0) throw new Error("Tidak ada baris data untuk dibuat.");

  if (input.mode === "single") {
    const prepared = await prepareDoc(input);
    input.records.forEach((record, i) => {
      drawRecord(prepared, input, record.values);
      if (i % 10 === 0) report((i + 1) / input.records.length);
    });
    report(1);
    return { kind: "pdf", bytes: await prepared.doc.save({ useObjectStreams: true }) };
  }

  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  const used = new Map<string, number>();
  for (const [i, record] of input.records.entries()) {
    const prepared = await prepareDoc(input);
    drawRecord(prepared, input, record.values);
    const base = record.name || `sertifikat-${i + 1}`;
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    const name = `${n ? `${base} (${n + 1})` : base}.pdf`;
    // PDF sudah terkompresi; zip cukup menyimpan tanpa kompresi ulang.
    entries[name] = [await prepared.doc.save({ useObjectStreams: true }), { level: 0 }];
    report((i + 1) / input.records.length);
  }
  return { kind: "zip", bytes: zipSync(entries) };
}
