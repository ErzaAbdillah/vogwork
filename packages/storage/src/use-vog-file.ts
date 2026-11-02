"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VersionRow } from "./db";
import { createFile, deleteFile, getFile, lastVersionTime, listFiles, listVersions, saveVersion, updateFile } from "./files";
import { requestPersistence } from "./persist";
import { packVog, unpackVog, type VogFile, type VogFileType } from "./vog";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 1200;
/** Cuplikan otomatis paling sering tiap 10 menit penyuntingan. */
const AUTO_VERSION_MS = 10 * 60 * 1000;

/**
 * Status satu jenis file editor: daftar file, file yang dibuka, autosave,
 * dan riwayat versi lokal. Isi file disimpan di IndexedDB perangkat.
 */
export function useVogFiles<T>(type: VogFileType) {
  const [files, setFiles] = useState<VogFile[]>([]);
  const [current, setCurrent] = useState<VogFile | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [loaded, setLoaded] = useState(false);
  // Naik setiap isi dimuat ulang dari penyimpanan (buka, buat, pulihkan) agar editor dipasang ulang.
  const [revision, setRevision] = useState(0);
  const pending = useRef<{ id: string; content?: unknown; title?: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Isi terbaru dari editor, termasuk yang belum sempat disimpan (autosave ditunda).
  const latest = useRef<{ id: string; content: unknown } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setFiles(await listFiles(type));
    } finally {
      setLoaded(true);
    }
  }, [type]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    setStatus("saving");
    try {
      const saved = await updateFile(job.id, { ...(job.content !== undefined && { content: job.content }), ...(job.title !== undefined && { title: job.title }) });
      if (saved && Date.now() - (await lastVersionTime(saved.id)) > AUTO_VERSION_MS) await saveVersion(saved, "Otomatis");
      setStatus("saved");
      void refresh();
    } catch {
      setStatus("error");
    }
  }, [refresh]);

  // Simpan sisa perubahan saat tab ditutup atau komponen dilepas.
  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  const schedule = useCallback(
    (patch: { content?: T; title?: string }) => {
      if (!current) return;
      if (patch.content !== undefined) latest.current = { id: current.id, content: patch.content };
      pending.current = { ...(pending.current?.id === current.id ? pending.current : {}), id: current.id, ...patch };
      setStatus("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [current, flush],
  );

  const open = useCallback(
    async (id: string) => {
      await flush();
      const file = await getFile(id);
      if (file) {
        latest.current = null;
        setCurrent(file);
        setRevision((r) => r + 1);
        setStatus("saved");
      }
    },
    [flush],
  );

  const create = useCallback(
    async (title: string, content: T) => {
      await flush();
      const file = await createFile(type, title, content);
      void requestPersistence();
      setCurrent(file);
      setRevision((r) => r + 1);
      setStatus("saved");
      void refresh();
      return file;
    },
    [flush, refresh, type],
  );

  const close = useCallback(async () => {
    await flush();
    setCurrent(null);
    void refresh();
  }, [flush, refresh]);

  const rename = useCallback(
    (title: string) => {
      setCurrent((c) => (c ? { ...c, title } : c));
      schedule({ title });
    },
    [schedule],
  );

  const remove = useCallback(
    async (id: string) => {
      if (pending.current?.id === id) pending.current = null;
      await deleteFile(id);
      if (current?.id === id) setCurrent(null);
      void refresh();
    },
    [current, refresh],
  );

  const versions = useCallback(async (): Promise<VersionRow[]> => (current ? listVersions(current.id) : []), [current]);

  const snapshot = useCallback(
    async (label: string) => {
      await flush();
      const file = current && (await getFile(current.id));
      if (file) await saveVersion(file, label);
    },
    [current, flush],
  );

  /** Mengembalikan isi versi lama; isi saat ini disimpan dulu sebagai versi supaya tidak hilang. */
  const restore = useCallback(
    async (version: VersionRow) => {
      await snapshot("Sebelum dipulihkan");
      const file = await updateFile(version.fileId, { content: version.content });
      if (file) {
        latest.current = null;
        setCurrent(file);
        setRevision((r) => r + 1);
      }
      void refresh();
    },
    [refresh, snapshot],
  );

  const exportVog = useCallback(async (): Promise<Blob | null> => {
    await flush();
    const file = current && (await getFile(current.id));
    return file ? new Blob([packVog(file, []) as Uint8Array<ArrayBuffer>], { type: "application/zip" }) : null;
  }, [current, flush]);

  const importVog = useCallback(
    async (blob: Blob) => {
      const { file } = unpackVog(new Uint8Array(await blob.arrayBuffer()));
      if (file.type !== type) throw new Error(`File .vog ini berisi ${file.type}, bukan ${type}.`);
      return create(file.title, file.content as T);
    },
    [create, type],
  );

  return {
    files,
    loaded,
    current,
    content: (current?.content ?? null) as T | null,
    status,
    revision,
    open,
    create,
    close,
    rename,
    update: (content: T) => schedule({ content }),
    /** Isi terbaru file yang sedang dibuka, untuk ekspor. */
    getContent: (): T | null => (current ? ((latest.current?.id === current.id ? latest.current.content : current.content) as T) : null),
    remove,
    versions,
    snapshot,
    restore,
    exportVog,
    importVog,
  };
}

export type VogFilesApi<T> = ReturnType<typeof useVogFiles<T>>;
