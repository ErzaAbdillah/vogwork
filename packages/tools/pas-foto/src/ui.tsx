"use client";

import { useT } from "@vogwork/i18n";
import { bytesToBlob, safeFilename, saveBlob, usePersistentState } from "@vogwork/storage";
import { Alert, Button, Checkbox, ColorInput, Dropzone, Field, Input, Section, Segmented, TaskStatus, useAsyncTask } from "@vogwork/ui";
import { runTask } from "@vogwork/workers";
import { Contact, Download, FileDown, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { dict } from "./dict";
import { BACKGROUNDS, clampCrop, mmToPx, PAPERS, PHOTO_SIZES, sheetLayout, type Adjust, type Crop, type Paper, type PhotoSize } from "./layout";
import { canvasBlob, loadPhoto, renderPhoto, renderSheet } from "./render";

type Bg = "original" | keyof typeof BACKGROUNDS | "custom";
const NO_CROP: Crop = { zoom: 1, x: 0, y: 0 };
const NO_ADJUST: Adjust = { brightness: 1, contrast: 1 };

export default function PasFotoTool() {
  const t = useT(dict);
  const [file, setFile] = useState<File | null>(null);
  const [original, setOriginal] = useState<HTMLCanvasElement | null>(null);
  const [cutout, setCutout] = useState<HTMLCanvasElement | null>(null);
  const [bg, setBg] = usePersistentState<Bg>("tool.pasFoto.bg", "original");
  const [custom, setCustom] = useState("#8fb3d9");
  const [size, setSize] = usePersistentState<PhotoSize>("tool.pasFoto.size", "3x4");
  const [paper, setPaper] = usePersistentState<Paper>("tool.pasFoto.paper", "A4");
  const [count, setCount] = useState<number | "">("");
  const [cutLines, setCutLines] = useState(true);
  const [crop, setCrop] = useState<Crop>(NO_CROP);
  const [adjust, setAdjust] = useState<Adjust>(NO_ADJUST);
  const [guide, setGuide] = useState(true);
  const removal = useAsyncTask();
  const { run: runRemoval } = removal;
  const removingFor = useRef<File | null>(null);
  const exporting = useAsyncTask();
  const preview = useRef<HTMLCanvasElement>(null);
  const sheetPreview = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null);

  const background = bg === "original" ? null : bg === "custom" ? custom : BACKGROUNDS[bg];
  const source = bg === "original" ? original : cutout;
  const { w, h } = PHOTO_SIZES[size];
  const layout = useMemo(() => sheetLayout(paper, size), [paper, size]);

  useEffect(() => {
    if (!file) return;
    let alive = true;
    loadPhoto(file).then((canvas) => alive && setOriginal(canvas));
    return () => {
      alive = false;
    };
  }, [file]);

  // Latar dihapus sekali per foto, lalu dipakai ulang untuk semua warna.
  useEffect(() => {
    if (!file || bg === "original" || cutout || removingFor.current === file) return;
    removingFor.current = file;
    void runRemoval(async ({ signal, progress }) => {
      const { removeBackground } = await import("@vogwork/workers/bg-remove");
      const blob = await removeBackground(file, { model: "fast", signal, onProgress: (p) => progress(p.stage === "download" ? p.progress : null, p.stage === "download" ? t("downloadingModel") : t("removing")) });
      setCutout(await loadPhoto(blob));
    }).finally(() => {
      removingFor.current = null;
    });
  }, [file, bg, cutout, runRemoval, t]);

  // Pratinjau memakai fungsi render yang sama dengan file hasil.
  useEffect(() => {
    const canvas = preview.current;
    if (!canvas || !source) return;
    const out = renderPhoto(source, { size, crop, adjust, background, width: 360 });
    canvas.width = out.width;
    canvas.height = out.height;
    canvas.getContext("2d")!.drawImage(out, 0, 0);
  }, [source, size, crop, adjust, background]);

  useEffect(() => {
    const canvas = sheetPreview.current;
    if (!canvas || !source) return;
    const photo = renderPhoto(source, { size, crop, adjust, background, width: 120 });
    const sheet = renderSheet(photo, { paper, size, count: count || undefined, cutLines });
    const scale = 260 / sheet.width;
    canvas.width = 260;
    canvas.height = Math.round(sheet.height * scale);
    canvas.getContext("2d")!.drawImage(sheet, 0, 0, canvas.width, canvas.height);
  }, [source, size, crop, adjust, background, paper, count, cutLines]);

  const finalPhoto = () => renderPhoto(source!, { size, crop, adjust, background });
  const name = file ? safeFilename(file.name.replace(/\.[^.]+$/, ""), "pas-foto") : "pas-foto";

  const downloadSheet = (kind: "pdf" | "jpg") =>
    exporting.run(async () => {
      const sheet = renderSheet(finalPhoto(), { paper, size, count: count || undefined, cutLines });
      const jpg = await canvasBlob(sheet, "image/jpeg", 0.95);
      if (kind === "jpg") return saveBlob(jpg, `${name}-${size}-lembar-${paper}.jpg`);
      const pt = (mm: number) => (mm / 25.4) * 72;
      const pdf = await runTask("pdf.fromImages", {
        images: [{ bytes: new Uint8Array(await jpg.arrayBuffer()), type: "image/jpeg", width: sheet.width, height: sheet.height, pageWidth: pt(PAPERS[paper].w), pageHeight: pt(PAPERS[paper].h) }],
        title: "Pas foto",
      });
      await saveBlob(bytesToBlob(pdf, "application/pdf"), `${name}-${size}-lembar-${paper}.pdf`);
    });

  const updateCrop = (next: Crop) => source && setCrop(clampCrop(source.width, source.height, w * 10, h * 10, next));

  if (!file) {
    return (
      <div className="max-w-3xl">
        <Dropzone accept="image/*" icon={<Contact />} title={t("drop")} hint={t("dropHint")} onFiles={([f]) => setFile(f!)} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div className="space-y-5">
        <Section
          title={t("background")}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null);
                setOriginal(null);
                setCutout(null);
                setCrop(NO_CROP);
                setAdjust(NO_ADJUST);
              }}
            >
              {t("changePhoto")}
            </Button>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label={t("background")}
              value={bg}
              onChange={setBg}
              options={[
                { value: "original", label: t("original") },
                { value: "red", label: t("red") },
                { value: "blue", label: t("blue") },
                { value: "white", label: t("white") },
                { value: "custom", label: t("custom") },
              ]}
            />
            {bg === "custom" && <ColorInput label={t("custom")} value={custom} onChange={setCustom} />}
          </div>
          <TaskStatus state={removal.state} onCancel={removal.cancel} />
        </Section>

        <Section title={t("size")}>
          <Segmented
            label={t("size")}
            value={size}
            onChange={(next) => {
              setSize(next);
              setCrop(NO_CROP);
            }}
            options={(Object.keys(PHOTO_SIZES) as PhotoSize[]).map((s) => ({ value: s, label: s.replace("x", " × ") }))}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={`${t("zoom")} ${crop.zoom.toFixed(2)}×`}>
              {(p) => <input {...p} type="range" min={1} max={3} step={0.01} value={crop.zoom} onChange={(e) => updateCrop({ ...crop, zoom: Number(e.target.value) })} className="accent-primary" />}
            </Field>
            <Field label={`${t("brightness")} ${Math.round(adjust.brightness * 100)}%`}>
              {(p) => <input {...p} type="range" min={0.7} max={1.4} step={0.01} value={adjust.brightness} onChange={(e) => setAdjust((a) => ({ ...a, brightness: Number(e.target.value) }))} className="accent-primary" />}
            </Field>
            <Field label={`${t("contrast")} ${Math.round(adjust.contrast * 100)}%`}>
              {(p) => <input {...p} type="range" min={0.7} max={1.4} step={0.01} value={adjust.contrast} onChange={(e) => setAdjust((a) => ({ ...a, contrast: Number(e.target.value) }))} className="accent-primary" />}
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox label={t("guide")} checked={guide} onChange={(e) => setGuide(e.target.checked)} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCrop(NO_CROP);
                setAdjust(NO_ADJUST);
              }}
            >
              <RotateCcw /> {t("reset")}
            </Button>
          </div>
          {guide && <p className="text-xs text-muted-foreground">{t("guideHint")}</p>}
        </Section>

        <Section title={t("sheet")}>
          <div className="flex flex-wrap items-end gap-4">
            <Field label={t("paper")}>
              {() => (
                <Segmented
                  label={t("paper")}
                  value={paper}
                  onChange={setPaper}
                  options={[
                    { value: "A4", label: "A4" },
                    { value: "4R", label: "4R (10×15 cm)" },
                  ]}
                />
              )}
            </Field>
            <Field label={`${t("count")} (${t("max", { n: layout.slots.length })})`}>
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min={1}
                  max={layout.slots.length}
                  placeholder={String(layout.slots.length)}
                  className="w-28"
                  value={count}
                  onChange={(e) => setCount(e.target.value ? Math.min(layout.slots.length, Math.max(1, Number(e.target.value))) : "")}
                />
              )}
            </Field>
            <Checkbox label={t("cutLines")} checked={cutLines} onChange={(e) => setCutLines(e.target.checked)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!source || exporting.running} onClick={() => downloadSheet("pdf")}>
              <FileDown /> {t("downloadSheetPdf")}
            </Button>
            <Button variant="outline" disabled={!source || exporting.running} onClick={() => downloadSheet("jpg")}>
              <Download /> {t("downloadSheetJpg")}
            </Button>
          </div>
          <Alert>{t("printTip")}</Alert>
          <TaskStatus state={exporting.state} />
        </Section>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl bg-muted/40 p-4 backdrop-blur-xl">
          <div
            role="application"
            aria-label={t("frame")}
            className="relative mx-auto w-full max-w-[280px] cursor-grab touch-none overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black/10 active:cursor-grabbing"
            style={{ aspectRatio: `${w} / ${h}` }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, crop };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              const rect = e.currentTarget.getBoundingClientRect();
              updateCrop({ ...d.crop, x: d.crop.x + (e.clientX - d.x) / rect.width, y: d.crop.y + (e.clientY - d.y) / rect.height });
            }}
            onPointerUp={() => (drag.current = null)}
            onWheel={(e) => updateCrop({ ...crop, zoom: Math.min(3, Math.max(1, crop.zoom - e.deltaY * 0.0015)) })}
          >
            <canvas ref={preview} className="h-full w-full" />
            {guide && (
              <svg viewBox="0 0 100 133" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                <ellipse cx="50" cy="48" rx="25" ry="33" fill="none" stroke="#fff" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.9" />
                <line x1="12" x2="88" y1="104" y2="104" stroke="#fff" strokeWidth="0.6" strokeDasharray="3 2" opacity="0.7" />
              </svg>
            )}
          </div>
          <Button className="mt-4 w-full" disabled={!source} onClick={async () => saveBlob(await canvasBlob(finalPhoto(), "image/jpeg"), `${name}-${size}.jpg`)}>
            <Download /> {t("downloadPhoto", { px: `${mmToPx(w)}×${mmToPx(h)}` })}
          </Button>
        </div>
        <div className="space-y-2 rounded-2xl bg-muted/40 p-4">
          <p className="text-sm font-medium">{t("sheetPreview")}</p>
          <canvas ref={sheetPreview} aria-label={t("sheetPreview")} role="img" className="mx-auto block h-auto max-w-full rounded bg-white shadow" />
        </div>
      </div>
    </div>
  );
}
