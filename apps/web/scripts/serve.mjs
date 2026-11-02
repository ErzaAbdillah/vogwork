// Server statis kecil untuk hasil `next build` (folder out/), meniru Cloudflare Pages:
// URL tanpa .html, 404.html sebagai fallback. Dipakai untuk uji Playwright dan pratinjau lokal.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../out");
const port = Number(process.env.PORT ?? 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".pfb": "application/octet-stream",
  ".bcmap": "application/octet-stream",
};

function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
  const base = join(root, clean);
  if (!base.startsWith(root)) return null;
  const candidates = [base, `${base}.html`, join(base, "index.html")];
  return candidates.find((p) => existsSync(p) && statSync(p).isFile()) ?? null;
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  let file = resolveFile(pathname);
  let status = 200;
  if (!file) {
    file = join(root, "404.html");
    status = 404;
  }
  const headers = { "Content-Type": types[extname(file)] ?? "application/octet-stream" };
  if (pathname.startsWith("/_next/static/")) headers["Cache-Control"] = "public, max-age=31536000, immutable";
  else headers["Cache-Control"] = "no-cache";
  res.writeHead(status, headers);
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`VogWork tersedia di http://localhost:${port}`));
