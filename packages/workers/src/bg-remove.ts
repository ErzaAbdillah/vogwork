export type BgModel = "fast" | "accurate";

export const BG_MODELS: Record<BgModel, { id: string; sizeMb: number; needsWebGpu: boolean; license: string }> = {
  fast: { id: "Xenova/modnet", sizeMb: 25, needsWebGpu: false, license: "Apache-2.0" },
  accurate: { id: "onnx-community/BiRefNet_lite-ONNX", sizeMb: 115, needsWebGpu: true, license: "MIT" },
};

export function hasWebGpu(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export interface BgProgress {
  stage: "download" | "process";
  /** 0–1 */
  progress: number;
}

type Response =
  | { id: number; type: "progress"; stage: BgProgress["stage"]; progress: number }
  | { id: number; type: "result"; blob: Blob }
  | { id: number; type: "error"; message: string };

let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<number, { resolve: (b: Blob) => void; reject: (e: Error) => void; onProgress?: (p: BgProgress) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./bg.worker.ts", import.meta.url), { type: "module", name: "vogwork-bg-remove" });
  worker.onmessage = (event: MessageEvent<Response>) => {
    const message = event.data;
    const entry = pending.get(message.id);
    if (!entry) return;
    if (message.type === "progress") entry.onProgress?.({ stage: message.stage, progress: message.progress });
    else {
      pending.delete(message.id);
      if (message.type === "result") entry.resolve(message.blob);
      else entry.reject(new Error(message.message));
    }
  };
  worker.onerror = (event) => {
    for (const p of pending.values()) p.reject(new Error(event.message || "Worker AI berhenti mendadak"));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/**
 * Menghapus latar gambar dengan model segmentasi yang berjalan di browser
 * (transformers.js). Model diunduh dari Hugging Face sekali lalu disimpan cache browser.
 * Hasilnya PNG dengan latar transparan.
 */
export function removeBackground(
  image: Blob,
  options: { model?: BgModel; signal?: AbortSignal; onProgress?: (p: BgProgress) => void } = {},
): Promise<Blob> {
  const model = BG_MODELS[options.model ?? "fast"];
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) return reject(new DOMException("Dibatalkan", "AbortError"));
    pending.set(id, { resolve, reject, onProgress: options.onProgress });
    options.signal?.addEventListener(
      "abort",
      () => {
        if (!pending.delete(id)) return;
        reject(new DOMException("Dibatalkan", "AbortError"));
        if (pending.size === 0) {
          worker?.terminate();
          worker = null;
        }
      },
      { once: true },
    );
    getWorker().postMessage({ id, image, model: model.id, webgpu: model.needsWebGpu && hasWebGpu() });
  });
}
