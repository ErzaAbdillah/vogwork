import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IParagraphOptions,
  type ParagraphChild,
} from "docx";
import { strFromU8, unzipSync } from "fflate";

/** Simpul ProseMirror/Tiptap dalam bentuk JSON. */
export interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export interface DocSettings {
  pageSize: "A4" | "F4" | "Letter";
  orientation: "portrait" | "landscape";
  marginMm: { top: number; right: number; bottom: number; left: number };
  header: string;
  footer: string;
  pageNumbers: boolean;
  fontFamily: "Times New Roman" | "Arial" | "Calibri";
  fontSize: number;
}

/** Isi file dokumen VogWork (`VogFile.content` untuk type "document"). */
export interface DocContent {
  settings: DocSettings;
  doc: PMNode;
}

export const defaultDocSettings = (): DocSettings => ({
  pageSize: "A4",
  orientation: "portrait",
  marginMm: { top: 25, right: 25, bottom: 25, left: 30 },
  header: "",
  footer: "",
  pageNumbers: true,
  fontFamily: "Times New Roman",
  fontSize: 12,
});

/** Ukuran kertas dalam milimeter (lebar × tinggi potret). */
export const PAPER_MM: Record<DocSettings["pageSize"], [number, number]> = {
  A4: [210, 297],
  F4: [215, 330],
  Letter: [215.9, 279.4],
};

const TWIP_PER_MM = 56.6929;
const twip = (mm: number) => Math.round(mm * TWIP_PER_MM);
const PX_PER_MM = 96 / 25.4;

const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};
const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];

