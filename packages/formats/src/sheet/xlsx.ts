import type ExcelJSType from "exceljs";
import { createEvaluator, isError, looksLikeDate, parseLiteral, type Value } from "./formula";
import { NUMBER_FORMATS } from "./format";
import { addr, colIndex, DEFAULT_COL_WIDTH, newSheet, parseAddr, serialToDate, dateToSerial, type CellStyle, type NumberFormat, type Workbook } from "./model";

type ExcelJS = typeof ExcelJSType;
let loader: Promise<ExcelJS> | null = null;
async function loadExcelJS(): Promise<ExcelJS> {
  loader ??= import("exceljs").then((m) => ((m as unknown as { default?: ExcelJS }).default ?? (m as unknown as ExcelJS)));
  return loader;
}

const PX_PER_CHAR = 7;
const argb = (hex?: string) => (hex ? `FF${hex.replace("#", "").toUpperCase()}` : undefined);
const fromArgb = (value?: string) => (value && /^[0-9a-f]{8}$/i.test(value) ? `#${value.slice(2).toLowerCase()}` : undefined);

function numFmtFor(fmt?: NumberFormat): string | undefined {
  return NUMBER_FORMATS.find((f) => f.value === fmt && f.value !== "general")?.excel;
}

function fmtFromNumFmt(numFmt?: string): NumberFormat | undefined {
  if (!numFmt || numFmt === "General") return undefined;
  if (numFmt === "@") return "text";
  if (/Rp/i.test(numFmt)) return "rupiah";
  if (numFmt.includes("%")) return "percent";
  if (/[dy]/i.test(numFmt) && /m/i.test(numFmt)) return "date";
  if (/0\.0/.test(numFmt)) return "decimal";
  if (/#|0/.test(numFmt)) return "number";
  return undefined;
}

/**
 * Menulis workbook ke XLSX: nilai, formula beserta hasil terakhirnya, format angka
 * dan tanggal, gaya dasar, lebar kolom, sel gabungan. Grafik ikut sebagai gambar.
 */
export async function workbookToXlsx(workbook: Workbook, options: { chartImages?: Record<string, Uint8Array> } = {}): Promise<Uint8Array> {
  const ExcelJS = await loadExcelJS();
  const book = new ExcelJS.Workbook();
  book.creator = "VogWork";
  book.created = new Date();
  const evaluate = createEvaluator(workbook);

  workbook.sheets.forEach((sheet, sheetIdx) => {
    const ws = book.addWorksheet(sheet.name.slice(0, 31) || `Sheet${sheetIdx + 1}`);
    let maxCol = 0;
    for (const [address, cell] of Object.entries(sheet.cells)) {
      const raw = cell.v ?? "";
      if (!raw && !cell.s) continue;
      const target = ws.getCell(address);
      const p = parseAddr(address);
      if (p) maxCol = Math.max(maxCol, p.col);
      if (raw.startsWith("=")) {
        const result = evaluate(sheetIdx, address);
        target.value = {
          formula: raw.slice(1).replace(/;/g, ","),
          result: isError(result) ? { error: result.error.replace("#SIKLUS!", "#REF!") } : cell.s?.fmt === "date" && typeof result === "number" ? serialToDate(result) : (result ?? undefined),
        } as never;
      } else if (cell.s?.fmt === "text") {
        target.value = raw;
      } else {
        const value = parseLiteral(raw);
        target.value = cell.s?.fmt === "date" && typeof value === "number" ? serialToDate(value) : (value as string | number | boolean | null);
      }
      const s = cell.s;
      if (s) {
        if (s.b || s.i || s.u || s.color) target.font = { bold: s.b, italic: s.i, underline: s.u, color: s.color ? { argb: argb(s.color) } : undefined };
        if (s.fill) target.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(s.fill) } };
        if (s.align) target.alignment = { horizontal: s.align };
        const numFmt = numFmtFor(s.fmt);
        if (numFmt) target.numFmt = numFmt;
      }
    }
    for (let c = 0; c <= Math.max(maxCol, ...Object.keys(sheet.colWidths).map(Number)); c++) {
      const width = sheet.colWidths[c];
      if (width && width !== DEFAULT_COL_WIDTH) ws.getColumn(c + 1).width = Math.round((width / PX_PER_CHAR) * 10) / 10;
    }
    for (const merge of sheet.merges) ws.mergeCells(merge);

    const chart = options.chartImages?.[sheet.id];
    if (chart && sheet.chart) {
      const imageId = book.addImage({ buffer: chart as never, extension: "png" });
      const anchorCol = maxCol + 2;
      ws.addImage(imageId, { tl: { col: anchorCol, row: 1 }, ext: { width: 480, height: 300 } });
    }
  });

  const buffer = await book.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

