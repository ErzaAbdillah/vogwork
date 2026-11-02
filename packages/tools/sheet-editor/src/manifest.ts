import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "sheet-editor",
  slug: "spreadsheet",
  kind: "app",
  wide: true,
  name: { id: "Spreadsheet", en: "Spreadsheets" },
  tagline: {
    id: "Hitung anggaran dan data dengan formula, buka file Excel, lalu simpan kembali sebagai XLSX.",
    en: "Work with budgets and data using formulas, open Excel files, and save back to XLSX.",
  },
  category: "sheet",
  icon: "sheet",
  keywords: ["spreadsheet", "excel", "xlsx", "lembar kerja", "tabel", "rumus", "formula", "anggaran", "rab", "sum", "vlookup", "csv"],
  inputs: [{ name: "workbook", type: "json" }],
  outputs: [{ name: "xlsx", type: "file/any" }],
  seo: {
    title: "Spreadsheet Online Gratis — Buka & Simpan File Excel (XLSX)",
    description:
      "Lembar kerja gratis di browser dengan formula SUM, IF, SUMIF, VLOOKUP, format rupiah dan tanggal, sel gabungan, beberapa sheet, dan grafik. Buka file Excel dan simpan lagi sebagai XLSX atau CSV.",
    steps: [
      "Pilih template (anggaran, daftar nilai, kas harian) atau buka file .xlsx/.csv.",
      "Ketik angka, teks, atau formula yang diawali “=”, misalnya =SUM(B2:B10).",
      "Atur format rupiah, persen, atau tanggal, tebalkan judul, dan gabungkan sel.",
      "File tersimpan otomatis. Unduh XLSX untuk Excel atau CSV untuk aplikasi lain.",
    ],
    faq: [
      { q: "Fungsi apa saja yang didukung?", a: "SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, IF, IFERROR, AND, OR, SUMIF, COUNTIF, AVERAGEIF, VLOOKUP, INDEX, MATCH, ROUND, CONCAT, LEFT, RIGHT, MID, TODAY, DATE, dan lainnya. Titik koma juga diterima sebagai pemisah argumen." },
      { q: "Apakah formula tetap jalan setelah dibuka di Excel?", a: "Ya. Formula disimpan apa adanya beserta hasil terakhirnya, sehingga Excel langsung menampilkan nilai yang sama." },
      { q: "Apa yang belum didukung?", a: "Pivot table, makro VBA, format bersyarat, dan grafik kompleks. Grafik dasar diekspor sebagai gambar." },
    ],
  },
};
