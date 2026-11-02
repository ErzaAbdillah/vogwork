import { cn } from "@vogwork/ui";
import { T } from "./t";

/**
 * Siluet duduk yang abstrak dengan gradasi hijau-kuning dan tepi buram,
 * visual utama tema "mindful".
 */
export function MindfulFigure({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-[4/5] w-full", className)} aria-hidden>
      <svg viewBox="0 0 400 500" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="mf-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2e8f3e" />
            <stop offset="0.45" stopColor="#4cbf3c" />
            <stop offset="0.72" stopColor="#a9d83a" />
            <stop offset="1" stopColor="#f2c94c" />
          </linearGradient>
          <filter id="mf-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <g filter="url(#mf-blur)" fill="url(#mf-g)">
          <ellipse cx="200" cy="88" rx="40" ry="48" />
          <path d="M118 170c10-28 46-40 82-40s72 12 82 40l14 96c4 30-12 50-40 50H144c-28 0-44-20-40-50z" />
          <path d="M112 262c-10 22 2 46 30 52l52 8c18 2 30 18 30 36v86c0 14 10 24 24 24s24-10 24-24v-96c0-36-24-62-60-68l-58-10c-24-4-38-20-42-8z" opacity="0.92" />
          <path d="M288 262c10 22-2 46-30 52l-26 6c-8 2-14 8-14 16v120c0 14-10 24-24 24s-24-10-24-24V346c0-30 20-54 50-60l34-8c22-4 30-28 34-16z" opacity="0.85" />
        </g>
      </svg>
      <span className="absolute top-[33%] left-1/2 -translate-x-1/2 text-sm font-light tracking-wide text-white/90">
        <T k="figureLabel" />
      </span>
    </div>
  );
}
