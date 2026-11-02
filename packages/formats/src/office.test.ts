import { describe, expect, it } from "vitest";
import { defaultDocSettings, docToDocx, docxToHtml, type DocContent } from "./office/docx";
import { createEvaluator, formatValue, newSheet, parseLiteral, type Workbook } from "./sheet";
import { workbookToXlsx, xlsxToWorkbook } from "./sheet/xlsx";
import { contentSlide, THEMES, titleSlide, type Deck } from "./slides/model";
import { deckToPdf } from "./slides/pdf";
import { deckToPptx, pptxToDeck } from "./slides/pptx";

const ab = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

function book(cells: Record<string, string>, extra: Record<string, string> = {}): Workbook {
  const s1 = newSheet("Data");
  for (const [a, v] of Object.entries(cells)) s1.cells[a] = { v };
  const s2 = newSheet("Ringkasan");
  for (const [a, v] of Object.entries(extra)) s2.cells[a] = { v };
  return { sheets: [s1, s2] };
}

describe("mesin formula", () => {
  const wb = book(
    {
      A1: "Nama",
      B1: "Nilai",
      A2: "Andi",
      B2: "80",
      A3: "Siti",
      B3: "95",
      A4: "Budi",
      B4: "70",
      C1: "=SUM(B2:B4)",
      C2: "=AVERAGE(B2:B4)",
      C3: '=IF(B3>=90;"A";"B")',
      C4: '=SUMIF(B2:B4,">=80")',
      C5: '=COUNTIF(A2:A4,"B*")',
      C6: "=VLOOKUP(\"Siti\",A2:B4,2,FALSE)",
      C7: "=B2/0",
      C8: "=C9",
      C9: "=C8",
      C10: "=ROUND(2.345,2)&\" kg\"",
      C11: "=2^3^2",
      C12: "=-B2+10%",
      C13: "=NOSUCH(1)",
    },
    { A1: "=Data!C1*2", A2: "='Data'!B2+1" },
  );
  const value = createEvaluator(wb);

  it.each([
    ["C1", 245],
    ["C3", "A"],
    ["C4", 175],
    ["C5", 1],
    ["C6", 95],
    ["C10", "2.35 kg"],
    ["C11", 512],
    ["C12", -79.9],
  ])("%s", (address, expected) => {
    const v = value(0, address);
    if (typeof expected === "number") expect(v).toBeCloseTo(expected);
    else expect(v).toBe(expected);
  });

  it("menghasilkan galat yang jelas", () => {
    expect(value(0, "C7")).toEqual({ error: "#DIV/0!" });
    expect(value(0, "C8")).toEqual({ error: "#SIKLUS!" });
    expect(value(0, "C13")).toEqual({ error: "#NAME?" });
  });

  it("referensi antar-sheet", () => {
    expect(value(1, "A1")).toBe(490);
    expect(value(1, "A2")).toBe(81);
  });

  it("membaca angka dan tanggal gaya Indonesia", () => {
    expect(parseLiteral("1.250.000")).toBe(1250000);
    expect(parseLiteral("12,5")).toBe(12.5);
    expect(formatValue(parseLiteral("02/11/2026"), "date")).toBe("02/11/2026");
    expect(formatValue(1250000, "rupiah")).toBe("Rp 1.250.000");
    expect(formatValue(0.125, "percent")).toBe("12,5%");
  });
});

describe("round-trip XLSX", () => {
  it("nilai, formula, gaya, lebar kolom, dan sel gabungan tetap utuh", async () => {
    const wb = book({ A1: "Anggaran", A2: "Kertas", B2: "150000", A3: "Tinta", B3: "275000", B4: "=SUM(B2:B3)", C2: "02/11/2026" });
    const sheet = wb.sheets[0]!;
    sheet.cells.A1!.s = { b: true, fill: "#e8f5e9", align: "center" };
    sheet.cells.B4!.s = { fmt: "rupiah", b: true };
    sheet.cells.C2!.s = { fmt: "date" };
    sheet.colWidths[0] = 180;
    sheet.merges = ["A1:B1"];

    const back = await xlsxToWorkbook(ab(await workbookToXlsx(wb)));
    const s = back.workbook.sheets[0]!;
    expect(back.workbook.sheets.map((x) => x.name)).toEqual(["Data", "Ringkasan"]);
    expect(s.cells.B4?.v).toBe("=SUM(B2:B3)");
    expect(s.cells.B4?.s?.fmt).toBe("rupiah");
    expect(s.cells.A1?.s).toMatchObject({ b: true, fill: "#e8f5e9", align: "center" });
    expect(s.merges).toEqual(["A1:B1"]);
    expect(s.colWidths[0]).toBeGreaterThan(170);
    expect(formatValue(createEvaluator(back.workbook)(0, "C2"), s.cells.C2?.s?.fmt)).toBe("02/11/2026");
    expect(createEvaluator(back.workbook)(0, "B4")).toBe(425000);
  });
});

