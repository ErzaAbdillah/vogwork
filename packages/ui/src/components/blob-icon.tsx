"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../lib/cn";

/** Bentuk organik 64×64. `arc` digambar sebagai garis tebal, sisanya sebagai isian. */
export const BLOB_SHAPES = {
  circle: "M32 7c14 0 25 10 25 24S47 57 31 57 7 46 7 32 18 7 32 7z",
  drop: "M13 13c15-7 35 0 39 16s-8 27-22 27S9 45 9 30c0-7 1-13 4-17z",
  bean: "M19 9c10-4 23 4 23 14 0 6 8 8 13 16s-4 17-15 15-12-10-21-12S7 36 7 26s4-14 12-17z",
  teardrop: "M17 7c7 0 6 10 12 18s17 12 17 21-8 12-16 12-17-6-15-15S9 26 11 18s1-11 6-11z",
  comet: "M51 7c7 4 2 15-6 25S28 55 21 57s-4-9 2-19S40 3 51 7z",
  star: "M32 5l5 16 15-7-9 14 16 4-16 4 9 14-15-7-5 16-5-16-15 7 9-14-16-4 16-4-9-14 15 7z",
  wave: "M7 44c6-14 18-19 27-23s21-10 24 2-6 27-20 29-27 2-31-8z",
  leaf: "M56 7C41 9 18 20 11 41c-3 10 2 16 11 16 15 0 29-17 34-50z",
  arc: "M11 47a21 21 0 0 1 42 0",
} as const;

export type BlobShape = keyof typeof BLOB_SHAPES;

/**
 * Ikon bergaya "mindful": bentuk gradasi yang di-blur dengan simbol putih
 * yang tetap tajam di atasnya, supaya mudah dikenali di ukuran kecil.
 */
export function BlobIcon({
  shape,
  from,
  to,
  children,
  className,
  blur = 3.2,
}: {
  shape: BlobShape;
  from: string;
  to: string;
  children?: ReactNode;
  className?: string;
  blur?: number;
}) {
  const id = useId().replace(/:/g, "");
  const path = BLOB_SHAPES[shape];
  return (
    <span className={cn("relative grid size-12 shrink-0 place-items-center", className)}>
      <svg viewBox="0 0 64 64" aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
          <filter id={`b${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={blur} />
          </filter>
        </defs>
        {shape === "arc" ? (
          <path d={path} fill="none" stroke={`url(#g${id})`} strokeWidth="13" strokeLinecap="round" filter={`url(#b${id})`} />
        ) : (
          <path d={path} fill={`url(#g${id})`} filter={`url(#b${id})`} />
        )}
      </svg>
      {children && <span className="relative text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)] [&_svg]:size-[42%] [&_svg]:min-h-4 [&_svg]:min-w-4">{children}</span>}
    </span>
  );
}
