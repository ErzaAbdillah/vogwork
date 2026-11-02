"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Nilai yang hanya ada di browser (mis. dukungan WebGPU). Saat render statis dan
 * hidrasi memakai `serverValue`, lalu langsung diganti nilai browser tanpa salah cocok HTML.
 */
export function useClientValue<T>(getValue: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, getValue, () => serverValue);
}

/** `true` setelah komponen berjalan di browser. */
export function useIsClient(): boolean {
  return useClientValue(() => true, false);
}

/** Object URL untuk Blob yang otomatis dilepas saat Blob berganti atau komponen dilepas. */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    // Object URL adalah sumber daya di luar React yang harus dibuat dan dilepas bersama efek ini.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return blob ? url : null;
}
