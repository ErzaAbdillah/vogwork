import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("hub menampilkan semua alat dan pencarian bekerja", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Kerja tenang");
  const cards = page.locator("#alat ul > li");
  await expect(cards).toHaveCount(11);

  await page.getByRole("searchbox").fill("kwitansi");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Invoice & Kwitansi");
});

test("tool QR dimuat lewat registry dan menghasilkan gambar", async ({ page }) => {
  await page.goto("/alat/buat-qr-code");
  const textarea = page.getByLabel("Tautan atau teks");
  await expect(textarea).toBeVisible();
  await textarea.fill("https://vogwork.id");
  const canvas = page.getByRole("img", { name: "Pratinjau" });
  await expect(canvas).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("qr-text.png");
});

test("gabung PDF berjalan di browser tanpa unggahan", async ({ page }) => {
  const make = async (pages: number) => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pages; i++) doc.addPage([200, 200]);
    return Buffer.from(await doc.save());
  };
  const uploads: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") uploads.push(r.url());
  });

  await page.goto("/alat/gabung-pisah-kompres-pdf");
  await page.locator('input[type="file"]').setInputFiles([
    { name: "a.pdf", mimeType: "application/pdf", buffer: await make(2) },
    { name: "b.pdf", mimeType: "application/pdf", buffer: await make(3) },
  ]);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Gabungkan 2 PDF/ }).click();
  const file = await download;
  const merged = await PDFDocument.load(readFileSync(await file.path()));
  expect(merged.getPageCount()).toBe(5);
  expect(uploads).toEqual([]);
});

test("mode gelap dan bahasa Inggris tersimpan", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mode gelap" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Calm work");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Calm work");
});

test("alat tetap bisa dibuka offline setelah kunjungan pertama", async ({ page, context }) => {
  await page.goto("/");
  // Service worker baru aktif setelah semua aset selesai di-precache.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.goto("/alat/surat-dinas");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Surat Dinas");
  await expect(page.getByRole("heading", { name: "Kop surat" })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
});

async function downloadBytes(page: import("@playwright/test").Page, button: string) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: button, exact: true }).click();
  const file = await download;
  return { name: file.suggestedFilename(), bytes: readFileSync(await file.path()) };
}

test("editor dokumen: template, ketik, ekspor DOCX", async ({ page }) => {
  await page.goto("/alat/dokumen");
  await page.getByRole("button", { name: /Laporan kegiatan/ }).click();
  const editor = page.locator(".ProseMirror");
  await expect(editor).toContainText("Laporan Kegiatan");
  await editor.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" Uji otomatis");
  await expect(page.getByText("Tersimpan di perangkat")).toBeVisible();
  const { name, bytes } = await downloadBytes(page, "Word (.docx)");
  expect(name).toBe("Laporan kegiatan.docx");
  expect(bytes.subarray(0, 2).toString()).toBe("PK");
});

test("spreadsheet: formula dihitung ulang dan ekspor XLSX", async ({ page }) => {
  await page.goto("/alat/spreadsheet");
  await page.getByRole("button", { name: /Anggaran kegiatan/ }).click();
  await expect(page.getByRole("gridcell", { name: "Rp 6.000.000" })).toBeVisible();
  await page.getByRole("gridcell", { name: "80", exact: true }).click();
  await page.keyboard.type("100");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("gridcell", { name: "Rp 6.700.000" })).toBeVisible();
  const { name, bytes } = await downloadBytes(page, "Excel (.xlsx)");
  expect(name).toBe("Anggaran kegiatan.xlsx");
  expect(bytes.subarray(0, 2).toString()).toBe("PK");
});

test("slide: template dan ekspor PPTX", async ({ page }) => {
  await page.goto("/alat/slide");
  await page.getByRole("button", { name: /Laporan rapat/ }).click();
  await expect(page.getByRole("button", { name: "Slide 4" })).toBeVisible();
  const { name, bytes } = await downloadBytes(page, "PowerPoint (.pptx)");
  expect(name).toBe("Laporan rapat.pptx");
  expect(bytes.subarray(0, 2).toString()).toBe("PK");
});
