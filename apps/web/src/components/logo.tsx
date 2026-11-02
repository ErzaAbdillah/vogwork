import { cn } from "@vogwork/ui";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="8" fill="url(#vog-g)" />
      <path d="M8.5 9.5 16 23l7.5-13.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="9.6" r="2" fill="#fff" opacity=".85" />
      <defs>
        <linearGradient id="vog-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14917f" />
          <stop offset="1" stopColor="#1f6fa3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)}>
      <LogoMark />
      <span className="text-lg">
        Vog<span className="text-primary">Work</span>
      </span>
    </span>
  );
}
