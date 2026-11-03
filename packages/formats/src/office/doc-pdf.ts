import { rgb, StandardFonts, type PDFFont } from "pdf-lib";
import { dataUrlToBytes, embedDataUrlImage, hexToRgb, MM, PdfFlow, type FontSet } from "../pdf-flow";
import { toWinAnsi } from "../winansi";
import { PAPER_MM, type DocContent, type PMNode } from "./docx";

interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  color?: string;
  size?: number;
}

type Token = { text: string; run: Run; space: boolean } | { br: true };

const pt = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? (value.endsWith("px") ? n * 0.75 : n) : undefined;
};

function runsOf(nodes: PMNode[] | undefined, inherit: Partial<Run> = {}): (Run | "br")[] {
  const out: (Run | "br")[] = [];
  for (const node of nodes ?? []) {
    if (node.type === "hardBreak") out.push("br");
    if (node.type !== "text" || !node.text) continue;
    const marks = Object.fromEntries((node.marks ?? []).map((m) => [m.type, m.attrs ?? {}]));
    const style = marks.textStyle as Record<string, unknown> | undefined;
    out.push({
      text: node.text,
      bold: Boolean(marks.bold) || Boolean(inherit.bold),
      italic: Boolean(marks.italic),
      underline: Boolean(marks.underline || marks.link),
      strike: Boolean(marks.strike),
      code: Boolean(marks.code),
      color: typeof style?.color === "string" ? style.color : marks.link ? "#1f5fbf" : undefined,
      size: pt(style?.fontSize) ?? inherit.size,
    });
  }
  return out;
}

function tokenize(runs: (Run | "br")[]): Token[] {
  const tokens: Token[] = [];
  for (const run of runs) {
    if (run === "br") {
      tokens.push({ br: true });
      continue;
    }
    for (const part of toWinAnsi(run.text).split(/(?<= )/)) {
      if (!part) continue;
      tokens.push({ text: part.replace(/ $/, ""), run, space: part.endsWith(" ") });
    }
  }
  return tokens;
}

/**
 * Menyusun dokumen VogWork menjadi PDF asli (bukan dialog cetak): judul, paragraf
 * dengan format campuran, perataan, daftar, kutipan, tabel, gambar, header, footer,
 * dan nomor halaman.
 */
