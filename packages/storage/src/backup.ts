import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { getDb, kvGet, kvSet, type KvRow } from "./db";
import type { VogAsset, VogFile } from "./vog";

const LAST_BACKUP_KEY = "meta.lastBackup";
const BACKUP_FORMAT = "vogwork-backup";

/** Semua data lokal (preferensi, draf, file) dalam satu zip yang bisa dipulihkan. */
export async function exportBackup(): Promise<Uint8Array> {
  const db = getDb();
  const [kv, files, assets] = await Promise.all([db.kv.toArray(), db.files.toArray(), db.assets.toArray()]);
  const entries: Record<string, Uint8Array> = {
    "backup.json": strToU8(JSON.stringify({ format: BACKUP_FORMAT, version: 1, createdAt: new Date().toISOString() })),
    "kv.json": strToU8(JSON.stringify(kv.filter((row) => row.key !== LAST_BACKUP_KEY))),
    "files.json": strToU8(JSON.stringify(files)),
  };
  for (const asset of assets) entries[`assets/${asset.hash}`] = asset.data;
  entries["assets.json"] = strToU8(JSON.stringify(assets.map(({ hash, mime }) => ({ hash, mime }))));
  const zip = zipSync(entries, { level: 6 });
  await kvSet(LAST_BACKUP_KEY, Date.now());
  return zip;
}

export async function importBackup(bytes: Uint8Array): Promise<{ entries: number }> {
  const zip = unzipSync(bytes);
  const header = zip["backup.json"];
  if (!header || JSON.parse(strFromU8(header)).format !== BACKUP_FORMAT) {
    throw new Error("File ini bukan cadangan VogWork");
  }
  const kv = JSON.parse(strFromU8(zip["kv.json"] ?? strToU8("[]"))) as KvRow[];
  const files = JSON.parse(strFromU8(zip["files.json"] ?? strToU8("[]"))) as VogFile[];
  const assetMeta = JSON.parse(strFromU8(zip["assets.json"] ?? strToU8("[]"))) as Omit<VogAsset, "data">[];
  const assets: VogAsset[] = assetMeta.flatMap((meta) => {
    const data = zip[`assets/${meta.hash}`];
    return data ? [{ ...meta, data }] : [];
  });

  const db = getDb();
  await db.transaction("rw", db.kv, db.files, db.assets, async () => {
    await db.kv.bulkPut(kv);
    await db.files.bulkPut(files);
    await db.assets.bulkPut(assets);
  });
  return { entries: kv.length + files.length + assets.length };
}

export async function getLastBackup(): Promise<number | null> {
  return (await kvGet<number>(LAST_BACKUP_KEY)) ?? null;
}

export async function countLocalEntries(): Promise<number> {
  const db = getDb();
  const [kv, files] = await Promise.all([db.kv.count(), db.files.count()]);
  return kv + files;
}

export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.transaction("rw", [db.kv, db.files, db.assets, db.versions], async () => {
    await Promise.all([db.kv.clear(), db.files.clear(), db.assets.clear(), db.versions.clear()]);
  });
}
