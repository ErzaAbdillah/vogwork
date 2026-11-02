import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "doc-editor",
  slug: "dokumen",
  kind: "app",
  wide: true,
  name: { id: "Dokumen", en: "Documents" },
  tagline: {
    id: "Tulis surat dan laporan, buka file Word, lalu simpan kembali sebagai DOCX atau PDF.",
    en: "Write letters and reports, open Word files, and save back to DOCX or PDF.",
  },
  category: "document",
  icon: "file-text",
  keywords: ["dokumen", "word", "docx", "pengolah kata", "editor teks", "laporan", "makalah", "skripsi", "notulen", "document", "writer"],
  inputs: [{ name: "document", type: "json" }],
  outputs: [{ name: "docx", type: "file/any" }],
  seo: {
    title: "Editor Dokumen Online Gratis — Buka & Simpan File Word (DOCX)",
    description:
      "Pengolah kata gratis di browser: judul, daftar, tabel, gambar, header dan footer, nomor halaman, ukuran A4/F4. Buka file Word dan simpan lagi sebagai DOCX atau PDF. Dokumen tersimpan di perangkat Anda.",
    steps: [
      "Pilih template (kosong, surat, laporan, atau notulen) atau buka file .docx dari perangkat.",
      "Tulis dan format: judul, tebal/miring, warna, perataan, daftar, tabel, dan gambar.",
      "Atur kertas, margin, header, footer, dan nomor halaman di Pengaturan halaman.",
      "Dokumen tersimpan otomatis. Unduh sebagai DOCX untuk Word atau cetak sebagai PDF.",
    ],
    faq: [
      { q: "Apakah hasil DOCX bisa dibuka di Microsoft Word?", a: "Bisa. Judul, paragraf, daftar, tabel, gambar, header, footer, nomor halaman, ukuran kertas, dan margin ikut tersimpan." },
      { q: "Apa yang hilang saat membuka file Word?", a: "Struktur dibawa utuh, tetapi perataan, warna, dan jenis huruf bawaan file belum ikut. Laporan kompatibilitas menampilkan apa saja yang disederhanakan." },
      { q: "Di mana dokumen saya disimpan?", a: "Di penyimpanan browser perangkat ini, lengkap dengan riwayat versi. Gunakan Data lokal untuk membuat cadangan." },
    ],
  },
};