export async function docToPdf(content: DocContent, options: { title?: string } = {}): Promise<Uint8Array> {
  const s = content.settings;
  const [w, h] = PAPER_MM[s.pageSize];
  const size: [number, number] = s.orientation === "landscape" ? [h * MM, w * MM] : [w * MM, h * MM];
  const flow = await PdfFlow.create({ size, marginMm: s.marginMm, family: s.fontFamily === "Times New Roman" ? "times" : "helvetica", fontSize: s.fontSize, title: options.title });
  const courier: FontSet = {
    regular: await flow.doc.embedFont(StandardFonts.Courier),
    bold: await flow.doc.embedFont(StandardFonts.CourierBold),
    italic: await flow.doc.embedFont(StandardFonts.CourierOblique),
    boldItalic: await flow.doc.embedFont(StandardFonts.CourierBoldOblique),
  };
  const base = s.fontSize;

  const fontFor = (run: Run): PDFFont => {
    const set = run.code ? courier : flow.fonts;
    return run.bold && run.italic ? set.boldItalic : run.bold ? set.bold : run.italic ? set.italic : set.regular;
  };

  /** Paragraf kaya-format dengan pembungkusan baris dan perataan. */
  const paragraph = (nodes: PMNode[] | undefined, opts: { align?: string; indent?: number; size?: number; bold?: boolean; after?: number; marker?: string }) => {
    const left = flow.margin.left + (opts.indent ?? 0);
    const width = flow.contentWidth - (opts.indent ?? 0);
    const sizeOf = (run: Run) => run.size ?? opts.size ?? base;
    const tokens = tokenize(runsOf(nodes, { bold: opts.bold, size: opts.size }));
    const lines: { items: { text: string; run: Run; width: number; space: number }[]; last: boolean }[] = [];
    let line: (typeof lines)[number]["items"] = [];
    let used = 0;
    const flush = (last: boolean) => {
      lines.push({ items: line, last });
      line = [];
      used = 0;
    };
    for (const token of tokens) {
      if ("br" in token) {
        flush(true);
        continue;
      }
      const font = fontFor(token.run);
      const tw = font.widthOfTextAtSize(token.text, sizeOf(token.run));
      const sw = token.space ? font.widthOfTextAtSize(" ", sizeOf(token.run)) : 0;
      if (used + tw > width && line.length > 0) flush(false);
      line.push({ text: token.text, run: token.run, width: tw, space: sw });
      used += tw + sw;
    }
    flush(true);

    lines.forEach((ln, i) => {
      const lineSize = Math.max(opts.size ?? base, ...ln.items.map((it) => sizeOf(it.run)));
      const lineHeight = lineSize * 1.35;
      flow.ensureSpace(lineHeight);
      const baseline = flow.pageHeight - flow.cursor - lineSize * 0.85;
      if (i === 0 && opts.marker) {
        flow.page.drawText(opts.marker, { x: left - 14, y: baseline, size: opts.size ?? base, font: flow.fonts.regular });
      }
      const contentWidth = ln.items.reduce((sum, it, k) => sum + it.width + (k < ln.items.length - 1 ? it.space : 0), 0);
      const gaps = ln.items.slice(0, -1).filter((it) => it.space > 0).length;
      const justify = opts.align === "justify" && !ln.last && gaps > 0;
      const extra = justify ? (width - contentWidth) / gaps : 0;
      let x = opts.align === "center" ? left + (width - contentWidth) / 2 : opts.align === "right" ? left + width - contentWidth : left;
      ln.items.forEach((it, k) => {
        const runSize = sizeOf(it.run);
        const color = it.run.color ? hexToRgb(it.run.color) : rgb(0.07, 0.07, 0.07);
        flow.page.drawText(it.text, { x, y: baseline, size: runSize, font: fontFor(it.run), color });
        const endX = x + it.width + (k < ln.items.length - 1 ? it.space + (justify && it.space ? extra : 0) : 0);
        if (it.run.underline) flow.page.drawLine({ start: { x, y: baseline - runSize * 0.12 }, end: { x: x + it.width, y: baseline - runSize * 0.12 }, thickness: runSize / 18, color });
        if (it.run.strike) flow.page.drawLine({ start: { x, y: baseline + runSize * 0.3 }, end: { x: x + it.width, y: baseline + runSize * 0.3 }, thickness: runSize / 18, color });
        x = endX;
      });
      flow.cursor += lineHeight;
    });
    flow.cursor += opts.after ?? base * 0.5;
  };

  const plainText = (node: PMNode): string =>
    node.type === "text" ? (node.text ?? "") : node.type === "hardBreak" ? "\n" : (node.content ?? []).map(plainText).join(node.type === "tableCell" || node.type === "tableHeader" ? "\n" : "");

  const blocks = async (nodes: PMNode[] | undefined, ctx: { indent: number; ordered?: boolean; level: number }) => {
    for (const node of nodes ?? []) {
      const align = String(node.attrs?.textAlign ?? "left");
      switch (node.type) {
        case "paragraph":
          paragraph(node.content, { align, indent: ctx.indent });
          break;
        case "heading": {
          const level = Math.min(4, Math.max(1, Number(node.attrs?.level ?? 1)));
          const headingSize = base * [1.8, 1.45, 1.2, 1.05][level - 1]!;
          flow.cursor += headingSize * 0.4;
          flow.ensureSpace(headingSize * 3);
          paragraph(node.content, { align, indent: ctx.indent, size: headingSize, bold: true, after: headingSize * 0.35 });
          break;
        }
        case "bulletList":
        case "orderedList": {
          let n = Number(node.attrs?.start ?? 1);
          for (const item of node.content ?? []) {
            const marker = node.type === "orderedList" ? `${ctx.level % 2 ? String.fromCharCode(96 + n) : n}.` : ["•", "o", "-"][ctx.level % 3]!;
            let first = true;
            for (const child of item.content ?? []) {
              if (child.type === "bulletList" || child.type === "orderedList") await blocks([child], { indent: ctx.indent + 18, level: ctx.level + 1 });
              else {
                paragraph(child.content, { align: String(child.attrs?.textAlign ?? "left"), indent: ctx.indent + 18, marker: first ? marker : undefined, after: base * 0.2 });
                first = false;
              }
            }
            n++;
          }
          flow.cursor += base * 0.3;
          break;
        }
        case "blockquote": {
          const top = flow.cursor;
          const page = flow.page;
          await blocks(node.content, { ...ctx, indent: ctx.indent + 16 });
          if (page === flow.page) {
            page.drawLine({ start: { x: flow.margin.left + ctx.indent + 4, y: flow.pageHeight - top }, end: { x: flow.margin.left + ctx.indent + 4, y: flow.pageHeight - flow.cursor + base * 0.5 }, thickness: 2, color: rgb(0.7, 0.77, 0.69) });
          }
          break;
        }
        case "codeBlock": {
          const lines = plainText(node).split("\n");
          const code: PMNode[] = lines.flatMap((line, i) => [{ type: "text", text: line || " ", marks: [{ type: "code" }] }, ...(i < lines.length - 1 ? [{ type: "hardBreak" }] : [])]);
          paragraph(code, { indent: ctx.indent, size: base * 0.9 });
          break;
        }
        case "horizontalRule":
          flow.moveDown(base * 0.4);
          flow.rule({ thickness: 0.6, color: rgb(0.6, 0.6, 0.6) });
          flow.moveDown(base * 0.8);
          break;
        case "table": {
          const rows = (node.content ?? []).map((row) =>
            (row.content ?? []).flatMap((cell) => [plainText(cell), ...Array.from({ length: Number(cell.attrs?.colspan ?? 1) - 1 }, () => "")]),
          );
          const cols = Math.max(1, ...rows.map((r) => r.length));
          const widths = ((node.content?.[0]?.content ?? []).flatMap((cell) => {
            const cw = cell.attrs?.colwidth as number[] | null | undefined;
            return Array.from({ length: Number(cell.attrs?.colspan ?? 1) }, (_, i) => cw?.[i] ?? 0);
          }));
          const known = widths.reduce((a, b) => a + b, 0);
          // Tanpa baris header, baris pertama tetap dipakai sebagai kepala tabel.
          const columns = Array.from({ length: cols }, (_, i) => ({ header: toWinAnsi(rows[0]?.[i] ?? ""), width: known > 0 && widths[i] ? widths[i]! / known : 1 / cols }));
          flow.table({ columns, rows: rows.slice(1).map((r) => r.map(toWinAnsi)), size: base * 0.92, headerFill: rgb(0.93, 0.95, 0.96), x: flow.margin.left + ctx.indent, width: flow.contentWidth - ctx.indent });
          flow.moveDown(base * 0.6);
          break;
        }
        case "image": {
          const src = String(node.attrs?.src ?? "");
          const mime = src.startsWith("data:") ? dataUrlToBytes(src).mime : "";
          if (mime !== "image/png" && mime !== "image/jpeg") break;
          const image = await embedDataUrlImage(flow.doc, src);
          const maxW = flow.contentWidth - ctx.indent;
          const wantW = Number(node.attrs?.width) ? Number(node.attrs?.width) * 0.75 : image.width * 0.75;
          let iw = Math.min(maxW, wantW);
          let ih = iw * (image.height / image.width);
          const maxH = flow.pageHeight - flow.margin.top - flow.margin.bottom;
          if (ih > maxH) [iw, ih] = [maxH * (image.width / image.height), maxH];
          flow.ensureSpace(ih);
          flow.imageAt(image, flow.margin.left + ctx.indent + (maxW - iw) / 2, flow.cursor, iw, ih);
          flow.moveDown(ih + base * 0.6);
          break;
        }
        default:
          if (node.content) await blocks(node.content, ctx);
      }
    }
  };

  await blocks(content.doc.content, { indent: 0, level: 0 });

  const pages = flow.doc.getPages();
  pages.forEach((page, i) => {
    const small = 9;
    const font = flow.fonts.regular;
    const grey = rgb(0.4, 0.4, 0.4);
    const center = (text: string, y: number) => {
      const safe = toWinAnsi(text);
      page.drawText(safe, { x: (flow.pageWidth - font.widthOfTextAtSize(safe, small)) / 2, y, size: small, font, color: grey });
    };
    if (s.header.trim()) center(s.header, flow.pageHeight - flow.margin.top / 2);
    const footer = [s.footer.trim(), s.pageNumbers ? `Halaman ${i + 1} dari ${pages.length}` : ""].filter(Boolean).join("   ·   ");
    if (footer) center(footer, flow.margin.bottom / 2);
  });

  return flow.save();
}
