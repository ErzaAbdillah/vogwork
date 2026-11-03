import { defineTool } from "@vogwork/core";
import { manifest } from "./manifest";

export { manifest };

export default defineTool(manifest, {
  /** Tanpa antarmuka: foto → pas foto 3×4 (atau `params.size`) di tengah, latar asli. */
  async run(input, ctx) {
    const { canvasBlob, loadPhoto, renderPhoto } = await import("./render");
    const source = await loadPhoto(input.image as Blob);
    const size = (ctx.params?.size as "2x3" | "3x4" | "4x6" | undefined) ?? "3x4";
    const photo = renderPhoto(source, { size, crop: { zoom: 1, x: 0, y: 0 }, adjust: { brightness: 1, contrast: 1 }, background: null });
    return { image: await canvasBlob(photo, "image/jpeg") };
  },
  ui: () => import("./ui"),
});
