import type { Locale } from "@vogwork/core";

export type Dict = Record<string, string>;

/** Mengganti `{nama}` di dalam teks dengan nilai dari `vars`. */
export function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export function formatBytes(bytes: number, locale: Locale = "id"): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toLocaleString(locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: digits })} ${units[unit]}`;
}
