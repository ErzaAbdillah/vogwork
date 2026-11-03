import { defineTool } from "@vogwork/core";
import { manifest } from "./manifest";

export { manifest };

export default defineTool(manifest, {
  /** Tanpa antarmuka: PDF → DOCX berisi teks yang bisa disunting. */
  async run(input, ctx) {
    const { pdfToDoc } = await import("./convert");
    const { docToDocx } = await import("@vogwork/formats/docx");
    const content = await pdfToDoc(input.pdf as Blob, { mode: "text", ocr: false, signal: ctx.signal });
    const bytes = await docToDocx(content);
    return { docx: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }) };
  },
  ui: () => import("./ui"),
});
