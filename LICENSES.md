# Audit lisensi pihak ketiga

Diperiksa 2 November 2026. Aturan roadmap: hanya MIT, Apache-2.0, atau lisensi permisif lain; hindari AGPL/GPL dan fitur berbayar.

## Dibundel ke aplikasi

| Pustaka | Versi | Lisensi | Dipakai di |
| --- | --- | --- | --- |
| next, react, react-dom | 16.4 / 19.3 | MIT | apps/web |
| tailwindcss, @tailwindcss/postcss | 4.3 | MIT | apps/web |
| class-variance-authority, clsx, tailwind-merge | — | MIT / Apache-2.0 (cva) | packages/ui |
| lucide-react | 1.66 | ISC | ikon |
| pdf-lib, @pdf-lib/fontkit | 1.17 / 1.1 | MIT | pembuatan PDF |
| pdfjs-dist | 6.5 | Apache-2.0 | pratinjau dan render PDF |
| xlsx (SheetJS Community Edition, dari cdn.sheetjs.com) | 0.20.3 | Apache-2.0 | baca/tulis Excel & CSV |
| docx | 9.15 | MIT | ekspor DOCX surat dinas |
| qrcode | 1.5 | MIT | QR code |
| fflate | 0.8 | MIT | ZIP dan format .vog |
| dexie | 4.4 | Apache-2.0 | IndexedDB |
| tesseract.js (+ tesseract.js-core) | 7.0 | Apache-2.0 | OCR |
| Plus Jakarta Sans (next/font, dihosting sendiri) | — | OFL-1.1 | huruf antarmuka |

## Dimuat saat dipakai (tidak dibundel)

| Sumber | Lisensi | Catatan |
| --- | --- | --- |
| @huggingface/transformers 4.3.2 (jsDelivr) | Apache-2.0 | Dimuat dari CDN; paket npm-nya menarik onnxruntime-node yang tidak dibutuhkan browser |
| onnxruntime-web (via transformers.js) | MIT | |
| Model Xenova/modnet | Apache-2.0 | Model "Cepat" |
| Model onnx-community/BiRefNet_lite-ONNX | MIT | Model "Akurat" |
| Data bahasa Tesseract `ind`, `eng` (@tesseract.js-data) | Apache-2.0 | |

Model yang **sengaja tidak dipakai**: `briaai/RMBG-1.4` (lisensi non-komersial) dan `@imgly/background-removal` (AGPL).

## Alat pengembangan (tidak dikirim ke pengguna)

turbo (MIT), typescript (Apache-2.0), eslint + eslint-config-next (MIT), vitest (MIT), @playwright/test (Apache-2.0).

## Catatan

- SheetJS dari npm (`xlsx@0.18.5`) sudah usang dan memiliki kerentanan yang diketahui; selalu pasang dari `cdn.sheetjs.com` sesuai petunjuk resmi.
- Bila menambah pustaka, periksa lisensinya dulu dan tambahkan baris di sini.
