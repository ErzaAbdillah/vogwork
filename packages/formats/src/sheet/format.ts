import { isError, type Value } from "./formula";
import { serialToDate, type NumberFormat } from "./model";

const id = (options: Intl.NumberFormatOptions) => new Intl.NumberFormat("id-ID", options);
const GENERAL = id({ maximumFractionDigits: 10, useGrouping: false });
const NUMBER = id({ maximumFractionDigits: 0 });
const DECIMAL = id({ minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PERCENT = id({ style: "percent", maximumFractionDigits: 2 });

/** Teks tampilan sel sesuai format angka (gaya Indonesia: koma desimal, titik ribuan). */
export function formatValue(value: Value, fmt: NumberFormat = "general"): string {
  if (value === null) return "";
  if (isError(value)) return value.error;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "string") return value;
  const n = Object.is(value, -0) ? 0 : value;
  switch (fmt) {
    case "number":
      return NUMBER.format(n);
    case "decimal":
      return DECIMAL.format(n);
    case "rupiah":
      return `Rp ${NUMBER.format(Math.round(n))}`.replace("Rp -", "-Rp ");
    case "percent":
      return PERCENT.format(n);
    case "date": {
      const d = serialToDate(n);
      return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    }
    default:
      return Math.abs(n) >= 1e15 ? n.toExponential(6) : GENERAL.format(n);
  }
}

/** Angka rata kanan, teks rata kiri, seperti spreadsheet umumnya. */
export function defaultAlign(value: Value): "left" | "right" | "center" {
  if (typeof value === "number") return "right";
  if (typeof value === "boolean" || isError(value)) return "center";
  return "left";
}

export const NUMBER_FORMATS: { value: NumberFormat; id: string; en: string; excel: string }[] = [
  { value: "general", id: "Umum", en: "General", excel: "General" },
  { value: "number", id: "Angka 1.234", en: "Number 1,234", excel: "#,##0" },
  { value: "decimal", id: "Desimal 1.234,56", en: "Decimal 1,234.56", excel: "#,##0.00" },
  { value: "rupiah", id: "Rupiah", en: "Rupiah", excel: '"Rp "#,##0' },
  { value: "percent", id: "Persen", en: "Percent", excel: "0%" },
  { value: "date", id: "Tanggal", en: "Date", excel: "dd/mm/yyyy" },
  { value: "text", id: "Teks", en: "Text", excel: "@" },
];
