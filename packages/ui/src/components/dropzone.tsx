"use client";

import { common, useT } from "@vogwork/i18n";
import { Upload } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";

function matches(file: File, accept?: string) {
  if (!accept) return true;
  return accept.split(",").some((rule) => {
    const r = rule.trim().toLowerCase();
    if (r.startsWith(".")) return file.name.toLowerCase().endsWith(r);
    if (r.endsWith("/*")) return file.type.startsWith(r.slice(0, -1));
    return file.type === r;
  });
}

/**
 * Area unggah: klik untuk memilih atau tarik-lepas file. File tidak dikirim
 * ke mana pun; komponen ini hanya menyerahkan objek File ke tool.
 */
export function Dropzone({
  onFiles,
  accept,
  multiple = false,
  title,
  hint,
  icon,
  compact = false,
  className,
  onReject,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
  onReject?: (files: File[]) => void;
}) {
  const t = useT(common);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const all = [...list];
    const accepted = all.filter((f) => matches(f, accept));
    const rejected = all.filter((f) => !matches(f, accept));
    if (rejected.length) onReject?.(rejected);
    if (accepted.length) onFiles(multiple ? accepted : accepted.slice(0, 1));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          compact ? "p-4" : "p-8 sm:p-10",
        )}
      >
        <span className={cn("grid place-items-center rounded-full bg-primary/10 text-primary", compact ? "size-9 [&_svg]:size-4" : "size-12 [&_svg]:size-5")}>
          {icon ?? <Upload aria-hidden />}
        </span>
        <span className="text-sm font-medium">{title ?? t("dropFiles")}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </button>
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
