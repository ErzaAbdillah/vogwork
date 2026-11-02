import { describe, expect, it } from "vitest";
import { formatNomor, formatRupiah, formatTanggal, terbilang, terbilangRupiah } from "./indonesia";
import { chunkPages, parsePageRanges } from "./ranges";
import { toWinAnsi } from "./winansi";

describe("terbilang", () => {
  it.each([
    [0, "nol"],
    [1, "satu"],
    [11, "sebelas"],
    [15, "lima belas"],
    [100, "seratus"],
    [111, "seratus sebelas"],
    [1000, "seribu"],
    [1001, "seribu satu"],
    [21500, "dua puluh satu ribu lima ratus"],
    [1_250_000, "satu juta dua ratus lima puluh ribu"],
    [2_000_001_000, "dua miliar seribu"],
  ])("%d → %s", (n, words) => {
    expect(terbilang(n)).toBe(words);
  });

  it("menulis rupiah dengan huruf kapital di awal kata", () => {
    expect(terbilangRupiah(150000)).toBe("Seratus Lima Puluh Ribu Rupiah");
  });
});

describe("format Indonesia", () => {
  it("rupiah tanpa -0", () => {
    expect(formatRupiah(1250000)).toBe("Rp 1.250.000");
    expect(formatRupiah(-0)).toBe("Rp 0");
  });

  it("tanggal", () => {
    expect(formatTanggal("2026-11-02")).toBe("2 November 2026");
    expect(formatTanggal("2026-11-02", { hari: true })).toBe("Senin, 2 November 2026");
  });

  it("nomor surat dan invoice", () => {
    const date = new Date(2026, 10, 2);
    expect(formatNomor("{kode}/{nomor:3}/{unit}/{bulan-romawi}/{tahun}", { nomor: 7, kode: "005", unit: "SEKR", date })).toBe(
      "005/007/SEKR/XI/2026",
    );
    expect(formatNomor("INV/{tahun}/{bulan}/{nomor:4}", { nomor: 12, date })).toBe("INV/2026/11/0012");
  });
});

describe("rentang halaman", () => {
  it("mengurai rentang campuran", () => {
    expect(parsePageRanges("1-3, 5, 9-", 10)).toEqual([0, 1, 2, 4, 8, 9]);
    expect(parsePageRanges("3-1", 5)).toEqual([2, 1, 0]);
    expect(parsePageRanges("12", 5)).toEqual([]);
    expect(() => parsePageRanges("abc", 5)).toThrow();
  });

  it("membagi per N halaman", () => {
    expect(chunkPages(5, 2)).toEqual([[0, 1], [2, 3], [4]]);
  });
});

describe("WinAnsi", () => {
  it("mengganti karakter yang tidak didukung font standar PDF", () => {
    expect(toWinAnsi("Café “ok” – 5 ≥ 3 ✓")).toBe("Café “ok” – 5 >= 3 ?");
  });
});
