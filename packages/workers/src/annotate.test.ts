import { degrees, PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { mapPoint } from "./tasks/annotate";
import { handlers } from "./tasks";

const noop = () => {};
// PNG 1×1 transparan.
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

describe("pemetaan titik halaman berputar", () => {
  const box = { x: 0, y: 0, width: 600, height: 800 };
  it.each([
    // [rotasi, titik terlihat kiri-atas → PDF]
    [0, [0, 0], { x: 0, y: 800 }],
    [90, [0, 0], { x: 0, y: 0 }],
    [180, [0, 0], { x: 600, y: 0 }],
    [270, [0, 0], { x: 600, y: 800 }],
  ] as const)("rotasi %d", (rotation, [px, py], expected) => {
    expect(mapPoint(px, py, rotation, box)).toEqual(expected);
  });

  it("memperhitungkan offset crop box", () => {
    expect(mapPoint(10, 20, 0, { x: 5, y: 7, width: 100, height: 200 })).toEqual({ x: 15, y: 187 });
  });
});

describe("tanda tangan dan formulir", () => {
  it("menempel gambar dan teks, mengisi lalu meratakan formulir", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    doc.addPage([600, 800]).setRotation(degrees(90));
    const form = doc.getForm();
    form.createTextField("nama").addToPage(page, { x: 50, y: 700, width: 200, height: 20 });
    form.createCheckBox("setuju").addToPage(page, { x: 50, y: 650, width: 15, height: 15 });
    const bytes = await doc.save();

    const fields = await handlers["pdf.readForm"]({ bytes }, noop);
    expect(fields.map((f) => [f.name, f.type])).toEqual([
      ["nama", "text"],
      ["setuju", "checkbox"],
    ]);

    const out = await handlers["pdf.annotate"](
      {
        bytes,
        items: [
          { kind: "image", page: 0, png: PNG, ref: "ttd", x: 0.6, y: 0.8, w: 0.2, h: 0.08 },
          { kind: "image", page: 1, png: PNG, ref: "ttd", x: 0.6, y: 0.8, w: 0.2, h: 0.08 },
          { kind: "text", page: 1, text: "Disetujui ✓\n3 November 2026", size: 0.02, color: "#1d3b25", font: "helvetica", x: 0.1, y: 0.1, w: 0.3, h: 0.05 },
        ],
        form: { nama: "Andi Pratama", setuju: "1" },
        flatten: true,
      },
      noop,
    );
    const result = await PDFDocument.load(out);
    expect(result.getPageCount()).toBe(2);
    expect(result.getForm().getFields()).toHaveLength(0);
  });
});
