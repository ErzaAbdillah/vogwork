# VogWork

Suite produktivitas gratis yang berjalan di browser. File diproses di perangkat pengguna; tidak ada yang diunggah ke server.

Status: **Fase 0 (fondasi) dan Fase 1 (toolkit MVP)** dari roadmap sudah dibangun.

| Tool | Halaman | Isi |
| --- | --- | --- |
| Gabung, Pisah & Kompres PDF | `/alat/gabung-pisah-kompres-pdf` | Gabung + atur urutan, pisah per halaman/rentang, kompres ringan/sedang/kuat, gambar → PDF |
| Pembuat QR Code | `/alat/buat-qr-code` | Tautan, WiFi, WhatsApp, email, vCard; warna, logo, PNG/SVG |
| Sertifikat Massal | `/alat/sertifikat-massal` | Template JPG/PNG/PDF + data Excel/CSV, teks bisa diseret, font kustom, PDF atau ZIP |
| Surat Dinas | `/alat/surat-dinas` | Kop, pola nomor surat, rincian acara, penandatangan, tembusan; PDF & DOCX |
| Invoice & Kwitansi | `/alat/invoice-kwitansi` | Diskon, PPN, terbilang, tanda LUNAS, kotak meterai > Rp5 juta |
| OCR Gambar ke Teks | `/alat/ocr-gambar-ke-teks` | Bahasa Indonesia + Inggris, gambar dan PDF hasil scan |
| Hapus Background | `/alat/hapus-background` | MODNet / BiRefNet di browser, latar transparan atau warna pas foto |
| Konverter Gambar & Data | `/alat/konverter-gambar-csv-json` | JPG/PNG/WEBP + resize; CSV ↔ JSON ↔ XLSX |

Shell aplikasi: hub dengan pencarian (tekan `/`), kategori, mode gelap, bahasa Indonesia/Inggris, PWA yang bisa dipakai offline setelah kunjungan pertama, dan halaman **Data lokal** untuk cadangan, pemulihan, serta penyimpanan permanen.

## Menjalankan

Butuh Node.js 22+ dan pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Pemeriksaan yang sama dengan CI:

```bash
pnpm lint
pnpm typecheck
pnpm test         # Vitest: core, format Indonesia, tugas PDF, model tool
pnpm build        # ekspor statis ke apps/web/out
pnpm test:e2e     # Playwright terhadap hasil build (pasang dulu: pnpm --filter @vogwork/web exec playwright install chromium)
pnpm --filter @vogwork/web start   # pratinjau hasil build di http://localhost:4173
```

## Deploy (Cloudflare Pages)

- Build command: `pnpm build`
- Output directory: `apps/web/out`
- Environment variable: `NEXT_PUBLIC_SITE_URL=https://domain-anda` (dipakai untuk sitemap, canonical, dan Open Graph)

`apps/web/public/_headers` berisi header keamanan dan cache untuk Cloudflare Pages. CSP masih dalam mode `Report-Only`; ubah ke `Content-Security-Policy` setelah konsol browser bersih di semua alat.

## Struktur

```text
apps/
  web/            Next.js 16 (ekspor statis): hub, halaman tool, PWA
  docs/           panduan pengguna dan panduan membuat tool
packages/
  core/           kontrak VogTool, registry + pencarian, pipeline runner
  storage/        IndexedDB (Dexie), format .vog, cadangan, simpan file
  formats/        terbilang, tanggal & nomor surat, tata letak PDF, PDF.js, CSV/XLSX, gambar
  workers/        Web Worker untuk PDF & ZIP, OCR (Tesseract.js), AI hapus background
  ui/             komponen bersama gaya shadcn/ui
  i18n/           bahasa id/en
  tools/*         satu paket per tool
tooling/tsconfig  konfigurasi TypeScript bersama
```

Aturan arsitektur dijaga oleh lint: tool tidak boleh mengimpor tool lain (`no-restricted-imports`). Logika bersama dipindah ke `packages/`.

## Catatan teknis

- **Pekerjaan berat di worker.** Gabung/pisah/kompres PDF, sertifikat, dan ZIP berjalan di `packages/workers`. Render PDF memakai worker PDF.js; OCR dan AI memakai worker masing-masing.
- **Unduhan sekali pakai.** OCR mengunduh mesin dan data bahasa dari jsDelivr; hapus background mengunduh transformers.js dari jsDelivr dan model dari Hugging Face. Gambar pengguna tidak pernah dikirim.
- **Offline.** `scripts/postbuild.mjs` mendaftar semua aset hasil build ke `precache.json`; `public/sw.js` menyimpannya saat pemasangan.
- **Ikon PWA** dibuat dari `src/app/icon.svg` dengan `node apps/web/scripts/make-icons.mjs`.
- **Bahasa.** Antarmuka bilingual; teks SEO per tool sengaja hanya bahasa Indonesia.

## Belum dikerjakan (fase berikutnya)

- Fase 2: editor dokumen (Tiptap), spreadsheet, slide, mail merge, riwayat versi.
- Fase 3: pipeline builder visual (runner dan validasinya sudah ada di `packages/core`), transkripsi, BYOK, sinkronisasi terenkripsi.
- `services/api` (akun dan sinkronisasi) belum dibuat karena Fase 1 tidak membutuhkan server.

Lisensi repositori: tertutup (keputusan roadmap). Lisensi pustaka pihak ketiga ada di [LICENSES.md](LICENSES.md).
