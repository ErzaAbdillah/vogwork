import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "ocr",
  slug: "ocr-gambar-ke-teks",
  name: { id: "OCR Gambar ke Teks", en: "OCR Image to Text" },
  tagline: {
    id: "Ambil teks dari foto dokumen, tangkapan layar, atau PDF hasil scan. Mendukung bahasa Indonesia.",
    en: "Extract text from document photos, screenshots, or scanned PDFs. Supports Indonesian.",
  },
  category: "document",
  icon: "scan-text",
  keywords: ["ocr", "gambar ke teks", "foto ke teks", "image to text", "scan", "pindai", "salin teks dari gambar", "pdf scan", "tesseract", "bahasa indonesia"],
  inputs: [{ name: "images", type: "file/image", multiple: true }],
  outputs: [{ name: "text", type: "text" }],
  downloadsOnFirstUse: {
    id: "Pemakaian pertama mengunduh mesin OCR dan data bahasa (sekitar 15 MB) dari jsDelivr, lalu disimpan browser. Gambar Anda tidak ikut dikirim.",
    en: "The first use downloads the OCR engine and language data (about 15 MB) from jsDelivr, then the browser keeps it. Your images are never sent.",
  },
  seo: {
    title: "OCR Bahasa Indonesia Gratis — Ubah Gambar & PDF Scan Jadi Teks",
    description:
      "Ubah foto dokumen, tangkapan layar, dan PDF hasil scan menjadi teks yang bisa disalin dan disunting. OCR bahasa Indonesia dan Inggris berjalan di browser, tanpa upload ke server.",
    steps: [
      "Pilih satu atau beberapa gambar (JPG, PNG, WEBP) atau PDF hasil scan.",
      "Pilih bahasa dokumen. Gabungan Indonesia + Inggris cocok untuk kebanyakan dokumen.",
      "Klik Ambil Teks. Pemakaian pertama perlu mengunduh data bahasa sekali.",
      "Periksa dan sunting hasilnya, lalu salin atau unduh sebagai file .txt.",
    ],
    faq: [
      { q: "Seberapa akurat hasilnya?", a: "Sangat baik untuk teks cetak yang jelas. Foto miring, buram, atau tulisan tangan menurunkan akurasi; aktifkan 'Tingkatkan kontras' untuk foto yang kurang terang." },
      { q: "Apakah bisa dipakai offline?", a: "Bisa, setelah data bahasa terunduh pada pemakaian pertama." },
      { q: "Apakah dokumen saya dikirim ke server?", a: "Tidak. Pengenalan teks berjalan di browser Anda memakai Tesseract.js." },
    ],
  },
};
