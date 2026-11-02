import { DOMParser } from "@xmldom/xmldom";
import { strFromU8, unzipSync } from "fflate";
import { newId, SLIDE_H, SLIDE_W, THEMES, type Deck, type Slide, type SlideElement, type TextStyle } from "./model";

const FONT = { sans: "Arial", serif: "Times New Roman" } as const;
const strip = (hex: string) => hex.replace("#", "").toUpperCase();

export interface PptxExportOptions {
  /** PNG latar bertema (dengan cahaya gradasi) per ukuran slide, dibuat di browser. */
  themeBackground?: string;
}

/** Menulis deck ke PPTX yang bisa disunting di PowerPoint: teks, gambar, bentuk, catatan. */
export async function deckToPptx(deck: Deck, options: PptxExportOptions = {}): Promise<Uint8Array> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "VogWork";
  pptx.title = "Presentasi VogWork";
  const theme = THEMES[deck.theme];

  for (const slide of deck.slides) {
    const s = pptx.addSlide();
    if (slide.background) s.background = { color: strip(slide.background) };
    else if (options.themeBackground) s.background = { data: options.themeBackground };
    else s.background = { color: strip(theme.background) };

    for (const el of slide.elements) {
      const box = { x: el.x, y: el.y, w: el.w, h: el.h };
      if (el.type === "text") {
        s.addText(el.text, {
          ...box,
          fontSize: el.style.size,
          bold: el.style.bold,
          italic: el.style.italic,
          color: strip(el.style.color),
          align: el.style.align,
          fontFace: FONT[el.style.font],
          valign: "top",
          margin: 4,
          fit: "none",
        });
      } else if (el.type === "image") {
        s.addImage({ ...box, data: el.src });
      } else {
        const shape = el.shape === "ellipse" ? pptx.ShapeType.ellipse : el.shape === "roundRect" ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
        s.addShape(shape, { ...box, fill: { color: strip(el.fill) }, line: el.stroke ? { color: strip(el.stroke), width: 1 } : { type: "none" }, rectRadius: el.shape === "roundRect" ? 0.2 : undefined });
      }
    }
    if (slide.notes.trim()) s.addNotes(slide.notes);
  }
  const out = await pptx.write({ outputType: "uint8array" });
  return out as Uint8Array;
}

// ---------- Impor ----------

const EMU_PER_IN = 914400;
/** Bagian DOM XML yang dipakai; sama di browser dan Node (@xmldom/xmldom). */
interface XmlEl {
  nodeName: string;
  nodeType: number;
  textContent: string | null;
  firstChild: XmlEl | null;
  nextSibling: XmlEl | null;
  getAttribute(name: string): string | null;
  getElementsByTagName(name: string): ArrayLike<XmlEl>;
}

function parseXml(text: string): XmlEl {
  return new DOMParser().parseFromString(text, "text/xml").documentElement as unknown as XmlEl;
}

function children(el: XmlEl | null | undefined, name: string): XmlEl[] {
  if (!el) return [];
  const out: XmlEl[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && n.nodeName === name) out.push(n);
  return out;
}
const child = (el: XmlEl | null | undefined, name: string) => children(el, name)[0] ?? null;
function descendants(el: XmlEl | null | undefined, name: string): XmlEl[] {
  if (!el) return [];
  return Array.from(el.getElementsByTagName(name));
}

function relsFor(files: Record<string, Uint8Array>, path: string): Record<string, string> {
  const dir = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const rels = files[`${dir}/_rels/${name}.rels`];
  if (!rels) return {};
  const map: Record<string, string> = {};
  for (const r of descendants(parseXml(strFromU8(rels)), "Relationship")) {
    const target = r.getAttribute("Target") ?? "";
    map[r.getAttribute("Id") ?? ""] = target.startsWith("/") ? target.slice(1) : resolvePath(dir, target);
  }
  return map;
}

function resolvePath(dir: string, target: string): string {
  const parts = dir.split("/");
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", svg: "image/svg+xml" };

function toDataUrl(bytes: Uint8Array, path: string): string | null {
  const mime = MIME[path.split(".").pop()?.toLowerCase() ?? ""];
  if (!mime || mime === "image/svg+xml") return null;
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(binary)}`;
}

function xfrm(sp: XmlEl, scale: { x: number; y: number }) {
  const x = descendants(sp, "a:xfrm")[0];
  const off = child(x, "a:off");
  const ext = child(x, "a:ext");
  if (!off || !ext) return null;
  return {
    x: (Number(off.getAttribute("x")) / EMU_PER_IN) * scale.x,
    y: (Number(off.getAttribute("y")) / EMU_PER_IN) * scale.y,
    w: (Number(ext.getAttribute("cx")) / EMU_PER_IN) * scale.x,
    h: (Number(ext.getAttribute("cy")) / EMU_PER_IN) * scale.y,
  };
}

const srgb = (el: XmlEl | null | undefined) => {
  const c = descendants(el, "a:srgbClr")[0]?.getAttribute("val");
  return c ? `#${c.toLowerCase()}` : null;
};

export interface PptxImport {
  deck: Deck;
  report: string[];
}

/**
 * Membaca PPTX: kotak teks, gambar, bentuk dasar, warna latar, dan catatan pembicara.
 * Posisi diskalakan ke slide 16:9.
 */
