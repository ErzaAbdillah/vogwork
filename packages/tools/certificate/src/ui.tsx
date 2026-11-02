"use client";

import type { TableData } from "@vogwork/core";
import { common, useT } from "@vogwork/i18n";
import { bytesToBlob, safeFilename, saveBlob, usePersistentState } from "@vogwork/storage";
import { Alert, Badge, Button, ColorInput, Dropzone, Field, Input, PreviewPanel, Section, Segmented, Select, SplitLayout, TaskStatus, Textarea, useAsyncTask, useObjectUrl } from "@vogwork/ui";
import { runTask } from "@vogwork/workers";
import { AlignCenter, AlignLeft, AlignRight, Award, ChevronLeft, ChevronRight, FileSpreadsheet, ImagePlus, Plus, Sparkles, Trash2, Type } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CertificateCanvas } from "./canvas";
import { dict } from "./dict";
import { newField, pageSizeFor, placeholders, resolveTemplate, STANDARD_FONTS, type CertField, type CustomFont } from "./model";
import { drawSampleTemplate, sampleFields, sampleTable } from "./sample";

interface Template {
  kind: "image" | "pdf";
  name: string;
  /** File yang disematkan ke PDF (JPG/PNG/PDF). */
  blob: Blob;
  /** Gambar untuk pratinjau di layar. */
  preview: Blob;
  pageSize: [number, number];
}

interface DataState extends TableData {
  sheets: string[];
  sheet: string;
  source: File | null;
}

async function prepareTemplate(file: Blob, name: string): Promise<Template> {
  if (file.type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    const { renderPdfPages } = await import("@vogwork/formats/pdfjs");
    const [page] = await renderPdfPages(file, { pages: [0], targetWidth: 1600, type: "image/jpeg", quality: 0.85 });
    if (!page) throw new Error("PDF kosong");
    return { kind: "pdf", name, blob: file, preview: page.blob, pageSize: [page.width, page.height] };
  }
  const { convertImage, decodeImage } = await import("@vogwork/formats/image");
  let blob = file;
  // pdf-lib hanya bisa menyematkan JPG dan PNG.
  if (file.type !== "image/jpeg" && file.type !== "image/png") blob = (await convertImage(file, { type: "image/png" })).blob;
  const bitmap = await decodeImage(blob);
  const pageSize = pageSizeFor(bitmap.width, bitmap.height);
  bitmap.close();
  return { kind: "image", name, blob, preview: blob, pageSize };
}

