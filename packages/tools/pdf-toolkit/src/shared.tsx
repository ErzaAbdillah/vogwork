"use client";

import { common, formatBytes, useLocale, useT } from "@vogwork/i18n";
import { Button, cn } from "@vogwork/ui";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface Item {
  id: string;
  file: File;
}

let counter = 0;
export function toItems(files: File[]): Item[] {
  return files.map((file) => ({ id: `${Date.now()}-${counter++}`, file }));
}

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

/** Jumlah halaman dan gambar mini halaman pertama, dihitung di latar belakang. */
export function usePdfInfo(file: File | null) {
  const [info, setInfo] = useState<{ pages: number | null; thumb: string | null; error: boolean }>({ pages: null, thumb: null, error: false });
  useEffect(() => {
    if (!file) return;
    let url: string | null = null;
    let alive = true;
    (async () => {
      const { openPdf, renderPdfPages } = await import("@vogwork/formats/pdfjs");
      const doc = await openPdf(file);
      const pages = doc.numPages;
      void doc.loadingTask.destroy();
      if (!alive) return;
      setInfo((s) => ({ ...s, pages }));
      const [first] = await renderPdfPages(file, { targetWidth: 120, pages: [0], quality: 0.7 });
      if (!alive || !first) return;
      url = URL.createObjectURL(first.blob);
      setInfo({ pages, thumb: url, error: false });
    })().catch(() => alive && setInfo({ pages: null, thumb: null, error: true }));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);
  return info;
}

export function FileMeta({ file, pages }: { file: File; pages?: number | null }) {
  const { locale } = useLocale();
  const c = useT(common);
  return (
    <p className="text-xs text-muted-foreground">
      {formatBytes(file.size, locale)}
      {pages ? ` · ${c("pages", { count: pages })}` : ""}
    </p>
  );
}

/** Daftar yang bisa diurutkan dengan seret-lepas atau tombol naik/turun. */
export function SortableList<T extends { id: string }>({
  items,
  onChange,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, index: number) => ReactNode;
}) {
  const c = useT(common);
  const dragIndex = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    onChange(next);
  };

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => (dragIndex.current = index)}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(index);
          }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex.current !== null) move(dragIndex.current, index);
            dragIndex.current = null;
            setOver(null);
          }}
          className={cn("flex items-center gap-3 rounded-lg border bg-card p-2 pr-1 transition-colors", over === index && "border-primary bg-primary/5")}
        >
          <GripVertical aria-hidden className="size-4 shrink-0 cursor-grab text-muted-foreground" />
          <div className="min-w-0 flex-1">{render(item, index)}</div>
          <div className="flex shrink-0 items-center">
            <Button variant="ghost" size="icon-sm" aria-label={c("moveUp")} disabled={index === 0} onClick={() => move(index, index - 1)}>
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={c("moveDown")} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>
              <ArrowDown />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={c("remove")} onClick={() => onChange(items.filter((i) => i.id !== item.id))}>
              <X />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
