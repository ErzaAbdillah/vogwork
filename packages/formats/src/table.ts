import type { TableData } from "@vogwork/core";

type Xlsx = typeof import("xlsx");
let loader: Promise<Xlsx> | null = null;

/** SheetJS cukup besar, jadi hanya dimuat ketika benar-benar dibutuhkan. */
function loadXlsx(): Promise<Xlsx> {
  loader ??= import("xlsx");
  return loader;
}

function toTable(matrix: string[][]): TableData {
  const [head = [], ...body] = matrix;
  const seen = new Map<string, number>();
  const columns = head.map((raw, i) => {
    const base = String(raw ?? "").trim() || `Kolom ${i + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count ? `${base} (${count + 1})` : base;
  });
  const rows = body
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => Object.fromEntries(columns.map((col, i) => [col, String(row[i] ?? "").trim()])));
  return { columns, rows };
}

export interface ReadTableResult extends TableData {
  sheets: string[];
  sheet: string;
}

/**
 * Membaca CSV, TSV, XLS, XLSX, atau ODS. Baris pertama dipakai sebagai nama kolom,
 * dan nilai sel diambil sebagai teks terformat (mis. tanggal tetap "02/11/2026").
 */
export async function readTable(file: Blob & { name?: string }, options: { sheet?: string } = {}): Promise<ReadTableResult> {
  const XLSX = await loadXlsx();
  const name = file.name?.toLowerCase() ?? "";
  const isText = /\.(csv|tsv|txt)$/.test(name) || file.type.startsWith("text/");
  const workbook = isText
    ? XLSX.read(await file.text(), { type: "string", raw: false, FS: name.endsWith(".tsv") ? "\t" : undefined })
    : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = options.sheet && workbook.SheetNames.includes(options.sheet) ? options.sheet : workbook.SheetNames[0]!;
  const matrix = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[sheet]!, { header: 1, raw: false, defval: "", dateNF: "dd/mm/yyyy" });
  return { ...toTable(matrix), sheets: workbook.SheetNames, sheet };
}

/** Mengurai teks yang ditempel dari Excel/Sheets (tab) atau CSV. */
export function parsePastedTable(text: string): TableData {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const delimiter = lines[0]?.includes("\t") ? "\t" : lines[0]?.includes(";") && !lines[0]?.includes(",") ? ";" : ",";
  return toTable(lines.map((line) => splitDelimited(line, delimiter)));
}

function splitDelimited(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) {
      cells.push(cell);
      cell = "";
    } else cell += ch;
  }
  cells.push(cell);
  return cells;
}

function toMatrix(table: TableData): string[][] {
  return [table.columns, ...table.rows.map((row) => table.columns.map((c) => row[c] ?? ""))];
}

export function tableToCsv(table: TableData, delimiter = ","): string {
  const escape = (value: string) =>
    /[",\n\r;\t]/.test(value) || value.includes(delimiter) ? `"${value.replace(/"/g, '""')}"` : value;
  return toMatrix(table)
    .map((row) => row.map(escape).join(delimiter))
    .join("\r\n");
}

export function tableToJson(table: TableData, pretty = true): string {
  return JSON.stringify(table.rows, null, pretty ? 2 : undefined);
}

export async function tableToXlsx(table: TableData, sheetName = "Data"): Promise<Uint8Array> {
  const XLSX = await loadXlsx();
  const sheet = XLSX.utils.aoa_to_sheet(toMatrix(table));
  sheet["!cols"] = table.columns.map((c) => ({
    wch: Math.min(50, Math.max(c.length, ...table.rows.slice(0, 200).map((r) => (r[c] ?? "").length)) + 2),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  return new Uint8Array(XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}

/** Array objek (atau array of array) menjadi tabel; objek bersarang ditulis sebagai JSON. */
export function jsonToTable(value: unknown): TableData {
  const list = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
  if (list.length === 0) return { columns: [], rows: [] };
  if (list.every(Array.isArray)) return toTable((list as unknown[][]).map((row) => row.map(cellText)));

  const columns: string[] = [];
  for (const item of list) {
    if (item && typeof item === "object") for (const key of Object.keys(item)) if (!columns.includes(key)) columns.push(key);
  }
  if (columns.length === 0) return { columns: ["value"], rows: list.map((v) => ({ value: cellText(v) })) };
  const rows = list.map((item) =>
    Object.fromEntries(columns.map((c) => [c, cellText((item as Record<string, unknown> | null)?.[c])])),
  );
  return { columns, rows };
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
