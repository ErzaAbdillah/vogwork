// Membuat ikon PNG PWA dari src/app/icon.svg memakai Chromium Playwright.
// Jalankan ulang setelah logo berubah: node scripts/make-icons.mjs
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "src/app/icon.svg"), "utf8");
const outDir = join(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const targets = [
  { file: join(outDir, "icon-192.png"), size: 192, maskable: false },
  { file: join(outDir, "icon-512.png"), size: 512, maskable: false },
  // Ikon maskable: logo di zona aman 80% di atas latar penuh.
  { file: join(outDir, "icon-maskable-512.png"), size: 512, maskable: true },
  { file: join(root, "src/app/apple-icon.png"), size: 180, maskable: true },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, maskable } of targets) {
  await page.setViewportSize({ width: size, height: size });
  const inner = maskable ? size * 0.8 : size;
  await page.setContent(
    `<html><body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;background:${maskable ? "#d9dee5" : "transparent"}">
      <div style="width:${inner}px;height:${inner}px">${svg.replace("<svg", '<svg width="100%" height="100%"')}</div>
    </body></html>`,
  );
  await page.screenshot({ path: file, omitBackground: !maskable });
  console.log(`[icons] ${file}`);
}
await browser.close();
