import { defineTool } from "@vogwork/core";
import { manifest } from "./manifest";
import type { Kop, Letter } from "./model";

export { manifest };

export default defineTool(manifest, {
  /** Tanpa antarmuka: `input.letter` = { kop, letter } → PDF. */
  async run(input) {
    const { kop, letter } = input.letter as { kop: Kop; letter: Letter };
    const { renderLetterPdf } = await import("./render-pdf");
    const bytes = await renderLetterPdf(kop, letter);
    return { pdf: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }) };
  },
  ui: () => import("./ui"),
});
