import type { StandardFontKey } from "@vogwork/workers";

export type FontKey = StandardFontKey | `custom:${string}`;

export interface CertField {
  id: string;
  /** Teks dengan placeholder kolom, mis. "{Nama}" atau "No. {Nomor}". */
  text: string;
  x: number;
  y: number;
  align: "left" | "center" | "right";
  /** Relatif terhadap lebar halaman. */
  size: number;
  font: FontKey;
  color: string;
  maxWidth: number;
}

export interface CustomFont {
  id: string;
  name: string;
  bytes: Uint8Array;
}

export const STANDARD_FONTS: { key: StandardFontKey; label: string; css: { family: string; weight: number; style: string } }[] = [
  { key: "times-bold", label: "Times Bold", css: { family: '"Times New Roman", Times, serif', weight: 700, style: "normal" } },
  { key: "times", label: "Times", css: { family: '"Times New Roman", Times, serif', weight: 400, style: "normal" } },
  { key: "times-italic", label: "Times Italic", css: { family: '"Times New Roman", Times, serif', weight: 400, style: "italic" } },
  { key: "times-bolditalic", label: "Times Bold Italic", css: { family: '"Times New Roman", Times, serif', weight: 700, style: "italic" } },
  { key: "helvetica-bold", label: "Helvetica Bold", css: { family: "Helvetica, Arial, sans-serif", weight: 700, style: "normal" } },
  { key: "helvetica", label: "Helvetica", css: { family: "Helvetica, Arial, sans-serif", weight: 400, style: "normal" } },
  { key: "courier-bold", label: "Courier Bold", css: { family: '"Courier New", Courier, monospace', weight: 700, style: "normal" } },
  { key: "courier", label: "Courier", css: { family: '"Courier New", Courier, monospace', weight: 400, style: "normal" } },
];

export function cssFont(font: FontKey) {
  if (font.startsWith("custom:")) return { family: `"vogfont-${font.slice(7)}", sans-serif`, weight: 400, style: "normal" };
  return (STANDARD_FONTS.find((f) => f.key === font) ?? STANDARD_FONTS[0]!).css;
}

/** Mengganti {Kolom} dengan nilai baris; nama kolom tidak peka huruf besar/kecil. */
export function resolveTemplate(text: string, row: Record<string, string>): string {
  const lower = new Map(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]));
  return text.replace(/\{([^{}]+)\}/g, (match, key: string) => row[key] ?? lower.get(key.toLowerCase().trim()) ?? match);
}

export function placeholders(text: string): string[] {
  return [...text.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]!);
}

let seq = 0;
export function newField(partial: Partial<CertField> = {}): CertField {
  return {
    id: `f${Date.now().toString(36)}${seq++}`,
    text: "{Nama}",
    x: 0.5,
    y: 0.5,
    align: "center",
    size: 0.045,
    font: "times-bold",
    color: "#1f2937",
    maxWidth: 0.8,
    ...partial,
  };
}

/** Ukuran halaman PDF (pt) untuk template gambar: sisi terpanjang setara A4. */
export function pageSizeFor(width: number, height: number): [number, number] {
  return width >= height ? [842, (842 * height) / width] : [(842 * width) / height, 842];
}
