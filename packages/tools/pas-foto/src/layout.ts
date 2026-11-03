/** Ukuran pas foto yang umum di Indonesia (lebar × tinggi, cm). */
export const PHOTO_SIZES = {
  "2x3": { w: 20, h: 30 },
  "3x4": { w: 30, h: 40 },
  "4x6": { w: 40, h: 60 },
} as const;

export type PhotoSize = keyof typeof PHOTO_SIZES;

/** Kertas cetak (mm) dan margin tepi yang aman untuk dipotong. */
export const PAPERS = {
  A4: { w: 210, h: 297, margin: 5 },
  "4R": { w: 102, h: 152, margin: 2 },
} as const;

export type Paper = keyof typeof PAPERS;

export const DPI = 300;
export const mmToPx = (mm: number) => Math.round((mm / 25.4) * DPI);

/** Latar pas foto yang lazim dipakai. */
export const BACKGROUNDS = { red: "#d9232d", blue: "#1d5fbf", white: "#ffffff" } as const;

export interface Crop {
  /** 1 = gambar pas menutupi bingkai; lebih besar = diperbesar. */
  zoom: number;
  /** Geser relatif terhadap ukuran bingkai (−0,5 … 0,5). */
  x: number;
  y: number;
}

export interface Adjust {
  brightness: number;
  contrast: number;
}

/**
 * Posisi gambar dalam bingkai keluaran. Rumus yang sama dipakai untuk pratinjau
 * di layar dan file hasil, sehingga keduanya selalu cocok.
 */
export function placement(imageW: number, imageH: number, frameW: number, frameH: number, crop: Crop) {
  const scale = Math.max(frameW / imageW, frameH / imageH) * crop.zoom;
  const drawW = imageW * scale;
  const drawH = imageH * scale;
  const maxX = Math.max(0, (drawW - frameW) / 2);
  const maxY = Math.max(0, (drawH - frameH) / 2);
  const dx = Math.min(maxX, Math.max(-maxX, crop.x * frameW));
  const dy = Math.min(maxY, Math.max(-maxY, crop.y * frameH));
  return { x: (frameW - drawW) / 2 + dx, y: (frameH - drawH) / 2 + dy, width: drawW, height: drawH };
}

/** Geseran dibatasi supaya bingkai tidak pernah menampilkan area kosong. */
export function clampCrop(imageW: number, imageH: number, frameW: number, frameH: number, crop: Crop): Crop {
  const p = placement(imageW, imageH, frameW, frameH, crop);
  return { ...crop, x: (p.x - (frameW - p.width) / 2) / frameW, y: (p.y - (frameH - p.height) / 2) / frameH };
}

export interface SheetLayout {
  cols: number;
  rows: number;
  /** Posisi kiri-atas setiap foto (mm). */
  slots: { x: number; y: number }[];
}

/** Menyusun sebanyak mungkin foto (atau `count`) di kertas, rata tengah, jarak 2 mm. */
export function sheetLayout(paper: Paper, size: PhotoSize, count?: number, gap = 2): SheetLayout {
  const { w: pw, h: ph, margin } = PAPERS[paper];
  const { w, h } = PHOTO_SIZES[size];
  const cols = Math.max(0, Math.floor((pw - margin * 2 + gap) / (w + gap)));
  const rows = Math.max(0, Math.floor((ph - margin * 2 + gap) / (h + gap)));
  const total = Math.min(cols * rows, count ?? cols * rows);
  const usedRows = Math.ceil(total / Math.max(1, cols));
  const startX = (pw - (cols * w + (cols - 1) * gap)) / 2;
  const startY = margin + (ph - margin * 2 - (usedRows * h + (usedRows - 1) * gap)) / 2;
  const slots = Array.from({ length: total }, (_, i) => ({ x: startX + (i % cols) * (w + gap), y: startY + Math.floor(i / cols) * (h + gap) }));
  return { cols, rows, slots };
}
