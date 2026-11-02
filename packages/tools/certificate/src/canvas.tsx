"use client";

import { cn } from "@vogwork/ui";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cssFont, resolveTemplate, type CertField } from "./model";

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

/**
 * Pratinjau template dengan teks yang bisa diseret. Posisi disimpan relatif (0–1)
 * terhadap halaman, sehingga sama persis dengan hasil PDF di ukuran apa pun.
 */
export function CertificateCanvas({
  imageUrl,
  aspect,
  fields,
  row,
  selectedId,
  onSelect,
  onMove,
  label,
}: {
  imageUrl: string;
  aspect: number;
  fields: CertField[];
  row: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  label: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [snapX, setSnapX] = useState(false);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = width / aspect;

  const toRelative = (e: PointerEvent) => {
    const rect = container.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  const onPointerDown = (e: PointerEvent, field: CertField) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = toRelative(e);
    drag.current = { id: field.id, dx: field.x - p.x, dy: field.y - p.y };
    onSelect(field.id);
    container.current?.focus({ preventScroll: true });
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current) return;
    const p = toRelative(e);
    let x = Math.min(1, Math.max(0, p.x + drag.current.dx));
    const y = Math.min(1, Math.max(0, p.y + drag.current.dy));
    // Tertarik ke garis tengah supaya mudah meratakan nama di tengah.
    const snapped = Math.abs(x - 0.5) < 0.012;
    if (snapped) x = 0.5;
    setSnapX(snapped);
    onMove(drag.current.id, x, y);
  };

  const endDrag = () => {
    drag.current = null;
    setSnapX(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const field = fields.find((f) => f.id === selectedId);
    if (!field) return;
    const step = e.shiftKey ? 0.02 : 0.004;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!delta) return;
    e.preventDefault();
    onMove(field.id, Math.min(1, Math.max(0, field.x + delta[0]!)), Math.min(1, Math.max(0, field.y + delta[1]!)));
  };

  return (
    <div
      ref={container}
      tabIndex={0}
      role="application"
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerDown={() => onSelect(null)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative w-full touch-none overflow-hidden rounded-md bg-white shadow-md ring-1 ring-black/5 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      style={{ aspectRatio: String(aspect) }}
    >
      <img src={imageUrl} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
      {snapX && <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-primary/70" />}
      {width > 0 &&
        fields.map((field) => {
          const text = resolveTemplate(field.text, row);
          const font = cssFont(field.font);
          let px = field.size * width;
          const fontString = (size: number) => `${font.style} ${font.weight} ${size}px ${font.family}`;
          const textWidth = measure(text, fontString(px));
          if (field.maxWidth && textWidth > field.maxWidth * width) px *= (field.maxWidth * width) / textWidth;
          const translateX = field.align === "center" ? "-50%" : field.align === "right" ? "-100%" : "0";
          const selected = field.id === selectedId;
          return (
            <div
              key={field.id}
              onPointerDown={(e) => onPointerDown(e, field)}
              className={cn(
                "absolute cursor-move rounded-sm whitespace-pre outline-offset-4",
                selected ? "outline-2 outline-primary outline-dashed" : "hover:outline-1 hover:outline-primary/50 hover:outline-dashed",
              )}
              style={{
                left: field.x * width,
                top: field.y * height,
                transform: `translate(${translateX}, -50%)`,
                fontFamily: font.family,
                fontWeight: font.weight,
                fontStyle: font.style,
                fontSize: px,
                lineHeight: 1,
                color: field.color,
              }}
            >
              {text || " "}
            </div>
          );
        })}
    </div>
  );
}
