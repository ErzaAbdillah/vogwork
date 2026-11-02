import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "certificate",
  slug: "sertifikat-massal",
  name: { id: "Sertifikat Massal", en: "Bulk Certificates" },
  tagline: {
    id: "Isi nama peserta dari Excel atau CSV ke template sertifikat, lalu unduh PDF atau ZIP.",
    en: "Fill participant names from Excel or CSV into a certificate template, then download PDF or ZIP.",
  },
  category: "document",
  icon: "award",
  keywords: ["sertifikat", "certificate", "piagam", "e-sertifikat", "sertifikat massal", "bulk", "mail merge", "excel", "csv", "webinar", "seminar", "panitia"],
  inputs: [
    { name: "template", type: "file/image" },
    { name: "rows", type: "table/rows" },
  ],
  outputs: [{ name: "archive", type: "file/zip" }],
  seo: {
    title: "Buat Sertifikat Massal dari Excel — Gratis, PDF & ZIP",
    description:
      "Buat ratusan e-sertifikat sekaligus: unggah template (JPG, PNG, atau PDF), ambil nama peserta dari Excel/CSV, atur posisi teks, lalu unduh satu PDF atau ZIP per peserta. Tanpa upload ke server.",
    steps: [
      "Unggah desain sertifikat tanpa nama (JPG, PNG, atau PDF), atau pakai template contoh.",
      "Unggah daftar peserta dari Excel/CSV, atau tempel langsung dari spreadsheet.",
      "Seret teks {Nama} ke posisi yang tepat, lalu atur huruf, ukuran, dan warnanya.",
      "Pilih satu PDF berisi semua sertifikat atau ZIP berisi satu PDF per peserta, lalu unduh.",
    ],
    faq: [
      { q: "Berapa banyak sertifikat yang bisa dibuat sekaligus?", a: "Ratusan hingga ribuan, tergantung memori perangkat. Semua dibuat di browser Anda, jadi data peserta tidak dikirim ke mana pun." },
      { q: "Bisakah memakai huruf sendiri?", a: "Bisa. Unggah file font TTF atau OTF yang Anda punya lisensinya, lalu pilih untuk tiap teks." },
      { q: "Nama yang sangat panjang terpotong?", a: "Tidak. Atur 'Lebar maksimum'; teks yang lebih panjang otomatis diperkecil agar tetap muat." },
      { q: "Bagaimana dengan nomor sertifikat?", a: "Tambahkan kolom nomor di Excel, lalu tambahkan teks baru seperti 'No. {Nomor}'." },
    ],
  },
};
