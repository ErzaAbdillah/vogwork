import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "invoice",
  slug: "invoice-kwitansi",
  name: { id: "Invoice & Kwitansi", en: "Invoice & Receipt" },
  tagline: {
    id: "Invoice dengan PPN dan diskon, plus kwitansi dengan terbilang otomatis. Unduh PDF.",
    en: "Invoices with VAT and discounts, plus Indonesian receipts with amounts in words. Download PDF.",
  },
  category: "business",
  icon: "receipt-text",
  keywords: ["invoice", "faktur", "tagihan", "kwitansi", "kuitansi", "receipt", "nota", "terbilang", "ppn", "umkm", "toko", "pembayaran", "meterai"],
  inputs: [{ name: "invoice", type: "json" }],
  outputs: [{ name: "pdf", type: "file/pdf" }],
  seo: {
    title: "Buat Invoice & Kwitansi Online Gratis — Terbilang Otomatis, PDF",
    description:
      "Buat invoice profesional dengan PPN, diskon, dan info rekening, serta kwitansi dengan terbilang rupiah otomatis. Cocok untuk UMKM, freelancer, dan bendahara kegiatan. Gratis, tanpa daftar, tanpa upload.",
    steps: [
      "Isi profil usaha sekali saja: nama, alamat, logo, dan rekening. Profil tersimpan di perangkat ini.",
      "Tambahkan pelanggan dan daftar barang atau jasa beserta jumlah dan harganya.",
      "Atur diskon dan PPN; subtotal, total, dan terbilang dihitung otomatis.",
      "Unduh PDF invoice, lalu buat kwitansi pelunasannya dengan satu klik.",
    ],
    faq: [
      { q: "Apakah kwitansi ini perlu meterai?", a: "Bea meterai Rp10.000 berlaku untuk dokumen penerimaan uang di atas Rp5.000.000. Kotak meterai otomatis muncul di kwitansi bila nominalnya melewati batas itu." },
      { q: "Berapa tarif PPN yang dipakai?", a: "Anda bisa mengisi tarif sendiri. Bawaannya 0% (tanpa PPN); isi 11 atau 12 sesuai ketentuan yang berlaku untuk transaksi Anda." },
      { q: "Apakah data pelanggan saya aman?", a: "Ya. Semua data hanya tersimpan di browser perangkat Anda dan PDF dibuat langsung di perangkat." },
    ],
  },
};
