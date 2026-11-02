"use client";

import type { ComponentProps, InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cn } from "../lib/cn";

const control =
  "w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-9 py-1 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-20 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-9 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8 select-chevron", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm leading-none font-medium select-none", className)} {...props} />;
}

/**
 * Label + kontrol + petunjuk/galat. `children` menerima id supaya label
 * terhubung dengan kontrol untuk pembaca layar.
 */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm select-none", className)}>
      <input type="checkbox" className="size-4 cursor-pointer rounded border-input accent-primary" {...props} />
      {label}
    </label>
  );
}

export function ColorInput({ value, onChange, label, className }: { value: string; onChange: (v: string) => void; label: string; className?: string }) {
  return (
    <label className={cn("inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-2 text-sm shadow-xs", className)}>
      <input type="color" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="size-6 cursor-pointer rounded border-0 bg-transparent p-0" />
      <span className="font-mono text-xs uppercase">{value}</span>
    </label>
  );
}