export async function pptxToDeck(data: ArrayBuffer): Promise<PptxImport> {
  const files = unzipSync(new Uint8Array(data));
  const report = new Set<string>();
  const presPath = "ppt/presentation.xml";
  const pres = parseXml(strFromU8(files[presPath] ?? new Uint8Array()));
  const size = child(pres, "p:sldSz");
  const srcW = Number(size?.getAttribute("cx") ?? SLIDE_W * EMU_PER_IN) / EMU_PER_IN;
  const srcH = Number(size?.getAttribute("cy") ?? SLIDE_H * EMU_PER_IN) / EMU_PER_IN;
  const scale = { x: SLIDE_W / srcW, y: SLIDE_H / srcH };
  if (Math.abs(srcW / srcH - 16 / 9) > 0.05) report.add("Rasio slide asli bukan 16:9; posisi elemen disesuaikan.");

  const presRels = relsFor(files, presPath);
  const slidePaths = descendants(pres, "p:sldId").map((s) => presRels[s.getAttribute("r:id") ?? ""]).filter((p): p is string => Boolean(p && files[p]));
  const theme = THEMES.plain;
  const slides: Slide[] = [];

  for (const path of slidePaths) {
    const doc = parseXml(strFromU8(files[path]!));
    const rels = relsFor(files, path);
    const elements: SlideElement[] = [];
    let placeholderIndex = 0;

    const visit = (tree: XmlEl | null) => {
      for (let n = tree?.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 1) continue;
        const el = n;
        if (el.nodeName === "p:grpSp") {
          visit(el);
          report.add("Grup bentuk dipisah menjadi elemen terpisah.");
        } else if (el.nodeName === "p:sp") {
          const box = xfrm(el, scale);
          const ph = descendants(el, "p:ph")[0];
          const phType = ph?.getAttribute("type") ?? (ph ? "body" : null);
          const paragraphs = descendants(el, "a:p").map((p) => descendants(p, "a:t").map((t) => t.textContent ?? "").join(""));
          const text = paragraphs.join("\n").replace(/\n+$/, "");
          const firstRun = descendants(el, "a:rPr")[0] ?? descendants(el, "a:defRPr")[0];
          const isTitle = phType === "title" || phType === "ctrTitle";
          const fallback = isTitle ? { x: 0.8, y: 0.5, w: SLIDE_W - 1.6, h: 1.2 } : { x: 0.8, y: 1.8 + placeholderIndex * 0.2, w: SLIDE_W - 1.6, h: 4.8 };
          if (ph) placeholderIndex++;
          const geom = descendants(el, "a:prstGeom")[0]?.getAttribute("prst") ?? "rect";
          const spPr = child(el, "p:spPr");
          const fill = srgb(child(spPr, "a:solidFill"));
          const stroke = srgb(child(spPr, "a:ln"));
          if (fill && (box ?? fallback)) {
            if (!["rect", "roundRect", "ellipse"].includes(geom)) report.add(`Bentuk “${geom}” disederhanakan menjadi persegi.`);
            elements.push({ id: newId(), type: "shape", ...(box ?? fallback), shape: geom === "ellipse" ? "ellipse" : geom === "roundRect" ? "roundRect" : "rect", fill, stroke });
          }
          if (text.trim()) {
            const sz = Number(firstRun?.getAttribute("sz") ?? 0);
            const algn = descendants(el, "a:pPr")[0]?.getAttribute("algn");
            const style: TextStyle = {
              size: sz ? Math.round(sz / 100) : isTitle ? 36 : 20,
              bold: firstRun?.getAttribute("b") === "1",
              italic: firstRun?.getAttribute("i") === "1",
              color: srgb(firstRun) ?? (isTitle ? theme.title : theme.body),
              align: algn === "ctr" ? "center" : algn === "r" ? "right" : "left",
              font: /times|georgia|serif/i.test(descendants(firstRun, "a:latin")[0]?.getAttribute("typeface") ?? "") ? "serif" : "sans",
            };
            elements.push({ id: newId(), type: "text", ...(box ?? fallback), text, style });
          }
        } else if (el.nodeName === "p:pic") {
          const box = xfrm(el, scale);
          const embed = descendants(el, "a:blip")[0]?.getAttribute("r:embed");
          const target = embed ? rels[embed] : undefined;
          const src = target && files[target] ? toDataUrl(files[target]!, target) : null;
          if (box && src) elements.push({ id: newId(), type: "image", ...box, src });
          else report.add("Gambar berformat SVG/EMF atau tautan luar dilewati.");
        } else if (el.nodeName === "p:graphicFrame") {
          report.add(descendants(el, "a:tbl").length ? "Tabel PowerPoint belum didukung dan dilewati." : "Grafik/SmartArt dilewati.");
        }
      }
    };
    visit(descendants(doc, "p:spTree")[0] ?? null);

    const background = srgb(descendants(doc, "p:bg")[0]);
    let notes = "";
    const notesPath = Object.values(rels).find((p) => p.includes("notesSlide"));
    if (notesPath && files[notesPath]) {
      const notesDoc = parseXml(strFromU8(files[notesPath]!));
      const body = descendants(notesDoc, "p:sp").find((sp) => descendants(sp, "p:ph")[0]?.getAttribute("type") === "body");
      notes = descendants(body, "a:p")
        .map((p) => descendants(p, "a:t").map((t) => t.textContent ?? "").join(""))
        .join("\n")
        .trim();
    }
    if (descendants(doc, "p:transition").length || descendants(doc, "p:timing").length) report.add("Animasi dan transisi tidak dibawa.");
    slides.push({ id: newId("s"), elements, notes, background: background ?? "#ffffff" });
  }

  if (slides.length === 0) throw new Error("Tidak ada slide yang bisa dibaca dari file ini.");
  report.add("Gaya teks dibaca dari awal setiap kotak teks; format campuran dalam satu kotak disamakan.");
  return { deck: { theme: "plain", slides }, report: [...report] };
}
