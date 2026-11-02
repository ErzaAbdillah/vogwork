import Dexie, { type Table } from "dexie";
import type { VogAsset, VogFile } from "./vog";

/** Cuplikan isi file untuk riwayat versi lokal. */
export interface VersionRow {
  id?: number;
  fileId: string;
  createdAt: number;
  label: string;
  title: string;
  content: unknown;
}

export interface KvRow {
  key: string;
  value: unknown;
  updatedAt: number;
}

class VogDatabase extends Dexie {
  files!: Table<VogFile, string>;
  assets!: Table<VogAsset, string>;
  kv!: Table<KvRow, string>;
  versions!: Table<VersionRow, number>;

  constructor() {
    super("vogwork");
    this.version(1).stores({
      files: "id, type, updatedAt",
      assets: "hash",
      kv: "key",
    });
    this.version(2).stores({
      versions: "++id, fileId, createdAt",
    });
  }
}

let instance: VogDatabase | null = null;

/** Basis data IndexedDB; hanya dibuat di browser. */
export function getDb(): VogDatabase {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB tidak tersedia di lingkungan ini");
  instance ??= new VogDatabase();
  return instance;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const row = await getDb().kv.get(key);
  return row?.value as T | undefined;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await getDb().kv.put({ key, value, updatedAt: Date.now() });
}

export async function kvDelete(key: string): Promise<void> {
  await getDb().kv.delete(key);
}

/** Nomor urut yang naik setiap dipanggil, mis. untuk nomor surat atau invoice. */
export async function nextCounter(key: string): Promise<number> {
  const db = getDb();
  return db.transaction("rw", db.kv, async () => {
    const current = ((await db.kv.get(key))?.value as number | undefined) ?? 0;
    const next = current + 1;
    await db.kv.put({ key, value: next, updatedAt: Date.now() });
    return next;
  });
}