function cellText(value: unknown): { raw: string; date?: boolean } {
  if (value === null || value === undefined) return { raw: "" };
  if (value instanceof Date) return { raw: String(dateToSerial(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate())), date: true };
  if (typeof value === "number" || typeof value === "boolean") return { raw: String(value).toUpperCase() === "TRUE" || String(value).toUpperCase() === "FALSE" ? String(value).toUpperCase() : String(value) };
  if (typeof value === "string") return { raw: value.startsWith("=") ? `'${value}` : value };
  const v = value as Record<string, unknown>;
  if (Array.isArray(v.richText)) return { raw: (v.richText as { text: string }[]).map((r) => r.text).join("") };
  if (typeof v.text === "string") return { raw: v.text };
  if (typeof v.formula === "string" || typeof v.sharedFormula === "string") return { raw: "" };
  if (typeof v.error === "string") return { raw: v.error };
  return { raw: String(value) };
}

export interface XlsxImport {
  workbook: Workbook;
  report: string[];
}

/** Membaca XLSX ke model VogWork beserta laporan elemen yang tidak didukung. */
export async function xlsxToWorkbook(data: ArrayBuffer): Promise<XlsxImport> {
  const ExcelJS = await loadExcelJS();
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(data as never);
  const report = new Set<string>();
  const workbook: Workbook = { sheets: [] };

  book.eachSheet((ws) => {
    const sheet = newSheet(ws.name, Math.max(100, ws.rowCount + 20), Math.max(26, ws.columnCount + 2));
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const address = cell.address;
        const value = cell.value as unknown;
        const formula = (value as { formula?: string; sharedFormula?: string } | null)?.formula ?? (cell as unknown as { formula?: string }).formula;
        let raw = formula ? `=${formula}` : cellText(value).raw;
        const style: CellStyle = {};
        if (value instanceof Date) style.fmt = "date";
        const font = cell.font;
        if (font?.bold) style.b = true;
        if (font?.italic) style.i = true;
        if (font?.underline) style.u = true;
        const color = fromArgb(font?.color?.argb);
        if (color && color !== "#000000") style.color = color;
        const fill = cell.fill as { type?: string; fgColor?: { argb?: string } } | undefined;
        const fillColor = fill?.type === "pattern" ? fromArgb(fill.fgColor?.argb) : undefined;
        if (fillColor && fillColor !== "#ffffff") style.fill = fillColor;
        const align = cell.alignment?.horizontal;
        if (align === "left" || align === "center" || align === "right") style.align = align;
        const fmt = fmtFromNumFmt(cell.numFmt);
        if (fmt) style.fmt = fmt;
        if (style.fmt === "date" && !formula && typeof value === "number") raw = String(value);
        if (style.fmt === "date" && looksLikeDate(raw)) raw = String(parseLiteral(raw));
        if (!raw && Object.keys(style).length === 0) return;
        sheet.cells[address] = { v: raw, ...(Object.keys(style).length > 0 && { s: style }) };
      });
    });
    ws.columns?.forEach((col, i) => {
      if (col.width) sheet.colWidths[i] = Math.round(col.width * PX_PER_CHAR);
    });
    const merges = (ws.model as { merges?: string[] }).merges ?? [];
    sheet.merges = merges.filter((m) => /^[A-Z]+\d+:[A-Z]+\d+$/.test(m));
    if (ws.getImages().length > 0) report.add(`Sheet “${ws.name}”: gambar dan grafik tidak dibawa.`);
    const extra = ws as unknown as { conditionalFormattings?: unknown[]; dataValidations?: { model?: Record<string, unknown> } };
    if (extra.conditionalFormattings?.length) report.add(`Sheet “${ws.name}”: format bersyarat tidak dibawa.`);
    if (extra.dataValidations?.model && Object.keys(extra.dataValidations.model).length) report.add(`Sheet “${ws.name}”: validasi data tidak dibawa.`);
    workbook.sheets.push(sheet);
  });

  if (workbook.sheets.length === 0) workbook.sheets.push(newSheet("Sheet1"));

  // Formula di luar daftar fungsi yang didukung akan tampil sebagai #NAME?.
  const evaluate = createEvaluator(workbook);
  const unknown = new Set<string>();
  workbook.sheets.forEach((sheet, i) => {
    for (const [address, cell] of Object.entries(sheet.cells)) {
      if (!cell.v?.startsWith("=")) continue;
      const result: Value = evaluate(i, address);
      if (isError(result) && result.error === "#NAME?") for (const m of cell.v.matchAll(/([A-Z][A-Z0-9.]*)\(/gi)) unknown.add(m[1]!.toUpperCase());
    }
  });
  if (unknown.size) report.add(`Fungsi belum didukung: ${[...unknown].slice(0, 8).join(", ")}. Hasilnya tampil #NAME?.`);
  report.add("Pivot table, makro VBA, dan grafik kompleks tidak dibawa.");
  return { workbook, report: [...report] };
}

export { colIndex, addr };
