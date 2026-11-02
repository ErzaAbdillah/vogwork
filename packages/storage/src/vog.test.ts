import { describe, expect, it } from "vitest";
import { hashBytes, packVog, unpackVog, type VogFile } from "./vog";
import { safeFilename } from "./save";

describe("format .vog", () => {
  it("bolak-balik tanpa kehilangan isi dan aset", async () => {
    const image = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
    const hash = await hashBytes(image);
    const file: VogFile = {
      id: "f1",
      type: "document",
      title: "Surat Undangan",
      schemaVersion: 1,
      createdAt: "2026-11-02T00:00:00.000Z",
      updatedAt: "2026-11-02T00:00:00.000Z",
      content: { type: "doc", content: [{ type: "paragraph", text: "Halo" }] },
      assets: [{ hash, mime: "image/png" }],
    };
    const unpacked = unpackVog(packVog(file, [{ hash, mime: "image/png", data: image }]));
    expect(unpacked.file).toEqual(file);
    expect([...unpacked.assets[0]!.data]).toEqual([...image]);
  });

  it("menolak zip tanpa file.json", () => {
    expect(() => unpackVog(new Uint8Array([80, 75, 5, 6, ...new Array(18).fill(0)]))).toThrow(/file.json/);
  });
});

describe("safeFilename", () => {
  it("membuang karakter terlarang", () => {
    expect(safeFilename('Sertifikat: Budi/Ani?.pdf')).toBe("Sertifikat BudiAni.pdf");
    expect(safeFilename("   ")).toBe("file");
  });
});
