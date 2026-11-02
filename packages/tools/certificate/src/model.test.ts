import { describe, expect, it } from "vitest";
import { pageSizeFor, placeholders, resolveTemplate } from "./model";

describe("template sertifikat", () => {
  it("mengganti kolom tanpa peduli huruf besar/kecil", () => {
    const row = { Nama: "Andi Pratama", Nomor: "001" };
    expect(resolveTemplate("{Nama}", row)).toBe("Andi Pratama");
    expect(resolveTemplate("No. {nomor}/{Tahun}", row)).toBe("No. 001/{Tahun}");
  });

  it("mendaftar placeholder", () => {
    expect(placeholders("{Nama} - {Peran}")).toEqual(["Nama", "Peran"]);
  });

  it("ukuran halaman mengikuti orientasi gambar", () => {
    const [w, h] = pageSizeFor(2000, 1414);
    expect(w).toBe(842);
    expect(h).toBeCloseTo(595.29, 1);
    expect(pageSizeFor(1000, 2000)).toEqual([421, 842]);
  });
});
