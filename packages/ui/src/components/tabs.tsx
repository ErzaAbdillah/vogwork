"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

/** Tab terkontrol dengan navigasi panah kiri/kanan sesuai pola ARIA. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  label,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  label: string;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + items.length) % items.length;
    refs.current[next]?.focus();
    onChange(items[next]!.value);
  };

  return (
    <div role="tablist" aria-label={label} className={cn("inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg bg-muted p-1", className)}>
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            id={`${id}-${item.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4",
              selected ? "bg-background text-foreground shadow-xs" : "hover:text-foreground",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pilihan kecil eksklusif, mis. rata kiri/tengah/kanan. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex min-h-9 max-w-full flex-wrap items-center gap-0.5 rounded-md border border-input bg-background p-0.5 shadow-xs", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex h-7 min-w-8 shrink-0 items-center justify-center gap-1 rounded-[5px] px-2.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4",
            option.value === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
