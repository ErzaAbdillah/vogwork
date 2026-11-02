import {
  degrees,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import type { Report } from "./types";

/** Posisi relatif (0–1) terhadap halaman seperti yang terlihat di layar, diukur dari kiri atas. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AnnotationItem =
  | ({ kind: "image"; page: number; png: Uint8Array; /** Gambar dengan ref sama disematkan sekali, mis. paraf di tiap halaman. */ ref?: string } & Box)
  | ({ kind: "text"; page: number; text: string; /** Relatif terhadap lebar halaman. */ size: number; color: string; font: "helvetica" | "times" } & Box);

export interface FormField {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "radio";
  value: string;
  options: string[];
}

export interface AnnotateInput {
  bytes: Uint8Array;
  items: AnnotationItem[];
  form?: Record<string, string>;
  /** Ratakan formulir supaya isian tidak bisa diubah lagi. */
  flatten?: boolean;
}

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

/**
 * Mengubah titik pada halaman yang terlihat (kiri atas, sudah diputar sesuai /Rotate)
 * menjadi koordinat PDF (kiri bawah, belum diputar).
 */
export function mapPoint(px: number, py: number, rotation: number, box: { x: number; y: number; width: number; height: number }) {
  const { width: W, height: H } = box;
  const r = ((rotation % 360) + 360) % 360;
  let X: number;
  let Y: number;
  if (r === 90) [X, Y] = [py, px];
  else if (r === 180) [X, Y] = [W - px, py];
  else if (r === 270) [X, Y] = [W - py, H - px];
  else [X, Y] = [px, H - py];
  return { x: X + box.x, y: Y + box.y };
}

function viewedSize(page: PDFPage) {
  const crop = page.getCropBox();
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  return { crop, rotation: r, width: r % 180 ? crop.height : crop.width, height: r % 180 ? crop.width : crop.height };
}

function hex(color: string) {
  const n = Number.parseInt(color.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Membaca kolom formulir PDF (AcroForm) beserta nilainya saat ini. */
export async function readForm({ bytes }: { bytes: Uint8Array }, _report: Report): Promise<FormField[]> {
  const doc = await load(bytes);
  return doc
    .getForm()
    .getFields()
    .flatMap((field): FormField[] => {
      const name = field.getName();
      if (field instanceof PDFTextField) return [{ name, type: "text", value: field.getText() ?? "", options: [] }];
      if (field instanceof PDFCheckBox) return [{ name, type: "checkbox", value: field.isChecked() ? "1" : "", options: [] }];
      if (field instanceof PDFDropdown || field instanceof PDFOptionList) return [{ name, type: "dropdown", value: field.getSelected()[0] ?? "", options: field.getOptions() }];
      if (field instanceof PDFRadioGroup) return [{ name, type: "radio", value: field.getSelected() ?? "", options: field.getOptions() }];
      return [];
    });
}

/** Menempel tanda tangan, stempel, dan teks ke halaman, serta mengisi formulir. */
export async function annotate(input: AnnotateInput, report: Report): Promise<Uint8Array> {
  const doc = await load(input.bytes);
  const pages = doc.getPages();

  if (input.form && Object.keys(input.form).length > 0) {
    const form = doc.getForm();
    for (const [name, value] of Object.entries(input.form)) {
      const field = form.getFieldMaybe(name);
      if (!field) continue;
      if (field instanceof PDFTextField) field.setText(value);
      else if (field instanceof PDFCheckBox) {
        if (value) field.check();
        else field.uncheck();
      }
      else if ((field instanceof PDFDropdown || field instanceof PDFOptionList) && value) field.select(value);
      else if (field instanceof PDFRadioGroup && value) field.select(value);
    }
    if (input.flatten) form.flatten();
  }

  const images = new Map<string | Uint8Array, PDFImage>();
  const fonts: Partial<Record<"helvetica" | "times", PDFFont>> = {};

  for (const [i, item] of input.items.entries()) {
    const page = pages[item.page];
    if (!page) continue;
    const v = viewedSize(page);
    const left = item.x * v.width;
    const top = item.y * v.height;
    if (item.kind === "image") {
      const key = item.ref ?? item.png;
      let image = images.get(key);
      if (!image) {
        image = await doc.embedPng(item.png);
        images.set(key, image);
      }
      const w = item.w * v.width;
      const h = item.h * v.height;
      // Jangkar = sudut kiri bawah kotak yang terlihat; gambar diputar ikut halaman supaya tampak tegak.
      const anchor = mapPoint(left, top + h, v.rotation, v.crop);
      page.drawImage(image, { x: anchor.x, y: anchor.y, width: w, height: h, rotate: degrees(v.rotation) });
    } else {
      fonts[item.font] ??= await doc.embedFont(item.font === "times" ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
      const font = fonts[item.font]!;
      const size = item.size * v.width;
      const supported = new Set(font.getCharacterSet());
      const text = [...item.text].map((ch) => (ch === "\n" || supported.has(ch.codePointAt(0)!) ? ch : "?")).join("");
      text.split("\n").forEach((line, li) => {
        const anchor = mapPoint(left, top + size * (0.82 + li * 1.2), v.rotation, v.crop);
        page.drawText(line, { x: anchor.x, y: anchor.y, size, font, color: hex(item.color), rotate: degrees(v.rotation) });
      });
    }
    report((i + 1) / Math.max(1, input.items.length));
  }

  doc.setModificationDate(new Date());
  doc.setProducer("VogWork");
  return doc.save({ useObjectStreams: true });
}
