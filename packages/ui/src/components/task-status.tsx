"use client";

import { common, useT } from "@vogwork/i18n";
import type { TaskState } from "../hooks/use-async-task";
import { Button } from "./button";
import { Alert, Progress } from "./feedback";

/** Menampilkan progres + tombol batal, atau pesan galat/sukses dari `useAsyncTask`. */
export function TaskStatus({ state, onCancel, className }: { state: TaskState; onCancel?: () => void; className?: string }) {
  const t = useT(common);
  if (state.status === "running") {
    return (
      <div className={className}>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground" aria-live="polite">
            {state.message ?? t("processing")}
            {state.progress !== null && ` ${Math.round(state.progress * 100)}%`}
          </span>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {t("cancel")}
            </Button>
          )}
        </div>
        <Progress value={state.progress} className="mt-2" label={t("processing")} />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <Alert variant="error" title={t("errorTitle")} className={className}>
        {state.message}
      </Alert>
    );
  }
  if (state.status === "done" && state.message) {
    return (
      <Alert variant="success" className={className}>
        {state.message}
      </Alert>
    );
  }
  return null;
}
