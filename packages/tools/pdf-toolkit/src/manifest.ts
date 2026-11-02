import type { ToolManifest } from "@vogwork/core";

export const manifest: ToolManifest = {
  id: "pdf-toolkit",
  slug: "gabung-pisah-kompres-pdf",
  name: { id: "Gabung, Pisah & Kompres PDF", en: "Merge, Split & Compress PDF" },
  tagline: {
    id: "Gabungkan beberapa PDF, ambil halaman tertentu, perkecil ukuran, atau ubah foto menjadi PDF.",
    en: "Combine PDFs, extract pages, shrink file size, or turn photos into a PDF.",
  },
  category: "pdf",
  icon: "file-stack",
  keywords: ["gabung pdf", "merge pdf", "pisah pdf", "split pdf", "kompres pdf", "compress pdf", "perkecil pdf", "jpg ke pdf", "foto ke pdf", "ambil halaman pdf", "combine"],
  inputs: [{ name: "files", type: "file/pdf", multiple: true }],
  outputs: [{ name: "pdf", type: "file/pdf" }],
  seo: {
    title: "Gabung PDF, Pisah PDF & Kompres PDF Gratis — Tanpa Upload",
    description:
      "Gabungkan beberapa file PDF jadi satu, pisahkan halaman, kompres ukuran PDF, dan ubah JPG ke PDF secara gratis. File diproses di browser Anda dan tidak diunggah ke server.",
    steps: [
      "Pilih tab Gabung, Pisah, Kompres, atau Gambar → PDF.",
      "Tarik file PDF atau foto ke kotak unggah. File hanya dibaca oleh browser Anda.",
      "Atur urutan file, pilih halaman, atau tentukan tingkat kompresi.",
      "Klik tombol proses, lalu unduh hasilnya.",
    ],
    faq: [
      { q: "Apakah file PDF saya diunggah?", a: "Tidak. Penggabungan, pemisahan, dan kompresi berjalan di browser Anda memakai Web Worker. Tidak ada file yang dikirim ke server." },
      { q: "Kenapa hasil kompresi kuat teksnya tidak bisa diblok?", a: "Kompresi sedang dan kuat mengubah setiap halaman menjadi gambar agar ukurannya jauh lebih kecil. Pakai kompresi ringan bila teks harus tetap bisa dipilih." },
      { q: "Bisakah membuka PDF yang dikunci kata sandi?", a: "Belum. Buka dulu kunci PDF dengan aplikasi yang Anda punya, lalu proses di sini." },
      { q: "Berapa batas ukuran file?", a: "Tidak ada batas dari kami; batasnya memori perangkat. Ponsel biasanya nyaman untuk PDF hingga sekitar 100 MB." },
    ],
  },
};
