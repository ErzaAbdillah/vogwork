"use client";

import { chunkPages, parsePageRanges } from "@vogwork/formats";
import { useT } from "@vogwork/i18n";
import { bytesToBlob, safeFilename, saveBlob } from "@vogwork/storage";
import { Alert, Button, cn, Dropzone, Field, Input, Segmented, Spinner, TaskStatus, useAsyncTask } from "@vogwork/ui";
import { runTask } from "@vogwork/workers";
import { Check, Scissors, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { dict } from "./dict";
import { baseName, FileMeta, pdfBlob } from "./shared";

type Mode = "extract" | "every" | "ranges";

/** {0,1,2,4} → "1-3, 5" */
function toRangeText(indices: number[]): string {
  const sorted = [...indices].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]!;
    let end = start;
    while (sorted[i + 1] === end + 1) end = sorted[++i]!;
    parts.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
  }
  return parts.join(", ");
}

export function SplitPanel() {
  const t = useT(dict);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [rendering, setRendering] = useState(false);
  const [mode, setMode] = useState<Mode>("extract");
  const [rangeText, setRangeText] = useState("");
  const [groupText, setGroupText] = useState("");
  const [every, setEvery] = useState(1);
  const task = useAsyncTask();
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    if (!file) return;
    const controller = new AbortController();
    const urls: string[] = [];
    (async () => {
      const { getPdfPageCount, iteratePdfPages } = await import("@vogwork/formats/pdfjs");
      setPageCount(await getPdfPageCount(file));
      for await (const page of iteratePdfPages(file, { targetWidth: 150, quality: 0.6, signal: controller.signal, pages: undefined })) {
        const url = URL.createObjectURL(page.blob);
        urls.push(url);
        setThumbs([...urls]);
      }
    })()
      .catch(() => {})
      .finally(() => !controller.signal.aborted && setRendering(false));
    return () => {
      controller.abort();
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [file]);

  const selected = useMemo(() => {
    try {
      return new Set(parsePageRanges(rangeText, pageCount));
    } catch {
      return null;
    }
  }, [rangeText, pageCount]);

  const toggle = (index: number) => {
    const next = new Set(selected ?? []);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setRangeText(toRangeText([...next]));
  };

  const groups = (): number[][] => {
    if (mode === "extract") {
      if (!selected || selected.size === 0) throw new Error(t("noPages"));
      // Urutan ketikan pengguna dipertahankan, mis. "3, 1" menukar halaman.
      return [parsePageRanges(rangeText, pageCount)];
    }
    if (mode === "every") return chunkPages(pageCount, Math.max(1, every));
    const result = groupText
      .split(",")
      .map((part) => parsePageRanges(part, pageCount))
      .filter((g) => g.length > 0);
    if (result.length === 0) throw new Error(t("invalidRange"));
    return result;
  };

  const split = () =>
    task.run(async ({ signal, progress }) => {
      const bytes = new Uint8Array(await file!.arrayBuffer());
      const list = groups();
      const parts = await runTask("pdf.split", { bytes, groups: list }, { signal, onProgress: (p) => progress(p * 0.9) });
      const base = safeFilename(baseName(file!.name), "dokumen");
      if (parts.length === 1) {
        await saveBlob(pdfBlob(parts[0]!), `${base}-halaman-${toRangeText(list[0]!).replace(/\s/g, "")}.pdf`);
      } else {
        const zip = await runTask("zip", {
          level: 0,
          entries: parts.map((p, i) => ({ name: `${base}-${toRangeText(list[i]!).replace(/\s/g, "")}.pdf`, bytes: p })),
        });
        await saveBlob(bytesToBlob(zip, "application/zip"), `${base}-dipisah.zip`);
      }
      return parts.length;
    });

  if (!file) {
    return (
      <Dropzone
        accept=".pdf,application/pdf"
        title={t("dropPdf")}
        onFiles={([f]) => {
          setThumbs([]);
          setPageCount(0);
          setRendering(true);
          setFile(f!);
        }}
      />
    );
  }

  const selectedCount = selected?.size ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <FileMeta file={file} pages={pageCount || null} />
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={t("clear")} onClick={() => setFile(null)}>
          <X />
        </Button>
      </div>

      <Field label={t("splitMode")}>
        {() => (
          <Segmented
            label={t("splitMode")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "extract", label: t("modeExtract") },
              { value: "every", label: t("modeEvery") },
              { value: "ranges", label: t("modeRanges") },
            ]}
          />
        )}
      </Field>

      {mode === "extract" && (
        <Field label={t("rangesLabel")} hint={t("extractHint")} error={selected === null ? t("invalidRange") : undefined}>
          {(p) => <Input {...p} placeholder="1-3, 5" value={rangeText} onChange={(e) => setRangeText(e.target.value)} />}
        </Field>
      )}
      {mode === "every" && (
        <Field label={t("everyLabel")}>
          {(p) => <Input {...p} type="number" min={1} max={pageCount || 1} value={every} onChange={(e) => setEvery(Number(e.target.value))} className="w-32" />}
        </Field>
      )}
      {mode === "ranges" && (
        <Field label={t("rangesGroupsLabel")} hint={t("rangesGroupsHint")}>
          {(p) => <Input {...p} placeholder="1-3, 4-10, 11-" value={groupText} onChange={(e) => setGroupText(e.target.value)} />}
        </Field>
      )}

      {mode === "extract" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("selected", { count: selectedCount })}</span>
            <Button variant="ghost" size="sm" onClick={() => setRangeText(pageCount ? `1-${pageCount}` : "")}>
              {t("selectAll")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRangeText("")}>
              {t("selectNone")}
            </Button>
            {rendering && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Spinner /> {t("renderingPages")}
              </span>
            )}
          </div>
          <ul className="grid max-h-[28rem] grid-cols-3 gap-3 overflow-auto rounded-lg border bg-muted/40 p-3 sm:grid-cols-4 md:grid-cols-5">
            {Array.from({ length: pageCount }, (_, i) => {
              const isSelected = selected?.has(i) ?? false;
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(i)}
                    className={cn(
                      "relative block w-full overflow-hidden rounded-md border-2 bg-white outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      isSelected ? "border-primary" : "border-transparent hover:border-primary/40",
                    )}
                  >
                    {thumbs[i] ? <img src={thumbs[i]} alt="" className="block w-full" /> : <div className="aspect-[1/1.414] w-full animate-pulse bg-muted" />}
                    <span className={cn("absolute top-1 right-1 grid size-5 place-items-center rounded-full text-[10px]", isSelected ? "bg-primary text-primary-foreground" : "bg-black/50 text-white")}>
                      {isSelected ? <Check className="size-3" /> : null}
                    </span>
                    <span className="block bg-card py-0.5 text-center text-xs text-muted-foreground">{i + 1}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Button
        size="lg"
        disabled={task.running || pageCount === 0 || (mode === "extract" && selectedCount === 0)}
        onClick={async () => {
          setDone(null);
          const count = await split();
          if (count) setDone(count);
        }}
      >
        <Scissors /> {mode === "extract" ? t("extractButton", { count: selectedCount }) : t("splitButton")}
      </Button>
      <TaskStatus state={task.state} onCancel={task.cancel} />
      {done && task.state.status === "done" && <Alert variant="success">{t("splitDone", { count: done })}</Alert>}
    </div>
  );
}
