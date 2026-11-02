import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** Tata letak tool dua kolom: formulir di kiri, pratinjau/hasil di kanan. */
export function SplitLayout({ form, preview, className }: { form: ReactNode; preview: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]", className)}>
      <div className="min-w-0 space-y-5">{form}</div>
      <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">{preview}</div>
    </div>
  );
}

export function Section({ title, description, actions, children, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-xs sm:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h3 className="font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function PreviewPanel({ title, actions, children, className }: { title: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-muted/40", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      <div className="max-h-[calc(100vh-11rem)] overflow-auto p-4">{children}</div>
    </div>
  );
}
