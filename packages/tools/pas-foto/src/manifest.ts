import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "pas-foto",
  slug: "pas-foto",
  name: { id: "Pas Foto", en: "ID Photo" },
  tagline: {
    id: "Potong pas foto 2×3, 3×4, 4×6, ganti latar merah/biru, lalu cetak banyak di satu lembar A4 atau 4R.",
    en: "Crop 2×3, 3×4, 4×6 ID photos, switch to a red/blue background, then print many on one A4 or 4R sheet.",
  },
  category: "media",
  icon: "contact",
  keywords: ["pas foto", "foto 3x4", "foto 2x3", "foto 4x6", "background merah", "background biru", "ganti latar foto", "cetak pas foto", "foto ktp", "foto cpns", "id photo"],
  inputs: [{ name: "image", type: "file/image" }],
  outputs: [{ name: "image", type: "file/image" }],
  downloadsOnFirstUse: {
    id: "Ganti warna latar memakai model AI (sekitar 25 MB) yang diunduh sekali saat pertama dipakai. Foto Anda tetap di perangkat.",
    en: "Changing the background uses an AI model (about 25 MB) downloaded once on first use. Your photo stays on your device.",
  },
  seo: {
    title: "Buat Pas Foto Online Gratis — 2x3, 3x4, 4x6, Latar Merah/Biru, Siap Cetak",
    description:
      "Buat pas foto untuk CPNS, sekolah, kampus, atau lamaran kerja: potong ukuran 2×3, 3×4, 4×6, ganti latar merah, biru, atau putih dengan AI, lalu cetak banyak foto di satu lembar A4 atau kertas foto 4R. Tanpa upload.",
    steps: [
      "Pilih foto wajah dengan pencahayaan yang cukup.",
      "Pilih warna latar: asli, merah, biru, atau putih. Latar dihapus otomatis oleh AI di browser.",
      "Pilih ukuran, lalu geser dan perbesar foto supaya wajah pas di dalam panduan oval.",
      "Unduh satu foto, atau unduh lembar cetak A4/4R berisi banyak foto lengkap dengan garis potong.",
    ],
    faq: [
      { q: "Berapa resolusi hasilnya?", a: "300 dpi, ukuran standar cetak. Pas foto 3×4 menjadi 354 × 472 piksel." },
      { q: "Warna merah dan biru yang dipakai?", a: "Merah #D9232D dan biru #1D5FBF, warna yang umum dipakai studio foto. Anda juga bisa memilih warna lain." },
      { q: "Berapa banyak foto di satu lembar A4?", a: "Sampai 81 foto 2×3, 36 foto 3×4, atau 16 foto 4×6. Kertas foto 4R muat 9 foto 3×4." },
    ],
  },
};
