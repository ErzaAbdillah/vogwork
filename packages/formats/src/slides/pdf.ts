import { PDFDocument, StandardFonts, type PDFFont, type PDFImage } from "pdf-lib";
import { dataUrlToBytes, hexToRgb } from "../pdf-flow";
import { toWinAnsi } from "../winansi";
import { SLIDE_H, SLIDE_W, THEMES, type Deck } from "./model";

const PT = 72;

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of toWinAnsi(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width || !line) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Satu halaman PDF per slide, ukuran 16:9 (960 × 540 pt). */
export async function deckToPdf(deck: Deck, options: { themeBackground?: Uint8Array } = {}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Presentasi VogWork");
  pdf.setProducer("VogWork");
  const W = SLIDE_W * PT;
  const H = SLIDE_H * PT;
  const fonts = {
    sans: [await pdf.embedFont(StandardFonts.Helvetica), await pdf.embedFont(StandardFonts.HelveticaBold), await pdf.embedFont(StandardFonts.HelveticaOblique), await pdf.embedFont(StandardFonts.HelveticaBoldOblique)],
    serif: [await pdf.embedFont(StandardFonts.TimesRoman), await pdf.embedFont(StandardFonts.TimesRomanBold), await pdf.embedFont(StandardFonts.TimesRomanItalic), await pdf.embedFont(StandardFonts.TimesRomanBoldItalic)],
  };
  const theme = THEMES[deck.theme];
  const themeBg = options.themeBackground ? await pdf.embedPng(options.themeBackground) : null;
  const images = new Map<string, PDFImage>();

  for (const slide of deck.slides) {
    const page = pdf.addPage([W, H]);
    if (!slide.background && themeBg) page.drawImage(themeBg, { x: 0, y: 0, width: W, height: H });
    else page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: hexToRgb(slide.background ?? theme.background) });

    for (const el of slide.elements) {
      const x = el.x * PT;
      const w = el.w * PT;
      const h = el.h * PT;
      const top = H - el.y * PT;
      if (el.type === "shape") {
        const fill = hexToRgb(el.fill);
        const border = el.stroke ? { borderColor: hexToRgb(el.stroke), borderWidth: 1 } : {};
        if (el.shape === "ellipse") page.drawEllipse({ x: x + w / 2, y: top - h / 2, xScale: w / 2, yScale: h / 2, color: fill, ...border });
        else page.drawRectangle({ x, y: top - h, width: w, height: h, color: fill, ...border });
      } else if (el.type === "image") {
        let image = images.get(el.src);
        if (!image) {
          const { bytes, mime } = dataUrlToBytes(el.src);
          if (mime === "image/png") image = await pdf.embedPng(bytes);
          else if (mime === "image/jpeg") image = await pdf.embedJpg(bytes);
          if (image) images.set(el.src, image);
        }
        if (image) page.drawImage(image, { x, y: top - h, width: w, height: h });
      } else {
        const s = el.style;
        const font = fonts[s.font][(s.bold ? 1 : 0) + (s.italic ? 2 : 0)]!;
        const lineHeight = s.size * 1.2;
        let y = top - 4 - s.size * 0.9;
        for (const line of wrap(el.text, font, s.size, w - 8)) {
          if (y < top - h - s.size) break;
          const lw = font.widthOfTextAtSize(line, s.size);
          const lx = s.align === "center" ? x + (w - lw) / 2 : s.align === "right" ? x + w - 4 - lw : x + 4;
          page.drawText(line, { x: lx, y, size: s.size, font, color: hexToRgb(s.color) });
          y -= lineHeight;
        }
      }
    }
  }
  return pdf.save();
}
