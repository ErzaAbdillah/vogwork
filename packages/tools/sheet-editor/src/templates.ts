import { newSheet, type CellStyle, type Workbook } from "@vogwork/formats/sheet";
import type { WorkspaceTemplate } from "@vogwork/ui";

function sheetFrom(name: string, rows: (string | [string, CellStyle])[][], widths: number[] = []) {
  const sheet = newSheet(name);
  rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      const [v, s] = Array.isArray(cell) ? cell : [cell, undefined];
      if (v || s) sheet.cells[`${String.fromCharCode(65 + c)}${r + 1}`] = { v, ...(s && { s }) };
    }),
  );
  widths.forEach((w, i) => (sheet.colWidths[i] = w));
  return sheet;
}

const H: CellStyle = { b: true, fill: "#e3f1dc" };
const RP: CellStyle = { fmt: "rupiah" };
const TOTAL: CellStyle = { b: true, fmt: "rupiah", fill: "#f6efc9" };

export const templates: WorkspaceTemplate<Workbook>[] = [
  {
    id: "blank",
    name: { id: "Lembar kosong", en: "Blank sheet" },
    description: { id: "100 baris × 26 kolom", en: "100 rows × 26 columns" },
    create: () => ({ sheets: [newSheet("Sheet1")] }),
  },
  {
    id: "budget",
    name: { id: "Anggaran kegiatan", en: "Event budget" },
    description: { id: "Volume × harga, total rupiah", en: "Quantity × price, rupiah totals" },
    create: () => {
      const sheet = sheetFrom(
        "Anggaran",
        [
          [["Rencana Anggaran Kegiatan", { b: true }]],
          [],
          [["Uraian", H], ["Volume", H], ["Satuan", H], ["Harga satuan", H], ["Jumlah", H]],
          ["Konsumsi peserta", "80", "kotak", ["35000", RP], ["=B4*D4", RP]],
          ["Bahan pelatihan", "40", "paket", ["30000", RP], ["=B5*D5", RP]],
          ["Sewa proyektor", "2", "hari", ["250000", RP], ["=B6*D6", RP]],
          ["Honor narasumber", "2", "orang", ["750000", RP], ["=B7*D7", RP]],
          [["Total", { b: true }], "", "", "", ["=SUM(E4:E7)", TOTAL]],
        ],
        [200, 80, 80, 130, 140],
      );
      sheet.merges = ["A1:E1"];
      sheet.chart = { type: "bar", labels: "A4:A7", series: ["E4:E7"], title: "Jumlah per uraian" };
      return { sheets: [sheet] };
    },
  },
  {
    id: "grades",
    name: { id: "Daftar nilai", en: "Grade list" },
    description: { id: "Rata-rata, predikat dengan IF", en: "Averages, grades with IF" },
    create: () => {
      const rows: (string | [string, CellStyle])[][] = [[["Nama", H], ["Tugas", H], ["UTS", H], ["UAS", H], ["Rata-rata", H], ["Predikat", H]]];
      const names = ["Andi Pratama", "Siti Rahmawati", "Rizky Maulana", "Nur Aini", "Bagus Setiawan"];
      const scores = [
        [85, 78, 88],
        [92, 90, 95],
        [70, 65, 72],
        [88, 84, 80],
        [76, 80, 79],
      ];
      names.forEach((n, i) => {
        const r = i + 2;
        rows.push([n, ...scores[i]!.map(String), [`=ROUND(AVERAGE(B${r}:D${r}),1)`, { fmt: "decimal" }], `=IF(E${r}>=85,"A",IF(E${r}>=75,"B","C"))`]);
      });
      rows.push([["Rata-rata kelas", { b: true }], "", "", "", [`=ROUND(AVERAGE(E2:E6),1)`, { b: true, fmt: "decimal" }]]);
      const sheet = sheetFrom("Nilai", rows, [180, 70, 70, 70, 100, 90]);
      sheet.chart = { type: "bar", labels: "A2:A6", series: ["E2:E6"], title: "Rata-rata nilai" };
      return { sheets: [sheet] };
    },
  },
  {
    id: "cash",
    name: { id: "Buku kas harian", en: "Daily cash book" },
    description: { id: "Masuk, keluar, saldo berjalan", en: "In, out, running balance" },
    create: () => {
      const D: CellStyle = { fmt: "date" };
      const sheet = sheetFrom(
        "Kas",
        [
          [["Tanggal", H], ["Keterangan", H], ["Masuk", H], ["Keluar", H], ["Saldo", H]],
          [["01/11/2026", D], "Saldo awal", ["2000000", RP], ["0", RP], ["=C2-D2", RP]],
          [["02/11/2026", D], "Penjualan", ["850000", RP], ["0", RP], ["=E2+C3-D3", RP]],
          [["02/11/2026", D], "Beli bahan baku", ["0", RP], ["420000", RP], ["=E3+C4-D4", RP]],
          [["03/11/2026", D], "Penjualan", ["1100000", RP], ["0", RP], ["=E4+C5-D5", RP]],
          [["Jumlah", { b: true }], "", ["=SUM(C2:C5)", TOTAL], ["=SUM(D2:D5)", TOTAL], ["=E5", TOTAL]],
        ],
        [110, 200, 130, 130, 140],
      );
      return { sheets: [sheet] };
    },
  },
];
