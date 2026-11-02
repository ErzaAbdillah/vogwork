"use client";

import { useT } from "@vogwork/i18n";
import { Button, Segmented } from "@vogwork/ui";
import { Eraser } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trimCanvas } from "./art";
import { dict } from "./dict";

const INKS = { black: "#111111", blue: "#1b3fae" } as const;

/** Kanvas untuk menggambar tanda tangan dengan mouse, jari, atau stylus. */
export function SignaturePad({ onDone }: { onDone: (art: { dataUrl: string; ratio: number }) => void }) {
  const t = useT(dict);
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number; mid: { x: number; y: number } } | null>(null);
  const [ink, setInk] = useState<keyof typeof INKS>("black");
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    c.getContext("2d")!.scale(ratio, ratio);
  }, []);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvas}
        aria-label={t("drawHere")}
        className="h-40 w-full touch-none rounded-xl border border-dashed bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = point(e);
          last.current = { ...p, mid: p };
        }}
        onPointerMove={(e) => {
          if (!last.current) return;
          const ctx = canvas.current!.getContext("2d")!;
          const p = point(e);
          const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
          // Kurva kuadrat antar titik tengah supaya goresan halus.
          ctx.strokeStyle = INKS[ink];
          ctx.lineWidth = e.pressure && e.pointerType === "pen" ? 1.2 + e.pressure * 2.6 : 2.4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(last.current.mid.x, last.current.mid.y);
          ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
          ctx.stroke();
          last.current = { ...p, mid };
          setEmpty(false);
        }}
        onPointerUp={() => (last.current = null)}
        onPointerCancel={() => (last.current = null)}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label={t("ink")}
          value={ink}
          onChange={setInk}
          options={[
            { value: "black", label: t("black") },
            { value: "blue", label: t("blue") },
          ]}
        />
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const c = canvas.current!;
              c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
              setEmpty(true);
            }}
          >
            <Eraser /> {t("clearPad")}
          </Button>
          <Button
            size="sm"
            disabled={empty}
            onClick={() => {
              const art = trimCanvas(canvas.current!);
              if (art) onDone(art);
            }}
          >
            {t("useSignature")}
          </Button>
        </div>
      </div>
    </div>
  );
}
