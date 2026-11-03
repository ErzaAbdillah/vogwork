import { mmToPx, PAPERS, PHOTO_SIZES, placement, sheetLayout, type Adjust, type Crop, type Paper, type PhotoSize } from "./layout";

export type Source = ImageBitmap | HTMLCanvasElement;

/**
 * Menggambar pas foto: latar warna (bila ada), lalu foto yang sudah diatur
 * terang/kontrasnya dan dipotong sesuai bingkai. `width` menentukan resolusi.
 */
export function renderPhoto(source: Source, options: { size: PhotoSize; crop: Crop; adjust: Adjust; background: string | null; width?: number }): HTMLCanvasElement {
  const { w, h } = PHOTO_SIZES[options.size];
  const outW = options.width ?? mmToPx(w);
  const outH = Math.round((outW * h) / w);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = options.background ?? "#ffffff";
  ctx.fillRect(0, 0, outW, outH);
  const p = placement(source.width, source.height, outW, outH, options.crop);
  ctx.filter = `brightness(${options.adjust.brightness}) contrast(${options.adjust.contrast})`;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, p.x, p.y, p.width, p.height);
  ctx.filter = "none";
  return canvas;
}

/** Lembar cetak 300 dpi berisi salinan foto, dengan garis potong tipis. */
export function renderSheet(photo: HTMLCanvasElement, options: { paper: Paper; size: PhotoSize; count?: number; cutLines: boolean }): HTMLCanvasElement {
  const paper = PAPERS[options.paper];
  const { w, h } = PHOTO_SIZES[options.size];
  const layout = sheetLayout(options.paper, options.size, options.count);
  const canvas = document.createElement("canvas");
  canvas.width = mmToPx(paper.w);
  canvas.height = mmToPx(paper.h);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const slot of layout.slots) {
    const x = mmToPx(slot.x);
    const y = mmToPx(slot.y);
    ctx.drawImage(photo, x, y, mmToPx(w), mmToPx(h));
    if (options.cutLines) {
      ctx.strokeStyle = "#b8bec6";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 0.5, y - 0.5, mmToPx(w) + 1, mmToPx(h) + 1);
    }
  }
  return canvas;
}

export function canvasBlob(canvas: HTMLCanvasElement, type: "image/jpeg" | "image/png", quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat gambar"))), type, quality));
}

/** Foto besar diperkecil dulu supaya potong dan pratinjau tetap ringan. */
export async function loadPhoto(blob: Blob, max = 2400): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}
