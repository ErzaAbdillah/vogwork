"use client";

import { common, useT } from "@vogwork/i18n";
import { saveBlob } from "@vogwork/storage";
import { Badge, Button, Checkbox, Dropzone, EmptyState, Field, Segmented, TaskStatus, Textarea, useAsyncTask } from "@vogwork/ui";
import type { OcrLanguage } from "@vogwork/workers/ocr";
import { Copy, Download, ScanText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const dict = {
  id: {
    drop: "Tarik gambar atau PDF hasil scan ke sini",
    dropHint: "JPG, PNG, WEBP, atau PDF. Bisa beberapa file sekaligus.",
    language: "Bahasa dokumen",
    both: "Indonesia + Inggris",
    indonesian: "Indonesia",
    english: "Inggris",
    enhance: "Tingkatkan kontras (untuk foto kurang terang)",
    run: "Ambil teks dari {count} gambar",
    preparing: "Menyiapkan mesin OCR (sekali saja)…",
    recognizing: "Membaca gambar {n} dari {total}…",
    pdfPages: "Merender halaman PDF {done}/{total}…",
    result: "Hasil",
    confidence: "Keyakinan {value}%",
    lowConfidence: "Keyakinan rendah: periksa ulang hasil ini.",
    copyAll: "Salin semua",
    copied: "Tersalin",
    downloadTxt: "Unduh .txt",
    emptyResult: "Hasil teks akan muncul di sini.",
    noText: "(tidak ada teks terbaca)",
    page: "halaman {n}",
  },
  en: {
    drop: "Drop images or scanned PDFs here",
    dropHint: "JPG, PNG, WEBP, or PDF. Several files at once are fine.",
    language: "Document language",
    both: "Indonesian + English",
    indonesian: "Indonesian",
    english: "English",
    enhance: "Boost contrast (for dim photos)",
    run: "Extract text from {count} images",
    preparing: "Preparing the OCR engine (one time)…",
    recognizing: "Reading image {n} of {total}…",
    pdfPages: "Rendering PDF page {done}/{total}…",
    result: "Result",
    confidence: "Confidence {value}%",
    lowConfidence: "Low confidence: double-check this result.",
    copyAll: "Copy all",
    copied: "Copied",
    downloadTxt: "Download .txt",
    emptyResult: "Extracted text will appear here.",
    noText: "(no readable text)",
    page: "page {n}",
  },
};

interface Source {
  id: string;
  label: string;
  image: Blob;
}

interface Result {
  id: string;
  label: string;
  text: string;
  confidence: number;
  url: string;
}

/** Abu-abu + peregangan kontras sederhana; membantu foto dokumen yang redup. */
async function enhance(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    d[i] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    const v = ((d[i]! - min) / range) * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar"))), "image/png"));
}

let seq = 0;

export default function OcrTool() {
  const t = useT(dict);
  const c = useT(common);
  const [files, setFiles] = useState<File[]>([]);
  const [lang, setLang] = useState<"both" | OcrLanguage>("both");
  const [boost, setBoost] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [copied, setCopied] = useState(false);
  const task = useAsyncTask();

  // URL gambar mini dilepas saat hasil diganti atau halaman ditutup, bukan saat teks disunting.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const showResults = (next: Result[]) => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = next.map((r) => r.url);
    setResults(next);
  };

  const run = () =>
    task.run(async ({ signal, progress }) => {
      const sources: Source[] = [];
      for (const file of files) {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const { renderPdfPages } = await import("@vogwork/formats/pdfjs");
          const pages = await renderPdfPages(file, { dpi: 200, type: "image/png", signal, onProgress: (done, total) => progress(null, t("pdfPages", { done, total })) });
          pages.forEach((p, i) => sources.push({ id: `s${seq++}`, label: `${file.name} · ${t("page", { n: i + 1 })}`, image: p.blob }));
        } else {
          sources.push({ id: `s${seq++}`, label: file.name, image: file });
        }
      }
      const images = boost ? await Promise.all(sources.map((s) => enhance(s.image))) : sources.map((s) => s.image);
      const { recognizeImages } = await import("@vogwork/workers/ocr");
      const output = await recognizeImages(images, {
        languages: lang === "both" ? ["ind", "eng"] : [lang],
        signal,
        onProgress: (value, stage, index) => progress(value, stage === "prepare" ? t("preparing") : t("recognizing", { n: index + 1, total: images.length })),
      });
      return sources.map((s, i) => ({ id: s.id, label: s.label, text: output[i]!.text, confidence: Math.round(output[i]!.confidence), url: URL.createObjectURL(s.image) }));
    }).then((r) => r && showResults(r));

  const allText = results.map((r) => (results.length > 1 ? `# ${r.label}\n${r.text}` : r.text)).join("\n\n");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <Dropzone multiple accept="image/*,.pdf,application/pdf" title={t("drop")} hint={t("dropHint")} onFiles={(f) => setFiles((prev) => [...prev, ...f])} />
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="inline-flex max-w-full items-center gap-1 rounded-full border bg-card py-1 pr-1 pl-3 text-xs">
                <span className="truncate">{f.name}</span>
                <Button variant="ghost" size="icon-sm" className="size-6" aria-label={c("remove")} onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Field label={t("language")}>
          {() => (
            <Segmented
              label={t("language")}
              value={lang}
              onChange={setLang}
              options={[
                { value: "both", label: t("both") },
                { value: "ind", label: t("indonesian") },
                { value: "eng", label: t("english") },
              ]}
            />
          )}
        </Field>
        <Checkbox label={t("enhance")} checked={boost} onChange={(e) => setBoost(e.target.checked)} />
        <Button size="lg" disabled={files.length === 0 || task.running} onClick={run}>
          <ScanText /> {t("run", { count: files.length })}
        </Button>
        <TaskStatus state={task.state} onCancel={task.cancel} />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t("result")}</h3>
          {results.length > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(allText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy /> {copied ? t("copied") : t("copyAll")}
              </Button>
              <Button size="sm" onClick={() => saveBlob(new Blob([allText], { type: "text/plain;charset=utf-8" }), "hasil-ocr.txt")}>
                <Download /> {t("downloadTxt")}
              </Button>
            </div>
          )}
        </div>
        {results.length === 0 ? (
          <EmptyState icon={<ScanText />} title={t("emptyResult")} />
        ) : (
          results.map((r) => (
            <div key={r.id} className="space-y-2 rounded-xl border bg-card p-3">
              <div className="flex items-center gap-3">
                <img src={r.url} alt="" className="size-12 shrink-0 rounded border object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.label}</p>
                  <Badge variant={r.confidence >= 70 ? "success" : "outline"}>{t("confidence", { value: r.confidence })}</Badge>
                </div>
              </div>
              {r.confidence < 60 && <p className="text-xs text-muted-foreground">{t("lowConfidence")}</p>}
              <Textarea
                aria-label={r.label}
                rows={8}
                className="font-mono text-xs"
                value={r.text || t("noText")}
                onChange={(e) => setResults((list) => list.map((x) => (x.id === r.id ? { ...x, text: e.target.value } : x)))}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
