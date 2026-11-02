"use client";

import type { TableData } from "@vogwork/core";
import type { ImageMime } from "@vogwork/formats/image";
// Hanya fungsi teks yang diimpor langsung; SheetJS tetap dimuat lazy di dalam modul ini.
import { tableToCsv, tableToJson } from "@vogwork/formats/table";
import { formatBytes, useLocale, useT } from "@vogwork/i18n";
import { bytesToBlob, saveBlob } from "@vogwork/storage";
import { Alert, Badge, Button, Dropzone, Field, Input, Segmented, Tabs, TaskStatus, Textarea, useAsyncTask } from "@vogwork/ui";
import { Copy, Download, FileJson, Image as ImageIcon, Repeat2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const dict = {
  id: {
    tabs: "Jenis konversi",
    images: "Gambar",
    data: "Data",
    dropImages: "Tarik gambar ke sini (JPG, PNG, WEBP, GIF, BMP)",
    format: "Format tujuan",
    quality: "Kualitas: {value}%",
    maxWidth: "Lebar maksimum (px)",
    maxHeight: "Tinggi maksimum (px)",
    optional: "Kosongkan untuk ukuran asli",
    convert: "Konversi {count} gambar",
    converting: "Mengonversi {n} dari {total}…",
    downloadAll: "Unduh semua (ZIP)",
    saved: "{percent} lebih kecil",
    bigger: "{percent} lebih besar",
    dropData: "Pilih file CSV, TSV, Excel, atau JSON",
    paste: "Atau tempel data (CSV, data dari Excel, atau JSON)",
    readPaste: "Baca data tempelan",
    output: "Format hasil",
    csvComma: "CSV koma",
    csvSemicolon: "CSV titik koma",
    tsv: "TSV",
    json: "JSON",
    xlsx: "Excel (XLSX)",
    rows: "{rows} baris · {cols} kolom",
    previewNote: "Menampilkan 20 baris pertama.",
    copy: "Salin",
    copied: "Tersalin",
    download: "Unduh",
    readError: "Data tidak bisa dibaca: {message}",
    jsonError: "JSON tidak valid: {message}",
    emptyData: "Tidak ada baris data yang terbaca.",
  },
  en: {
    tabs: "Conversion type",
    images: "Images",
    data: "Data",
    dropImages: "Drop images here (JPG, PNG, WEBP, GIF, BMP)",
    format: "Target format",
    quality: "Quality: {value}%",
    maxWidth: "Maximum width (px)",
    maxHeight: "Maximum height (px)",
    optional: "Leave empty to keep the original size",
    convert: "Convert {count} images",
    converting: "Converting {n} of {total}…",
    downloadAll: "Download all (ZIP)",
    saved: "{percent} smaller",
    bigger: "{percent} larger",
    dropData: "Choose a CSV, TSV, Excel, or JSON file",
    paste: "Or paste data (CSV, cells from Excel, or JSON)",
    readPaste: "Read pasted data",
    output: "Output format",
    csvComma: "CSV comma",
    csvSemicolon: "CSV semicolon",
    tsv: "TSV",
    json: "JSON",
    xlsx: "Excel (XLSX)",
    rows: "{rows} rows · {cols} columns",
    previewNote: "Showing the first 20 rows.",
    copy: "Copy",
    copied: "Copied",
    download: "Download",
    readError: "The data cannot be read: {message}",
    jsonError: "Invalid JSON: {message}",
    emptyData: "No data rows were found.",
  },
};

interface Converted {
  id: string;
  source: File;
  blob: Blob;
  url: string;
  name: string;
  width: number;
  height: number;
}

let seq = 0;

function ImagePanel() {
  const t = useT(dict);
  const { locale } = useLocale();
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<ImageMime>("image/jpeg");
  const [quality, setQuality] = useState(0.82);
  const [maxW, setMaxW] = useState("");
  const [maxH, setMaxH] = useState("");
  const [results, setResults] = useState<Converted[]>([]);
  const task = useAsyncTask();
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const convert = () =>
    task.run(async ({ signal, progress }) => {
      const { convertImage, extensionFor, replaceExtension } = await import("@vogwork/formats/image");
      const out: Converted[] = [];
      for (const [i, file] of files.entries()) {
        signal.throwIfAborted();
        progress(i / files.length, t("converting", { n: i + 1, total: files.length }));
        const r = await convertImage(file, { type, quality, maxWidth: Number(maxW) || undefined, maxHeight: Number(maxH) || undefined });
        out.push({ id: `c${seq++}`, source: file, blob: r.blob, url: URL.createObjectURL(r.blob), name: replaceExtension(file.name, extensionFor(type)), width: r.width, height: r.height });
      }
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current = out.map((r) => r.url);
      setResults(out);
    });

  const downloadAll = async () => {
    const { runTask } = await import("@vogwork/workers");
    const entries = await Promise.all(results.map(async (r) => ({ name: r.name, bytes: new Uint8Array(await r.blob.arrayBuffer()) })));
    await saveBlob(bytesToBlob(await runTask("zip", { entries, level: 0 }), "application/zip"), "gambar-konversi.zip");
  };

  return (
    <div className="space-y-5">
      <Dropzone multiple accept="image/*" title={t("dropImages")} onFiles={(f) => setFiles((prev) => [...prev, ...f])} />
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="inline-flex max-w-full items-center gap-1 rounded-full border bg-card py-1 pr-1 pl-3 text-xs">
              <span className="truncate">{f.name}</span>
              <span className="text-muted-foreground">{formatBytes(f.size, locale)}</span>
              <Button variant="ghost" size="icon-sm" className="size-6" aria-label="×" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-5">
        <Field label={t("format")}>
          {() => (
            <Segmented
              label={t("format")}
              value={type}
              onChange={setType}
              options={[
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
                { value: "image/webp", label: "WEBP" },
              ]}
            />
          )}
        </Field>
        {type !== "image/png" && (
          <Field label={t("quality", { value: Math.round(quality * 100) })} className="w-48">
            {(p) => <input {...p} type="range" min={0.4} max={1} step={0.01} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="accent-primary" />}
          </Field>
        )}
        <Field label={t("maxWidth")} hint={t("optional")}>
          {(p) => <Input {...p} type="number" min={1} className="w-36" value={maxW} onChange={(e) => setMaxW(e.target.value)} />}
        </Field>
        <Field label={t("maxHeight")}>{(p) => <Input {...p} type="number" min={1} className="w-36" value={maxH} onChange={(e) => setMaxH(e.target.value)} />}</Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={files.length === 0 || task.running} onClick={convert}>
          <Repeat2 /> {t("convert", { count: files.length })}
        </Button>
        {results.length > 1 && (
          <Button size="lg" variant="outline" onClick={downloadAll}>
            <Download /> {t("downloadAll")}
          </Button>
        )}
      </div>
      <TaskStatus state={task.state} onCancel={task.cancel} />
      {results.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {results.map((r) => {
            const diff = 1 - r.blob.size / r.source.size;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-lg border bg-card p-2">
                <img src={r.url} alt="" className="checkerboard size-14 shrink-0 rounded object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.width}×{r.height} · {formatBytes(r.source.size, locale)} → {formatBytes(r.blob.size, locale)}
                  </p>
                  <Badge variant={diff > 0 ? "success" : "outline"} className="mt-1">
                    {diff > 0 ? t("saved", { percent: `${Math.round(diff * 100)}%` }) : t("bigger", { percent: `${Math.round(-diff * 100)}%` })}
                  </Badge>
                </div>
                <Button size="icon-sm" aria-label={t("download")} onClick={() => saveBlob(r.blob, r.name)}>
                  <Download />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type OutFormat = "csv" | "csv-semicolon" | "tsv" | "json" | "xlsx";

function DataPanel() {
  const t = useT(dict);
  const [table, setTable] = useState<TableData | null>(null);
  const [sourceName, setSourceName] = useState("data");
  const [paste, setPaste] = useState("");
  const [format, setFormat] = useState<OutFormat>("json");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const task = useAsyncTask();

  const output = useMemo(() => {
    if (!table || format === "xlsx") return "";
    if (format === "json") return tableToJson(table);
    return tableToCsv(table, format === "tsv" ? "\t" : format === "csv-semicolon" ? ";" : ",");
  }, [table, format]);

  const accept = (next: TableData, name: string) => {
    if (next.rows.length === 0) return setError(t("emptyData"));
    setError(null);
    setTable(next);
    setSourceName(name.replace(/\.[^.]+$/, "") || "data");
  };

  const readFile = (file: File) =>
    task.run(async () => {
      const lib = await import("@vogwork/formats/table");
      if (file.name.toLowerCase().endsWith(".json")) {
        try {
          accept(lib.jsonToTable(JSON.parse(await file.text())), file.name);
        } catch (e) {
          setError(t("jsonError", { message: (e as Error).message }));
        }
      } else {
        accept(await lib.readTable(file), file.name);
      }
    });

  const readPaste = async () => {
    const lib = await import("@vogwork/formats/table");
    const text = paste.trim();
    if (text.startsWith("[") || text.startsWith("{")) {
      try {
        accept(lib.jsonToTable(JSON.parse(text)), "data");
      } catch (e) {
        setError(t("jsonError", { message: (e as Error).message }));
      }
    } else accept(lib.parsePastedTable(text), "data");
  };

  const download = async () => {
    if (!table) return;
    if (format === "xlsx") {
      const { tableToXlsx } = await import("@vogwork/formats/table");
      return saveBlob(bytesToBlob(await tableToXlsx(table), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), `${sourceName}.xlsx`);
    }
    const ext = format === "json" ? "json" : format === "tsv" ? "tsv" : "csv";
    const mime = format === "json" ? "application/json" : "text/csv";
    // BOM membuat Excel membaca CSV sebagai UTF-8 sehingga huruf seperti é tidak rusak.
    const body = ext === "json" ? output : `﻿${output}`;
    return saveBlob(new Blob([body], { type: `${mime};charset=utf-8` }), `${sourceName}.${ext}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Dropzone accept=".csv,.tsv,.txt,.xlsx,.xls,.ods,.json" icon={<FileJson />} title={t("dropData")} onFiles={([f]) => readFile(f!)} />
        <Field label={t("paste")}>
          {(p) => <Textarea {...p} rows={5} className="font-mono text-xs" value={paste} onChange={(e) => setPaste(e.target.value)} />}
        </Field>
        <Button variant="secondary" disabled={!paste.trim()} onClick={readPaste}>
          {t("readPaste")}
        </Button>
        <TaskStatus state={task.state} />
        {error && <Alert variant="error">{error}</Alert>}
      </div>

      <div className="space-y-4">
        {table && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge>{t("rows", { rows: table.rows.length, cols: table.columns.length })}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setTable(null)}>
                <X />
              </Button>
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {table.columns.map((c) => (
                      <th key={c} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-t">
                      {table.columns.map((c) => (
                        <td key={c} className="max-w-48 truncate px-2 py-1">
                          {row[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {table.rows.length > 20 && <p className="text-xs text-muted-foreground">{t("previewNote")}</p>}
            <Field label={t("output")}>
              {() => (
                <Segmented
                  label={t("output")}
                  value={format}
                  onChange={setFormat}
                  className="flex-wrap"
                  options={[
                    { value: "json", label: t("json") },
                    { value: "csv", label: t("csvComma") },
                    { value: "csv-semicolon", label: t("csvSemicolon") },
                    { value: "tsv", label: t("tsv") },
                    { value: "xlsx", label: t("xlsx") },
                  ]}
                />
              )}
            </Field>
            {format !== "xlsx" && <Textarea aria-label={t("output")} readOnly rows={8} className="font-mono text-xs" value={output} />}
            <div className="flex gap-2">
              <Button onClick={download}>
                <Download /> {t("download")}
              </Button>
              {format !== "xlsx" && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(output);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <Copy /> {copied ? t("copied") : t("copy")}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConverterTool() {
  const t = useT(dict);
  const [tab, setTab] = useState<"images" | "data">("images");
  return (
    <div className="space-y-5">
      <Tabs
        label={t("tabs")}
        value={tab}
        onChange={setTab}
        items={[
          { value: "images", label: t("images"), icon: <ImageIcon /> },
          { value: "data", label: t("data"), icon: <FileJson /> },
        ]}
      />
      {tab === "images" ? <ImagePanel /> : <DataPanel />}
    </div>
  );
}
