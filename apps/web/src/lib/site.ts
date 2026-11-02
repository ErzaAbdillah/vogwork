export const site = {
  name: "VogWork",
  /** Ganti lewat NEXT_PUBLIC_SITE_URL saat domain sudah aktif. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  description:
    "Alat kerja gratis yang berjalan di browser: gabung PDF, QR code, sertifikat massal, surat dinas, invoice, OCR, hapus background, dan konverter. File tetap di perangkat Anda.",
};
