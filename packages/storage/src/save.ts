interface SaveFilePickerWindow {
  showSaveFilePicker?: (options: { suggestedName?: string }) => Promise<{
    createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
  }>;
}

const PICKER_PREF_KEY = "vog.savePicker";

export function supportsFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

export function getSavePickerPreference(): boolean {
  try {
    return localStorage.getItem(PICKER_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSavePickerPreference(enabled: boolean): void {
  try {
    localStorage.setItem(PICKER_PREF_KEY, enabled ? "1" : "0");
  } catch {
    // abaikan
  }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Menyimpan hasil ke perangkat. Di Chromium, bila pengguna mengaktifkannya,
 * dialog "Simpan sebagai" dipakai; browser lain (atau bila dialog gagal) memakai unduhan biasa.
 */
export async function saveBlob(blob: Blob, filename: string): Promise<void> {
  const w = window as unknown as SaveFilePickerWindow;
  if (getSavePickerPreference() && w.showSaveFilePicker) {
    try {
      const handle = await w.showSaveFilePicker({ suggestedName: filename });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      // Pengguna menutup dialog: jangan lanjut mengunduh.
      if ((error as DOMException).name === "AbortError") return;
      // Dialog butuh gestur pengguna yang masih baru; bila kedaluwarsa, unduh biasa.
    }
  }
  download(blob, filename);
}

export function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type });
}

/** Nama file aman untuk Windows, macOS, dan Linux. */
export function safeFilename(name: string, fallback = "file"): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}
