import { defineTool } from "@vogwork/core";
import { manifest } from "./manifest";

export { manifest };

export default defineTool(manifest, {
  /** Tanpa antarmuka: menggabungkan semua PDF masukan menjadi satu. */
  async run(input, ctx) {
    const { runTask } = await import("@vogwork/workers");
    const files = (input.files as Blob[] | undefined) ?? [];
    const bytes = await runTask(
      "pdf.merge",
      { files: await Promise.all(files.map(async (f) => ({ bytes: new Uint8Array(await f.arrayBuffer()) }))) },
      { signal: ctx.signal, onProgress: ctx.onProgress },
    );
    return { pdf: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }) };
  },
  ui: () => import("./ui"),
});
