"use client";

import { cn } from "@vogwork/ui";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type Placed = { id: string; page: number; x: number; y: number; w: number; h: number } & (
  | { kind: "image"; artId: string; dataUrl: string; ratio: number }
  | { kind: "text"; text: string; size: number; color: string; font: "helvetica" | "times" }
);

type Drag = { id: string; mode: "move" | "resize"; sx: number; sy: number; orig: Placed };

/** Satu halaman PDF dengan elemen yang bisa dipilih, diseret, dan diubah ukurannya. */
export function PageView({
  index,
  image,
  aspect,
  items,
  selectedId,
  active,
  onActivate,
  onSelect,
  onChange,
  label,
}: {
  index: number;
  image: string;
  /** Lebar ÷ tinggi halaman yang terlihat. */
  aspect: number;
  items: Placed[];
  selectedId: string | null;
  active: boolean;
  onActivate: (page: number) => void;
  onSelect: (id: string | null) => void;
  onChange: (item: Placed) => void;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<Placed | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const height = width / aspect;

  const start = (e: ReactPointerEvent, item: Placed, mode: Drag["mode"]) => {
    e.preventDefault();
    e.stopPropagation();
    onActivate(index);
    onSelect(item.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: item.id, mode, sx: e.clientX, sy: e.clientY, orig: item };
  };

  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || !width) return;
    const dx = (e.clientX - d.sx) / width;
    const dy = (e.clientY - d.sy) / height;
    const o = d.orig;
    if (d.mode === "move") {
      setPreview({ ...o, x: Math.min(1 - o.w * 0.2, Math.max(-o.w * 0.8, o.x + dx)), y: Math.min(1 - o.h * 0.2, Math.max(-o.h * 0.8, o.y + dy)) });
    } else if (o.kind === "image") {
      // Gambar diperbesar dengan rasio tetap supaya tanda tangan tidak gepeng.
      const w = Math.max(0.03, o.w + dx);
      setPreview({ ...o, w, h: (w * width) / o.ratio / height });
    } else {
      const scale = Math.max(0.3, (o.w + dx) / o.w);
      setPreview({ ...o, size: Math.max(0.006, o.size * scale), w: o.w * scale, h: o.h * scale });
    }
  };

  const end = () => {
    if (drag.current && preview) onChange(preview);
    drag.current = null;
    setPreview(null);
  };

  return (
    <div
      ref={box}
      role="group"
      aria-label={label}
      onPointerDown={() => {
        onActivate(index);
        onSelect(null);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      className={cn("relative w-full touch-none bg-white shadow-md ring-2 select-none", active ? "ring-primary" : "ring-transparent")}
      style={{ aspectRatio: String(aspect) }}
    >
      <img src={image} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
      {width > 0 &&
        items.map((raw) => {
          const item = preview?.id === raw.id ? preview : raw;
          const selected = item.id === selectedId;
          return (
            <div
              key={item.id}
              data-testid="placed-item"
              onPointerDown={(e) => start(e, raw, "move")}
              className={cn("absolute cursor-move", selected ? "outline-2 outline-primary outline-dashed" : "hover:outline-1 hover:outline-primary/50 hover:outline-dashed")}
              style={{ left: item.x * width, top: item.y * height, width: item.kind === "image" ? item.w * width : undefined, height: item.kind === "image" ? item.h * height : undefined }}
            >
              {item.kind === "image" ? (
                <img src={item.dataUrl} alt="" draggable={false} className="pointer-events-none h-full w-full" />
              ) : (
                <div
                  ref={(el) => {
                    // Simpan ukuran kotak teks agar bisa dipilih dan ditarik ujungnya.
                    if (!el || preview) return;
                    const w = el.offsetWidth / width;
                    const h = el.offsetHeight / height;
                    if (Math.abs(w - raw.w) > 0.002 || Math.abs(h - raw.h) > 0.002) queueMicrotask(() => onChange({ ...raw, w, h }));
                  }}
                  className="whitespace-pre"
                  style={{ fontSize: item.size * width, lineHeight: 1.2, color: item.color, fontFamily: item.font === "times" ? '"Times New Roman", serif' : "Helvetica, Arial, sans-serif" }}
                >
                  {item.text || " "}
                </div>
              )}
              {selected && (
                <span
                  aria-hidden
                  onPointerDown={(e) => start(e, raw, "resize")}
                  className="absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize rounded-sm border-2 border-white bg-primary shadow"
                />
              )}
            </div>
          );
        })}
    </div>
  );
}
