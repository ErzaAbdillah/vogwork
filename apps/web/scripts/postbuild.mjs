// Setelah `next build`: mendaftar semua file hasil ekspor untuk precache service worker
// dan menandai sw.js dengan versi build supaya pembaruan terdeteksi.
import { createHash } from "node:crypto";
import { copyFileSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../out");
const MAX_SIZE = 4 * 1024 * 1024;
const SKIP = [
  /^sw\.js$/,
  /^_headers$/,
  /^_redirects$/,
  /\.map$/,
  /^precache\.json$/,
  /^vendor\/pdfjs\/cmaps\//,
  // Salinan bersarang data prefetch; versi bertitiknya yang di-precache.
  /(^|\/)__next\.[^/]+\//,
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// Ekspor statis Next 16 menulis data prefetch sebagai `__next.alat/$d$slug/__PAGE__.txt`,
// sedangkan router meminta `__next.alat.$d$slug.__PAGE__.txt`. Salin ke nama bertitik
// supaya prefetch tidak 404 di hosting statis mana pun.
for (const file of walk(outDir)) {
  const rel = relative(outDir, file).split(sep);
  const index = rel.findIndex((part, i) => part.startsWith("__next.") && i < rel.length - 1);
  if (index === -1) continue;
  const flat = join(outDir, ...rel.slice(0, index), rel.slice(index).join("."));
  copyFileSync(file, flat);
}

const hash = createHash("sha256");
const urls = [];
for (const file of walk(outDir).sort()) {
  const rel = relative(outDir, file).split(sep).join("/");
  const size = statSync(file).size;
  if (SKIP.some((re) => re.test(rel)) || size > MAX_SIZE) continue;
  hash.update(rel).update(readFileSync(file));
  // Halaman HTML dilayani tanpa ekstensi (Cloudflare Pages dan scripts/serve.mjs).
  if (rel === "index.html") urls.push("/");
  else if (rel.endsWith(".html")) urls.push(`/${rel.slice(0, -5)}`);
  else urls.push(`/${rel}`);
}

const version = hash.digest("hex").slice(0, 12);
writeFileSync(join(outDir, "precache.json"), JSON.stringify({ version, urls }));
const swPath = join(outDir, "sw.js");
writeFileSync(swPath, readFileSync(swPath, "utf8").replace("__VOG_VERSION__", version));
console.log(`[postbuild] precache ${urls.length} file, versi ${version}`);
