# Panduan membuat tool VogWork

Setiap tool adalah paket mandiri di `packages/tools/<nama>` yang hanya bergantung pada paket inti (`core`, `ui`, `i18n`, `storage`, `formats`, `workers`). Tool tidak boleh mengimpor tool lain; lint akan menolaknya.

## 1. Struktur paket

```text
packages/tools/contoh/
├─ package.json        name: @vogwork/tool-contoh, exports "." dan "./manifest"
├─ tsconfig.json       extends @vogwork/tsconfig/base.json
└─ src/
   ├─ manifest.ts      metadata ringan (aman untuk halaman statis)
   ├─ index.ts         defineTool(manifest, { run, ui })
   └─ ui.tsx           antarmuka, "use client", export default
```

## 2. Manifest

```ts
export const manifest: ToolManifest = {
  id: "contoh",
  slug: "kata-kunci-bahasa-indonesia",   // URL: /alat/<slug>
  name: { id: "Nama Alat", en: "Tool Name" },
  tagline: { id: "…", en: "…" },
  category: "util",                      // pdf | document | sheet | design | business | media | util
  icon: "box",                           // nama ikon lucide; daftarkan di apps/web/src/components/tool-icon.tsx
  keywords: ["kata kunci", "pencarian"],
  inputs: [{ name: "files", type: "file/pdf", multiple: true }],
  outputs: [{ name: "pdf", type: "file/pdf" }],
  seo: { title, description, steps: [...], faq: [...] },   // bahasa Indonesia
};
```

Kontrak di roadmap memakai `name: string`; di sini `name` dan `tagline` berbentuk `{ id, en }` karena antarmuka dwibahasa.

`inputs`/`outputs` dipakai pipeline: dua tool bisa dirangkai bila tipe output yang satu cocok dengan tipe input yang lain (`portsCompatible` di `packages/core`).

## 3. Implementasi

```ts
export default defineTool(manifest, {
  async run(input, ctx) {
    const { runTask } = await import("@vogwork/workers");   // pekerjaan berat lewat worker
    const bytes = await runTask("pdf.merge", { files: [...] }, { signal: ctx.signal, onProgress: ctx.onProgress });
    return { pdf: new Blob([bytes], { type: "application/pdf" }) };
  },
  ui: () => import("./ui"),   // dimuat hanya saat tool dibuka
});
```

- Impor berat (pdf-lib, SheetJS, PDF.js, Tesseract) selalu lewat `import()` dinamis.
- Tugas baru untuk worker ditambahkan di `packages/workers/src/tasks/` dan didaftarkan di `handlers`.
- Simpan draf dengan `usePersistentState("tool.<id>.<kunci>", nilaiAwal)`; simpan file dengan `saveBlob`.
- Status proses: `useAsyncTask()` + `<TaskStatus />` sudah menangani progres, batal, dan galat.
- Teks antarmuka: kamus `{ id: {...}, en: {...} }` + `useT(dict)`; kunci bahasa Inggris wajib lengkap (diperiksa type-check).

## 4. Mendaftarkan tool

1. Tambahkan dependensi `"@vogwork/tool-contoh": "workspace:*"` di `apps/web/package.json`, lalu `pnpm install`.
2. Tambahkan paket ke `transpilePackages` di `apps/web/next.config.ts`.
3. Impor manifest di `apps/web/src/lib/manifests.ts` dan tool di `apps/web/src/lib/tools.ts`.
4. Daftarkan ikon di `apps/web/src/components/tool-icon.tsx`.

Halaman `/alat/<slug>`, sitemap, pencarian hub, dan precache offline terbentuk otomatis.

## 5. Sebelum selesai

- Uji di mode terang dan gelap, di lebar ponsel.
- Uji tanpa koneksi setelah kunjungan pertama (`pnpm build && pnpm --filter @vogwork/web start`).
- Tulis unit test untuk logika murni (`src/*.test.ts`) dan catat lisensi pustaka baru di `LICENSES.md`.
