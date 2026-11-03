import { describe, expect, it } from "vitest";
import { clampCrop, mmToPx, placement, sheetLayout } from "./layout";

describe("tata letak pas foto", () => {
  it.each([
    ["A4", "2x3", 81],
    ["A4", "3x4", 36],
    ["A4", "4x6", 16],
    ["4R", "3x4", 9],
  ] as const)("%s muat %s sebanyak", (paper, size, total) => {
    const layout = sheetLayout(paper, size);
    expect(layout.slots).toHaveLength(total);
    const last = layout.slots.at(-1)!;
    expect(last.x).toBeGreaterThanOrEqual(0);
    expect(last.y).toBeGreaterThanOrEqual(0);
  });

  it("jumlah bisa dibatasi dan tetap rata tengah", () => {
    const layout = sheetLayout("A4", "4x6", 4);
    expect(layout.slots).toHaveLength(4);
    expect(layout.slots[0]!.y).toBeGreaterThan(5);
  });

  it("ukuran piksel pada 300 dpi", () => {
    expect([mmToPx(30), mmToPx(40)]).toEqual([354, 472]);
  });

  it("gambar selalu menutupi bingkai", () => {
    const p = placement(1000, 1000, 300, 400, { zoom: 1, x: 0.9, y: 0 });
    expect(p.x).toBeLessThanOrEqual(0);
    expect(p.x + p.width).toBeGreaterThanOrEqual(300);
    expect(p.height).toBe(400);
    expect(clampCrop(1000, 1000, 300, 400, { zoom: 1, x: 0.9, y: 0.3 }).y).toBe(0);
  });
});
