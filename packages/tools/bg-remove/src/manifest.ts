import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "bg-remove",
  slug: "hapus-background",
  name: { id: "Hapus Background", en: "Remove Background" },
  tagline: {
    id: "Hapus latar foto otomatis dengan AI di browser. Ganti jadi transparan, putih, merah, atau biru untuk pas foto.",
    en: "Remove photo backgrounds automatically with in-browser AI. Make them transparent, white, red, or blue for ID photos.",
  },
  category: "media",
  icon: "eraser",
  keywords: ["hapus background", "remove background", "hapus latar", "background transparan", "pas foto", "ganti background merah", "background biru", "foto produk", "png transparan"],
  inputs: [{ name: "image", type: "file/image" }],
  outputs: [{ name: "image", type: "file/image" }],
  downloadsOnFirstUse: {
    id: "Pemakaian pertama mengunduh model AI (25–115 MB) dari Hugging Face, lalu disimpan browser. Foto Anda diproses di perangkat dan tidak ikut dikirim.",
    en: "The first use downloads an AI model (25–115 MB) from Hugging Face, then the browser keeps it. Your photos are processed on-device and never sent.",
  },
  seo: {
    title: "Hapus Background Foto Gratis — Pas Foto Merah/Biru, PNG Transparan",
    description:
      "Hapus background foto otomatis dengan AI yang berjalan di browser. Buat PNG transparan untuk foto produk atau ganti latar pas foto menjadi merah, biru, atau putih. Tanpa upload, tanpa watermark.",
    steps: [
      "Pilih satu atau beberapa foto.",
      "Pilih model: Cepat untuk foto orang, Akurat untuk produk dan benda (butuh WebGPU).",
      "Klik Hapus Background. Pemakaian pertama mengunduh model AI sekali.",
      "Pilih latar transparan atau warna pas foto, lalu unduh PNG.",
    ],
    faq: [
      { q: "Apakah ada watermark atau batas jumlah?", a: "Tidak ada watermark dan tidak ada batas. Semua diproses di perangkat Anda." },
      { q: "Kenapa pemrosesan pertama lama?", a: "Browser perlu mengunduh model AI satu kali. Setelah itu model tersimpan dan pemrosesan berikutnya jauh lebih cepat." },
      { q: "Hasilnya kurang rapi di bagian rambut?", a: "Coba model Akurat bila browser Anda mendukung WebGPU (Chrome atau Edge terbaru), atau gunakan foto dengan latar yang kontras." },
    ],
  },
};
