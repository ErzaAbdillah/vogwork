"use client";

import { common, formatBytes, useLocale, useT } from "@vogwork/i18n";
import { safeFilename, saveBlob } from "@vogwork/storage";
import { Alert, Badge, Button, cn, Dropzone, TaskStatus, useAsyncTask } from "@vogwork/ui";
import { runTask } from "@vogwork/workers";
import { Download, Minimize2, X } from "lucide-react";
import { useState } from "react";
import { dict } from "./dict";
import { baseName, FileMeta, pdfBlob } from "./shared";

type Level = "light" | "medium" | "strong";
const RASTER: Record<Exclude<Level, "light">, { dpi: number; quality: number }> = {
  medium: { dpi: 150, quality: 0.72 },
  strong: { dpi: 96, quality: 0.6 },
};

export function CompressPanel() {
  const t = useT(dict);
  const c = useT(common);
  const { locale } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>("light");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const task = useAsyncTask();

  const compress = () =>
    task.run(async ({ signal, progress }) => {
      setResult(null);
      const bytes = new Uint8Array(await file!.arrayBuffer());
      if (level === "light") {
        return runTask("pdf.optimize", { bytes }, { signal, onProgress: (p) => progress(p) });
      }
      const { renderPdfPages } = await import("@vogwork/formats/pdfjs");
      const pages = await renderPdfPages(bytes, {
        dpi: RASTER[level].dpi,
        quality: RASTER[level].quality,
        type: "image/jpeg",
        signal,
        onProgress: (done, total) => progress((done / total) * 0.85, t("rendering", { done, total })),
      });
      progress(0.9, t("building"));
      const images = await Promise.all(
        pages.map(async (page) => ({
          bytes: new Uint8Array(await page.blob.arrayBuffer()),
          type: "image/jpeg",
          width: 0,
          height: 0,
          pageWidth: page.width,
          pageHeight: page.height,
        })),
      );
      const out = await runTask("pdf.fromImages", { images }, { signal });
      return out.byteLength < bytes.byteLength ? out : bytes;
    }).then((out) => out && setResult(out));

  if (!file) {
    return (
      <Dropzone
        accept=".pdf,application/pdf"
        title={t("dropPdf")}
        onFiles={([f]) => {
          setFile(f!);
          setResult(null);
        }}
      />
    );
  }

  const levels: { value: Level; title: string; hint: string }[] = [
    { value: "light", title: t("levelLight"), hint: t("levelLightHint") },
    { value: "medium", title: t("levelMedium"), hint: t("levelMediumHint") },
    { value: "strong", title: t("levelStrong"), hint: t("levelStrongHint") },
  ];
  const saved = result ? 1 - result.byteLength / file.size : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <FileMeta file={file} />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("clear")}
          onClick={() => {
            setFile(null);
            setResult(null);
          }}
        >
          <X />
        </Button>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">{t("level")}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {levels.map((l) => (
            <label
              key={l.value}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
                level === l.value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
              )}
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="level"
                  value={l.value}
                  checked={level === l.value}
                  onChange={() => {
                    setLevel(l.value);
                    setResult(null);
                  }}
                  className="accent-primary"
                />
                {l.title}
              </span>
              <span className="text-xs text-muted-foreground">{l.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {level !== "light" && <Alert>{t("rasterWarning")}</Alert>}

      <Button size="lg" disabled={task.running} onClick={compress}>
        <Minimize2 /> {t("compressButton")}
      </Button>
      <TaskStatus state={task.state} onCancel={task.cancel} />

      {result && task.state.status === "done" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/8 p-4">
          {saved > 0.005 ? (
            <p className="text-sm">
              {t("compressResult", {
                before: formatBytes(file.size, locale),
                after: formatBytes(result.byteLength, locale),
                percent: `-${Math.round(saved * 100)}%`,
              })}{" "}
              <Badge variant="success">-{Math.round(saved * 100)}%</Badge>
            </p>
          ) : (
            <p className="text-sm">{t("alreadySmall")}</p>
          )}
          {saved > 0.005 && (
            <Button onClick={() => saveBlob(pdfBlob(result), `${safeFilename(baseName(file.name), "dokumen")}-kompres.pdf`)}>
              <Download /> {c("downloadPdf")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
