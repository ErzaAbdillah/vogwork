"use client";

import { contentSlide, newId, SLIDE_H, SLIDE_W, textElement, THEMES, titleSlide, type Deck, type Slide, type SlideElement, type ThemeKey } from "@vogwork/formats/slides";
import { useLocale, useT } from "@vogwork/i18n";
import { Button, cn, Select, Textarea } from "@vogwork/ui";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  BringToFront,
  Circle,
  Copy,
  ImagePlus,
  Play,
  Plus,
  SendToBack,
  Square,
  SquareRoundCorner,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { dict } from "./dict";
import { SlideView } from "./slide-view";

function Tool({ label, active, onClick, children, disabled }: { label: string; active?: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn("inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40 [&_svg]:size-4", active && "bg-primary/15 text-primary")}
    >
      {children}
    </button>
  );
}

async function pickImage(): Promise<{ src: string; ratio: number } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const { convertImage, blobToDataUrl } = await import("@vogwork/formats/image");
      // PNG/JPEG supaya bisa masuk ke PPTX dan PDF; gambar besar diperkecil.
      const out = await convertImage(file, { type: file.type === "image/jpeg" ? "image/jpeg" : "image/png", quality: 0.9, maxWidth: 2400, maxHeight: 2400 });
      resolve({ src: await blobToDataUrl(out.blob), ratio: out.width / out.height });
    };
    input.click();
  });
}

function Presenter({ deck, start, onClose }: { deck: Deck; start: number; onClose: () => void }) {
  const t = useT(dict);
  const [index, setIndex] = useState(start);
  const root = useRef<HTMLDivElement>(null);
  const theme = THEMES[deck.theme];

  useEffect(() => {
    root.current?.requestFullscreen?.().catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) setIndex((i) => Math.min(deck.slides.length - 1, i + 1));
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) setIndex((i) => Math.max(0, i - 1));
      else if (e.key === "Escape") onClose();
    };
    const onFullscreen = () => !document.fullscreenElement && onClose();
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreen);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, [deck.slides.length, onClose]);

  return (
    <div ref={root} className="fixed inset-0 z-[100] flex items-center justify-center bg-black" onClick={() => setIndex((i) => Math.min(deck.slides.length - 1, i + 1))}>
      <div className="w-full max-w-[calc(100vh*16/9)]">
        <SlideView slide={deck.slides[index]!} theme={theme} label={t("slideN", { n: index + 1 })} />
      </div>
      <div className="absolute right-4 bottom-4 flex items-center gap-3 text-sm text-white/60">
        {index + 1} / {deck.slides.length}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="rounded-md bg-white/10 px-3 py-1.5 text-white hover:bg-white/20"
        >
          <X className="inline size-4" /> {t("exitPresent")}
        </button>
      </div>
    </div>
  );
}

