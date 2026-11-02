import type * as PdfjsLib from "pdfjs-dist";

/** Aset PDF.js disalin ke `public/vendor` saat build (lihat apps/web/scripts/copy-vendor.mjs). */
const VENDOR = "/vendor/pdfjs";
export const PDFJS_WORKER_URL = `${VENDOR}/pdf.worker.min.mjs`;

let loader: Promise<typeof PdfjsLib> | null = null;

export function loadPdfjs(): Promise<typeof PdfjsLib> {
  loader ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return pdfjs;
  });
  return loader;
}

export type PdfSource = ArrayBuffer | Uint8Array | Blob;

async function toBytes(source: PdfSource): Promise<Uint8Array> {
  if (source instanceof Blob) return new Uint8Array(await source.arrayBuffer());
  // PDF.js memindahkan buffer ke worker-nya; salin supaya data pemanggil tetap utuh.
  return source instanceof Uint8Array ? source.slice() : new Uint8Array(source.slice(0));
}

export async function openPdf(source: PdfSource) {
  const pdfjs = await loadPdfjs();
  return pdfjs.getDocument({
    data: await toBytes(source),
    standardFontDataUrl: `${VENDOR}/standard_fonts/`,
    cMapUrl: `${VENDOR}/cmaps/`,
    wasmUrl: `${VENDOR}/wasm/`,
    iccUrl: `${VENDOR}/iccs/`,
  }).promise;
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Gagal membuat gambar dari halaman PDF"))), type, quality),
  );
}

export interface RenderedPage {
  /** Ukuran halaman asli dalam poin PDF. */
  width: number;
  height: number;
  blob: Blob;
}

export interface RenderOptions {
  dpi?: number;
  /** Lebar target dalam piksel; bila diisi, `dpi` diabaikan. */
  targetWidth?: number;
  type?: "image/jpeg" | "image/png";
  quality?: number;
  pages?: number[];
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Merender halaman PDF menjadi gambar. Dipakai untuk pratinjau, kompresi kuat,
 * dan OCR dokumen hasil pindai.
 */
export async function renderPdfPages(source: PdfSource, options: RenderOptions = {}): Promise<RenderedPage[]> {
  const result: RenderedPage[] = [];
  for await (const page of iteratePdfPages(source, options)) result.push(page);
  return result;
}

/** Seperti `renderPdfPages`, tetapi menyerahkan halaman satu per satu supaya tampilan bisa diperbarui bertahap. */
export async function* iteratePdfPages(source: PdfSource, options: RenderOptions = {}): AsyncGenerator<RenderedPage> {
  const doc = await openPdf(source);
  try {
    const indices = options.pages ?? Array.from({ length: doc.numPages }, (_, i) => i);
    for (const [done, index] of indices.entries()) {
      options.signal?.throwIfAborted();
      const page = await doc.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      const scale = options.targetWidth ? options.targetWidth / base.width : (options.dpi ?? 110) / 72;
      const viewport = page.getViewport({ scale });
      const canvas = makeCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d")!;
      // Latar putih: JPEG tidak punya transparansi.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const blob = await canvasToBlob(canvas, options.type ?? "image/jpeg", options.quality ?? 0.75);
      page.cleanup();
      canvas.width = canvas.height = 0;
      options.onProgress?.(done + 1, indices.length);
      yield { width: base.width, height: base.height, blob };
    }
  } finally {
    void doc.loadingTask.destroy();
  }
}

export async function getPdfPageCount(source: PdfSource): Promise<number> {
  const doc = await openPdf(source);
  const count = doc.numPages;
  void doc.loadingTask.destroy();
  return count;
}
