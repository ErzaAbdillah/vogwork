"use client";

import { PAGE_SIZES } from "@vogwork/formats/pdf-flow";
import { formatBytes, useLocale, useT } from "@vogwork/i18n";
import { safeFilename, saveBlob } from "@vogwork/storage";
import { Alert, Button, Checkbox, Dropzone, Field, Input, Segmented, TaskStatus, useAsyncTask, useObjectUrl } from "@vogwork/ui";
import { runTask } from "@vogwork/workers";
import { FileImage } from "lucide-react";
import { useState } from "react";
import { dict } from "./dict";
import { FileMeta, pdfBlob, SortableList, toItems, type Item } from "./shared";

type PageSize = "fit" | "A4" | "F4";

function Thumb({ file }: { file: File }) {
  const url = useObjectUrl(file);
  return <div className="size-12 shrink-0 overflow-hidden rounded border bg-muted">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</div>;
}

export function ImagesPanel() {
  const t = useT(dict);
  const { locale } = useLocale();
  const [items, setItems] = useState<Item[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [margin, setMargin] = useState<"none" | "small">("small");
  const [shrink, setShrink] = useState(true);
  const [name, setName] = useState("foto");
  const [skipped, setSkipped] = useState(0);
  const [done, setDone] = useState<{ count: number; size: number } | null>(null);
  const task = useAsyncTask();

  const build = () =>
    task.run(async ({ signal, progress }) => {
      const { convertImage, decodeImage } = await import("@vogwork/formats/image");
      const images = [];
      for (const [i, item] of items.entries()) {
        signal.throwIfAborted();
        progress((i / items.length) * 0.8, t("preparing", { done: i + 1, total: items.length }));
        const keepAsIs = !shrink && (item.file.type === "image/jpeg" || item.file.type === "image/png");
        if (keepAsIs) {
          const bitmap = await decodeImage(item.file);
          images.push({ bytes: new Uint8Array(await item.file.arrayBuffer()), type: item.file.type, width: bitmap.width, height: bitmap.height });
          bitmap.close();
        } else {
          // Format lain (WEBP, GIF, BMP) dan foto besar diubah ke JPEG supaya PDF tetap ringan.
          const out = await convertImage(item.file, { type: "image/jpeg", quality: 0.85, maxWidth: shrink ? 2000 : undefined, maxHeight: shrink ? 2000 : undefined });
          images.push({ bytes: new Uint8Array(await out.blob.arrayBuffer()), type: "image/jpeg", width: out.width, height: out.height });
        }
      }
      progress(0.85, t("building"));
      const size = pageSize === "fit" ? "fit" : ([...PAGE_SIZES[pageSize]] as [number, number]);
      const pdf = await runTask("pdf.fromImages", { images, pageSize: size, margin: margin === "small" ? 28 : 0 }, { signal });
      await saveBlob(pdfBlob(pdf), `${safeFilename(name, "foto")}.pdf`);
      return { count: images.length, size: pdf.byteLength };
    });

  return (
    <div className="space-y-5">
      <Dropzone
        multiple
        accept="image/*"
        title={t("dropImages")}
        onFiles={(files) => {
          setDone(null);
          setItems((prev) => [...prev, ...toItems(files)]);
        }}
        onReject={(files) => setSkipped(files.length)}
      />
      {skipped > 0 && <Alert>{t("onlyImages", { count: skipped })}</Alert>}

      {items.length > 0 && (
        <SortableList
          items={items}
          onChange={setItems}
          render={(item) => (
            <div className="flex items-center gap-3">
              <Thumb file={item.file} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <FileMeta file={item.file} />
              </div>
            </div>
          )}
        />
      )}

      <div className="flex flex-wrap gap-5">
        <Field label={t("pageSize")}>
          {() => (
            <Segmented
              label={t("pageSize")}
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: "A4", label: "A4" },
                { value: "F4", label: "F4" },
                { value: "fit", label: t("fitImage") },
              ]}
            />
          )}
        </Field>
        {pageSize !== "fit" && (
          <Field label={t("margin")}>
            {() => (
              <Segmented
                label={t("margin")}
                value={margin}
                onChange={setMargin}
                options={[
                  { value: "none", label: t("marginNone") },
                  { value: "small", label: t("marginSmall") },
                ]}
              />
            )}
          </Field>
        )}
      </div>
      <Checkbox label={t("shrinkPhotos")} checked={shrink} onChange={(e) => setShrink(e.target.checked)} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label={t("outputName")} className="flex-1">
          {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Button
          size="lg"
          disabled={items.length === 0 || task.running}
          onClick={async () => {
            setDone(null);
            const r = await build();
            if (r) setDone(r);
          }}
        >
          <FileImage /> {t("imagesButton", { count: items.length })}
        </Button>
      </div>
      <TaskStatus state={task.state} onCancel={task.cancel} />
      {done && task.state.status === "done" && <Alert variant="success">{t("imagesDone", { count: done.count, size: formatBytes(done.size, locale) })}</Alert>}
    </div>
  );
}
