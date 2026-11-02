export type NumberFormat = "general" | "number" | "decimal" | "rupiah" | "percent" | "date" | "text";

export interface CellStyle {
  b?: boolean;
  i?: boolean;
  u?: boolean;
  align?: "left" | "center" | "right";
  fmt?: NumberFormat;
  /** Warna isian dan teks, format #rrggbb. */
  fill?: string;
  color?: string;
}

export interface Cell {
  /** Isi mentah seperti yang diketik: "12", "Budi", "=SUM(A1:A3)". */
  v?: string;
  s?: CellStyle;
}

export interface ChartSpec {
  type: "bar" | "line";
  /** Rentang label (mis. "A2:A6") dan satu rentang per seri (mis. ["E2:E6"]). */
  labels: string;
  series: string[];
  title: string;
}

export interface Sheet {
  id: string;
  name: string;
  cells: Record<string, Cell>;
  rows: number;
  cols: number;
  /** Lebar kolom dalam piksel, indeks berbasis 0. */
  colWidths: Record<number, number>;
  /** Sel gabungan, mis. "A1:C1". */
  merges: string[];
  chart?: ChartSpec | null;
}

/** Isi file spreadsheet VogWork (`VogFile.content` untuk type "sheet"). */
export interface Workbook {
  sheets: Sheet[];
}

export const DEFAULT_COL_WIDTH = 96;

let seq = 0;
export function newSheet(name: string, rows = 100, cols = 26): Sheet {
  return { id: `s${Date.now().toString(36)}${seq++}`, name, cells: {}, rows, cols, colWidths: {}, merges: [], chart: null };
}

export function newWorkbook(): Workbook {
  return { sheets: [newSheet("Sheet1")] };
}

/** 0 → "A", 26 → "AA" */
export function colName(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    name = String.fromCharCode(65 + r) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

export function colIndex(name: string): number {
  let n = 0;
  for (const ch of name.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function addr(row: number, col: number): string {
  return `${colName(col)}${row + 1}`;
}

export function parseAddr(a: string): { row: number; col: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(a.trim());
  if (!m) return null;
  return { row: Number(m[2]) - 1, col: colIndex(m[1]!) };
}

export interface Range {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export function parseRange(text: string): Range | null {
  const [a, b = a] = text.split(":");
  const p = parseAddr(a ?? "");
  const q = parseAddr(b ?? "");
  if (!p || !q) return null;
  return { r1: Math.min(p.row, q.row), c1: Math.min(p.col, q.col), r2: Math.max(p.row, q.row), c2: Math.max(p.col, q.col) };
}

export function rangeText(r: Range): string {
  const a = addr(r.r1, r.c1);
  const b = addr(r.r2, r.c2);
  return a === b ? a : `${a}:${b}`;
}

/** Sel kiri-atas dari gabungan yang memuat (row, col), atau null. */
export function mergeAt(sheet: Sheet, row: number, col: number): Range | null {
  for (const m of sheet.merges) {
    const r = parseRange(m);
    if (r && row >= r.r1 && row <= r.r2 && col >= r.c1 && col <= r.c2) return r;
  }
  return null;
}

/** Tanggal Excel: jumlah hari sejak 30 Desember 1899. */
const EPOCH = Date.UTC(1899, 11, 30);
export function dateToSerial(year: number, month: number, day: number): number {
  return Math.round((Date.UTC(year, month - 1, day) - EPOCH) / 86_400_000);
}
export function serialToDate(serial: number): Date {
  return new Date(EPOCH + Math.round(serial) * 86_400_000);
}
