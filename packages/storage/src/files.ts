import { getDb, type VersionRow } from "./db";
import { CURRENT_SCHEMA_VERSION, type VogFile, type VogFileType } from "./vog";

/** Batas cuplikan per file supaya riwayat tidak memenuhi penyimpanan. */
const MAX_VERSIONS = 40;

export function newFileId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `f${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export async function listFiles(type: VogFileType): Promise<VogFile[]> {
  const files = await getDb().files.where("type").equals(type).toArray();
  return files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getFile(id: string): Promise<VogFile | undefined> {
  return getDb().files.get(id);
}

export async function createFile(type: VogFileType, title: string, content: unknown): Promise<VogFile> {
  const now = new Date().toISOString();
  const file: VogFile = { id: newFileId(), type, title, schemaVersion: CURRENT_SCHEMA_VERSION, createdAt: now, updatedAt: now, content, assets: [] };
  await getDb().files.put(file);
  return file;
}

export async function updateFile(id: string, patch: Partial<Pick<VogFile, "title" | "content">>): Promise<VogFile | undefined> {
  const db = getDb();
  const current = await db.files.get(id);
  if (!current) return undefined;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.files.put(next);
  return next;
}

export async function deleteFile(id: string): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.files, db.versions, async () => {
    await db.files.delete(id);
    await db.versions.where("fileId").equals(id).delete();
  });
}

export async function saveVersion(file: Pick<VogFile, "id" | "title" | "content">, label: string): Promise<void> {
  const db = getDb();
  await db.versions.add({ fileId: file.id, createdAt: Date.now(), label, title: file.title, content: file.content });
  const all = await db.versions.where("fileId").equals(file.id).sortBy("createdAt");
  const excess = all.length - MAX_VERSIONS;
  if (excess > 0) await db.versions.bulkDelete(all.slice(0, excess).map((v) => v.id!));
}

export async function listVersions(fileId: string): Promise<VersionRow[]> {
  const rows = await getDb().versions.where("fileId").equals(fileId).sortBy("createdAt");
  return rows.reverse();
}

export async function lastVersionTime(fileId: string): Promise<number> {
  const rows = await getDb().versions.where("fileId").equals(fileId).sortBy("createdAt");
  return rows.at(-1)?.createdAt ?? 0;
}
