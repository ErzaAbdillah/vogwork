import { describe, expect, it } from "vitest";
import { computeTotals } from "./model";

describe("total invoice", () => {
  it("diskon dari subtotal, PPN dari dasar setelah diskon", () => {
    const totals = computeTotals({
      items: [
        { description: "A", qty: 2, unit: "pcs", price: 50_000 },
        { description: "B", qty: 1, unit: "pcs", price: 100_000 },
      ],
      discountPercent: 10,
      taxPercent: 11,
    });
    expect(totals).toEqual({ subtotal: 200_000, discount: 20_000, base: 180_000, tax: 19_800, total: 199_800 });
  });

  it("baris kosong tidak menghasilkan NaN", () => {
    expect(computeTotals({ items: [{ description: "", qty: Number.NaN, unit: "", price: 0 }], discountPercent: 0, taxPercent: 0 }).total).toBe(0);
  });
});
