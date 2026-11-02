import { defineTool } from "@vogwork/core";
import { manifest } from "./manifest";
import type { Business, Invoice } from "./model";

export { manifest };

export default defineTool(manifest, {
  /** Tanpa antarmuka: `input.invoice` = { business, invoice } → PDF. */
  async run(input) {
    const { business, invoice } = input.invoice as { business: Business; invoice: Invoice };
    const { renderInvoicePdf } = await import("./render");
    const bytes = await renderInvoicePdf(business, invoice);
    return { pdf: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }) };
  },
  ui: () => import("./ui"),
});
