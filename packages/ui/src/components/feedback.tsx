import { AlertCircle, CheckCircle2, Info, LoaderCircle } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export function Badge({ className, variant = "default", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "outline" | "success" }) {
  const styles = {
    default: "bg-primary/10 text-primary border-transparent",
    secondary: "bg-secondary text-secondary-foreground border-transparent",
    outline: "text-muted-foreground",
    success: "bg-success/12 text-success border-transparent",
  }[variant];
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3", styles, className)} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden className={cn("size-4 animate-spin", className)} />;
}

export function Progress({ value, className, label }: { value: number | null; className?: string; label?: string }) {
  const pct = value === null ? null : Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? undefined}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-[width] duration-300", pct === null && "w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite]")}
        style={pct === null ? undefined : { width: `${pct}%` }}
      />
    </div>
  );
}

export function Alert({
  variant = "info",
  title,
  children,
  action,
  className,
}: {
  variant?: "info" | "error" | "success";
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = variant === "error" ? AlertCircle : variant === "success" ? CheckCircle2 : Info;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg border p-3 text-sm",
        variant === "error" && "border-destructive/30 bg-destructive/8 text-destructive",
        variant === "success" && "border-success/30 bg-success/8 text-success",
        variant === "info" && "bg-muted/60 text-foreground",
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(variant === "info" && "text-muted-foreground")}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, children, className }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center", className)}>
      {icon && <div className="text-muted-foreground [&_svg]:size-8">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
