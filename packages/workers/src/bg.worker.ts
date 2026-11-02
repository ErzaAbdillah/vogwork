// transformers.js dimuat dari CDN dengan versi terkunci. Paket npm-nya menarik
// onnxruntime-node (ratusan MB) yang tidak dibutuhkan di browser.
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/+esm";

interface RawImageLike {
  toBlob(type?: string, quality?: number): Promise<Blob>;
}
type Segmenter = (input: unknown) => Promise<RawImageLike | RawImageLike[]>;
interface TransformersModule {
  env: { allowLocalModels: boolean };
  pipeline(task: string, model: string, options: Record<string, unknown>): Promise<Segmenter>;
  RawImage: { fromBlob(blob: Blob): Promise<unknown> };
}

interface Request {
  id: number;
  image: Blob;
  model: string;
  webgpu: boolean;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage(message: unknown): void;
};

let transformers: Promise<TransformersModule> | null = null;
let loaded: { key: string; segmenter: Promise<Segmenter> } | null = null;

function loadTransformers(): Promise<TransformersModule> {
  transformers ??= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ TRANSFORMERS_URL) as Promise<TransformersModule>;
  return transformers;
}

scope.onmessage = async ({ data }) => {
  const { id, image, model, webgpu } = data;
  try {
    const lib = await loadTransformers();
    lib.env.allowLocalModels = false;

    const key = `${model}:${webgpu}`;
    if (!loaded || loaded.key !== key) {
      const files = new Map<string, { loaded: number; total: number }>();
      loaded = {
        key,
        segmenter: lib.pipeline("background-removal", model, {
          device: webgpu ? "webgpu" : "wasm",
          dtype: webgpu ? "fp16" : "fp32",
          progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
            if (p.status !== "progress" || !p.file) return;
            files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
            const sum = [...files.values()].reduce((a, f) => ({ loaded: a.loaded + f.loaded, total: a.total + f.total }), { loaded: 0, total: 0 });
            if (sum.total > 0) scope.postMessage({ id, type: "progress", stage: "download", progress: sum.loaded / sum.total });
          },
        }),
      };
      loaded.segmenter.catch(() => {
        loaded = null;
      });
    }

    const segmenter = await loaded.segmenter;
    scope.postMessage({ id, type: "progress", stage: "process", progress: 0 });
    const input = await lib.RawImage.fromBlob(image);
    const output = await segmenter(input);
    const result = Array.isArray(output) ? output[0]! : output;
    const blob = await result.toBlob("image/png");
    scope.postMessage({ id, type: "result", blob });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    scope.postMessage({
      id,
      type: "error",
      message: /fetch|network|load/i.test(message)
        ? "Model AI gagal diunduh. Periksa koneksi internet untuk pemakaian pertama, lalu coba lagi."
        : message,
    });
  }
};
