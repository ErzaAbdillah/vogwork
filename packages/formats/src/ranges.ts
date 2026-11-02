/**
 * Mengurai rentang halaman seperti "1-3, 5, 8-" menjadi indeks berbasis 0.
 * Halaman di luar jumlah halaman diabaikan; urutan tulisan pengguna dipertahankan.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const pages: number[] = [];
  for (const raw of input.split(/[,;]/)) {
    const part = raw.trim();
    if (!part) continue;
    const match = /^(\d*)\s*-\s*(\d*)$/.exec(part);
    if (match) {
      const start = match[1] ? Number(match[1]) : 1;
      const end = match[2] ? Number(match[2]) : pageCount;
      const step = start <= end ? 1 : -1;
      for (let p = start; step > 0 ? p <= end : p >= end; p += step) {
        if (p >= 1 && p <= pageCount) pages.push(p - 1);
      }
    } else if (/^\d+$/.test(part)) {
      const p = Number(part);
      if (p >= 1 && p <= pageCount) pages.push(p - 1);
    } else {
      throw new Error(`Rentang halaman tidak dikenali: "${part}"`);
    }
  }
  return pages;
}

/** Membagi halaman menjadi kelompok berisi `size` halaman. */
export function chunkPages(pageCount: number, size: number): number[][] {
  const groups: number[][] = [];
  for (let start = 0; start < pageCount; start += size) {
    groups.push(Array.from({ length: Math.min(size, pageCount - start) }, (_, i) => start + i));
  }
  return groups;
}
