import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "pdf-sign",
  slug: "tanda-tangan-pdf",
  name: { id: "Tanda Tangan & Stempel PDF", en: "Sign & Stamp PDF" },
  tagline: {
    id: "Bubuhkan tanda tangan, paraf, stempel, dan tanggal ke PDF, atau isi formulir PDF.",
    en: "Add signatures, initials, stamps, and dates to a PDF, or fill PDF forms.",
  },
  category: "pdf",
  icon: "signature",
  keywords: ["tanda tangan pdf", "ttd pdf", "sign pdf", "paraf", "stempel", "cap", "isi formulir pdf", "fill pdf", "tanggal", "materai"],
  inputs: [{ name: "pdf", type: "file/pdf" }],
  outputs: [{ name: "pdf", type: "file/pdf" }],
  seo: {
    title: "Tanda Tangan PDF Online Gratis — TTD, Paraf, Stempel & Isi Formulir",
    description:
      "Bubuhkan tanda tangan, paraf di tiap halaman, stempel, dan tanggal ke PDF langsung di browser. Isi formulir PDF lalu ratakan supaya tidak bisa diubah. File tidak diunggah ke server.",
    steps: [
      "Pilih file PDF. Setiap halaman tampil sebagai pratinjau.",
      "Buat tanda tangan dengan menggambar, atau unggah foto tanda tangan di kertas putih.",
      "Klik halaman tujuan, tambahkan tanda tangan, stempel, teks, atau tanggal, lalu seret ke posisinya.",
      "Isi kolom formulir bila ada, lalu unduh PDF yang sudah ditandatangani.",
    ],
    faq: [
      { q: "Apakah ini tanda tangan elektronik tersertifikasi?", a: "Bukan. Ini tanda tangan visual (gambar). Untuk dokumen yang wajib bertanda tangan elektronik tersertifikasi, gunakan layanan penyelenggara sertifikasi elektronik resmi." },
      { q: "Apakah foto tanda tangan saya disimpan?", a: "Hanya di browser perangkat ini bila Anda menyimpannya ke daftar tanda tangan, dan bisa dihapus kapan saja. Tidak ada yang dikirim ke server." },
      { q: "Bisakah memberi paraf di setiap halaman?", a: "Bisa. Pilih paraf lalu klik “Salin ke semua halaman”." },
    ],
  },
};
