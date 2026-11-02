"use client";

import { useLocale } from "@vogwork/i18n";

const libraries: [name: string, license: string, use: { id: string; en: string }][] = [
  ["Next.js, React", "MIT", { id: "Kerangka aplikasi", en: "App framework" }],
  ["Tailwind CSS, lucide", "MIT / ISC", { id: "Tampilan dan ikon", en: "Styling and icons" }],
  ["pdf-lib, @pdf-lib/fontkit", "MIT", { id: "Membuat dan mengubah PDF", en: "Creating and editing PDFs" }],
  ["PDF.js (pdfjs-dist)", "Apache-2.0", { id: "Pratinjau dan render PDF", en: "PDF preview and rendering" }],
  ["SheetJS Community Edition", "Apache-2.0", { id: "Membaca dan menulis Excel/CSV", en: "Reading and writing Excel/CSV" }],
  ["docx", "MIT", { id: "Ekspor Word (.docx)", en: "Word (.docx) export" }],
  ["qrcode", "MIT", { id: "Membuat QR code", en: "QR code generation" }],
  ["fflate", "MIT", { id: "Membuat file ZIP", en: "ZIP files" }],
  ["Dexie", "Apache-2.0", { id: "Penyimpanan IndexedDB", en: "IndexedDB storage" }],
  ["Tesseract.js", "Apache-2.0", { id: "OCR", en: "OCR" }],
  ["transformers.js + MODNet / BiRefNet", "Apache-2.0 / MIT", { id: "Hapus background", en: "Background removal" }],
  ["Tiptap", "MIT", { id: "Editor dokumen", en: "Document editor" }],
  ["mammoth, DOMPurify", "BSD-2 / Apache-2.0", { id: "Membuka file Word dengan aman", en: "Opening Word files safely" }],
  ["ExcelJS", "MIT", { id: "File Excel (.xlsx)", en: "Excel files (.xlsx)" }],
  ["PptxGenJS, xmldom", "MIT", { id: "File PowerPoint (.pptx)", en: "PowerPoint files (.pptx)" }],
  ["Inter Tight", "OFL-1.1", { id: "Huruf antarmuka", en: "Interface typeface" }],
];

const text = {
  id: {
    title: "Tentang VogWork",
    intro:
      "VogWork adalah kumpulan alat kerja gratis untuk mahasiswa, pegawai instansi, dan pemilik usaha kecil di Indonesia. Semua alat berjalan di browser Anda, jadi tidak perlu berlangganan perangkat lunak kantor atau membuat akun.",
    privacyTitle: "Privasi: file tidak meninggalkan perangkat",
    privacy: [
      "File yang Anda pilih dibaca dan diproses oleh browser Anda sendiri, sebagian besar di Web Worker. Tidak ada unggahan ke server VogWork.",
      "Draf surat, profil invoice, dan preferensi disimpan di IndexedDB browser ini. Anda bisa mencadangkan atau menghapusnya kapan saja di halaman Data lokal.",
      "Tidak ada iklan, pelacak, atau analitik pihak ketiga.",
    ],
    downloadsTitle: "Yang diunduh dari internet",
    downloads: [
      "Kode aplikasi dari situs ini, lalu disimpan untuk dipakai offline.",
      "OCR: mesin Tesseract dan data bahasa Indonesia/Inggris dari cdn.jsdelivr.net, sekali saat pertama dipakai.",
      "Hapus background: pustaka transformers.js dari cdn.jsdelivr.net dan model AI dari huggingface.co, sekali saat pertama dipakai.",
      "Unduhan ini hanya berisi kode dan model. Gambar Anda tidak ikut dikirim.",
    ],
    libsTitle: "Pustaka open-source",
    libsIntro: "VogWork dibangun di atas pustaka berlisensi permisif berikut. Lisensi lengkap ada di LICENSES.md pada repositori.",
    colName: "Pustaka",
    colLicense: "Lisensi",
    colUse: "Dipakai untuk",
  },
  en: {
    title: "About VogWork",
    intro:
      "VogWork is a set of free work tools for students, civil servants, and small business owners in Indonesia. Every tool runs in your browser, so there is no office software subscription or account to create.",
    privacyTitle: "Privacy: files never leave your device",
    privacy: [
      "Files you choose are read and processed by your own browser, mostly in Web Workers. Nothing is uploaded to VogWork servers.",
      "Letter drafts, invoice profiles, and preferences are stored in this browser's IndexedDB. You can back them up or delete them at any time on the Local data page.",
      "No ads, trackers, or third-party analytics.",
    ],
    downloadsTitle: "What is downloaded from the internet",
    downloads: [
      "The app code from this site, which is then kept for offline use.",
      "OCR: the Tesseract engine and Indonesian/English language data from cdn.jsdelivr.net, once on first use.",
      "Background removal: the transformers.js library from cdn.jsdelivr.net and an AI model from huggingface.co, once on first use.",
      "These downloads contain only code and models. Your images are never sent.",
    ],
    libsTitle: "Open-source libraries",
    libsIntro: "VogWork is built on the permissively licensed libraries below. Full licenses are in LICENSES.md in the repository.",
    colName: "Library",
    colLicense: "License",
    colUse: "Used for",
  },
};

export function AboutContent() {
  const { locale } = useLocale();
  const t = text[locale];
  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-lg text-muted-foreground">{t.intro}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t.privacyTitle}</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          {t.privacy.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t.downloadsTitle}</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          {t.downloads.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t.libsTitle}</h2>
        <p className="text-muted-foreground">{t.libsIntro}</p>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">{t.colName}</th>
                <th className="px-4 py-2 font-medium">{t.colLicense}</th>
                <th className="px-4 py-2 font-medium">{t.colUse}</th>
              </tr>
            </thead>
            <tbody>
              {libraries.map(([name, license, use]) => (
                <tr key={name} className="border-t">
                  <td className="px-4 py-2 font-medium">{name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{license}</td>
                  <td className="px-4 py-2 text-muted-foreground">{use[locale]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
