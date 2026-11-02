"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { Alert, Spinner } from "./feedback";

/**
 * Pratinjau PDF memakai PDF.js, sehingga yang terlihat di layar sama persis
 * dengan file yang diunduh, di semua browser (termasuk Safari iOS).
 */
export function PdfPreview({
  data,
  maxPages = 5,
  className,
  emptyLabel,
  errorLabel = "Pratinjau gagal dibuat",
}: {
  data: Uint8Array | null;
  maxPages?: number;
  className?: string;
  emptyLabel?: string;
  errorLabel?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    if (!data || !container.current) return;
    let cancelled = false;
    const host = container.current;
    setState("loading");

    (async () => {
      const { openPdf } = await import("@vogwork/formats/pdfjs");
      const doc = await openPdf(data);
      if (cancelled) return void doc.loadingTask.destroy();
      setPageCount(doc.numPages);
      const width = Math.max(320, host.clientWidth);
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const canvases: HTMLCanvasElement[] = [];
      for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
        const page = await doc.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (width / base.width) * ratio });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.className = "block h-auto w-full rounded-sm bg-white shadow-md ring-1 ring-black/5";
        await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        if (cancelled) break;
        canvases.push(canvas);
      }
      void doc.loadingTask.destroy();
      if (cancelled) return;
      host.replaceChildren(...canvases);
      setState("ready");
    })().catch(() => !cancelled && setState("error"));

    return () => {
      cancelled = true;
    };
  }, [data, maxPages]);

  return (
    <div className={cn("relative", className)}>
      {!data && emptyLabel && <p className="py-16 text-center text-sm text-muted-foreground">{emptyLabel}</p>}
      {state === "error" && <Alert variant="error">{errorLabel}</Alert>}
      <div ref={container} className={cn("flex flex-col gap-4 transition-opacity", state === "loading" && "opacity-60")} />
      {state === "loading" && (
        <div className="absolute inset-x-0 top-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs shadow">
            <Spinner /> …
          </span>
        </div>
      )}
      {state === "ready" && pageCount > maxPages && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          +{pageCount - maxPages} …
        </p>
      )}
    </div>
  );
}