const hex = (color: unknown) => (typeof color === "string" && /^#?[0-9a-f]{6}$/i.test(color) ? color.replace("#", "").toUpperCase() : undefined);

function fontSizeHalfPoints(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return undefined;
  const pt = value.endsWith("px") ? n * 0.75 : n;
  return Math.round(pt * 2);
}

function dataUrlInfo(src: string): { bytes: Uint8Array; type: "png" | "jpg" | "gif" | "bmp" } | null {
  const match = /^data:image\/(png|jpe?g|gif|bmp);base64,(.*)$/i.exec(src);
  if (!match) return null;
  const binary = atob(match[2]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const kind = match[1]!.toLowerCase();
  return { bytes, type: kind === "jpeg" || kind === "jpg" ? "jpg" : (kind as "png" | "gif" | "bmp") };
}

export interface DocxExportOptions {
  /** Mengukur gambar (px). Di browser memakai createImageBitmap; tanpa ini dipakai atribut node. */
  measureImage?: (src: string) => Promise<{ width: number; height: number }>;
}

/** Mengubah dokumen VogWork menjadi DOCX yang rapi dibuka di Word. */
export async function docToDocx(content: DocContent, options: DocxExportOptions = {}): Promise<Uint8Array> {
  const s = content.settings;
  const [paperW, paperH] = PAPER_MM[s.pageSize];
  const pageWmm = s.orientation === "landscape" ? paperH : paperW;
  const contentWidthPx = (pageWmm - s.marginMm.left - s.marginMm.right) * PX_PER_MM;
  let listInstance = 0;

  const runs = async (nodes: PMNode[] | undefined, inherited: { bold?: boolean } = {}): Promise<ParagraphChild[]> => {
    const out: ParagraphChild[] = [];
    for (const node of nodes ?? []) {
      if (node.type === "hardBreak") {
        out.push(new TextRun({ text: "", break: 1 }));
        continue;
      }
      if (node.type === "image") {
        const image = await imageRun(node);
        if (image) out.push(image);
        continue;
      }
      if (node.type !== "text" || !node.text) continue;
      const marks = Object.fromEntries((node.marks ?? []).map((m) => [m.type, m.attrs ?? {}]));
      const style = marks.textStyle as Record<string, unknown> | undefined;
      const run = new TextRun({
        text: node.text,
        bold: Boolean(marks.bold) || inherited.bold,
        italics: Boolean(marks.italic),
        underline: marks.underline || marks.link ? {} : undefined,
        strike: Boolean(marks.strike),
        color: hex(style?.color) ?? (marks.link ? "1F5FBF" : undefined),
        size: fontSizeHalfPoints(style?.fontSize),
        font: marks.code ? "Courier New" : typeof style?.fontFamily === "string" ? style.fontFamily.split(",")[0]!.replace(/["']/g, "").trim() : undefined,
        shading: marks.highlight ? { type: ShadingType.CLEAR, fill: hex((marks.highlight as Record<string, unknown>).color) ?? "FFF176", color: "auto" } : undefined,
        superScript: Boolean(marks.superscript),
        subScript: Boolean(marks.subscript),
      });
      const href = (marks.link as Record<string, unknown> | undefined)?.href;
      out.push(typeof href === "string" ? new ExternalHyperlink({ link: href, children: [run] }) : run);
    }
    return out;
  };

  const imageRun = async (node: PMNode) => {
    const src = String(node.attrs?.src ?? "");
    const info = dataUrlInfo(src);
    if (!info) return null;
    let width = Number(node.attrs?.width) || 0;
    let height = Number(node.attrs?.height) || 0;
    if ((!width || !height) && options.measureImage) ({ width, height } = await options.measureImage(src));
    if (!width || !height) [width, height] = [400, 300];
    const scale = Math.min(1, contentWidthPx / width);
    return new ImageRun({ type: info.type, data: info.bytes, transformation: { width: Math.round(width * scale), height: Math.round(height * scale) } } as never);
  };

  const paragraphOptions = (node: PMNode): Partial<IParagraphOptions> => {
    const align = ALIGN[String(node.attrs?.textAlign ?? "")];
    return align ? { alignment: align } : {};
  };

  const blocks = async (nodes: PMNode[] | undefined, ctx: { list?: { ref: string; level: number; instance: number }; quote?: boolean } = {}): Promise<(Paragraph | Table)[]> => {
    const out: (Paragraph | Table)[] = [];
    for (const node of nodes ?? []) {
      switch (node.type) {
        case "paragraph":
          out.push(
            new Paragraph({
              ...paragraphOptions(node),
              children: await runs(node.content),
              ...(ctx.quote && { indent: { left: 720 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: "B5C4B1", space: 8 } } }),
            }),
          );
          break;
        case "heading": {
          const level = Math.min(4, Math.max(1, Number(node.attrs?.level ?? 1)));
          out.push(new Paragraph({ ...paragraphOptions(node), heading: HEADINGS[level - 1], children: await runs(node.content) }));
          break;
        }
        case "bulletList":
        case "orderedList": {
          const ref = node.type === "bulletList" ? "vog-bullet" : "vog-number";
          const level = ctx.list ? ctx.list.level + 1 : 0;
          const instance = node.type === "orderedList" ? ++listInstance : 0;
          for (const item of node.content ?? []) {
            let first = true;
            for (const child of item.content ?? []) {
              if (child.type === "bulletList" || child.type === "orderedList") {
                out.push(...(await blocks([child], { list: { ref, level, instance } })));
              } else if (first) {
                out.push(new Paragraph({ ...paragraphOptions(child), numbering: { reference: ref, level: Math.min(level, 5), instance }, children: await runs(child.content) }));
                first = false;
              } else {
                out.push(new Paragraph({ indent: { left: 720 * (level + 1) }, children: await runs(child.content) }));
              }
            }
          }
          break;
        }
        case "blockquote":
          out.push(...(await blocks(node.content, { ...ctx, quote: true })));
          break;
        case "codeBlock":
          for (const line of (node.content?.map((c) => c.text ?? "").join("") ?? "").split("\n")) {
            out.push(new Paragraph({ shading: { type: ShadingType.CLEAR, fill: "F1F3F5", color: "auto" }, children: [new TextRun({ text: line, font: "Courier New", size: 20 })] }));
          }
          break;
        case "horizontalRule":
          out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } }, children: [] }));
          break;
        case "table":
          out.push(await table(node));
          out.push(new Paragraph({ children: [] }));
          break;
        case "image": {
          const image = await imageRun(node);
          if (image) out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [image] }));
          break;
        }
        default:
          if (node.content) out.push(...(await blocks(node.content, ctx)));
      }
    }
    return out;
  };

  const table = async (node: PMNode) => {
    const rows = node.content ?? [];
    const firstRow = rows[0]?.content ?? [];
    const colCount = firstRow.reduce((n, c) => n + Number(c.attrs?.colspan ?? 1), 0) || 1;
    const widths = firstRow.flatMap((c) => {
      const span = Number(c.attrs?.colspan ?? 1);
      const cw = c.attrs?.colwidth as number[] | null | undefined;
      return Array.from({ length: span }, (_, i) => cw?.[i] ?? 0);
    });
    const total = contentWidthPx * 15;
    const known = widths.reduce((a, b) => a + b, 0);
    const columnWidths = widths.map((w) => (known > 0 && w > 0 ? Math.round((w / known) * total) : Math.round(total / colCount)));
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths,
      rows: await Promise.all(
        rows.map(
          async (row) =>
            new TableRow({
              children: await Promise.all(
                (row.content ?? []).map(async (cell) => {
                  const header = cell.type === "tableHeader";
                  const paragraphs = (await blocks(cell.content)).filter((b): b is Paragraph => b instanceof Paragraph);
                  return new TableCell({
                    columnSpan: Number(cell.attrs?.colspan ?? 1),
                    rowSpan: Number(cell.attrs?.rowspan ?? 1),
                    shading: header ? { type: ShadingType.CLEAR, fill: "EEF1F4", color: "auto" } : undefined,
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                    children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [] })],
                  });
                }),
              ),
            }),
        ),
      ),
    });
  };

  const body = await blocks(content.doc.content);
  const footerChildren: ParagraphChild[] = [];
  if (s.footer.trim()) footerChildren.push(new TextRun({ text: s.footer + (s.pageNumbers ? "   ·   " : "") }));
  if (s.pageNumbers) footerChildren.push(new TextRun({ children: ["Halaman ", PageNumber.CURRENT, " dari ", PageNumber.TOTAL_PAGES] }));

  const level = (i: number, format: (typeof LevelFormat)[keyof typeof LevelFormat], text: string) => ({
    level: i,
    format,
    text,
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } },
  });

  const doc = new Document({
    creator: "VogWork",
    title: "Dokumen VogWork",
    styles: {
      default: {
        document: { run: { font: s.fontFamily, size: s.fontSize * 2 }, paragraph: { spacing: { after: 120, line: 300 } } },
        heading1: { run: { font: s.fontFamily, size: 36, bold: true, color: "111111" }, paragraph: { spacing: { before: 240, after: 120 } } },
        heading2: { run: { font: s.fontFamily, size: 30, bold: true, color: "111111" }, paragraph: { spacing: { before: 200, after: 100 } } },
        heading3: { run: { font: s.fontFamily, size: 26, bold: true, color: "111111" }, paragraph: { spacing: { before: 160, after: 80 } } },
      },
    },
    numbering: {
      config: [
        { reference: "vog-bullet", levels: [0, 1, 2, 3, 4, 5].map((i) => level(i, LevelFormat.BULLET, ["•", "◦", "▪"][i % 3]!)) },
        { reference: "vog-number", levels: [0, 1, 2, 3, 4, 5].map((i) => level(i, i % 2 ? LevelFormat.LOWER_LETTER : LevelFormat.DECIMAL, `%${i + 1}.`)) },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: twip(paperW), height: twip(paperH), orientation: s.orientation === "landscape" ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
            margin: { top: twip(s.marginMm.top), right: twip(s.marginMm.right), bottom: twip(s.marginMm.bottom), left: twip(s.marginMm.left) },
          },
        },
        headers: s.header.trim() ? { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.header, size: 18, color: "666666" })] })] }) } : undefined,
        footers: footerChildren.length ? { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: footerChildren })] }) } : undefined,
        children: body.length > 0 ? body : [new Paragraph({ children: [] })],
      },
    ],
  });

  return new Uint8Array(await Packer.toArrayBuffer(doc));
}