/** Editor deck: daftar slide, kanvas, bilah alat, catatan, dan mode presentasi. */
export function DeckEditor({ initial, onChange }: { initial: Deck; onChange: (deck: Deck) => void }) {
  const t = useT(dict);
  const { locale } = useLocale();
  const [deck, setDeck] = useState<Deck>(initial);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const theme = THEMES[deck.theme];
  const slide = deck.slides[Math.min(index, deck.slides.length - 1)]!;
  const selected = slide.elements.find((e) => e.id === selectedId) ?? null;

  const update = (next: Deck) => {
    setDeck(next);
    onChange(next);
  };
  const updateSlide = (patch: (s: Slide) => Slide) => update({ ...deck, slides: deck.slides.map((s, i) => (i === index ? patch(s) : s)) });
  const updateElement = (el: SlideElement) => updateSlide((s) => ({ ...s, elements: s.elements.map((e) => (e.id === el.id ? el : e)) }));
  const addElement = (el: SlideElement) => {
    updateSlide((s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedId(el.id);
  };
  const removeSelected = () => {
    if (!selected) return;
    updateSlide((s) => ({ ...s, elements: s.elements.filter((e) => e.id !== selected.id) }));
    setSelectedId(null);
  };
  const reorder = (dir: 1 | -1) => {
    if (!selected) return;
    updateSlide((s) => {
      const list = [...s.elements];
      const i = list.findIndex((e) => e.id === selected.id);
      const j = Math.min(list.length - 1, Math.max(0, i + dir));
      [list[i], list[j]] = [list[j]!, list[i]!];
      return { ...s, elements: list };
    });
  };
  const addSlide = (layout: "title" | "content" | "blank") => {
    const s = layout === "title" ? titleSlide(theme, "Judul", "Subjudul") : layout === "content" ? contentSlide(theme, "Judul slide", ["Poin pertama", "Poin kedua"]) : { id: newId("s"), elements: [], notes: "" };
    const slides = [...deck.slides];
    slides.splice(index + 1, 0, s);
    update({ ...deck, slides });
    setIndex(index + 1);
    setSelectedId(null);
  };
  const moveSlide = (dir: 1 | -1) => {
    const j = index + dir;
    if (j < 0 || j >= deck.slides.length) return;
    const slides = [...deck.slides];
    [slides[index], slides[j]] = [slides[j]!, slides[index]!];
    update({ ...deck, slides });
    setIndex(j);
  };

  // Delete dan panah bekerja pada elemen terpilih saat fokus tidak di kolom teks.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!selected || presenting || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelected();
      }
      const step = e.shiftKey ? 0.5 : 0.05;
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (delta) {
        e.preventDefault();
        updateElement({ ...selected, x: selected.x + delta[0]!, y: selected.y + delta[1]! });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const text = selected?.type === "text" ? selected : null;
  const shape = selected?.type === "shape" ? selected : null;

  return (
    <div className="space-y-3">
      {presenting && <Presenter deck={deck} start={index} onClose={() => setPresenting(false)} />}

      <div className="no-print flex flex-wrap items-center gap-0.5 rounded-2xl border bg-card-solid/90 p-1.5 shadow-sm backdrop-blur-xl">
        <Tool label={t("addText")} onClick={() => addElement(textElement({ text: t("newText"), x: 1.5, y: 3, w: 6, h: 1 }, theme))}>
          <Type /> {t("addText")}
        </Tool>
        <Tool
          label={t("addImage")}
          onClick={async () => {
            const img = await pickImage();
            if (!img) return;
            const h = Math.min(4.5, 6 / img.ratio);
            const w = h * img.ratio;
            addElement({ id: newId(), type: "image", src: img.src, x: (SLIDE_W - w) / 2, y: (SLIDE_H - h) / 2, w, h });
          }}
        >
          <ImagePlus /> {t("addImage")}
        </Tool>
        {(
          [
            ["rect", Square],
            ["roundRect", SquareRoundCorner],
            ["ellipse", Circle],
          ] as const
        ).map(([kind, Icon]) => (
          <Tool key={kind} label={t(kind)} onClick={() => addElement({ id: newId(), type: "shape", shape: kind, x: 5, y: 2.5, w: 3, h: 2, fill: "#7cc93f", stroke: null })}>
            <Icon />
          </Tool>
        ))}
        <span className="mx-1 h-6 w-px bg-border" />
        <Tool label={t("front")} disabled={!selected} onClick={() => reorder(1)}>
          <BringToFront />
        </Tool>
        <Tool label={t("back")} disabled={!selected} onClick={() => reorder(-1)}>
          <SendToBack />
        </Tool>
        <Tool label={t("deleteElement")} disabled={!selected} onClick={removeSelected}>
          <Trash2 />
        </Tool>

        {text && (
          <span className="flex flex-wrap items-center gap-0.5 rounded-md bg-muted/70 px-1">
            <Select aria-label={t("size")} className="h-7 w-16 text-xs" value={text.style.size} onChange={(e) => updateElement({ ...text, style: { ...text.style, size: Number(e.target.value) } })}>
              {[12, 14, 16, 18, 20, 24, 28, 32, 36, 44, 54, 66, 80].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            <Tool label={t("bold")} active={text.style.bold} onClick={() => updateElement({ ...text, style: { ...text.style, bold: !text.style.bold } })}>
              <b>B</b>
            </Tool>
            <Tool label={t("italic")} active={text.style.italic} onClick={() => updateElement({ ...text, style: { ...text.style, italic: !text.style.italic } })}>
              <i>I</i>
            </Tool>
            {(
              [
                ["left", AlignLeft, "alignLeft"],
                ["center", AlignCenter, "alignCenter"],
                ["right", AlignRight, "alignRight"],
              ] as const
            ).map(([align, Icon, label]) => (
              <Tool key={align} label={t(label)} active={text.style.align === align} onClick={() => updateElement({ ...text, style: { ...text.style, align } })}>
                <Icon />
              </Tool>
            ))}
            <Tool label={t(text.style.font === "sans" ? "serif" : "sans")} onClick={() => updateElement({ ...text, style: { ...text.style, font: text.style.font === "sans" ? "serif" : "sans" } })}>
              {text.style.font === "sans" ? "Aa" : <span className="font-serif">Aa</span>}
            </Tool>
            <label className="relative grid size-7 cursor-pointer place-items-center rounded hover:bg-accent" title={t("color")}>
              <span className="size-4 rounded-full border" style={{ background: text.style.color }} />
              <input type="color" aria-label={t("color")} className="absolute inset-0 opacity-0" value={text.style.color} onChange={(e) => updateElement({ ...text, style: { ...text.style, color: e.target.value } })} />
            </label>
          </span>
        )}
        {shape && (
          <span className="flex items-center gap-1 rounded-md bg-muted/70 px-2 text-xs">
            {t("fill")}
            <input type="color" aria-label={t("fill")} className="size-6 cursor-pointer rounded border-0 bg-transparent" value={shape.fill} onChange={(e) => updateElement({ ...shape, fill: e.target.value })} />
            <label className="ml-1 flex items-center gap-1">
              <input type="checkbox" className="accent-primary" checked={Boolean(shape.stroke)} onChange={(e) => updateElement({ ...shape, stroke: e.target.checked ? "#1d3b25" : null })} />
              {t("outline")}
            </label>
          </span>
        )}

        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          <Select aria-label={t("theme")} className="h-8 w-36 text-xs" value={deck.theme} onChange={(e) => update({ ...deck, theme: e.target.value as ThemeKey })}>
            {Object.values(THEMES).map((th) => (
              <option key={th.key} value={th.key}>
                {th.name[locale]}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-1 text-xs" title={t("background")}>
            <input
              type="color"
              aria-label={t("background")}
              className="size-7 cursor-pointer rounded border-0 bg-transparent"
              value={slide.background ?? theme.background}
              onChange={(e) => updateSlide((s) => ({ ...s, background: e.target.value }))}
            />
            {slide.background && (
              <button type="button" className="rounded px-1.5 py-1 hover:bg-accent" onClick={() => updateSlide((s) => ({ ...s, background: null }))}>
                {t("themeBackground")}
              </button>
            )}
          </label>
          <Button size="sm" onClick={() => setPresenting(true)}>
            <Play /> {t("present")}
          </Button>
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="no-print order-2 space-y-2 lg:order-1" aria-label={t("slides")}>
          <ol className="flex gap-2 overflow-x-auto pb-1 lg:max-h-[70vh] lg:flex-col lg:overflow-y-auto">
            {deck.slides.map((s, i) => (
              <li key={s.id} className="w-36 shrink-0 lg:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    setSelectedId(null);
                  }}
                  aria-current={i === index}
                  aria-label={t("slideN", { n: i + 1 })}
                  className={cn("flex w-full items-start gap-1.5 rounded-lg p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50", i === index ? "bg-primary/15" : "hover:bg-muted/60")}
                >
                  <span className="w-4 pt-0.5 text-right text-[10px] text-muted-foreground">{i + 1}</span>
                  <span className="pointer-events-none flex-1 overflow-hidden rounded border shadow-xs">
                    <SlideView slide={s} theme={theme} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-1">
            <Select aria-label={t("addSlide")} className="h-8 flex-1 text-xs" value="" onChange={(e) => e.target.value && addSlide(e.target.value as "title" | "content" | "blank")}>
              <option value="">+ {t("addSlide")}</option>
              <option value="content">{t("layoutContent")}</option>
              <option value="title">{t("layoutTitle")}</option>
              <option value="blank">{t("layoutBlank")}</option>
            </Select>
          </div>
          <div className="flex gap-0.5">
            <Tool label={t("duplicate")} onClick={() => {
              const copy: Slide = { ...structuredClone(slide), id: newId("s"), elements: slide.elements.map((e) => ({ ...e, id: newId() })) };
              const slides = [...deck.slides];
              slides.splice(index + 1, 0, copy);
              update({ ...deck, slides });
              setIndex(index + 1);
            }}>
              <Copy />
            </Tool>
            <Tool label={t("moveUp")} disabled={index === 0} onClick={() => moveSlide(-1)}>
              <ArrowUp />
            </Tool>
            <Tool label={t("moveDown")} disabled={index === deck.slides.length - 1} onClick={() => moveSlide(1)}>
              <ArrowDown />
            </Tool>
            <Tool
              label={t("deleteSlide")}
              disabled={deck.slides.length === 1}
              onClick={() => {
                update({ ...deck, slides: deck.slides.filter((_, i) => i !== index) });
                setIndex(Math.max(0, index - 1));
              }}
            >
              <Trash2 />
            </Tool>
            <Tool label={t("addSlide")} onClick={() => addSlide("content")}>
              <Plus />
            </Tool>
          </div>
        </aside>

        <div className="order-1 min-w-0 space-y-3 lg:order-2">
          <div className="rounded-2xl bg-muted/40 p-3 sm:p-6">
            <SlideView
              slide={slide}
              theme={theme}
              interactive
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={updateElement}
              label={t("canvas")}
              className="rounded-lg shadow-[0_10px_40px_-12px_rgb(0_0_0/0.4)]"
            />
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("notes")}</span>
            <Textarea rows={3} placeholder={t("notesPlaceholder")} value={slide.notes} onChange={(e) => updateSlide((s) => ({ ...s, notes: e.target.value }))} />
          </label>
        </div>
      </div>
    </div>
  );
}
