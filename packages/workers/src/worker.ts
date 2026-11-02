import { handlers, type TaskName } from "./tasks";
import type { WorkerRequest, WorkerResponse } from "./protocol";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse, transfer: Transferable[]): void;
};

function transferables(value: unknown, found = new Set<ArrayBuffer>()): ArrayBuffer[] {
  if (value instanceof Uint8Array) {
    if (value.buffer instanceof ArrayBuffer) found.add(value.buffer);
  } else if (Array.isArray(value)) {
    value.forEach((v) => transferables(v, found));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => transferables(v, found));
  }
  return [...found];
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, task, input } = event.data;
  const post = (message: WorkerResponse, transfer: Transferable[] = []) => scope.postMessage(message, transfer);
  try {
    const handler = handlers[task as TaskName] as (input: unknown, report: (p: number, m?: string) => void) => Promise<unknown>;
    if (!handler) throw new Error(`Tugas "${task}" tidak dikenal`);
    const result = await handler(input, (progress, message) => post({ id, type: "progress", progress, message }));
    post({ id, type: "result", result }, transferables(result));
  } catch (error) {
    post({ id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
