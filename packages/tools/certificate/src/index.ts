import { defineTool, type TableData } from "@vogwork/core";
import { manifest } from "./manifest";
import { resolveTemplate } from "./model";

export { manifest };

export default defineTool(manifest, {
  /**
   * Tanpa antarmuka: menulis kolom pertama (atau `params.text`) di tengah template.
   * Cocok untuk pipeline "data → sertifikat".
   */
  async run(input, ctx) {
    const { runTask } = await import("@vogwork/workers");
    const template = input.template as Blob;
    const table = input.rows as TableData;
    const text = String(ctx.params?.text ?? `{${table.columns[0] ?? "Nama"}}`);
    const bitmap = await createImageBitmap(template);
    const pageSize: [number, number] = bitmap.width >= bitmap.height ? [842, (842 * bitmap.height) / bitmap.width] : [(842 * bitmap.width) / bitmap.height, 842];
    bitmap.close();
    const result = await runTask(
      "pdf.stamp",
      {
        template: { kind: "image", bytes: new Uint8Array(await template.arrayBuffer()), mime: template.type },
        pageSize,
        fields: [{ x: 0.5, y: 0.5, align: "center", size: 0.045, font: "times-bold", color: "#1f2937", maxWidth: 0.8 }],
        records: table.rows.map((row, i) => ({ name: resolveTemplate(text, row) || `sertifikat-${i + 1}`, values: [resolveTemplate(text, row)] })),
        mode: "separate",
      },
      { signal: ctx.signal, onProgress: ctx.onProgress },
    );
    return { archive: new Blob([result.bytes as Uint8Array<ArrayBuffer>], { type: "application/zip" }) };
  },
  ui: () => import("./ui"),
});
