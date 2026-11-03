"use client";

import type { Localized } from "@vogwork/core";
import { useLocale, useT } from "@vogwork/i18n";
import { safeFilename, saveBlob, type VersionRow, type VogFilesApi } from "@vogwork/storage";
import { ArrowLeft, Check, CloudOff, FileDown, FilePlus2, History, Loader2, Save, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../components/button";
import { Dropzone } from "../components/dropzone";
import { Alert, EmptyState } from "../components/feedback";
import { cn } from "../lib/cn";

const dict = {
  id: {
    newFile: "Buat baru",
    templates: "Mulai dari",
    import: "Buka file dari perangkat",
    importHint: "Isi file dibaca oleh browser Anda, tidak diunggah.",
    recent: "File di perangkat ini",
    noFiles: "Belum ada file. Buat baru atau buka file dari perangkat.",
    open: "Buka",
    delete: "Hapus",
    deleteConfirm: "Hapus “{title}” dari perangkat ini? Riwayat versinya ikut terhapus.",
    back: "Semua file",
    title: "Judul file",
    saving: "Menyimpan…",
    saved: "Tersimpan di perangkat",
    error: "Gagal menyimpan",
    history: "Riwayat versi",
    saveVersion: "Simpan versi",
    noVersions: "Belum ada versi. Versi otomatis dibuat tiap 10 menit penyuntingan.",
    restore: "Pulihkan",
    restoreConfirm: "Pulihkan versi ini? Isi saat ini disimpan dulu sebagai versi baru.",
    exportVog: "Simpan .vog",
    importError: "File tidak bisa dibuka: {message}",
    report: "Laporan kompatibilitas",
    edited: "diubah {date}",
    importing: "Membuka file…",
  },
  en: {
    newFile: "New",
    templates: "Start from",
    import: "Open a file from this device",
    importHint: "The file is read by your browser, never uploaded.",
    recent: "Files on this device",
    noFiles: "No files yet. Create a new one or open a file from your device.",
    open: "Open",
    delete: "Delete",
    deleteConfirm: "Delete “{title}” from this device? Its version history is deleted too.",
    back: "All files",
    title: "File title",
    saving: "Saving…",
    saved: "Saved on this device",
    error: "Save failed",
    history: "Version history",
    saveVersion: "Save version",
    noVersions: "No versions yet. A version is created automatically every 10 minutes of editing.",
    restore: "Restore",
    restoreConfirm: "Restore this version? The current content is saved as a new version first.",
    exportVog: "Save .vog",
    importError: "The file cannot be opened: {message}",
    report: "Compatibility report",
    edited: "edited {date}",
    importing: "Opening file…",
  },
};

export interface WorkspaceTemplate<T> {
  id: string;
  name: Localized;
  description: Localized;
  create: () => T;
}

export interface ImportResult<T> {
  title: string;
  content: T;
  /** Elemen yang diabaikan atau disederhanakan saat impor. */
  report: string[];
}

export interface WorkspaceExport {
  label: string;
  icon?: ReactNode;
  run: (title: string) => Promise<void>;
}

/**
 * Kerangka bersama editor Dokumen, Spreadsheet, dan Slide: layar awal dengan
 * template dan daftar file, lalu bilah atas berisi judul, status simpan,
 * riwayat versi, dan tombol ekspor.
 */
export function Workspace<T>({
  api,
  icon,
  templates,
  importAccept,
  importFile,
  exports,
  children,
}: {
  api: VogFilesApi<T>;
  icon: ReactNode;
  templates: WorkspaceTemplate<T>[];
  importAccept: string;
  importFile: (file: File) => Promise<ImportResult<T>>;
  exports: WorkspaceExport[];
  children: (content: T, onChange: (content: T) => void) => ReactNode;
}) {
  const t = useT(dict);
  const { locale } = useLocale();
  const [report, setReport] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [busyExport, setBusyExport] = useState<string | null>(null);

  // Tool lain bisa mengirim pengguna ke file tertentu lewat ?buka=<id>.
  const { open } = api;
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("buka");
    if (!id) return;
    void open(id);
    window.history.replaceState(null, "", window.location.pathname);
  }, [open]);

  const dateText = (value: string | number) =>
    new Date(value).toLocaleString(locale === "id" ? "id-ID" : "en-US", { dateStyle: "medium", timeStyle: "short" });

  const onImport = async (file: File) => {
    setError(null);
    setImporting(true);
    try {
      if (file.name.toLowerCase().endsWith(".vog")) {
        await api.importVog(file);
        setReport(null);
      } else {
        const result = await importFile(file);
        await api.create(result.title, result.content);
        setReport(result.report.length > 0 ? result.report : null);
      }
    } catch (e) {
      setError(t("importError", { message: (e as Error).message }));
    } finally {
      setImporting(false);
    }
  };

  if (!api.current || api.content === null) {
    return (
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-medium tracking-widest text-muted-foreground uppercase">{t("templates")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((tpl) => (
              <li key={tpl.id}>
                <button
                  type="button"
                  onClick={() => void api.create(tpl.name[locale], tpl.create())}
                  className="flex h-full w-full flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left backdrop-blur-xl transition-all outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="text-primary [&_svg]:size-5">{tpl.id === "blank" ? <FilePlus2 /> : icon}</span>
                  <span className="font-medium">{tpl.name[locale]}</span>
                  <span className="text-xs text-muted-foreground">{tpl.description[locale]}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-2">
            <Dropzone accept={`${importAccept},.vog`} icon={importing ? <Loader2 className="animate-spin" /> : <Upload />} title={importing ? t("importing") : t("import")} hint={t("importHint")} onFiles={([f]) => void onImport(f!)} />
            {error && <Alert variant="error">{error}</Alert>}
          </div>
          <section className="space-y-3">
            <h2 className="text-sm font-medium tracking-widest text-muted-foreground uppercase">{t("recent")}</h2>
            {api.loaded && api.files.length === 0 ? (
              <EmptyState icon={icon} title={t("noFiles")} />
            ) : (
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card backdrop-blur-xl">
                {api.files.map((file) => (
                  <li key={file.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
                    <button type="button" className="min-w-0 flex-1 text-left outline-none focus-visible:underline" onClick={() => void api.open(file.id)}>
                      <span className="block truncate text-sm font-medium">{file.title}</span>
                      <span className="block text-xs text-muted-foreground">{t("edited", { date: dateText(file.updatedAt) })}</span>
                    </button>
                    <Button size="sm" variant="outline" onClick={() => void api.open(file.id)}>
                      {t("open")}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("delete")}
                      onClick={() => window.confirm(t("deleteConfirm", { title: file.title })) && void api.remove(file.id)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    );
  }

  const statusIcon =
    api.status === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : api.status === "error" ? <CloudOff className="size-3.5" /> : <Check className="size-3.5" />;

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-2 backdrop-blur-xl">
        <Button variant="ghost" size="sm" onClick={() => void api.close()}>
          <ArrowLeft /> {t("back")}
        </Button>
        <input
          aria-label={t("title")}
          value={api.current.title}
          onChange={(e) => api.rename(e.target.value)}
          className="h-8 min-w-40 flex-1 rounded-md bg-transparent px-2 text-base font-medium outline-none hover:bg-muted/60 focus-visible:bg-card-solid focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <span className={cn("inline-flex items-center gap-1 text-xs", api.status === "error" ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
          {statusIcon}
          {api.status === "saving" ? t("saving") : api.status === "error" ? t("error") : t("saved")}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => setVersions(versions ? null : await api.versions())}
            aria-expanded={versions !== null}
          >
            <History /> {t("history")}
          </Button>
          {exports.map((ex) => (
            <Button
              key={ex.label}
              variant="outline"
              size="sm"
              disabled={busyExport !== null}
              onClick={async () => {
                setBusyExport(ex.label);
                setError(null);
                try {
                  await ex.run(safeFilename(api.current!.title, "dokumen"));
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusyExport(null);
                }
              }}
            >
              {busyExport === ex.label ? <Loader2 className="animate-spin" /> : (ex.icon ?? <FileDown />)} {ex.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const blob = await api.exportVog();
              if (blob) await saveBlob(blob, `${safeFilename(api.current!.title, "file")}.vog`);
            }}
          >
            <Save /> {t("exportVog")}
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {report && (
        <Alert
          title={t("report")}
          action={
            <Button variant="ghost" size="icon-sm" aria-label="×" onClick={() => setReport(null)}>
              <X />
            </Button>
          }
        >
          <ul className="list-disc space-y-0.5 pl-4">
            {report.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Alert>
      )}

      {versions && (
        <div className="no-print space-y-2 rounded-2xl border bg-card p-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{t("history")}</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await api.snapshot(locale === "id" ? "Disimpan manual" : "Saved manually");
                setVersions(await api.versions());
              }}
            >
              <Save /> {t("saveVersion")}
            </Button>
          </div>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noVersions")}</p>
          ) : (
            <ul className="max-h-56 divide-y overflow-auto text-sm">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-2">
                  <span className="flex-1">
                    {dateText(v.createdAt)} <span className="text-muted-foreground">· {v.label}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!window.confirm(t("restoreConfirm"))) return;
                      await api.restore(v);
                      setVersions(null);
                    }}
                  >
                    {t("restore")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div key={`${api.current.id}:${api.revision}`}>{children(api.content, api.update)}</div>
    </div>
  );
}
