/** Gambar yang bisa ditempel: tanda tangan, paraf, atau stempel, disimpan sebagai PNG transparan. */
export interface Art {
  id: string;
  kind: "signature" | "initials" | "stamp";
  dataUrl: string;
  /** Lebar ÷ tinggi. */
  ratio: number;
}

let seq = 0;
export const artId = () => `a${Date.now().toString(36)}${(seq++).toString(36)}`;

function canvasPng(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/png");
}

/** Memotong area kosong di sekitar coretan supaya tanda tangan pas di kotaknya. */
export function trimCanvas(source: HTMLCanvasElement, padding = 8): { dataUrl: string; ratio: number } | null {
  const ctx = source.getContext("2d", { willReadFrequently: true })!;
  const { width, height } = source;
  const data = ctx.getImageData(0, 0, width, height).data;
  let [x1, y1, x2, y2] = [width, height, -1, -1];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3]! > 8) {
        if (x < x1) x1 = x;
        if (y < y1) y1 = y;
        if (x > x2) x2 = x;
        if (y > y2) y2 = y;
      }
  if (x2 < 0) return null;
  const w = x2 - x1 + 1 + padding * 2;
  const h = y2 - y1 + 1 + padding * 2;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(source, x1 - padding, y1 - padding, w, h, 0, 0, w, h);
  return { dataUrl: canvasPng(out), ratio: w / h };
}

/**
 * Foto tanda tangan di kertas: piksel terang dibuat transparan dan tinta
 * diwarnai seragam, lalu area kosong dipotong.
 */
export async function cleanSignaturePhoto(file: Blob, ink: string | null): Promise<{ dataUrl: string; ratio: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const [ir, ig, ib] = ink ? [1, 3, 5].map((i) => Number.parseInt(ink.slice(i, i + 2), 16)) : [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    // Kertas (terang) hilang bertahap, tinta (gelap) tetap; tepi dihaluskan.
    const alpha = Math.max(0, Math.min(255, ((200 - lum) / 120) * 255));
    if (ink) {
      d[i] = ir!;
      d[i + 1] = ig!;
      d[i + 2] = ib!;
    }
    d[i + 3] = Math.min(d[i + 3]!, alpha);
  }
  ctx.putImageData(img, 0, 0);
  return trimCanvas(canvas, 4) ?? { dataUrl: canvasPng(canvas), ratio: canvas.width / canvas.height };
}

export interface StampSpec {
  shape: "round" | "rect";
  top: string;
  middle: string;
  bottom: string;
  color: string;
}

/** Stempel bulat (teks melingkar) atau persegi, sebagai PNG transparan. */
export function drawStamp(spec: StampSpec): { dataUrl: string; ratio: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  // Gaya diatur setelah ukuran kanvas ditetapkan, karena mengubah ukuran mereset konteks.
  if (spec.shape === "round") {
    const S = 520;
    canvas.width = canvas.height = S;
    ctx.strokeStyle = spec.color;
    ctx.fillStyle = spec.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const c = S / 2;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(c, c, c - 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(c, c, c - 92, 0, Math.PI * 2);
    ctx.stroke();
    // Teks atas melengkung mengikuti lingkaran.
    const text = spec.top.toUpperCase();
    ctx.font = "700 40px Arial, sans-serif";
    const radius = c - 52;
    const spread = Math.min(Math.PI * 1.5, (ctx.measureText(text).width * 1.08) / radius);
    [...text].forEach((ch, i, all) => {
      const angle = -Math.PI / 2 - spread / 2 + (spread * (i + 0.5)) / all.length;
      ctx.save();
      ctx.translate(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    ctx.font = "800 54px Arial, sans-serif";
    ctx.fillText(spec.middle.toUpperCase(), c, c - 8, S - 220);
    ctx.font = "600 30px Arial, sans-serif";
    ctx.fillText(spec.bottom, c, c + 52, S - 220);
    ctx.font = "700 34px Arial, sans-serif";
    ctx.fillText("★", c, S - 52);
  } else {
    canvas.width = 720;
    canvas.height = 260;
    ctx.strokeStyle = spec.color;
    ctx.fillStyle = spec.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 700, 240);
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, 664, 204);
    ctx.font = "800 84px Arial, sans-serif";
    ctx.fillText(spec.middle.toUpperCase(), 360, spec.bottom ? 112 : 130, 620);
    if (spec.bottom) {
      ctx.font = "600 34px Arial, sans-serif";
      ctx.fillText(spec.bottom, 360, 190, 620);
    }
  }
  return { dataUrl: canvasPng(canvas), ratio: canvas.width / canvas.height };
}
