export type ImageMime = "image/png" | "image/jpeg" | "image/webp";

export async function decodeImage(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Gambar tidak bisa dibaca. Format yang didukung: PNG, JPG, WEBP, GIF, BMP.");
  }
}

function makeCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function canvasToBlob(canvas: OffscreenCanvas | HTMLCanvasElement, type: ImageMime, quality?: number): Promise<Blob> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Browser gagal menyandikan gambar"))), type, quality),
  );
}

export function fitSize(width: number, height: number, maxWidth?: number, maxHeight?: number) {
  const scale = Math.min(1, maxWidth ? maxWidth / width : 1, maxHeight ? maxHeight / height : 1);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export interface ConvertOptions {
  type: ImageMime;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** Warna latar untuk bagian transparan; JPEG selalu memakai latar (bawaan putih). */
  background?: string;
}

export async function convertImage(blob: Blob, options: ConvertOptions): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await decodeImage(blob);
  const { width, height } = fitSize(bitmap.width, bitmap.height, options.maxWidth, options.maxHeight);
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  const background = options.background ?? (options.type === "image/jpeg" ? "#ffffff" : undefined);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const out = await canvasToBlob(canvas, options.type, options.quality);
  return { blob: out, width, height };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Logo dan tanda tangan disimpan sebagai PNG kecil supaya bisa disematkan ke PDF dan DOCX. */
export async function toPngDataUrl(blob: Blob, maxSize = 600): Promise<string> {
  const { blob: png } = await convertImage(blob, { type: "image/png", maxWidth: maxSize, maxHeight: maxSize });
  return blobToDataUrl(png);
}

export function extensionFor(type: string): string {
  return { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[type] ?? "bin";
}

export function replaceExtension(filename: string, ext: string): string {
  const base = filename.replace(/\.[^./\\]+$/, "");
  return `${base || "gambar"}.${ext}`;
}
