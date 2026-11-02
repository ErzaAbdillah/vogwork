"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TaskState =
  | { status: "idle" }
  | { status: "running"; progress: number | null; message?: string }
  | { status: "done"; message?: string }
  | { status: "error"; message: string };

interface Helpers {
  signal: AbortSignal;
  progress: (value: number | null, message?: string) => void;
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Status satu pekerjaan asinkron (memproses, progres, galat, batal).
 * Menjalankan pekerjaan baru otomatis membatalkan pekerjaan sebelumnya.
 */
export function useAsyncTask() {
  const [state, setState] = useState<TaskState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async <T,>(fn: (helpers: Helpers) => Promise<T>, doneMessage?: string): Promise<T | undefined> => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ status: "running", progress: null });
    try {
      const result = await fn({
        signal: current.signal,
        progress: (value, message) => {
          if (!current.signal.aborted) setState({ status: "running", progress: value, message });
        },
      });
      if (!current.signal.aborted) setState({ status: "done", message: doneMessage });
      return result;
    } catch (error) {
      if (current.signal.aborted || isAbort(error)) {
        setState({ status: "idle" });
      } else {
        setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
      }
      return undefined;
    }
  }, []);

  const cancel = useCallback(() => controller.current?.abort(), []);
  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, run, cancel, reset, running: state.status === "running" };
}
