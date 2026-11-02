import type { TaskInput, TaskName, TaskOutput } from "./tasks";
import type { WorkerRequest, WorkerResponse } from "./protocol";

export type { StampField, StampInput, StandardFontKey, TaskName } from "./tasks";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number, message?: string) => void;
}

let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<number, Pending>();

function failAll(error: Error) {
  for (const p of pending.values()) p.reject(error);
  pending.clear();
}

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === "undefined") return null;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "vogwork-tasks" });
  } catch {
    return null;
  }
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    const entry = pending.get(message.id);
    if (!entry) return;
    if (message.type === "progress") entry.onProgress?.(message.progress, message.message);
    else {
      pending.delete(message.id);
      if (message.type === "result") entry.resolve(message.result);
      else entry.reject(new Error(message.message));
    }
  };
  worker.onerror = (event) => {
    failAll(new Error(event.message || "Worker berhenti mendadak"));
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export interface RunOptions {
  onProgress?: (progress: number, message?: string) => void;
  signal?: AbortSignal;
}

function abortError() {
  return new DOMException("Dibatalkan", "AbortError");
}

/**
 * Menjalankan tugas berat di Web Worker supaya tampilan tetap responsif.
 * Bila worker tidak tersedia, tugas dijalankan di thread utama.
 */
export async function runTask<K extends TaskName>(task: K, input: TaskInput<K>, options: RunOptions = {}): Promise<TaskOutput<K>> {
  options.signal?.throwIfAborted();
  const target = getWorker();

  if (!target) {
    const { handlers } = await import("./tasks");
    const handler = handlers[task] as (input: TaskInput<K>, report: (p: number, m?: string) => void) => Promise<TaskOutput<K>>;
    return handler(input, options.onProgress ?? (() => {}));
  }

  const id = ++sequence;
  return new Promise<TaskOutput<K>>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress: options.onProgress });
    options.signal?.addEventListener(
      "abort",
      () => {
        if (!pending.has(id)) return;
        pending.delete(id);
        reject(abortError());
        // Tidak ada tugas lain yang berjalan: hentikan worker agar pekerjaan benar-benar berhenti.
        if (pending.size === 0) {
          worker?.terminate();
          worker = null;
        }
      },
      { once: true },
    );
    const request: WorkerRequest = { id, task, input };
    target.postMessage(request);
  });
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
