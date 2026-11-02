const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
const SKALA = ["", "ribu", "juta", "miliar", "triliun", "kuadriliun"];

function bawahSeribu(n: number): string {
  if (n < 12) return SATUAN[n]!;
  if (n < 20) return `${SATUAN[n - 10]} belas`;
  if (n < 100) {
    const sisa = n % 10;
    return `${SATUAN[Math.floor(n / 10)]} puluh${sisa ? ` ${SATUAN[sisa]}` : ""}`;
  }
  const ratus = Math.floor(n / 100);
  const sisa = n % 100;
  const depan = ratus === 1 ? "seratus" : `${SATUAN[ratus]} ratus`;
  return sisa ? `${depan} ${bawahSeribu(sisa)}` : depan;
}

/**
 * Menulis bilangan bulat dalam kata bahasa Indonesia, mis. 1.250.000 →
 * "satu juta dua ratus lima puluh ribu". Pecahan dibulatkan.
 */
export function terbilang(value: number): string {
  if (!Number.isFinite(value)) return "";
  let n = Math.round(Math.abs(value));
  if (n === 0) return "nol";
  if (n >= 1e18) throw new RangeError("Angka terlalu besar untuk ditulis terbilang");

  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]!;
    if (g === 0) continue;
    if (i === 1 && g === 1) words.push("seribu");
    else words.push(`${bawahSeribu(g)}${SKALA[i] ? ` ${SKALA[i]}` : ""}`);
  }
  return `${value < 0 ? "minus " : ""}${words.join(" ")}`;
}

/** "satu juta rupiah" → "Satu Juta Rupiah" untuk kwitansi. */
export function titleCase(text: string): string {
  return text.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase());
}

export function terbilangRupiah(value: number): string {
  return titleCase(`${terbilang(value)} rupiah`);
}

export function formatRupiah(value: number, options: { symbol?: boolean } = {}): string {
  // Normalisasi -0 supaya tidak tampil sebagai "-Rp 0".
  const safe = Object.is(value, -0) || !Number.isFinite(value) ? 0 : value;
  const formatted = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(safe));
  return options.symbol === false ? formatted : `Rp ${formatted}`;
}

/** Mengurai "1.250.000" atau "1250000,50" menjadi angka. */
export function parseRupiah(text: string): number {
  const cleaned = text.replace(/[^\d,-]/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
export const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** Tanggal ISO (yyyy-mm-dd) tanpa pergeseran zona waktu. */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2 November 2026" */
export function formatTanggal(date: Date | string, options: { hari?: boolean } = {}): string {
  const d = typeof date === "string" ? parseIsoDate(date) : date;
  const text = `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  return options.hari ? `${HARI[d.getDay()]}, ${text}` : text;
}

export function bulanRomawi(month: number): string {
  return ROMAWI[month - 1] ?? "";
}

export interface NomorParts {
  nomor: number;
  date: Date;
  kode?: string;
  unit?: string;
}

/**
 * Menyusun nomor surat atau invoice dari pola. Token yang dikenal:
 * `{nomor}`, `{nomor:3}` (diisi nol), `{kode}`, `{unit}`, `{bulan}`, `{bulan-romawi}`, `{tahun}`.
 */
export function formatNomor(pattern: string, parts: NomorParts): string {
  const month = parts.date.getMonth() + 1;
  return pattern.replace(/\{([\w-]+)(?::(\d+))?\}/g, (match, token: string, pad?: string) => {
    switch (token) {
      case "nomor":
        return String(parts.nomor).padStart(pad ? Number(pad) : 0, "0");
      case "kode":
        return parts.kode ?? "";
      case "unit":
        return parts.unit ?? "";
      case "bulan":
        return String(month).padStart(2, "0");
      case "bulan-romawi":
        return bulanRomawi(month);
      case "tahun":
        return String(parts.date.getFullYear());
      default:
        return match;
    }
  });
}
