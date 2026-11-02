import { defineTool } from "@vogwork/core";
import type { AnnotationItem } from "@vogwork/workers";
import { manifest } from "./manifest";

export { manifest };

export default defineTool(manifest, {
  /** Tanpa antarmuka: menempel elemen di `params.items` dan mengisi `params.form`. */
  async run(input, ctx) {
    const { runTask } = await import("@vogwork/workers");
    const bytes = await runTask(
      "pdf.annotate",
      {
        bytes: new Uint8Array(await (input.pdf as Blob).arrayBuffer()),
        items: (ctx.params?.items as AnnotationItem[] | undefined) ?? [],
        form: ctx.params?.form as Record<string, string> | undefined,
        flatten: Boolean(ctx.params?.flatten),
      },
      { signal: ctx.signal, onProgress: ctx.onProgress },
    );
    return { pdf: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }) };
  },
  ui: () => import("./ui"),
});
