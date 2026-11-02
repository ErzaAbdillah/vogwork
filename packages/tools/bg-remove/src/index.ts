import { defineTool } from "@vogwork/core";
import { manifest } from "./manifest";

export { manifest };

export default defineTool(manifest, {
  async run(input, ctx) {
    const { removeBackground } = await import("@vogwork/workers/bg-remove");
    const image = await removeBackground(input.image as Blob, {
      signal: ctx.signal,
      onProgress: (p) => ctx.onProgress?.(p.stage === "download" ? p.progress * 0.8 : 0.9),
    });
    return { image };
  },
  ui: () => import("./ui"),
});
