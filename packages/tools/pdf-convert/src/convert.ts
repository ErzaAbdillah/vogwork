import { defaultDocSettings, PAPER_MM, type DocContent, type DocSettings, type PMNode } from "@vogwork/formats/docx";

type Progress = (value: number, message?: string) => void;

const PX_PER_MM = 96 / 25.4;

/** Kertas terdekat dengan ukuran halaman PDF (dalam pt). */
function paperFor(widthPt: number, heightPt: number): Pick<DocSettings, "pageSize" | "orientation"> {
  const landscape = widthPt > heightPt;
  const longMm = (Math.max(widthPt, heightPt) / 72) * 25.4;
  const pageSize = Math.abs(longMm - 330) < 8 ? "F4" : Math.abs(longMm - 279.4) < 6 ? "Letter" : "A4";
  return { pageSize, orientation: landscape ? "landscape" : "portrait" };
}

/** Rasio karakter per halaman di bawah ini biasanya berarti PDF hasil scan. */
export const SCANNED_THRESHOLD = 10;

export async function pdfToDoc(
  file: Blob,
  options: { mode: "text" | "layout"; ocr: boolean; signal?: AbortSignal; onProgress?: Progress; labels?: { reading: string; ocr: string; rendering: string } },
): Promise<DocContent> {
  const progress = options.onProgress ?? (() => {});
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { iteratePdfPages } = await import("@vogwork/formats/pdfjs");

  if (options.mode === "layout") {
    // Setiap halaman menjadi gambar penuh: tampilan sama persis, teks tidak bisa disunting.
    const { blobToDataUrl } = await import("@vogwork/formats/image");
    const content: PMNode[] = [];
    let paper: Pick<DocSettings, "pageSize" | "orientation"> = { pageSize: "A4", orientation: "portrait" };
    for await (const page of iteratePdfPages(bytes, { dpi: 150, quality: 0.82, signal: options.signal, onProgress: (d, t) => progress(d / t, options.labels?.rendering) })) {
      if (content.length === 0) paper = paperFor(page.width, page.height);
      const [w, h] = PAPER_MM[paper.pageSize];
      const [pw, ph] = paper.orientation === "landscape" ? [h, w] : [w, h];
      const margin = 6;
      const boxW = (pw - margin * 2) * PX_PER_MM;
      const boxH = (ph - margin * 2) * PX_PER_MM - 4;
      const scale = Math.min(boxW / page.width, boxH / page.height);
      content.push({ type: "image", attrs: { src: await blobToDataUrl(page.blob), width: Math.floor(page.width * scale), height: Math.floor(page.height * scale) } });
    }
    return { settings: { ...defaultDocSettings(), ...paper, marginMm: { top: 6, right: 6, bottom: 6, left: 6 }, pageNumbers: false }, doc: { type: "doc", content } };
  }

  if (options.ocr) {
    const images: Blob[] = [];
    let paper: Pick<DocSettings, "pageSize" | "orientation"> | null = null;
    for await (const page of iteratePdfPages(bytes, { dpi: 200, type: "image/png", signal: options.signal, onProgress: (d, t) => progress((d / t) * 0.3, options.labels?.rendering) })) {
      paper ??= paperFor(page.width, page.height);
      images.push(page.blob);
    }
    const { recognizeImages } = await import("@vogwork/workers/ocr");
    const results = await recognizeImages(images, { signal: options.signal, onProgress: (p) => progress(0.3 + p * 0.7, options.labels?.ocr) });
    const content: PMNode[] = results.flatMap((r) =>
      r.text
        .split(/\n\s*\n/)
        .map((block) => block.replace(/-\n/g, "").replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean)
        .map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
    );
    return { settings: { ...defaultDocSettings(), ...(paper ?? {}) }, doc: { type: "doc", content: content.length ? content : [{ type: "paragraph", content: [] }] } };
  }

  const { extractPdfText, paragraphsToNodes } = await import("@vogwork/formats/pdf-text");
  const { openPdf } = await import("@vogwork/formats/pdfjs");
  const doc = await openPdf(bytes);
  const first = (await doc.getPage(1)).getViewport({ scale: 1 });
  void doc.loadingTask.destroy();
  const text = await extractPdfText(bytes, (d, t) => progress(d / t, options.labels?.reading));
  const content = text.pages.flatMap((p) => paragraphsToNodes(p));
  return { settings: { ...defaultDocSettings(), ...paperFor(first.width, first.height) }, doc: { type: "doc", content: content.length ? content : [{ type: "paragraph", content: [] }] } };
}

/** Jumlah karakter teks per halaman, untuk menebak apakah PDF hasil scan. */
export async function textDensity(file: Blob): Promise<{ pages: number; perPage: number }> {
  const { extractPdfText } = await import("@vogwork/formats/pdf-text");
  const result = await extractPdfText(file);
  const pages = Math.max(1, result.pages.length);
  return { pages, perPage: result.characters / pages };
}
