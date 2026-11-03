import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "pdf-convert",
  slug: "pdf-ke-word-jpg",
  name: { id: "PDF ↔ Word & Gambar", en: "PDF ↔ Word & Images" },
  tagline: {
    id: "Ubah PDF ke Word (DOCX) atau JPG/PNG per halaman, dan Word ke PDF. PDF hasil scan dibaca dengan OCR.",
    en: "Turn PDFs into Word (DOCX) or JPG/PNG pages, and Word into PDF. Scanned PDFs are read with OCR.",
  },
  category: "pdf",
  icon: "arrow-right-left",
  keywords: ["pdf ke word", "pdf to word", "pdf ke docx", "pdf ke jpg", "pdf to jpg", "pdf ke png", "word ke pdf", "docx ke pdf", "convert pdf", "ubah pdf"],
  inputs: [{ name: "pdf", type: "file/pdf" }],
  outputs: [{ name: "docx", type: "file/any" }],
  seo: {
    title: "PDF ke Word, PDF ke JPG & Word ke PDF Gratis — Tanpa Upload",
    description:
      "Ubah PDF menjadi dokumen Word yang bisa disunting, simpan setiap halaman PDF sebagai JPG atau PNG, dan ubah file Word (DOCX) menjadi PDF. PDF hasil scan dibaca dengan OCR bahasa Indonesia. Semua diproses di browser.",
    steps: [
      "Pilih jenis konversi: PDF → Gambar, PDF → Word, atau Word → PDF.",
      "Pilih file dari perangkat. File hanya dibaca oleh browser Anda.",
      "Atur kualitas gambar atau mode konversi Word sesuai kebutuhan.",
      "Unduh hasilnya, atau buka langsung di editor Dokumen untuk disunting.",
    ],
    faq: [
      { q: "Apakah tata letak PDF ke Word sama persis?", a: "Mode “Teks bisa disunting” mempertahankan judul, paragraf, dan perataan, tetapi tidak meniru posisi persis. Pilih “Tata letak persis” bila tampilan lebih penting daripada menyunting teks." },
      { q: "Bagaimana dengan PDF hasil scan?", a: "PDF hasil scan tidak memiliki teks. Aktifkan OCR supaya teksnya dibaca dari gambar halaman. Pemakaian pertama mengunduh data bahasa sekali." },
      { q: "Apakah file saya dikirim ke server?", a: "Tidak. Konversi berjalan di browser perangkat Anda." },
    ],
  },
};
