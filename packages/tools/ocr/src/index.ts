import { defineTool } from "@vogwork/core";
import { manifest } from "./manifest";

export { manifest };

export default defineTool(manifest, {
  async run(input, ctx) {
    const { recognizeImages } = await import("@vogwork/workers/ocr");
    const images = (input.images as Blob[] | undefined) ?? [];
    const results = await recognizeImages(images, { signal: ctx.signal, onProgress: (p) => ctx.onProgress?.(p) });
    return { text: results.map((r) => r.text).join("\n\n") };
  },
  ui: () => import("./ui"),
});
