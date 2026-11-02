import { zipSync, type Zippable } from "fflate";
import { annotate, readForm } from "./annotate";
import { imagesToPdf, merge, optimize, split, stampRecords } from "./pdf";
import type { Report } from "./types";

export type { Report } from "./types";
export type { AnnotateInput, AnnotationItem, FormField } from "./annotate";
export type { ImagesToPdfInput, MergeInput, SplitInput, StampField, StampInput, StandardFontKey } from "./pdf";

export interface ZipInput {
  entries: { name: string; bytes: Uint8Array }[];
  /** 0 = simpan saja (untuk PDF/JPG yang sudah terkompresi). */
  level?: 0 | 6;
}

async function zip({ entries, level = 6 }: ZipInput, report: Report): Promise<Uint8Array> {
  const files: Zippable = {};
  for (const entry of entries) {
    let name = entry.name;
    for (let n = 2; name in files; n++) name = entry.name.replace(/(\.[^.]+)?$/, ` (${n})$1`);
    files[name] = [entry.bytes, { level }];
  }
  const out = zipSync(files);
  report(1);
  return out;
}

/** Semua tugas yang bisa dijalankan di Web Worker. */
export const handlers = {
  "pdf.merge": merge,
  "pdf.split": split,
  "pdf.optimize": optimize,
  "pdf.fromImages": imagesToPdf,
  "pdf.stamp": stampRecords,
  "pdf.annotate": annotate,
  "pdf.readForm": readForm,
  zip,
};

export type Handlers = typeof handlers;
export type TaskName = keyof Handlers;
export type TaskInput<K extends TaskName> = Parameters<Handlers[K]>[0];
export type TaskOutput<K extends TaskName> = Awaited<ReturnType<Handlers[K]>>;
