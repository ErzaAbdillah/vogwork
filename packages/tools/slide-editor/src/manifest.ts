import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "slide-editor",
  slug: "slide",
  kind: "app",
  wide: true,
  name: { id: "Slide", en: "Slides" },
  tagline: {
    id: "Susun presentasi dengan teks, gambar, dan bentuk, buka file PowerPoint, lalu simpan sebagai PPTX atau PDF.",
    en: "Build presentations with text, images, and shapes, open PowerPoint files, and save as PPTX or PDF.",
  },
  category: "design",
  icon: "presentation",
  keywords: ["slide", "presentasi", "powerpoint", "pptx", "ppt", "materi", "pitch deck", "presentation", "slideshow"],
  inputs: [{ name: "deck", type: "json" }],
  outputs: [{ name: "pptx", type: "file/any" }],
  seo: {
    title: "Buat Presentasi Online Gratis — Buka & Simpan PowerPoint (PPTX)",
    description:
      "Editor slide gratis di browser: teks, gambar, bentuk, tema, catatan pembicara, dan mode presentasi layar penuh. Buka file PowerPoint dan simpan lagi sebagai PPTX atau PDF, tanpa upload.",
    steps: [
      "Pilih template atau buka file .pptx dari perangkat.",
      "Tambahkan teks, gambar, dan bentuk; seret untuk memindah dan tarik sudut untuk mengubah ukuran.",
      "Pilih tema, tulis catatan pembicara, lalu tekan Presentasikan untuk tampil layar penuh.",
      "Unduh PPTX untuk PowerPoint atau PDF untuk dibagikan.",
    ],
    faq: [
      { q: "Apakah hasilnya bisa disunting di PowerPoint?", a: "Bisa. Teks, gambar, bentuk dasar, dan catatan pembicara tersimpan sebagai objek PowerPoint biasa." },
      { q: "Apa yang tidak ikut saat membuka PPTX?", a: "Animasi, transisi, SmartArt, tabel, dan grafik belum didukung. Laporan kompatibilitas menyebutkan apa saja yang dilewati." },
      { q: "Bisakah dipakai untuk presentasi tanpa internet?", a: "Bisa. Setelah situs pernah dibuka, mode presentasi berjalan sepenuhnya offline." },
    ],
  },
};
