import { defineTool } from "@vogwork/core";
import type { Workbook } from "@vogwork/formats/sheet";
import { manifest } from "./manifest";

export { manifest };

export default defineTool(manifest, {
  /** Tanpa antarmuka: workbook VogWork → file XLSX. */
  async run(input) {
    const { workbookToXlsx } = await import("@vogwork/formats/xlsx");
    const bytes = await workbookToXlsx(input.workbook as Workbook);
    return { xlsx: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }) };
  },
  ui: () => import("./ui"),
});
