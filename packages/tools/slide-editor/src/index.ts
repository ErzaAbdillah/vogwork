import { defineTool } from "@vogwork/core";
import type { Deck } from "@vogwork/formats/slides";
import { manifest } from "./manifest";

export { manifest };

export default defineTool(manifest, {
  /** Tanpa antarmuka: deck VogWork → file PPTX (latar polos). */
  async run(input) {
    const { deckToPptx } = await import("@vogwork/formats/pptx");
    const bytes = await deckToPptx(input.deck as Deck);
    return { pptx: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }) };
  },
  ui: () => import("./ui"),
});
