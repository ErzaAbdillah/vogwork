"use client";

import { parsePageRanges } from "@vogwork/formats";
import { formatBytes, useLocale, useT } from "@vogwork/i18n";
import { safeFilename, saveBlob } from "@vogwork/storage";
import { Alert, Button, Dropzone, Field, Input, TaskStatus, useAsyncTask } from "@vogwork/ui";
import { runTask } from "@vogwork/workers";
import { ArrowDownAZ, Combine, FileText } from "lucide-react";
import { useState } from "react";
import { dict } from "./dict";
import { FileMeta, pdfBlob, SortableList, toItems, usePdfInfo, type Item } from "./shared";

interface MergeItem extends Item {
  ranges: string;
}

function MergeRow({ item, onRanges }: { item: MergeItem; onRanges: (value: string) => void }) {
  const t = useT(dict);
  const info = usePdfInfo(item.file);
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-14 w-11 shrink-0 place-items-center overflow-hidden rounded border bg-white">
        {info.thumb ? <img src={info.thumb} alt="" className="h-full w-full object-cover object-top" /> : <FileText aria-hidden className="size-5 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.file.name}>
          {item.file.name}
        </p>
        <FileMeta file={item.file} pages={info.pages} />
      </div>
      <Input
        aria-label={t("pagesHint")}
        placeholder={t("pagesAll")}
        value={item.ranges}
        onChange={(e) => onRanges(e.target.value)}
        className="hidden h-8 w-36 text-xs sm:block"
      />
    </div>
  );
}

export function MergePanel() {
  const t = useT(dict);
  const { locale } = useLocale();
  const [items, setItems] = useState<MergeItem[]>([]);
  const [name, setName] = useState("gabungan");
  const [skipped, setSkipped] = useState(0);
  const task = useAsyncTask();

  const add = (files: File[]) => setItems((prev) => [...prev, ...toItems(files).map((i) => ({ ...i, ranges: "" }))]);

  const merge = () =>
    task.run(async ({ signal, progress }) => {
      const files = await Promise.all(
        items.map(async (item) => {
          const bytes = new Uint8Array(await item.file.arrayBuffer());
          if (!item.ranges.trim()) return { bytes };
          const { getPdfPageCount } = await import("@vogwork/formats/pdfjs");
          const pages = parsePageRanges(item.ranges, await getPdfPageCount(bytes));
          if (pages.length === 0) throw new Error(`${t("invalidRange")} (${item.file.name})`);
          return { bytes, pages };
        }),
      );
      const out = await runTask("pdf.merge", { files }, { signal, onProgress: (p) => progress(p) });
      await saveBlob(pdfBlob(out), `${safeFilename(name, "gabungan")}.pdf`);
      const { getPdfPageCount } = await import("@vogwork/formats/pdfjs");
      return { pages: await getPdfPageCount(out), size: out.byteLength };
    });

  const [done, setDone] = useState<{ pages: number; size: number } | null>(null);

  return (
    <div className="space-y-5">
      <Dropzone
        multiple
        accept=".pdf,application/pdf"
        title={t("dropPdfs")}
        onFiles={(files) => {
          setDone(null);
          add(files);
        }}
        onReject={(files) => setSkipped(files.length)}
      />
      {skipped > 0 && <Alert>{t("onlyPdf", { count: skipped })}</Alert>}

      {items.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{t("dragHint")}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setItems((prev) => [...prev].sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, { numeric: true })))}>
                <ArrowDownAZ /> {t("sortName")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setItems([])}>
                {t("clear")}
              </Button>
            </div>
          </div>
          <SortableList
            items={items}
            onChange={setItems}
            render={(item) => <MergeRow item={item} onRanges={(ranges) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ranges } : i)))} />}
          />
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label={t("outputName")} className="flex-1">
          {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Button
          size="lg"
          disabled={items.length < 2 || task.running}
          onClick={async () => {
            setDone(null);
            const result = await merge();
            if (result) setDone(result);
          }}
        >
          <Combine /> {t("mergeButton", { count: items.length })}
        </Button>
      </div>
      {items.length === 1 && <p className="text-sm text-muted-foreground">{t("mergeEmpty")}</p>}
      <TaskStatus state={task.state} onCancel={task.cancel} />
      {done && task.state.status === "done" && <Alert variant="success">{t("mergeDone", { pages: done.pages, size: formatBytes(done.size, locale) })}</Alert>}
    </div>
  );
}
