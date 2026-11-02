import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "converter",
  slug: "konverter-gambar-csv-json",
  name: { id: "Konverter Gambar & Data", en: "Image & Data Converter" },
  tagline: {
    id: "Ubah JPG, PNG, WEBP dan perkecil ukurannya. Ubah CSV, Excel, dan JSON satu sama lain.",
    en: "Convert and resize JPG, PNG, WEBP. Convert between CSV, Excel, and JSON.",
  },
  category: "util",
  icon: "repeat-2",
  keywords: ["konverter", "converter", "png ke jpg", "jpg ke png", "webp ke jpg", "kompres foto", "perkecil foto", "resize", "csv ke json", "json ke csv", "excel ke csv", "csv ke excel", "xlsx"],
  inputs: [{ name: "rows", type: "table/rows" }],
  outputs: [{ name: "text", type: "text" }],
  seo: {
    title: "Konverter Gambar & Data Gratis — PNG ke JPG, WEBP, CSV ke JSON, Excel",
    description:
      "Ubah format gambar (JPG, PNG, WEBP), perkecil ukuran foto, dan konversi data antara CSV, Excel (XLSX), dan JSON. Proses banyak file sekaligus langsung di browser, tanpa upload.",
    steps: [
      "Pilih tab Gambar atau Data.",
      "Gambar: pilih foto, tentukan format, kualitas, dan ukuran maksimum.",
      "Data: unggah CSV, Excel, atau JSON, atau tempel datanya, lalu pilih format tujuan.",
      "Unduh hasilnya satu per satu atau sekaligus dalam ZIP.",
    ],
    faq: [
      { q: "CSV untuk Excel berbahasa Indonesia sebaiknya pakai pemisah apa?", a: "Pilih 'CSV titik koma'. Excel dengan pengaturan Indonesia memakai koma untuk desimal, sehingga titik koma lebih aman sebagai pemisah kolom." },
      { q: "Apakah kualitas foto berkurang?", a: "Untuk JPG dan WEBP Anda bisa mengatur kualitas. 80–85% biasanya tidak terlihat bedanya tetapi ukurannya jauh lebih kecil." },
      { q: "Apakah file HEIC dari iPhone didukung?", a: "Hanya di Safari, karena browser lain belum bisa membaca HEIC. Di iPhone, Anda juga bisa mengatur kamera ke format 'Paling Kompatibel'." },
    ],
  },
};