export interface DocxImport {
  html: string;
  settings: Partial<DocSettings>;
  report: string[];
}

/**
 * Membaca DOCX: struktur (judul, paragraf, daftar, tabel, gambar, tautan) lewat mammoth,
 * ukuran kertas, margin, serta header/footer dibaca langsung dari XML.
 * HTML hasilnya wajib disanitasi sebelum dimasukkan ke editor.
 */
export async function docxToHtml(data: ArrayBuffer): Promise<DocxImport> {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.convertToHtml(
    // Versi browser mammoth membaca `arrayBuffer`, versi Node membaca `buffer`.
    { arrayBuffer: data, buffer: data } as never,
    {
      styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh", "p[style-name='Judul'] => h1:fresh"],
      convertImage: mammoth.images.imgElement(async (image: { contentType: string; read: (enc: string) => Promise<string> }) => ({
        src: `data:${image.contentType};base64,${await image.read("base64")}`,
      })),
    } as never,
  );

  const report = new Set<string>();
  report.add("Struktur dibawa (judul, paragraf, daftar, tabel, gambar, tautan); perataan, warna, serta jenis dan ukuran huruf tidak dibawa.");
  for (const message of result.messages as { type: string; message: string }[]) {
    const style = /Unrecognised (paragraph|run) style: '([^']+)'/.exec(message.message);
    if (style) report.add(`Gaya “${style[2]}” diganti format biasa.`);
  }

  const settings: Partial<DocSettings> = {};
  try {
    const files = unzipSync(new Uint8Array(data));
    const xml = strFromU8(files["word/document.xml"] ?? new Uint8Array());
    const pgSz = /<w:pgSz\b([^>]*)\/>/.exec(xml)?.[1] ?? "";
    const w = Number(/w:w="(\d+)"/.exec(pgSz)?.[1]);
    const h = Number(/w:h="(\d+)"/.exec(pgSz)?.[1]);
    if (w && h) {
      const landscape = w > h;
      const [shortMm, longMm] = [Math.min(w, h) / TWIP_PER_MM, Math.max(w, h) / TWIP_PER_MM];
      settings.orientation = landscape ? "landscape" : "portrait";
      settings.pageSize = Math.abs(longMm - 330) < 4 ? "F4" : Math.abs(shortMm - 215.9) < 2 && Math.abs(longMm - 279.4) < 3 ? "Letter" : "A4";
    }
    const mar = /<w:pgMar\b([^>]*)\/>/.exec(xml)?.[1] ?? "";
    const m = (k: string) => Math.round(Number(new RegExp(`w:${k}="(\\d+)"`).exec(mar)?.[1] ?? 0) / TWIP_PER_MM);
    if (mar) settings.marginMm = { top: m("top") || 25, right: m("right") || 25, bottom: m("bottom") || 25, left: m("left") || 30 };
    const textOf = (name: string) =>
      Object.entries(files)
        .filter(([path]) => new RegExp(`^word/${name}\\d*\\.xml$`).test(path))
        .map(([, bytes]) => [...strFromU8(bytes).matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]).join(""))
        .find((t) => t.trim()) ?? "";
    settings.header = textOf("header");
    const footer = textOf("footer").replace(/Halaman\s*\d*\s*dari\s*\d*/i, "").trim();
    settings.footer = /^\d+$/.test(footer) ? "" : footer;
    if (/<w:(ins|del)\b/.test(xml)) report.add("Perubahan terlacak (track changes) tidak didukung; teks akhir yang dipakai.");
    if (/<m:oMath/.test(xml)) report.add("Persamaan matematika tidak didukung dan diabaikan.");
    if (/dgm:|diagramData/.test(xml)) report.add("SmartArt tidak didukung dan diabaikan.");
    if (/<w:comment|commentReference/.test(xml)) report.add("Komentar tidak dibawa.");
  } catch {
    // Pengaturan halaman hanya tambahan; isi dokumen tetap bisa dibuka.
  }
  return { html: result.value, settings, report: [...report] };
}
