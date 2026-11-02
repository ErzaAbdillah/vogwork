// Menyalin aset runtime PDF.js (worker, font standar, wasm) dari node_modules
// ke public/vendor supaya dilayani dari domain sendiri dan ikut tersimpan offline.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const out = resolve(here, "../public/vendor/pdfjs");

const require = createRequire(join(root, "packages/formats/package.json"));
const pdfjsDir = resolve(dirname(require.resolve("pdfjs-dist")), "..");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(pdfjsDir, "build/pdf.worker.min.mjs"), join(out, "pdf.worker.min.mjs"));
for (const dir of ["standard_fonts", "wasm", "cmaps", "iccs"]) {
  if (existsSync(join(pdfjsDir, dir))) cpSync(join(pdfjsDir, dir), join(out, dir), { recursive: true });
}
console.log(`[copy-vendor] PDF.js → ${out}`);