export default function CertificateTool() {
  const t = useT(dict);
  const c = useT(common);
  const [template, setTemplate] = usePersistentState<Template | null>("tool.certificate.template", null);
  const [fields, setFields] = usePersistentState<CertField[]>("tool.certificate.fields", sampleFields);
  const [fonts, setFonts] = usePersistentState<CustomFont[]>("tool.certificate.fonts", []);
  const [mode, setMode] = usePersistentState<"single" | "separate">("tool.certificate.mode", "separate");
  const [namePattern, setNamePattern] = usePersistentState("tool.certificate.filename", "Sertifikat - {Nama}");
  const [data, setData] = useState<DataState | null>(null);
  const [paste, setPaste] = useState("");
  const [rowIndex, setRowIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const task = useAsyncTask();
  const previewUrl = useObjectUrl(template?.preview);

  // Font kustom didaftarkan ke dokumen supaya pratinjau memakai huruf yang sama dengan PDF.
  useEffect(() => {
    const faces = fonts.map((f) => new FontFace(`vogfont-${f.id}`, f.bytes as Uint8Array<ArrayBuffer>));
    faces.forEach((face) => face.load().then(() => document.fonts.add(face)).catch(() => {}));
    return () => faces.forEach((face) => document.fonts.delete(face));
  }, [fonts]);

  const selected = fields.find((f) => f.id === selectedId) ?? null;
  const rows = data?.rows ?? [];
  const row = rows[Math.min(rowIndex, rows.length - 1)] ?? Object.fromEntries((data?.columns ?? []).map((col) => [col, `{${col}}`]));
  const missing = useMemo(() => {
    if (!data) return [];
    const cols = new Set(data.columns.map((col) => col.toLowerCase().trim()));
    return [...new Set(fields.flatMap((f) => placeholders(f.text)).filter((p) => !cols.has(p.toLowerCase().trim())))];
  }, [data, fields]);

  const updateField = (id: string, patch: Partial<CertField>) => setFields((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const loadTemplate = async (file: Blob, name: string) => {
    setTemplateError(null);
    try {
      setTemplate(await prepareTemplate(file, name));
    } catch {
      setTemplateError(t("templateError"));
    }
  };

  const loadData = async (file: File, sheet?: string) => {
    setDataError(null);
    try {
      const { readTable } = await import("@vogwork/formats/table");
      const result = await readTable(file, { sheet });
      setData({ ...result, source: file });
      setRowIndex(0);
    } catch (error) {
      setDataError(t("dataError", { message: (error as Error).message }));
    }
  };

  const generate = () =>
    task.run(async ({ signal, progress }) => {
      if (!template || !data) return;
      const usedFonts = new Set(fields.map((f) => f.font));
      const records = data.rows.map((r, i) => ({
        name: safeFilename(resolveTemplate(namePattern, r), `sertifikat-${i + 1}`),
        values: fields.map((f) => resolveTemplate(f.text, r)),
      }));
      progress(0, t("generating"));
      const result = await runTask(
        "pdf.stamp",
        {
          template: { kind: template.kind, bytes: new Uint8Array(await template.blob.arrayBuffer()), mime: template.blob.type },
          pageSize: template.pageSize,
          fields: fields.map(({ x, y, align, size, font, color, maxWidth }) => ({ x, y, align, size, font, color, maxWidth })),
          records,
          fonts: fonts.filter((f) => usedFonts.has(`custom:${f.id}`)).map(({ id, bytes }) => ({ id, bytes })),
          mode,
          title: "Sertifikat",
        },
        { signal, onProgress: (p) => progress(p, t("generating")) },
      );
      const base = safeFilename(namePattern.replace(/\{[^}]*\}/g, "").replace(/[-\s]+$/, ""), "sertifikat");
      if (result.kind === "pdf") await saveBlob(bytesToBlob(result.bytes, "application/pdf"), `${base}.pdf`);
      else await saveBlob(bytesToBlob(result.bytes, "application/zip"), `${base}.zip`);
    }, t("done", { count: data?.rows.length ?? 0 }));

  const insertColumn = (column: string) => {
    if (selected) updateField(selected.id, { text: `${selected.text}{${column}}` });
    else {
      const field = newField({ text: `{${column}}`, y: 0.5 + fields.length * 0.06 });
      setFields((list) => [...list, field]);
      setSelectedId(field.id);
    }
  };

  const fontOptions = [...STANDARD_FONTS.map((f) => ({ value: f.key as string, label: f.label })), ...fonts.map((f) => ({ value: `custom:${f.id}`, label: f.name }))];

  const form = (
    <>
      <Section title={t("step1")} description={t("step1Body")}>
        {template ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <span className="min-w-0 truncate font-medium">{template.name}</span>
            <Button variant="outline" size="sm" onClick={() => setTemplate(null)}>
              {t("changeTemplate")}
            </Button>
          </div>
        ) : (
          <>
            <Dropzone accept="image/*,.pdf,application/pdf" icon={<ImagePlus />} title={t("dropTemplate")} onFiles={([f]) => loadTemplate(f!, f!.name)} />
            <Button variant="outline" onClick={async () => loadTemplate(await drawSampleTemplate(), "template-contoh.png")}>
              <Sparkles /> {t("useSample")}
            </Button>
          </>
        )}
        {templateError && <Alert variant="error">{templateError}</Alert>}
      </Section>

      <Section title={t("step2")} description={t("step2Body")}>
        {data ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge>{t("rows", { count: data.rows.length })}</Badge>
              {data.source && <span className="truncate text-muted-foreground">{data.source.name}</span>}
              {data.sheets.length > 1 && (
                <Select aria-label={t("sheet")} className="h-8 w-auto" value={data.sheet} onChange={(e) => data.source && loadData(data.source, e.target.value)}>
                  {data.sheets.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              )}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setData(null)}>
                {c("remove")}
              </Button>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">
                {t("columns")} · {t("clickToInsert")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.columns.map((col) => (
                  <button key={col} type="button" onClick={() => insertColumn(col)} className="rounded-md border bg-card px-2 py-1 font-mono text-xs hover:border-primary hover:text-primary">
                    {`{${col}}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-48 overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {data.columns.map((col) => (
                      <th key={col} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.slice(0, 50).map((r, i) => (
                    <tr key={i} onClick={() => setRowIndex(i)} className={i === rowIndex ? "cursor-pointer bg-primary/8" : "cursor-pointer border-t hover:bg-muted/50"}>
                      {data.columns.map((col) => (
                        <td key={col} className="px-2 py-1 whitespace-nowrap">
                          {r[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <Dropzone compact accept=".csv,.tsv,.txt,.xlsx,.xls,.ods" icon={<FileSpreadsheet />} title={t("dropData")} onFiles={([f]) => loadData(f!)} />
            <Field label={t("pasteData")}>
              {(p) => <Textarea {...p} rows={3} className="font-mono text-xs" placeholder={t("pastePlaceholder")} value={paste} onChange={(e) => setPaste(e.target.value)} />}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!paste.trim()}
                onClick={async () => {
                  const { parsePastedTable } = await import("@vogwork/formats/table");
                  setData({ ...parsePastedTable(paste), sheets: [], sheet: "", source: null });
                  setRowIndex(0);
                }}
              >
                {t("applyPaste")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setData({ ...sampleTable, sheets: [], sheet: "", source: null });
                  setRowIndex(0);
                }}
              >
                {t("useSampleData")}
              </Button>
            </div>
          </>
        )}
        {dataError && <Alert variant="error">{dataError}</Alert>}
      </Section>

      <Section
        title={t("step3")}
        description={t("step3Body")}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const field = newField({ text: data?.columns[0] ? `{${data.columns[0]}}` : "Teks", y: Math.min(0.9, 0.5 + fields.length * 0.06) });
              setFields((list) => [...list, field]);
              setSelectedId(field.id);
            }}
          >
            <Plus /> {t("addText")}
          </Button>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {fields.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedId(f.id)}
              className={
                f.id === selectedId
                  ? "inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                  : "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
              }
            >
              <Type className="size-3" /> {f.text || "—"}
            </button>
          ))}
        </div>
        {missing.length > 0 && <Alert>{missing.map((name) => t("unknownColumn", { name: `{${name}}` })).join(" ")}</Alert>}
        {selected && (
          <div className="grid gap-4 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
            <Field label={t("text")} hint={t("textHint")} className="sm:col-span-2">
              {(p) => <Input {...p} value={selected.text} onChange={(e) => updateField(selected.id, { text: e.target.value })} />}
            </Field>
            <Field label={t("font")}>
              {(p) => (
                <Select {...p} value={selected.font} onChange={(e) => updateField(selected.id, { font: e.target.value as CertField["font"] })}>
                  {fontOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("color")}>{() => <ColorInput label={t("color")} value={selected.color} onChange={(color) => updateField(selected.id, { color })} />}</Field>
            <Field label={`${t("size")}: ${Math.round(selected.size * (template?.pageSize[0] ?? 842))} pt`}>
              {(p) => <input {...p} type="range" min={0.008} max={0.12} step={0.001} value={selected.size} onChange={(e) => updateField(selected.id, { size: Number(e.target.value) })} className="accent-primary" />}
            </Field>
            <Field label={`${t("maxWidth")}: ${Math.round(selected.maxWidth * 100)}%`} hint={t("maxWidthHint")}>
              {(p) => <input {...p} type="range" min={0.1} max={1} step={0.01} value={selected.maxWidth} onChange={(e) => updateField(selected.id, { maxWidth: Number(e.target.value) })} className="accent-primary" />}
            </Field>
            <Field label={t("align")}>
              {() => (
                <Segmented
                  label={t("align")}
                  value={selected.align}
                  onChange={(align) => updateField(selected.id, { align })}
                  options={[
                    { value: "left", label: <AlignLeft />, title: t("left") },
                    { value: "center", label: <AlignCenter />, title: t("center") },
                    { value: "right", label: <AlignRight />, title: t("right") },
                  ]}
                />
              )}
            </Field>
            <div className="flex items-end justify-between gap-2">
              <label className="cursor-pointer text-xs font-medium text-primary hover:underline">
                {t("uploadFont")}
                <input
                  type="file"
                  accept=".ttf,.otf,font/ttf,font/otf"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const font: CustomFont = { id: Date.now().toString(36), name: file.name.replace(/\.[^.]+$/, ""), bytes: new Uint8Array(await file.arrayBuffer()) };
                    setFonts((list) => [...list, font]);
                    updateField(selected.id, { font: `custom:${font.id}` });
                  }}
                />
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  setFields((list) => list.filter((f) => f.id !== selected.id));
                  setSelectedId(null);
                }}
              >
                <Trash2 /> {t("deleteText")}
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section title={t("step4")}>
        <Field label={t("output")}>
          {() => (
            <Segmented
              label={t("output")}
              value={mode}
              onChange={setMode}
              options={[
                { value: "separate", label: t("zip") },
                { value: "single", label: t("single") },
              ]}
            />
          )}
        </Field>
        {mode === "separate" && (
          <Field label={t("fileName")} hint={t("fileNameHint")}>
            {(p) => <Input {...p} value={namePattern} onChange={(e) => setNamePattern(e.target.value)} />}
          </Field>
        )}
        {!data && <p className="text-sm text-muted-foreground">{t("needData")}</p>}
        <Button size="lg" disabled={!template || !data || data.rows.length === 0 || fields.length === 0 || task.running} onClick={generate}>
          <Award /> {t("generate", { count: data?.rows.length ?? 0 })}
        </Button>
        <TaskStatus state={task.state} onCancel={task.cancel} />
      </Section>
    </>
  );

  const preview = (
    <PreviewPanel
      title={t("preview")}
      actions={
        rows.length > 1 ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Button variant="ghost" size="icon-sm" aria-label={t("prev")} disabled={rowIndex === 0} onClick={() => setRowIndex((i) => i - 1)}>
              <ChevronLeft />
            </Button>
            {t("row", { n: rowIndex + 1, total: rows.length })}
            <Button variant="ghost" size="icon-sm" aria-label={t("next")} disabled={rowIndex >= rows.length - 1} onClick={() => setRowIndex((i) => i + 1)}>
              <ChevronRight />
            </Button>
          </div>
        ) : null
      }
    >
      {template && previewUrl ? (
        <CertificateCanvas
          imageUrl={previewUrl}
          aspect={template.pageSize[0] / template.pageSize[1]}
          fields={fields}
          row={row}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={(id, x, y) => updateField(id, { x, y })}
          label={t("preview")}
        />
      ) : (
        <p className="py-24 text-center text-sm text-muted-foreground">{t("previewEmpty")}</p>
      )}
    </PreviewPanel>
  );

  return <SplitLayout form={form} preview={preview} />;
}
