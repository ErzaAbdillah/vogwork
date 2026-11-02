export type OcrLanguage = "ind" | "eng";

export interface OcrResult {
  text: string;
  confidence: number;
}

const STAGES: Record<string, number> = {
  "loading tesseract core": 0.05,
  "initializing tesseract": 0.1,
  "loading language traineddata": 0.15,
  "initializing api": 0.25,
};

/**
 * OCR dengan Tesseract.js. Mesin dan data bahasa diunduh sekali saat pertama dipakai
 * lalu disimpan browser; gambar tidak pernah meninggalkan perangkat.
 */
export async function recognizeImages(
  images: Blob[],
  options: {
    languages?: OcrLanguage[];
    signal?: AbortSignal;
    onProgress?: (progress: number, stage: "prepare" | "recognize", index: number) => void;
  } = {},
): Promise<OcrResult[]> {
  const { createWorker } = await import("tesseract.js");
  let current = 0;
  const worker = await createWorker(options.languages ?? ["ind", "eng"], 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") {
        options.onProgress?.((current + m.progress) / images.length, "recognize", current);
      } else if (m.status in STAGES) {
        options.onProgress?.(STAGES[m.status]! + m.progress * 0.05, "prepare", current);
      }
    },
  });

  const onAbort = () => void worker.terminate();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const results: OcrResult[] = [];
    for (const [index, image] of images.entries()) {
      options.signal?.throwIfAborted();
      current = index;
      const { data } = await worker.recognize(image);
      results.push({ text: data.text.trim(), confidence: data.confidence ?? 0 });
    }
    return results;
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    await worker.terminate().catch(() => {});
  }
}
