"use client";

import { useT } from "@vogwork/i18n";
import { countLocalEntries, getLastBackup } from "@vogwork/storage";
import { Button } from "@vogwork/ui";
import { DatabaseBackup, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { shell } from "@/lib/dict";

const DAY = 24 * 60 * 60 * 1000;
const FIRST_SEEN_KEY = "vog.firstSeen";
const DISMISSED_KEY = "vog.backupReminderDismissed";

function useServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // Pemasangan pertama juga memicu controllerchange; muat ulang hanya saat ada pembaruan.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        const track = (worker: ServiceWorker | null) => {
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
          });
        };
        if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
        registration.addEventListener("updatefound", () => track(registration.installing));
      })
      .catch(() => {
        // Tanpa service worker situs tetap jalan, hanya tidak bisa offline.
      });
  }, []);

  return { waiting, update: () => waiting?.postMessage("SKIP_WAITING") };
}

/** Pengingat cadangan berkala, karena browser bisa menghapus data lokal saat ruang penuh. */
function useBackupReminder() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let firstSeen = Date.now();
    try {
      const saved = Number(localStorage.getItem(FIRST_SEEN_KEY));
      if (saved) firstSeen = saved;
      else localStorage.setItem(FIRST_SEEN_KEY, String(firstSeen));
      const dismissed = Number(localStorage.getItem(DISMISSED_KEY));
      if (dismissed && Date.now() - dismissed < 7 * DAY) return;
    } catch {
      return;
    }
    if (Date.now() - firstSeen < 7 * DAY) return;
    Promise.all([countLocalEntries(), getLastBackup()])
      .then(([entries, last]) => setShow(entries > 0 && (!last || Date.now() - last > 14 * DAY)))
      .catch(() => {});
  }, []);
  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // abaikan
    }
  };
  return { show, dismiss };
}

export function AppNotices() {
  const t = useT(shell);
  const sw = useServiceWorker();
  const reminder = useBackupReminder();

  if (!sw.waiting && !reminder.show) return null;
  return (
    <div className="no-print fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-xl items-center gap-3 rounded-xl border bg-card p-3 pl-4 text-sm shadow-lg">
        {sw.waiting ? (
          <>
            <RefreshCw aria-hidden className="size-4 shrink-0 text-primary" />
            <span className="flex-1">{t("updateReady")}</span>
            <Button size="sm" onClick={sw.update}>
              {t("updateNow")}
            </Button>
          </>
        ) : (
          <>
            <DatabaseBackup aria-hidden className="size-4 shrink-0 text-primary" />
            <span className="flex-1">{t("backupReminder")}</span>
            <Link href="/pengaturan" onClick={reminder.dismiss} className="shrink-0 font-medium text-primary hover:underline">
              {t("backupNow")}
            </Link>
            <Button size="icon-sm" variant="ghost" onClick={reminder.dismiss} aria-label={t("dismiss")}>
              <X />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
