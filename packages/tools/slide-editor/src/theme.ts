import type { SlideTheme } from "@vogwork/formats/slides";

/** Latar tema sebagai CSS: warna dasar + cahaya gradasi yang lembut. */
export function themeCss(theme: SlideTheme): string {
  const glows = theme.glows.map((g) => `radial-gradient(circle at ${g.x * 100}% ${g.y * 100}%, ${g.color}cc 0%, ${g.color}00 ${g.r * 100}%)`);
  return [...glows, theme.background].join(", ");
}

/** Latar tema sebagai PNG 1920×1080 untuk ekspor PPTX dan PDF. */
export async function themePng(theme: SlideTheme): Promise<string | null> {
  if (theme.glows.length === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, 1920, 1080);
  for (const g of theme.glows) {
    const cx = g.x * 1920;
    const cy = g.y * 1080;
    const r = g.r * 1920;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, `${g.color}cc`);
    gradient.addColorStop(1, `${g.color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1920, 1080);
  }
  return canvas.toDataURL("image/png");
}
