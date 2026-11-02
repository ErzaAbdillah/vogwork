import type { ComponentType } from "react";

export type Locale = "id" | "en";

/** Teks yang tersedia dalam semua bahasa antarmuka. */
export type Localized = Record<Locale, string>;

export type ToolCategory = "pdf" | "document" | "sheet" | "design" | "business" | "media" | "util";

/**
 * Tipe data yang mengalir antar-tool. Dua tool bisa dirangkai bila tipe
 * output yang satu cocok dengan tipe input yang lain.
 */
export type PortType =
  | "file/pdf"
  | "file/image"
  | "file/zip"
  | "file/any"
  | "table/rows"
  | "text"
  | "json";

export interface PortSpec {
  name: string;
  type: PortType;
  /** Port menerima atau menghasilkan lebih dari satu nilai. */
  multiple?: boolean;
  optional?: boolean;
}

/** Nilai untuk port `table/rows`. */
export interface TableData {
  columns: string[];
  rows: Record<string, string>[];
}

export type ToolInput = Record<string, unknown>;
export type ToolOutput = Record<string, unknown>;

export interface ToolContext {
  locale: Locale;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
  onProgress?: (progress: number, message?: string) => void;
}

/** Konten halaman statis per tool, ditulis dalam bahasa Indonesia untuk mesin pencari. */
export interface ToolSeo {
  title: string;
  description: string;
  steps: string[];
  faq: { q: string; a: string }[];
}

/**
 * Metadata tool yang ringan: aman dipakai di halaman statis tanpa memuat
 * kode berat tool tersebut.
 */
export interface ToolManifest {
  id: string;
  /** Slug URL berbahasa Indonesia, mis. "gabung-pisah-kompres-pdf". */
  slug: string;
  name: Localized;
  tagline: Localized;
  category: ToolCategory;
  /** Nama ikon lucide (kebab-case). */
  icon: string;
  keywords: string[];
  inputs: PortSpec[];
  outputs: PortSpec[];
  /** Tool butuh unduhan model/data saat pertama dipakai. */
  downloadsOnFirstUse?: Localized;
  seo: ToolSeo;
}

export interface VogTool extends ToolManifest {
  /** Menjalankan tool tanpa antarmuka; pekerjaan berat dilempar ke Web Worker. */
  run(input: ToolInput, ctx: ToolContext): Promise<ToolOutput>;
  /** Antarmuka tool, dimuat hanya saat tool dibuka. */
  ui: () => Promise<{ default: ComponentType }>;
}
