export interface StorageStatus {
  persisted: boolean;
  usage: number | null;
  quota: number | null;
}

/**
 * Meminta browser agar tidak menghapus data VogWork saat ruang penuh.
 * Chromium memutuskan diam-diam; Firefox menampilkan pertanyaan ke pengguna.
 */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  if (typeof navigator === "undefined" || !navigator.storage) return { persisted: false, usage: null, quota: null };
  const [persisted, estimate] = await Promise.all([
    navigator.storage.persisted?.().catch(() => false) ?? false,
    navigator.storage.estimate?.().catch(() => ({}) as StorageEstimate) ?? ({} as StorageEstimate),
  ]);
  return { persisted, usage: estimate.usage ?? null, quota: estimate.quota ?? null };
}
