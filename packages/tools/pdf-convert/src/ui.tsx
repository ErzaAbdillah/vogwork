"use client";

import { parsePageRanges } from "@vogwork/formats";
import { defaultDocSettings, type DocContent } from "@vogwork/formats/docx";
import { useT } from "@vogwork/i18n";
import { bytesToBlob, createFile, safeFilename, saveBlob } from "@vogwork/storage";
import { Alert, Button, buttonVariants, Checkbox, Dropzone, Field, Input, Segmented, Spinner, Tabs, TaskStatus, useAsyncTask } from "@vogwork/ui";
import { runTask } from "@vogwork/workers";
import { FileDown, FileText, Image as ImageIcon, PenSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import { dict } from "./dict";

const base = (name: string) => safeFilename(name.replace(/\.[^.]+$/, ""), "dokumen");

function FileBar({ file, onClear }: { file: File; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border bg-card p-3 text-sm backdrop-blur-xl">
      <span className="truncate font-medium">{file.name}</span>
      <Button variant="ghost" size="icon-sm" aria-label="×" onClick={onClear}>
        <X />
      </Button>
    </div>
  );
}

function ToImages() {
  const t = useT(dict);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [dpi, setDpi] = useState<"96" | "150" | "300">("150");
  const [range, setRange] = useState("");
  const task = useAsyncTask();

  const convert = () =>
    task.run(async ({ signal, progress }) => {
      const { getPdfPageCount, renderPdfPages } = await import("@vogwork/formats/pdfjs");
      const total = await getPdfPageCount(file!);
      const pages = range.trim() ? parsePageRanges(range, total) : undefined;
      if (pages && pages.length === 0) throw new Error(t("invalidRange"));
      const images = await renderPdfPages(file!, { dpi: Number(dpi), type, quality: 0.9, pages, signal, onProgress: (d, n) => progress((d / n) * 0.9, t("rendering")) });
      const ext = type === "image/png" ? "png" : "jpg";
      const indices = pages ?? images.map((_, i) => i);
      if (images.length === 1) return saveBlob(images[0]!.blob, `${base(file!.name)}-halaman-${indices[0]! + 1}.${ext}`);
      const entries = await Promise.all(images.map(async (img, i) => ({ name: `${base(file!.name)}-halaman-${String(indices[i]! + 1).padStart(3, "0")}.${ext}`, bytes: new Uint8Array(await img.blob.arrayBuffer()) })));
      await saveBlob(bytesToBlob(await runTask("zip", { entries, level: 0 }), "application/zip"), `${base(file!.name)}-gambar.zip`);
    }, t("imagesDone"));

  if (!file) return <Dropzone accept=".pdf,application/pdf" title={t("dropPdf")} onFiles={([f]) => setFile(f!)} />;
  return (
    <div className="space-y-5">
      <FileBar file={file} onClear={() => setFile(null)} />
      <div className="flex flex-wrap gap-5">
        <Field label={t("format")}>
          {() => (
            <Segmented
              label={t("format")}
              value={type}
              onChange={setType}
              options={[
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
              ]}
            />
          )}
        </Field>
        <Field label={t("quality")}>
          {() => (
            <Segmented
              label={t("quality")}
              value={dpi}
              onChange={setDpi}
              options={[
                { value: "96", label: t("screen") },
                { value: "150", label: t("standard") },
                { value: "300", label: t("print") },
              ]}
            />
          )}
        </Field>
      </div>
      <Field label={t("pages")}>{(p) => <Input {...p} className="max-w-xs" placeholder="1-3, 5" value={range} onChange={(e) => setRange(e.target.value)} />}</Field>
      <Button size="lg" disabled={task.running} onClick={convert}>
        <ImageIcon /> {t("toImagesButton")}
      </Button>
      <TaskStatus state={task.state} onCancel={task.cancel} />
    </div>
  );
}

function ToWord() {
  const t = useT(dict);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"text" | "layout">("text");
  const [ocr, setOcr] = useState(false);
  const [scanned, setScanned] = useState<boolean | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const task = useAsyncTask();

  // PDF hasil scan hampir tidak punya teks; OCR langsung disarankan.
  useEffect(() => {
    if (!file) return;
    let alive = true;
    import("./convert")
      .then(async ({ textDensity, SCANNED_THRESHOLD }) => {
        const density = await textDensity(file);
        if (!alive) return;
        const isScanned = density.perPage < SCANNED_THRESHOLD;
        setScanned(isScanned);
        setOcr(isScanned);
      })
      .catch(() => alive && setScanned(false));
    return () => {
      alive = false;
    };
  }, [file]);

  // Hasil lama tidak berlaku lagi bila file atau mode berganti.
  const resetCreated = () => setCreated(null);

  const build = (signal: AbortSignal, progress: (v: number | null, m?: string) => void): Promise<DocContent> =>
    import("./convert").then(({ pdfToDoc }) =>
      pdfToDoc(file!, { mode, ocr: mode === "text" && ocr, signal, onProgress: progress, labels: { reading: t("reading"), ocr: t("ocrStage"), rendering: t("rendering") } }),
    );

  const download = () =>
    task.run(async ({ signal, progress }) => {
      const content = await build(signal, progress);
      const { docToDocx } = await import("@vogwork/formats/docx");
      const bytes = await docToDocx(content);
      await saveBlob(bytesToBlob(bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), `${base(file!.name)}.docx`);
    }, t("wordDone"));

  const openInEditor = () =>
    task.run(async ({ signal, progress }) => {
      const content = await build(signal, progress);
      const saved = await createFile("document", base(file!.name), content);
      setCreated(saved.id);
    });

  if (!file)
    return (
      <Dropzone
        accept=".pdf,application/pdf"
        title={t("dropPdf")}
        onFiles={([f]) => {
          setScanned(null);
          setCreated(null);
          setFile(f!);
        }}
      />
    );
  return (
    <div className="space-y-5">
      <FileBar file={file} onClear={() => setFile(null)} />
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">{t("mode")}</legend>
        {(
          [
            ["text", t("modeText"), t("modeTextHint")],
            ["layout", t("modeLayout"), t("modeLayoutHint")],
          ] as const
        ).map(([value, title, hint]) => (
          <label key={value} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm ${mode === value ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"}`}>
            <span className="flex items-center gap-2 font-medium">
              <input
                type="radio"
                name="mode"
                className="accent-primary"
                checked={mode === value}
                onChange={() => {
                  setMode(value);
                  resetCreated();
                }}
              />
              {title}
            </span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </label>
        ))}
      </fieldset>
      {mode === "text" && (
        <div className="space-y-2">
          {scanned === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> {t("checking")}
            </p>
          ) : (
            scanned && <Alert>{t("scanned")}</Alert>
          )}
          <Checkbox label={t("useOcr")} checked={ocr} onChange={(e) => setOcr(e.target.checked)} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={task.running} onClick={download}>
          <FileText /> {t("toWordButton")}
        </Button>
        {created ? (
          <a href={`/alat/dokumen?buka=${encodeURIComponent(created)}`} className={buttonVariants({ size: "lg", variant: "outline" })}>
            <PenSquare /> {t("openEditor")} →
          </a>
        ) : (
          <Button size="lg" variant="outline" disabled={task.running} onClick={openInEditor}>
            <PenSquare /> {t("openEditor")}
          </Button>
        )}
      </div>
      <TaskStatus state={task.state} onCancel={task.cancel} />
    </div>
  );
}

function FromWord() {
  const t = useT(dict);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<string[]>([]);
  const task = useAsyncTask();

  const convert = () =>
    task.run(async ({ progress }) => {
      progress(null, t("reading"));
      const [{ docxToHtml }, { htmlToDoc }, { docToPdf }] = await Promise.all([
        import("@vogwork/formats/docx"),
        import("@vogwork/formats/html-doc"),
        import("@vogwork/formats/doc-pdf"),
      ]);
      const imported = await docxToHtml(await file!.arrayBuffer());
      setReport(imported.report);
      const content: DocContent = { settings: { ...defaultDocSettings(), ...imported.settings }, doc: htmlToDoc(imported.html) };
      const bytes = await docToPdf(content, { title: base(file!.name) });
      await saveBlob(bytesToBlob(bytes, "application/pdf"), `${base(file!.name)}.pdf`);
    }, t("pdfDone"));

  if (!file) return <Dropzone accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" title={t("dropDocx")} onFiles={([f]) => setFile(f!)} />;
  return (
    <div className="space-y-5">
      <FileBar
        file={file}
        onClear={() => {
          setFile(null);
          setReport([]);
        }}
      />
      <Button size="lg" disabled={task.running} onClick={convert}>
        <FileDown /> {t("fromWordButton")}
      </Button>
      <TaskStatus state={task.state} onCancel={task.cancel} />
      {report.length > 0 && task.state.status === "done" && (
        <Alert title={t("report")}>
          <ul className="list-disc space-y-0.5 pl-4">
            {report.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
}

export default function PdfConvertTool() {
  const t = useT(dict);
  const [tab, setTab] = useState<"images" | "word" | "pdf">("word");
  return (
    <div className="max-w-3xl space-y-5">
      <Tabs
        label={t("tabs")}
        value={tab}
        onChange={setTab}
        items={[
          { value: "word", label: t("toWord"), icon: <FileText /> },
          { value: "images", label: t("toImages"), icon: <ImageIcon /> },
          { value: "pdf", label: t("fromWord"), icon: <FileDown /> },
        ]}
      />
      {tab === "images" && <ToImages />}
      {tab === "word" && <ToWord />}
      {tab === "pdf" && <FromWord />}
      <p className="text-xs text-muted-foreground">{t("moreImages")}</p>
    </div>
  );
}
