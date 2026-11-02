import { addr, createEvaluator, formatValue, parseRange, type ChartSpec, type Value, type Workbook } from "@vogwork/formats/sheet";

const COLORS = ["#3fae55", "#f2b630", "#4d7cff", "#ff5aa5", "#2fbfb0"];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function cellsIn(range: string, read: (address: string) => Value): Value[] {
  const r = parseRange(range);
  if (!r) return [];
  const out: Value[] = [];
  for (let row = r.r1; row <= r.r2; row++) for (let col = r.c1; col <= r.c2; col++) out.push(read(addr(row, col)));
  return out;
}

/** Nama seri dari sel di atas rentangnya, bila berisi teks. */
export function seriesNames(spec: ChartSpec, read: (address: string) => Value): string[] {
  return spec.series.map((s) => {
    const r = parseRange(s);
    const header = r && r.r1 > 0 ? read(addr(r.r1 - 1, r.c1)) : null;
    return typeof header === "string" && header ? header : s;
  });
}

/** Grafik batang atau garis sebagai teks SVG; dipakai untuk layar dan untuk gambar di XLSX. */
export function chartSvg(spec: ChartSpec, read: (address: string) => Value): string {
  const labels = cellsIn(spec.labels, read).map((v) => formatValue(v));
  const series = spec.series.map((s) => cellsIn(s, read).map((v) => (typeof v === "number" ? v : 0)));
  const names = seriesNames(spec, read);
  const W = 640;
  const H = 360;
  const pad = { l: 72, r: 16, t: spec.title ? 44 : 20, b: 56 };
  const values = series.flat();
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const y = (v: number) => pad.t + plotH - ((v - min) / span) * plotH;
  const band = plotW / Math.max(1, labels.length);
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="#ffffff" rx="12"/>`];
  if (spec.title) parts.push(`<text x="${W / 2}" y="26" text-anchor="middle" font-size="16" fill="#1d3b25">${esc(spec.title)}</text>`);
  for (let i = 0; i <= 4; i++) {
    const t = min + (span * i) / 4;
    parts.push(`<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="#e5e8ec"/>`);
    parts.push(`<text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="#6b7280">${esc(formatValue(Math.round(t * 100) / 100, Math.abs(max) >= 1000 ? "number" : "general"))}</text>`);
  }
  series.forEach((vals, si) => {
    const color = COLORS[si % COLORS.length];
    if (spec.type === "bar") {
      const bw = (band * 0.7) / series.length;
      vals.forEach((v, i) => {
        const x = pad.l + i * band + band * 0.15 + si * bw;
        parts.push(`<rect x="${x}" y="${Math.min(y(v), y(0))}" width="${bw}" height="${Math.abs(y(v) - y(0))}" rx="3" fill="${color}"/>`);
      });
    } else {
      const points = vals.map((v, i) => `${pad.l + i * band + band / 2},${y(v)}`).join(" ");
      parts.push(`<polyline fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" points="${points}"/>`);
    }
  });
  labels.forEach((label, i) => {
    const text = label.length > 14 ? `${label.slice(0, 13)}…` : label;
    parts.push(`<text x="${pad.l + i * band + band / 2}" y="${H - pad.b + 18}" text-anchor="middle" font-size="11" fill="#374151">${esc(text)}</text>`);
  });
  names.forEach((name, i) => {
    parts.push(`<g transform="translate(${pad.l + i * 150}, ${H - 16})"><rect width="10" height="10" y="-9" rx="2" fill="${COLORS[i % COLORS.length]}"/><text x="16" font-size="11" fill="#374151">${esc(name)}</text></g>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, sans-serif" role="img" aria-label="${esc(spec.title || "Grafik")}">${parts.join("")}</svg>`;
}

export function SheetChart({ spec, read }: { spec: ChartSpec; read: (address: string) => Value }) {
  return <div className="[&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: chartSvg(spec, read) }} />;
}

async function svgToPng(svg: string): Promise<Uint8Array> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Grafik gagal digambar"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    canvas.getContext("2d")!.drawImage(img, 0, 0, 1280, 720);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG gagal"))), "image/png"));
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** PNG grafik untuk setiap sheet yang punya grafik, untuk disisipkan ke XLSX. */
export async function chartImages(workbook: Workbook): Promise<Record<string, Uint8Array>> {
  const evaluate = createEvaluator(workbook);
  const out: Record<string, Uint8Array> = {};
  for (const [i, sheet] of workbook.sheets.entries()) {
    if (sheet.chart) out[sheet.id] = await svgToPng(chartSvg(sheet.chart, (a) => evaluate(i, a)));
  }
  return out;
}
