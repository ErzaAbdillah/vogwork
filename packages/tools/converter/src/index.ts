import { defineTool, type TableData } from "@vogwork/core";
import { manifest } from "./manifest";

export { manifest };

export default defineTool(manifest, {
  /** Tanpa antarmuka: tabel → CSV (bawaan) atau JSON (`params.format = "json"`). */
  async run(input, ctx) {
    const { tableToCsv, tableToJson } = await import("@vogwork/formats/table");
    const table = input.rows as TableData;
    return { text: ctx.params?.format === "json" ? tableToJson(table) : tableToCsv(table) };
  },
  ui: () => import("./ui"),
});
