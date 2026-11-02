import { defineTool } from "@vogwork/core";
import type { DocContent } from "@vogwork/formats/docx";
import { manifest } from "./manifest";

export { manifest };

export default defineTool(manifest, {
  /** Tanpa antarmuka: isi dokumen VogWork → file DOCX. */
  async run(input) {
    const { docToDocx } = await import("@vogwork/formats/docx");
    const bytes = await docToDocx(input.document as DocContent);
    return { docx: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }) };
  },
  ui: () => import("./ui"),
});
