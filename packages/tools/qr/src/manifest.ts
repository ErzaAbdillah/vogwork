import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "qr",
  slug: "buat-qr-code",
  name: { id: "Pembuat QR Code", en: "QR Code Generator" },
  tagline: {
    id: "QR untuk tautan, WiFi, WhatsApp, email, atau kartu kontak. Unduh PNG atau SVG.",
    en: "QR codes for links, Wi-Fi, WhatsApp, email, or contact cards. Download PNG or SVG.",
  },
  category: "util",
  icon: "qr-code",
  keywords: ["qr", "qr code", "kode qr", "barcode", "wifi", "whatsapp", "wa", "vcard", "kartu nama", "tautan", "link", "svg"],
  inputs: [{ name: "text", type: "text" }],
  outputs: [{ name: "image", type: "file/image" }],
  seo: {
    title: "Buat QR Code Gratis — Link, WiFi, WhatsApp, vCard (PNG & SVG)",
    description:
      "Buat QR code gratis tanpa daftar: tautan, WiFi, chat WhatsApp, email, dan kartu kontak. Atur warna dan logo, unduh PNG resolusi tinggi atau SVG. Diproses di browser.",
    steps: [
      "Pilih jenis QR: tautan/teks, WiFi, WhatsApp, email, atau kontak.",
      "Isi datanya. Pratinjau QR langsung berubah saat Anda mengetik.",
      "Atur ukuran, warna, dan logo di tengah bila perlu.",
      "Unduh sebagai PNG untuk dicetak atau SVG untuk desain, atau salin ke clipboard.",
    ],
    faq: [
      { q: "Apakah QR code ini bisa kedaluwarsa?", a: "Tidak. QR dibuat langsung dari data Anda, tanpa layanan perantara, jadi tetap berfungsi selamanya." },
      { q: "Apakah aman menaruh logo di tengah?", a: "Ya. Saat logo dipasang, tingkat koreksi galat otomatis dinaikkan ke H (30%) supaya QR tetap terbaca." },
      { q: "Bagaimana QR WiFi bekerja?", a: "Ponsel yang memindai QR WiFi akan menawarkan untuk langsung tersambung ke jaringan tanpa mengetik kata sandi." },
    ],
  },
};
