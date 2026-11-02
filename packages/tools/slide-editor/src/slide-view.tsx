"use client";

import { SLIDE_H, SLIDE_W, type Slide, type SlideElement, type SlideTheme } from "@vogwork/formats/slides";
import { cn } from "@vogwork/ui";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { themeCss } from "./theme";

const FONT_CSS = { sans: "Arial, Helvetica, sans-serif", serif: '"Times New Roman", Times, serif' };

type Drag = { id: string; mode: "move" | "resize"; startX: number; startY: number; orig: { x: number; y: number; w: number; h: number } };

/**
 * Menggambar satu slide. Dalam mode interaktif elemen bisa dipilih, diseret,
 * diubah ukurannya, dan teks bisa disunting dengan klik dua kali.
 */
export function SlideView({
  slide,
  theme,
  interactive = false,
  selectedId = null,
  onSelect,
  onChange,
  label,
  className,
}: {
  slide: Slide;
  theme: SlideTheme;
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (element: SlideElement) => void;
  label?: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<{ id: string; x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pxPerIn = width / SLIDE_W;

  const start = (e: ReactPointerEvent, el: SlideElement, mode: Drag["mode"]) => {
    if (!interactive || editingId === el.id) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(el.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: el.id, mode, startX: e.clientX, startY: e.clientY, orig: { x: el.x, y: el.y, w: el.w, h: el.h } };
  };

  const moveDrag = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || !pxPerIn) return;
    const dx = (e.clientX - d.startX) / pxPerIn;
    const dy = (e.clientY - d.startY) / pxPerIn;
    const next =
      d.mode === "move"
        ? { ...d.orig, x: Math.min(SLIDE_W - 0.2, Math.max(-d.orig.w + 0.2, d.orig.x + dx)), y: Math.min(SLIDE_H - 0.2, Math.max(-d.orig.h + 0.2, d.orig.y + dy)) }
        : { ...d.orig, w: Math.max(0.3, d.orig.w + dx), h: Math.max(0.2, d.orig.h + dy) };
    setPreview({ id: d.id, ...next });
  };

  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (d && preview && preview.id === d.id) {
      const el = slide.elements.find((x) => x.id === d.id);
      if (el) onChange?.({ ...el, x: preview.x, y: preview.y, w: preview.w, h: preview.h } as SlideElement);
    }
    setPreview(null);
  };

  return (
    <div
      ref={box}
      role={interactive ? "application" : "img"}
      aria-label={label}
      onPointerDown={() => interactive && (onSelect?.(null), setEditingId(null))}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn("relative w-full touch-none overflow-hidden select-none", className)}
      style={{ aspectRatio: `${SLIDE_W} / ${SLIDE_H}`, background: slide.background ?? themeCss(theme) }}
    >
      {width > 0 &&
        slide.elements.map((raw) => {
          const el = preview?.id === raw.id ? { ...raw, ...preview } : raw;
          const selected = interactive && selectedId === el.id;
          const style = { left: el.x * pxPerIn, top: el.y * pxPerIn, width: el.w * pxPerIn, height: el.h * pxPerIn };
          return (
            <div
              key={el.id}
              onPointerDown={(e) => start(e, el, "move")}
              onDoubleClick={() => interactive && el.type === "text" && setEditingId(el.id)}
              className={cn("absolute", interactive && "cursor-move", selected && "outline-2 outline-offset-1 outline-[#2f9a45] outline-dashed")}
              style={style}
            >
              {el.type === "text" &&
                (editingId === el.id ? (
                  <textarea
                    autoFocus
                    aria-label="Teks"
                    defaultValue={el.text}
                    onPointerDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      setEditingId(null);
                      if (e.target.value !== el.text) onChange?.({ ...el, text: e.target.value });
                    }}
                    onKeyDown={(e) => e.key === "Escape" && (e.currentTarget as HTMLTextAreaElement).blur()}
                    className="h-full w-full resize-none bg-white/70 p-[0.3em] outline-none"
                    style={{ fontSize: (el.style.size / 72) * pxPerIn, fontFamily: FONT_CSS[el.style.font], fontWeight: el.style.bold ? 700 : 400, fontStyle: el.style.italic ? "italic" : "normal", color: el.style.color, textAlign: el.style.align, lineHeight: 1.2 }}
                  />
                ) : (
                  <div
                    className="h-full w-full overflow-hidden p-[0.3em] whitespace-pre-wrap"
                    style={{ fontSize: (el.style.size / 72) * pxPerIn, fontFamily: FONT_CSS[el.style.font], fontWeight: el.style.bold ? 700 : 400, fontStyle: el.style.italic ? "italic" : "normal", color: el.style.color, textAlign: el.style.align, lineHeight: 1.2 }}
                  >
                    {el.text}
                  </div>
                ))}
              {el.type === "image" && <img src={el.src} alt="" draggable={false} className="pointer-events-none h-full w-full" />}
              {el.type === "shape" && (
                <div
                  className="h-full w-full"
                  style={{ background: el.fill, border: el.stroke ? `1px solid ${el.stroke}` : undefined, borderRadius: el.shape === "ellipse" ? "50%" : el.shape === "roundRect" ? 0.2 * pxPerIn : 0 }}
                />
              )}
              {selected && (
                <span
                  aria-hidden
                  onPointerDown={(e) => start(e, raw, "resize")}
                  className="absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize rounded-sm border-2 border-white bg-[#2f9a45] shadow"
                />
              )}
            </div>
          );
        })}
    </div>
  );
}
