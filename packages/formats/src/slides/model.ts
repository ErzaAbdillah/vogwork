/** Ukuran slide lebar 16:9 dalam inci, sama dengan PowerPoint. */
export const SLIDE_W = 13.333;
export const SLIDE_H = 7.5;

export interface TextStyle {
  size: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: "left" | "center" | "right";
  font: "sans" | "serif";
}

export type SlideElement =
  | { id: string; type: "text"; x: number; y: number; w: number; h: number; text: string; style: TextStyle }
  | { id: string; type: "image"; x: number; y: number; w: number; h: number; src: string }
  | { id: string; type: "shape"; x: number; y: number; w: number; h: number; shape: "rect" | "roundRect" | "ellipse"; fill: string; stroke: string | null };

export interface Slide {
  id: string;
  elements: SlideElement[];
  notes: string;
  /** Warna latar khusus slide ini; bila kosong memakai tema. */
  background?: string | null;
}

export type ThemeKey = "mindful-light" | "mindful-dark" | "plain" | "forest";

export interface SlideTheme {
  key: ThemeKey;
  name: { id: string; en: string };
  /** Latar polos untuk ekspor; `glows` digambar di atasnya bila ada. */
  background: string;
  glows: { x: number; y: number; r: number; color: string }[];
  title: string;
  body: string;
}

export const THEMES: Record<ThemeKey, SlideTheme> = {
  "mindful-light": {
    key: "mindful-light",
    name: { id: "Mindful terang", en: "Mindful light" },
    background: "#d9dee5",
    glows: [
      { x: 0.18, y: 0.3, r: 0.45, color: "#7cc93f" },
      { x: 0.85, y: 0.9, r: 0.4, color: "#f2d24c" },
    ],
    title: "#1d3b25",
    body: "#33443a",
  },
  "mindful-dark": {
    key: "mindful-dark",
    name: { id: "Mindful gelap", en: "Mindful dark" },
    background: "#0e1013",
    glows: [
      { x: 0.15, y: 0.25, r: 0.4, color: "#3fbf5a" },
      { x: 0.88, y: 0.8, r: 0.38, color: "#a24dff" },
    ],
    title: "#f2f5ee",
    body: "#c9d1cc",
  },
  forest: {
    key: "forest",
    name: { id: "Hutan", en: "Forest" },
    background: "#16301f",
    glows: [{ x: 0.8, y: 0.2, r: 0.45, color: "#8cc63f" }],
    title: "#f4f8e8",
    body: "#d6e4cf",
  },
  plain: { key: "plain", name: { id: "Polos putih", en: "Plain white" }, background: "#ffffff", glows: [], title: "#111111", body: "#333333" },
};

/** Isi file slide VogWork (`VogFile.content` untuk type "slide"). */
export interface Deck {
  theme: ThemeKey;
  slides: Slide[];
}

let seq = 0;
export const newId = (prefix = "e") => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

export function textElement(partial: Partial<Extract<SlideElement, { type: "text" }>> & { text: string }, theme: SlideTheme): SlideElement {
  return {
    id: newId(),
    type: "text",
    x: 0.8,
    y: 0.6,
    w: SLIDE_W - 1.6,
    h: 1.2,
    ...partial,
    style: { size: 24, bold: false, italic: false, color: theme.body, align: "left", font: "sans", ...partial.style },
  };
}

export function titleSlide(theme: SlideTheme, title: string, subtitle: string): Slide {
  return {
    id: newId("s"),
    notes: "",
    elements: [
      textElement({ text: title, y: 2.4, h: 1.5, style: { size: 54, bold: false, italic: false, color: theme.title, align: "left", font: "sans" } }, theme),
      textElement({ text: subtitle, y: 4.0, h: 0.9, style: { size: 22, bold: false, italic: false, color: theme.body, align: "left", font: "sans" } }, theme),
    ],
  };
}

export function contentSlide(theme: SlideTheme, title: string, bullets: string[]): Slide {
  return {
    id: newId("s"),
    notes: "",
    elements: [
      textElement({ text: title, y: 0.55, h: 1.0, style: { size: 36, bold: false, italic: false, color: theme.title, align: "left", font: "sans" } }, theme),
      textElement({ text: bullets.map((b) => `• ${b}`).join("\n"), y: 1.8, h: 4.8, style: { size: 22, bold: false, italic: false, color: theme.body, align: "left", font: "sans" } }, theme),
    ],
  };
}

export function blankDeck(themeKey: ThemeKey = "mindful-light"): Deck {
  const theme = THEMES[themeKey];
  return { theme: themeKey, slides: [titleSlide(theme, "Judul presentasi", "Subjudul atau nama penyaji")] };
}
