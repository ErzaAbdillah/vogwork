import { cn } from "@vogwork/ui";

/** Orb gradasi hijau-kuning yang lembut dengan huruf v putih. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 overflow-visible", className)}>
      <defs>
        <radialGradient id="vog-orb" cx="38%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f5d34a" />
          <stop offset=".55" stopColor="#7cc93f" />
          <stop offset="1" stopColor="#2f9a45" />
        </radialGradient>
        <filter id="vog-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#vog-orb)" filter="url(#vog-soft)" />
      <path d="M10.5 12 16 21.5 21.5 12" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-lg font-medium tracking-tight lowercase">vogwork</span>
    </span>
  );
}
