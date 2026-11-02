import { defineTool } from "@vogwork/core";
import { manifest } from "./manifest";

export { manifest };

export default defineTool(manifest, {
  async run(input, ctx) {
    const QRCode = (await import("qrcode")).default;
    const size = Number(ctx.params?.size ?? 1024);
    const dataUrl = await QRCode.toDataURL(String(input.text ?? ""), { width: size, margin: 2, errorCorrectionLevel: "M" });
    const image = await (await fetch(dataUrl)).blob();
    return { image };
  },
  ui: () => import("./ui"),
});