describe("round-trip DOCX", () => {
  it("judul, daftar, tabel, dan format teks terbaca kembali", async () => {
    const content: DocContent = {
      settings: { ...defaultDocSettings(), pageSize: "F4", header: "Laporan Kegiatan" },
      doc: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1, textAlign: "center" }, content: [{ type: "text", text: "Laporan Bulanan" }] },
          { type: "paragraph", content: [{ type: "text", text: "Teks ", marks: [] }, { type: "text", text: "tebal", marks: [{ type: "bold" }] }, { type: "text", text: " dan " }, { type: "text", text: "miring", marks: [{ type: "italic" }] }] },
          { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Poin satu" }] }] }] },
          { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Langkah satu" }] }] }] },
          {
            type: "table",
            content: [
              { type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Uraian" }] }] }, { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Jumlah" }] }] }] },
              { type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Kertas" }] }] }, { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "10" }] }] }] },
            ],
          },
        ],
      },
    };
    const bytes = await docToDocx(content);
    const back = await docxToHtml(ab(bytes));
    expect(back.html).toContain("<h1>Laporan Bulanan</h1>");
    expect(back.html).toContain("<strong>tebal</strong>");
    expect(back.html).toContain("<em>miring</em>");
    expect(back.html).toMatch(/<ul><li>Poin satu<\/li><\/ul>/);
    expect(back.html).toMatch(/<ol><li>Langkah satu<\/li><\/ol>/);
    expect(back.html).toMatch(/<table>.*Uraian.*Kertas.*<\/table>/s);
    expect(back.settings).toMatchObject({ pageSize: "F4", orientation: "portrait", header: "Laporan Kegiatan" });
  });
});

describe("round-trip PPTX", () => {
  it("teks, bentuk, dan catatan pembicara terbaca kembali", async () => {
    const theme = THEMES["mindful-light"];
    const second = contentSlide(theme, "Agenda", ["Pembukaan", "Diskusi"]);
    second.notes = "Ingat menyapa peserta.";
    second.elements.push({ id: "x", type: "shape", shape: "ellipse", x: 9, y: 4, w: 2, h: 2, fill: "#7cc93f", stroke: null });
    const deck: Deck = { theme: "mindful-light", slides: [titleSlide(theme, "Rapat Koordinasi", "November 2026"), second] };

    const back = await pptxToDeck(ab(await deckToPptx(deck)));
    expect(back.deck.slides).toHaveLength(2);
    const texts = back.deck.slides.map((s) => s.elements.flatMap((e) => (e.type === "text" ? [e.text] : [])));
    expect(texts[0]).toEqual(["Rapat Koordinasi", "November 2026"]);
    expect(texts[1]).toContain("• Pembukaan\n• Diskusi");
    expect(back.deck.slides[1]!.notes).toBe("Ingat menyapa peserta.");
    const shape = back.deck.slides[1]!.elements.find((e) => e.type === "shape");
    expect(shape).toMatchObject({ shape: "ellipse", fill: "#7cc93f" });
    const title = back.deck.slides[0]!.elements[0]!;
    expect(title.type === "text" && title.style.size).toBe(54);
    expect(title.x).toBeCloseTo(0.8, 1);
  });

  it("ekspor PDF satu halaman per slide", async () => {
    const theme = THEMES.plain;
    const pdf = await deckToPdf({ theme: "plain", slides: [titleSlide(theme, "A", "B"), contentSlide(theme, "C", ["D"])] });
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(2);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(960);
  });
});
