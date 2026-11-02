import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { handlers } from "./tasks";

const noop = () => {};

async function makePdf(pages: number, label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) doc.addPage([300, 400]).drawText(`${label} ${i + 1}`, { x: 20, y: 360, font, size: 14 });
  return doc.save();
}

async function pageCount(bytes: Uint8Array) {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe("tugas PDF", () => {
  it("menggabungkan dan memilih halaman", async () => {
    const a = await makePdf(2, "A");
    const b = await makePdf(3, "B");
    const merged = await handlers["pdf.merge"]({ files: [{ bytes: a }, { bytes: b, pages: [0, 2] }] }, noop);
    expect(await pageCount(merged)).toBe(4);
  });

  it("memisah per kelompok halaman", async () => {
    const src = await makePdf(5, "S");
    const parts = await handlers["pdf.split"]({ bytes: src, groups: [[0, 1], [2], [3, 4]] }, noop);
    expect(await Promise.all(parts.map(pageCount))).toEqual([2, 1, 2]);
  });

  it("menolak file yang bukan PDF", async () => {
    await expect(handlers["pdf.merge"]({ files: [{ bytes: new Uint8Array([1, 2, 3]) }] }, noop)).rejects.toThrow(/bukan PDF/);
  });

  it("optimasi tidak pernah memperbesar file", async () => {
    const src = await makePdf(3, "O");
    const out = await handlers["pdf.optimize"]({ bytes: src }, noop);
    expect(out.byteLength).toBeLessThanOrEqual(src.byteLength);
    expect(await pageCount(out)).toBe(3);
  });

  it("mengisi template PDF per baris data", async () => {
    const template = await makePdf(1, "Template");
    const input = {
      template: { kind: "pdf" as const, bytes: template },
      fields: [{ x: 0.5, y: 0.5, align: "center" as const, size: 0.06, font: "times-bold" as const, color: "#112233" }],
      records: [
        { name: "Budi", values: ["Budi Santoso"] },
        { name: "Siti", values: ["Siti Rahmawati ✓"] },
      ],
    };
    const single = await handlers["pdf.stamp"]({ ...input, mode: "single" }, noop);
    expect(single.kind).toBe("pdf");
    expect(await pageCount(single.bytes)).toBe(2);
    const zip = await handlers["pdf.stamp"]({ ...input, mode: "separate" }, noop);
    expect(zip.kind).toBe("zip");
    expect([...zip.bytes.slice(0, 2)]).toEqual([0x50, 0x4b]);
  });
});
