import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export type VogFileType = "document" | "sheet" | "slide" | "design";

/**
 * Amplop untuk semua jenis file VogWork. Dokumen, sheet, dan slide
 * hanya berbeda pada isi `content`.
 */
export interface VogFile {
  id: string;
  type: VogFileType;
  title: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  content: unknown;
  assets: { hash: string; mime: string }[];
}

export interface VogAsset {
  hash: string;
  mime: string;
  data: Uint8Array;
}

export const CURRENT_SCHEMA_VERSION = 1;

type Migration = (file: VogFile) => VogFile;
/** Migrasi dari versi n ke n+1, dijalankan otomatis saat file dibuka. */
const migrations: Record<number, Migration> = {};

export function migrate(file: VogFile): VogFile {
  let current = file;
  while (current.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const step = migrations[current.schemaVersion];
    if (!step) throw new Error(`Tidak ada migrasi untuk schemaVersion ${current.schemaVersion}`);
    current = step(current);
  }
  return current;
}

export async function hashBytes(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Format `.vog`: zip berisi `file.json` dan folder `assets/`, supaya pengguna tidak terkunci. */
export function packVog(file: VogFile, assets: VogAsset[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {
    "file.json": strToU8(JSON.stringify(file, null, 2)),
  };
  for (const asset of assets) entries[`assets/${asset.hash}`] = asset.data;
  return zipSync(entries, { level: 6 });
}

export function unpackVog(bytes: Uint8Array): { file: VogFile; assets: VogAsset[] } {
  const entries = unzipSync(bytes);
  const json = entries["file.json"];
  if (!json) throw new Error("Bukan file .vog yang valid: file.json tidak ditemukan");
  const file = migrate(JSON.parse(strFromU8(json)) as VogFile);
  const assets = file.assets.map(({ hash, mime }) => {
    const data = entries[`assets/${hash}`];
    if (!data) throw new Error(`Aset ${hash} hilang dari file .vog`);
    return { hash, mime, data };
  });
  return { file, assets };
}
