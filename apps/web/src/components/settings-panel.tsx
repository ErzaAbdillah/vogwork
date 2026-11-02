"use client";

import { formatBytes, useLocale, useT } from "@vogwork/i18n";
import {
  bytesToBlob,
  clearAllData,
  exportBackup,
  getLastBackup,
  getSavePickerPreference,
  getStorageStatus,
  importBackup,
  requestPersistence,
  saveBlob,
  setSavePickerPreference,
  supportsFileSystemAccess,
  type StorageStatus,
} from "@vogwork/storage";
import { Alert, Badge, Button, Checkbox, Dropzone, Progress, Section, TaskStatus, useAsyncTask, useClientValue } from "@vogwork/ui";
import { DatabaseBackup, HardDrive, ShieldCheck, Trash2, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const dict = {
  id: {
    storageTitle: "Penyimpanan di browser ini",
    storageBody: "Draf surat, profil invoice, dan preferensi disimpan di IndexedDB perangkat ini. Tidak ada yang dikirim ke server.",
    used: "Terpakai {used} dari kuota {quota}",
    persisted: "Permanen",
    notPersisted: "Bisa dihapus browser",
    persistHint: "Browser boleh menghapus data situs saat ruang penyimpanan penuh, kecuali penyimpanan dijadikan permanen.",
    persistButton: "Jadikan permanen",
    persistDenied: "Browser belum mengizinkan. Coba lagi setelah lebih sering memakai VogWork, atau pasang sebagai aplikasi.",
    backupTitle: "Cadangan",
    backupBody: "Simpan semua data lokal dalam satu file .zip, lalu pulihkan di browser atau perangkat lain.",
    lastBackup: "Cadangan terakhir: {date}",
    neverBackup: "Belum pernah membuat cadangan.",
    exportButton: "Unduh cadangan",
    restoreTitle: "Pulihkan dari file cadangan (.zip)",
    restored: "{count} entri dipulihkan. Muat ulang halaman alat untuk melihatnya.",
    backupDone: "Cadangan berhasil diunduh.",
    saveTitle: "Cara menyimpan file",
    pickerLabel: "Tanya lokasi simpan setiap kali (dialog “Simpan sebagai”)",
    pickerUnsupported: "Browser ini belum mendukung dialog simpan; file selalu masuk ke folder Unduhan.",
    offlineTitle: "Mode offline",
    offlineReady: "Siap dipakai tanpa internet. Alat OCR dan hapus background tetap perlu internet saat pertama kali untuk mengunduh model.",
    offlinePending: "Buka situs ini sekali lagi saat online untuk menyiapkan mode offline.",
    dangerTitle: "Hapus semua data lokal",
    dangerBody: "Menghapus draf, profil, dan preferensi dari browser ini. Tindakan ini tidak bisa dibatalkan.",
    dangerButton: "Hapus semua data",
    dangerConfirm: "Hapus semua data VogWork di browser ini? Buat cadangan dulu bila masih diperlukan.",
    cleared: "Semua data lokal sudah dihapus.",
  },
  en: {
    storageTitle: "Storage in this browser",
    storageBody: "Letter drafts, invoice profiles, and preferences are stored in this device's IndexedDB. Nothing is sent to a server.",
    used: "Using {used} of {quota} quota",
    persisted: "Persistent",
    notPersisted: "May be cleared by the browser",
    persistHint: "Browsers may delete site data when storage runs low, unless storage is made persistent.",
    persistButton: "Make persistent",
    persistDenied: "The browser has not allowed it yet. Try again after using VogWork more, or install it as an app.",
    backupTitle: "Backup",
    backupBody: "Save all local data in one .zip file, then restore it in another browser or device.",
    lastBackup: "Last backup: {date}",
    neverBackup: "No backup yet.",
    exportButton: "Download backup",
    restoreTitle: "Restore from a backup file (.zip)",
    restored: "{count} entries restored. Reload the tool pages to see them.",
    backupDone: "Backup downloaded.",
    saveTitle: "How files are saved",
    pickerLabel: "Ask where to save every time (“Save as” dialog)",
    pickerUnsupported: "This browser does not support the save dialog yet; files always go to the Downloads folder.",
    offlineTitle: "Offline mode",
    offlineReady: "Ready to use without internet. OCR and background removal still need internet the first time to download their models.",
    offlinePending: "Open this site once more while online to prepare offline mode.",
    dangerTitle: "Delete all local data",
    dangerBody: "Removes drafts, profiles, and preferences from this browser. This cannot be undone.",
    dangerButton: "Delete all data",
    dangerConfirm: "Delete all VogWork data in this browser? Make a backup first if you still need it.",
    cleared: "All local data has been deleted.",
  },
};

export function SettingsPanel() {
  const t = useT(dict);
  const { locale } = useLocale();
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [lastBackup, setLastBackup] = useState<number | null>(null);
  const pickerSupported = useClientValue(supportsFileSystemAccess, false);
  const savedPicker = useClientValue(getSavePickerPreference, false);
  const [pickerChoice, setPickerChoice] = useState<boolean | null>(null);
  const picker = pickerChoice ?? savedPicker;
  const [offlineReady, setOfflineReady] = useState(false);
  const [persistDenied, setPersistDenied] = useState(false);
  const [restored, setRestored] = useState<number | null>(null);
  const backup = useAsyncTask();
  const restore = useAsyncTask();
  const danger = useAsyncTask();

  const refresh = useCallback(() => {
    getStorageStatus().then(setStatus).catch(() => {});
    getLastBackup().then(setLastBackup).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    navigator.serviceWorker?.getRegistration().then((r) => setOfflineReady(Boolean(r?.active))).catch(() => {});
  }, [refresh]);

  const dateText = (ms: number) =>
    new Date(ms).toLocaleString(locale === "id" ? "id-ID" : "en-US", { dateStyle: "long", timeStyle: "short" });

  return (
    <div className="space-y-5">
      <Section title={t("storageTitle")} description={t("storageBody")} actions={<HardDrive aria-hidden className="size-5 text-muted-foreground" />}>
        {status && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.persisted ? "success" : "outline"}>
                <ShieldCheck /> {status.persisted ? t("persisted") : t("notPersisted")}
              </Badge>
              {status.usage !== null && status.quota !== null && (
                <span className="text-sm text-muted-foreground">
                  {t("used", { used: formatBytes(status.usage, locale), quota: formatBytes(status.quota, locale) })}
                </span>
              )}
            </div>
            {status.usage !== null && status.quota ? <Progress value={status.usage / status.quota} label={t("storageTitle")} /> : null}
            {!status.persisted && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="flex-1 text-sm text-muted-foreground">{t("persistHint")}</p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const ok = await requestPersistence();
                    setPersistDenied(!ok);
                    refresh();
                  }}
                >
                  {t("persistButton")}
                </Button>
              </div>
            )}
            {persistDenied && <Alert>{t("persistDenied")}</Alert>}
          </div>
        )}
      </Section>

      <Section title={t("backupTitle")} description={t("backupBody")} actions={<DatabaseBackup aria-hidden className="size-5 text-muted-foreground" />}>
        <p className="text-sm text-muted-foreground">{lastBackup ? t("lastBackup", { date: dateText(lastBackup) }) : t("neverBackup")}</p>
        <Button
          disabled={backup.running}
          onClick={() =>
            backup.run(async () => {
              const zip = await exportBackup();
              const stamp = new Date().toISOString().slice(0, 10);
              await saveBlob(bytesToBlob(zip, "application/zip"), `vogwork-cadangan-${stamp}.zip`);
              refresh();
            }, t("backupDone"))
          }
        >
          {t("exportButton")}
        </Button>
        <TaskStatus state={backup.state} />
        <Dropzone
          compact
          accept=".zip,application/zip"
          title={t("restoreTitle")}
          onFiles={([file]) => {
            setRestored(null);
            void restore
              .run(async () => {
                const { entries } = await importBackup(new Uint8Array(await file!.arrayBuffer()));
                refresh();
                return entries;
              })
              .then((entries) => entries !== undefined && setRestored(entries));
          }}
        />
        <TaskStatus state={restore.state} />
        {restored !== null && <Alert variant="success">{t("restored", { count: restored })}</Alert>}
      </Section>

      <Section title={t("saveTitle")}>
        {pickerSupported ? (
          <Checkbox
            label={t("pickerLabel")}
            checked={picker}
            onChange={(e) => {
              setPickerChoice(e.target.checked);
              setSavePickerPreference(e.target.checked);
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("pickerUnsupported")}</p>
        )}
      </Section>

      <Section title={t("offlineTitle")} actions={<WifiOff aria-hidden className="size-5 text-muted-foreground" />}>
        <p className="text-sm text-muted-foreground">{offlineReady ? t("offlineReady") : t("offlinePending")}</p>
      </Section>

      <Section title={t("dangerTitle")} description={t("dangerBody")} className="border-destructive/30">
        <Button
          variant="destructive"
          disabled={danger.running}
          onClick={() => {
            if (!window.confirm(t("dangerConfirm"))) return;
            void danger.run(async () => {
              await clearAllData();
              refresh();
            }, t("cleared"));
          }}
        >
          <Trash2 /> {t("dangerButton")}
        </Button>
        <TaskStatus state={danger.state} />
      </Section>
    </div>
  );
}
