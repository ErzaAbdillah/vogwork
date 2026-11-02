"use client";

import { replaceExtension } from "@vogwork/formats/image";
import { common, useT } from "@vogwork/i18n";
import { bytesToBlob, safeFilename, saveBlob } from "@vogwork/storage";
import { Alert, Button, cn, ColorInput, Dropzone, Field, Segmented, TaskStatus, useAsyncTask, useClientValue } from "@vogwork/ui";
import { BG_MODELS, hasWebGpu, type BgModel } from "@vogwork/workers/bg-remove";
import { Download, Eraser, Eye, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const dict = {
  id: {
    drop: "Tarik foto ke sini atau klik untuk memilih",
    dropHint: "JPG, PNG, atau WEBP. Bisa beberapa foto sekaligus.",
    model: "Model AI",
    fast: "Cepat (~{size} MB)",
    fastHint: "Terbaik untuk foto orang dan pas foto.",
    accurate: "Akurat (~{size} MB)",
    accurateHint: "Untuk produk dan benda. Butuh WebGPU.",
    noWebGpu: "Browser ini belum mendukung WebGPU, jadi model Akurat tidak tersedia. Coba Chrome atau Edge terbaru.",
    run: "Hapus background {count} foto",
    downloading: "Mengunduh model AI (sekali saja)…",
    processing: "Memproses foto {n} dari {total}…",
    background: "Latar baru",
    transparent: "Transparan",
    white: "Putih",
    red: "Merah",
    blue: "Biru",
    custom: "Warna lain",
    holdToCompare: "Tahan untuk melihat foto asli",
    download: "Unduh PNG",
    downloadAll: "Unduh semua (ZIP)",
    pending: "Menunggu",
  },
  en: {
    drop: "Drop photos here or click to choose",
    dropHint: "JPG, PNG, or WEBP. Several photos at once are fine.",
    model: "AI model",
    fast: "Fast (~{size} MB)",
    fastHint: "Best for people and ID photos.",
    accurate: "Accurate (~{size} MB)",
    accurateHint: "For products and objects. Needs WebGPU.",
    noWebGpu: "This browser does not support WebGPU yet, so the Accurate model is unavailable. Try the latest Chrome or Edge.",
    run: "Remove background from {count} photos",
    downloading: "Downloading the AI model (one time)…",
    processing: "Processing photo {n} of {total}…",
    background: "New background",
    transparent: "Transparent",
    white: "White",
    red: "Red",
    blue: "Blue",
    custom: "Other color",
    holdToCompare: "Hold to see the original",
    download: "Download PNG",
    downloadAll: "Download all (ZIP)",
    pending: "Waiting",
  },
};

type Bg = "transparent" | "white" | "red" | "blue" | "custom";
// Warna latar pas foto yang lazim dipakai.
const BG_COLORS: Record<Exclude<Bg, "transparent" | "custom">, string> = { white: "#ffffff", red: "#d9232d", blue: "#1d5fbf" };

interface Item {
  id: string;
  file: File;
  original: string;
  cutout: Blob | null;
  cutoutUrl: string | null;
}

async function compose(cutout: Blob, color: string | null): Promise<Blob> {
  if (!color) return cutout;
  const bitmap = await createImageBitmap(cutout);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG gagal"))), "image/png"));
}

let seq = 0;

export default function BgRemoveTool() {
  const t = useT(dict);
  const c = useT(common);
  const [items, setItems] = useState<Item[]>([]);
  const [model, setModel] = useState<BgModel>("fast");
  const [bg, setBg] = useState<Bg>("transparent");
  const [custom, setCustom] = useState("#f5f5f4");
  const webgpu = useClientValue(hasWebGpu, false);
  const [comparing, setComparing] = useState<string | null>(null);
  const task = useAsyncTask();
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(
    () => () =>
      itemsRef.current.forEach((i) => {
        URL.revokeObjectURL(i.original);
        if (i.cutoutUrl) URL.revokeObjectURL(i.cutoutUrl);
      }),
    [],
  );

  const color = bg === "transparent" ? null : bg === "custom" ? custom : BG_COLORS[bg];
  const previewStyle = useMemo(() => (color ? { backgroundColor: color } : undefined), [color]);

  const run = () =>
    task.run(async ({ signal, progress }) => {
      const { removeBackground } = await import("@vogwork/workers/bg-remove");
      const todo = itemsRef.current.filter((i) => !i.cutout);
      for (const [n, item] of todo.entries()) {
        const cutout = await removeBackground(item.file, {
          model,
          signal,
          onProgress: (p) => (p.stage === "download" ? progress(p.progress, t("downloading")) : progress((n + 0.5) / todo.length, t("processing", { n: n + 1, total: todo.length }))),
        });
        const url = URL.createObjectURL(cutout);
        setItems((list) => list.map((i) => (i.id === item.id ? { ...i, cutout, cutoutUrl: url } : i)));
        progress((n + 1) / todo.length, t("processing", { n: n + 1, total: todo.length }));
      }
    });

  const outName = (item: Item) => safeFilename(replaceExtension(item.file.name, "png").replace(/\.png$/, "-tanpa-bg.png"));

  const downloadAll = async () => {
    const { runTask } = await import("@vogwork/workers");
    const done = items.filter((i) => i.cutout);
    const entries = await Promise.all(done.map(async (i) => ({ name: outName(i), bytes: new Uint8Array(await (await compose(i.cutout!, color)).arrayBuffer()) })));
    const zip = await runTask("zip", { entries, level: 0 });
    await saveBlob(bytesToBlob(zip, "application/zip"), "tanpa-background.zip");
  };

  const pendingCount = items.filter((i) => !i.cutout).length;
  const doneCount = items.length - pendingCount;

  return (
    <div className="space-y-5">
      <Dropzone
        multiple
        accept="image/*"
        title={t("drop")}
        hint={t("dropHint")}
        onFiles={(files) => setItems((list) => [...list, ...files.map((file) => ({ id: `b${seq++}`, file, original: URL.createObjectURL(file), cutout: null, cutoutUrl: null }))])}
      />

      <div className="flex flex-wrap items-start gap-6">
        <Field label={t("model")} hint={model === "fast" ? t("fastHint") : t("accurateHint")}>
          {() => (
            <Segmented
              label={t("model")}
              value={model}
              onChange={(m) => (m === "accurate" && !webgpu ? undefined : setModel(m))}
              options={[
                { value: "fast", label: t("fast", { size: BG_MODELS.fast.sizeMb }) },
                { value: "accurate", label: t("accurate", { size: BG_MODELS.accurate.sizeMb }) },
              ]}
            />
          )}
        </Field>
        <Field label={t("background")}>
          {() => (
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label={t("background")}
                value={bg}
                onChange={setBg}
                options={[
                  { value: "transparent", label: t("transparent") },
                  { value: "white", label: t("white") },
                  { value: "red", label: t("red") },
                  { value: "blue", label: t("blue") },
                  { value: "custom", label: t("custom") },
                ]}
              />
              {bg === "custom" && <ColorInput label={t("custom")} value={custom} onChange={setCustom} />}
            </div>
          )}
        </Field>
      </div>
      {!webgpu && <Alert>{t("noWebGpu")}</Alert>}

      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={pendingCount === 0 || task.running} onClick={run}>
          <Eraser /> {t("run", { count: pendingCount })}
        </Button>
        {doneCount > 1 && (
          <Button size="lg" variant="outline" onClick={downloadAll}>
            <Download /> {t("downloadAll")}
          </Button>
        )}
      </div>
      <TaskStatus state={task.state} onCancel={task.cancel} />

      {items.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-xl border bg-card">
              <div className={cn("relative aspect-square", !color && "checkerboard")} style={previewStyle}>
                <img
                  src={item.cutoutUrl && comparing !== item.id ? item.cutoutUrl : item.original}
                  alt={item.file.name}
                  className={cn("absolute inset-0 h-full w-full object-contain", !item.cutout && "opacity-60")}
                />
                {!item.cutout && <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{t("pending")}</span>}
              </div>
              <div className="flex items-center gap-1 p-2">
                <p className="min-w-0 flex-1 truncate text-xs" title={item.file.name}>
                  {item.file.name}
                </p>
                {item.cutout && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("holdToCompare")}
                      title={t("holdToCompare")}
                      onPointerDown={() => setComparing(item.id)}
                      onPointerUp={() => setComparing(null)}
                      onPointerLeave={() => setComparing(null)}
                    >
                      <Eye />
                    </Button>
                    <Button size="icon-sm" aria-label={t("download")} title={t("download")} onClick={async () => saveBlob(await compose(item.cutout!, color), outName(item))}>
                      <Download />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={c("remove")}
                  onClick={() => {
                    URL.revokeObjectURL(item.original);
                    if (item.cutoutUrl) URL.revokeObjectURL(item.cutoutUrl);
                    setItems((list) => list.filter((i) => i.id !== item.id));
                  }}
                >
                  <X />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
