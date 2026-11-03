import type { PMNode } from "./docx";

/** Potongan teks dari PDF.js, koordinat PDF (kiri bawah). */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  size: number;
  width: number;
}

export interface ExtractedParagraph {
  text: string;
  size: number;
  heading: 0 | 1 | 2;
  align: "left" | "center";
}

interface Line {
  text: string;
  y: number;
  size: number;
  left: number;
  right: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 12;
}

/**
 * Menyusun potongan teks satu halaman menjadi baris, lalu paragraf.
 * Baris dengan huruf jauh lebih besar dianggap judul; baris pendek
 * yang posisinya di tengah halaman dianggap rata tengah.
 */
export function paragraphsFromItems(items: TextItem[], pageWidth: number, bodySize?: number): ExtractedParagraph[] {
  const visible = items.filter((i) => i.str.trim() !== "");
  if (visible.length === 0) return [];
  visible.sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: Line[] = [];
  for (const item of visible) {
    const line = lines.at(-1);
    if (line && Math.abs(line.y - item.y) < Math.max(line.size, item.size) * 0.5) {
      // Spasi disisipkan bila jarak antarpotongan cukup lebar.
      const gap = item.x - line.right;
      line.text += gap > item.size * 0.2 && !line.text.endsWith(" ") && !item.str.startsWith(" ") ? ` ${item.str}` : item.str;
      line.right = Math.max(line.right, item.x + item.width);
      line.size = Math.max(line.size, item.size);
    } else {
      lines.push({ text: item.str, y: item.y, size: item.size, left: item.x, right: item.x + item.width });
    }
  }

  const body = bodySize ?? median(lines.map((l) => l.size));
  const marginLeft = Math.min(...lines.map((l) => l.left));
  const marginRight = pageWidth - Math.max(...lines.map((l) => l.right));
  const contentWidth = pageWidth - marginLeft - marginRight;
  const isCentered = (l: Line) => {
    const width = l.right - l.left;
    const leftGap = l.left - marginLeft;
    const rightGap = pageWidth - marginRight - l.right;
    return width < contentWidth * 0.8 && leftGap > contentWidth * 0.08 && Math.abs(leftGap - rightGap) < contentWidth * 0.06;
  };
  const headingOf = (size: number): 0 | 1 | 2 => (size >= body * 1.6 ? 1 : size >= body * 1.2 ? 2 : 0);

  const paragraphs: ExtractedParagraph[] = [];
  let prev: Line | null = null;
  for (const line of lines) {
    const heading = headingOf(line.size);
    const align = isCentered(line) ? "center" : "left";
    const current = paragraphs.at(-1);
    const gap = prev ? prev.y - line.y : Infinity;
    const sameBlock =
      current &&
      prev &&
      heading === current.heading &&
      align === current.align &&
      Math.abs(line.size - current.size) < 0.5 &&
      gap < line.size * 1.75 &&
      // Baris sebelumnya yang pendek biasanya akhir paragraf.
      (prev.right - prev.left > contentWidth * 0.7 || align === "center");
    if (sameBlock) {
      current.text = current.text.endsWith("-") ? current.text.slice(0, -1) + line.text.trim() : `${current.text} ${line.text.trim()}`;
    } else {
      paragraphs.push({ text: line.text.trim(), size: line.size, heading, align });
    }
    prev = line;
  }
  return paragraphs;
}

export function paragraphsToNodes(paragraphs: ExtractedParagraph[]): PMNode[] {
  return paragraphs.map((p) => {
    const content = [{ type: "text", text: p.text }];
    const attrs = p.align === "center" ? { textAlign: "center" } : {};
    return p.heading ? { type: "heading", attrs: { level: p.heading, ...attrs }, content } : { type: "paragraph", attrs, content };
  });
}

/** Membaca teks setiap halaman PDF memakai PDF.js (hanya di browser). */
export async function extractPdfText(source: Uint8Array | Blob, onProgress?: (done: number, total: number) => void): Promise<{ pages: ExtractedParagraph[][]; characters: number }> {
  const { openPdf } = await import("../pdfjs");
  const doc = await openPdf(source);
  try {
    const raw: { items: TextItem[]; width: number }[] = [];
    let characters = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const view = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: TextItem[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const [a, b, , d, e, f] = item.transform as number[];
        items.push({ str: item.str, x: e!, y: f!, size: Math.hypot(a!, b!) || Math.abs(d!) || 12, width: item.width });
        characters += item.str.trim().length;
      }
      raw.push({ items, width: view.width });
      page.cleanup();
      onProgress?.(i, doc.numPages);
    }
    // Ukuran teks isi dihitung dari seluruh dokumen supaya judul terdeteksi konsisten.
    const body = median(raw.flatMap((p) => p.items.filter((i) => i.str.trim()).map((i) => i.size)));
    return { pages: raw.map((p) => paragraphsFromItems(p.items, p.width, body)), characters };
  } finally {
    void doc.loadingTask.destroy();
  }
}
