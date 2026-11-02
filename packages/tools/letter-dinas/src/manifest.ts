import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "letter-dinas",
  slug: "surat-dinas",
  name: { id: "Surat Dinas", en: "Official Letter" },
  tagline: {
    id: "Surat resmi dengan kop, nomor surat otomatis, dan tanda tangan. Unduh PDF atau Word.",
    en: "Formal Indonesian letters with letterhead, automatic numbering, and signature block. Download PDF or Word.",
  },
  category: "document",
  icon: "landmark",
  keywords: ["surat dinas", "surat resmi", "kop surat", "nomor surat", "tata naskah dinas", "surat undangan", "surat pemberitahuan", "surat permohonan", "docx", "word", "letter"],
  inputs: [{ name: "letter", type: "json" }],
  outputs: [{ name: "pdf", type: "file/pdf" }],
  seo: {
    title: "Buat Surat Dinas Online Gratis — Kop Surat, Nomor Surat, PDF & Word",
    description:
      "Buat surat dinas dan surat resmi dengan kop surat, penomoran otomatis, sifat, lampiran, hal, tembusan, dan blok tanda tangan sesuai kaidah tata naskah dinas. Unduh PDF atau DOCX. Gratis, tanpa upload.",
    steps: [
      "Pilih contoh surat (undangan, pemberitahuan, atau permohonan) sebagai titik awal.",
      "Isi kop surat: nama instansi, alamat, dan logo. Kop tersimpan otomatis untuk surat berikutnya.",
      "Atur pola nomor surat; nomor urut bertambah sendiri setiap kali Anda menekan “Nomor berikutnya”.",
      "Tulis isi surat, penandatangan, dan tembusan. Pratinjau di kanan sama persis dengan hasil unduhan.",
      "Unduh sebagai PDF untuk dikirim, atau DOCX untuk disunting di Word.",
    ],
    faq: [
      { q: "Apakah format ini sesuai tata naskah dinas?", a: "Susunannya mengikuti pola umum surat dinas: kop, tempat dan tanggal, nomor, sifat, lampiran, hal, tujuan, isi, penandatangan, dan tembusan. Sesuaikan dengan pedoman tata naskah instansi Anda bila ada aturan khusus." },
      { q: "Bisakah memakai ukuran kertas F4?", a: "Bisa. Pilih A4 atau F4 (folio 215 × 330 mm) di bagian Pengaturan halaman." },
      { q: "Apakah data instansi saya disimpan di server?", a: "Tidak. Kop, draf, dan nomor urut hanya disimpan di browser perangkat ini." },
    ],
  },
};
