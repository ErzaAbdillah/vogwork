"use client";

import { formatTanggal } from "@vogwork/formats";
import { useT } from "@vogwork/i18n";
import { safeFilename, saveBlob, usePersistentState } from "@vogwork/storage";
import { Alert, Button, Checkbox, ColorInput, Dropzone, Field, Input, Section, Segmented, Select, Spinner, TaskStatus, Tabs, Textarea, useAsyncTask } from "@vogwork/ui";
import { runTask, type AnnotationItem, type FormField } from "@vogwork/workers";
import { CalendarDays, Check, Copy, Download, PenLine, Signature, Stamp, Trash2, Type, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { artId, cleanSignaturePhoto, drawStamp, type Art, type StampSpec } from "./art";
import { dict } from "./dict";
import { PageView, type Placed } from "./page-view";
import { SignaturePad } from "./signature-pad";

interface PageImage {
  url: string;
  aspect: number;
}

const DEFAULT_WIDTH: Record<Art["kind"], number> = { signature: 0.26, initials: 0.1, stamp: 0.2 };

function dataUrlBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

let seq = 0;
const placedId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`;

export default function PdfSignTool() {
  const t = useT(dict);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageImage[]>([]);
  const [loading, setLoading] = useState<{ done: number; total: number } | null>(null);
  const [library, setLibrary] = usePersistentState<Art[]>("tool.pdfSign.library", []);
  const [creator, setCreator] = useState<Art["kind"]>("signature");
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [recolor, setRecolor] = useState(true);
  const [stamp, setStamp] = useState<StampSpec>({ shape: "round", top: "Usaha Contoh Sejahtera", middle: "Lunas", bottom: formatTanggal(new Date()), color: "#1b3fae" });
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [flatten, setFlatten] = useState(false);
  const task = useAsyncTask();
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  useEffect(() => {
    if (!file) return;
    const controller = new AbortController();
    (async () => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const form = await runTask("pdf.readForm", { bytes }).catch(() => [] as FormField[]);
      setFields(form);
      setValues(Object.fromEntries(form.map((f) => [f.name, f.value])));
      const { iteratePdfPages } = await import("@vogwork/formats/pdfjs");
      const list: PageImage[] = [];
      for await (const page of iteratePdfPages(bytes, {
        targetWidth: 1100,
        quality: 0.82,
        signal: controller.signal,
        onProgress: (done, total) => setLoading({ done, total }),
      })) {
        const url = URL.createObjectURL(page.blob);
        urls.current.push(url);
        list.push({ url, aspect: page.width / page.height });
        setPages([...list]);
      }
      setLoading(null);
    })().catch(() => setLoading(null));
    return () => controller.abort();
  }, [file]);

  const selected = placed.find((p) => p.id === selectedId) ?? null;
  const update = (item: Placed) => setPlaced((list) => list.map((p) => (p.id === item.id ? item : p)));
  const add = (item: Placed) => {
    setPlaced((list) => [...list, item]);
    setSelectedId(item.id);
  };

  const placeArt = (art: Art) => {
    const aspect = pages[activePage]?.aspect ?? 0.707;
    const w = DEFAULT_WIDTH[art.kind];
    const h = (w / art.ratio) * aspect;
    add({ id: placedId(), page: activePage, kind: "image", artId: art.id, dataUrl: art.dataUrl, ratio: art.ratio, x: art.kind === "initials" ? 0.82 : 0.62, y: 0.78 - h / 2, w, h });
  };

  const placeText = (text: string) => add({ id: placedId(), page: activePage, kind: "text", text, size: 0.02, color: "#111111", font: "helvetica", x: 0.1, y: 0.1, w: 0.2, h: 0.03 });

  const saveArt = (kind: Art["kind"], art: { dataUrl: string; ratio: number }) => {
    const item: Art = { id: artId(), kind, ...art };
    setLibrary((list) => [item, ...list].slice(0, 12));
    if (pages.length) placeArt(item);
  };

  const download = () =>
    task.run(async ({ signal, progress }) => {
      const items: AnnotationItem[] = placed.map((p) =>
        p.kind === "image"
          ? { kind: "image", page: p.page, png: dataUrlBytes(p.dataUrl), ref: p.artId, x: p.x, y: p.y, w: p.w, h: p.h }
          : { kind: "text", page: p.page, text: p.text, size: p.size, color: p.color, font: p.font, x: p.x, y: p.y, w: p.w, h: p.h },
      );
      const changed = Object.fromEntries(Object.entries(values).filter(([name, v]) => fields.find((f) => f.name === name)?.value !== v));
      const bytes = await runTask(
        "pdf.annotate",
        { bytes: new Uint8Array(await file!.arrayBuffer()), items, form: changed, flatten },
        { signal, onProgress: (p) => progress(p) },
      );
      await saveBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), `${safeFilename(file!.name.replace(/\.pdf$/i, ""), "dokumen")}-ttd.pdf`);
    }, t("done", { count: placed.length }));

  if (!file) {
    return (
      <div className="max-w-3xl space-y-3">
        <Dropzone accept=".pdf,application/pdf" icon={<Signature />} title={t("drop")} onFiles={([f]) => setFile(f!)} />
        <Alert>{t("notCertified")}</Alert>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        <div className="flex items-center justify-between gap-2 rounded-xl border bg-card p-3 text-sm backdrop-blur-xl">
          <span className="truncate font-medium">{file.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFile(null);
              setPages([]);
              setPlaced([]);
              setFields([]);
            }}
          >
            {t("changeFile")}
          </Button>
        </div>

        <Section title={t("library")} description={t("libraryHint")}>
          <Tabs
            label={t("library")}
            value={creator}
            onChange={setCreator}
            items={[
              { value: "signature", label: t("newSignature"), icon: <PenLine /> },
              { value: "initials", label: t("newInitials"), icon: <Signature /> },
              { value: "stamp", label: t("newStamp"), icon: <Stamp /> },
            ]}
          />
          {creator !== "stamp" ? (
            <>
              <Segmented
                label={t("draw")}
                value={mode}
                onChange={setMode}
                options={[
                  { value: "draw", label: t("draw") },
                  { value: "upload", label: t("upload") },
                ]}
              />
              {mode === "draw" ? (
                <SignaturePad key={creator} onDone={(art) => saveArt(creator, art)} />
              ) : (
                <>
                  <Dropzone compact accept="image/*" icon={<Upload />} title={t("upload")} hint={t("uploadHint")} onFiles={async ([f]) => saveArt(creator, await cleanSignaturePhoto(f!, recolor ? "#111111" : null))} />
                  <Checkbox label={t("keepInk")} checked={recolor} onChange={(e) => setRecolor(e.target.checked)} />
                </>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <Field label={t("stampShape")}>
                  {() => (
                    <Segmented
                      label={t("stampShape")}
                      value={stamp.shape}
                      onChange={(shape) => setStamp((s) => ({ ...s, shape }))}
                      options={[
                        { value: "round", label: t("round") },
                        { value: "rect", label: t("rect") },
                      ]}
                    />
                  )}
                </Field>
                <Field label={t("stampColor")}>{() => <ColorInput label={t("stampColor")} value={stamp.color} onChange={(color) => setStamp((s) => ({ ...s, color }))} />}</Field>
              </div>
              {stamp.shape === "round" && <Field label={t("stampTop")}>{(p) => <Input {...p} value={stamp.top} onChange={(e) => setStamp((s) => ({ ...s, top: e.target.value }))} />}</Field>}
              <Field label={t("stampMiddle")}>{(p) => <Input {...p} value={stamp.middle} onChange={(e) => setStamp((s) => ({ ...s, middle: e.target.value }))} />}</Field>
              <Field label={t("stampBottom")}>{(p) => <Input {...p} value={stamp.bottom} onChange={(e) => setStamp((s) => ({ ...s, bottom: e.target.value }))} />}</Field>
              <Button size="sm" onClick={() => saveArt("stamp", drawStamp(stamp))}>
                <Stamp /> {t("saveStamp")}
              </Button>
            </div>
          )}

          {library.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {library.map((art) => (
                <li key={art.id} className="group relative rounded-lg border bg-white p-2">
                  <button type="button" title={t("place", { n: activePage + 1 })} aria-label={t("place", { n: activePage + 1 })} className="block w-full" onClick={() => placeArt(art)}>
                    <img src={art.dataUrl} alt="" className="mx-auto h-14 w-full object-contain" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("removeArt")}
                    onClick={() => setLibrary((list) => list.filter((a) => a.id !== art.id))}
                    className="absolute top-1 right-1 hidden rounded bg-white/90 p-0.5 text-neutral-500 shadow group-hover:block hover:text-red-600"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("insert", { n: activePage + 1 })} description={t("selectedPage", { n: activePage + 1 })}>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => placeText("Teks")}>
              <Type /> {t("addText")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => placeText(formatTanggal(new Date()))}>
              <CalendarDays /> {t("addDate")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => placeText("✓")}>
              <Check /> {t("addCheck")}
            </Button>
          </div>
          {selected && (
            <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
              <p className="text-sm font-medium">{t("item")}</p>
              {selected.kind === "text" && (
                <>
                  <Field label={t("textLabel")}>{(p) => <Textarea {...p} rows={2} value={selected.text} onChange={(e) => update({ ...selected, text: e.target.value })} />}</Field>
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label={t("textSize")}>
                      {(p) => (
                        <Select {...p} className="w-24" value={String(Math.round(selected.size * 1000))} onChange={(e) => update({ ...selected, size: Number(e.target.value) / 1000 })}>
                          {[12, 15, 18, 20, 22, 26, 32, 40, 50].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                    <Field label={t("color")}>{() => <ColorInput label={t("color")} value={selected.color} onChange={(color) => update({ ...selected, color })} />}</Field>
                    <Segmented
                      label="Font"
                      value={selected.font}
                      onChange={(font) => update({ ...selected, font })}
                      options={[
                        { value: "helvetica", label: "Sans" },
                        { value: "times", label: "Serif" },
                      ]}
                    />
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setPlaced((list) => [
                      ...list,
                      ...pages.map((_, page) => ({ ...selected, id: placedId(), page })).filter((p) => p.page !== selected.page),
                    ])
                  }
                >
                  <Copy /> {t("copyAll")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    setPlaced((list) => list.filter((p) => p.id !== selected.id));
                    setSelectedId(null);
                  }}
                >
                  <Trash2 /> {t("deleteItem")}
                </Button>
              </div>
            </div>
          )}
        </Section>

        {fields.length > 0 && (
          <Section title={t("form")} description={t("formHint", { count: fields.length })}>
            {fields.map((f) =>
              f.type === "checkbox" ? (
                <Checkbox key={f.name} label={f.name} checked={values[f.name] === "1"} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked ? "1" : "" }))} />
              ) : (
                <Field key={f.name} label={f.name}>
                  {(p) =>
                    f.options.length > 0 ? (
                      <Select {...p} value={values[f.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}>
                        <option value="">—</option>
                        {f.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </Select>
                    ) : (
                      <Input {...p} value={values[f.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
                    )
                  }
                </Field>
              ),
            )}
            <Checkbox label={t("flatten")} checked={flatten} onChange={(e) => setFlatten(e.target.checked)} />
          </Section>
        )}

        <Button size="lg" className="w-full" disabled={task.running || pages.length === 0} onClick={download}>
          <Download /> {t("download")}
        </Button>
        <TaskStatus state={task.state} onCancel={task.cancel} />
        <p className="text-xs text-muted-foreground">{t("notCertified")}</p>
      </div>

      <div className="min-w-0 space-y-6 rounded-2xl bg-muted/40 p-4 sm:p-6">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> {t("loading", loading)}
          </p>
        )}
        {pages.map((page, i) => (
          <div key={page.url} className="mx-auto max-w-3xl space-y-1.5">
            <p className="text-xs text-muted-foreground">{t("pageN", { n: i + 1 })}</p>
            <PageView
              index={i}
              image={page.url}
              aspect={page.aspect}
              items={placed.filter((p) => p.page === i)}
              selectedId={selectedId}
              active={i === activePage}
              onActivate={setActivePage}
              onSelect={setSelectedId}
              onChange={update}
              label={t("canvas", { n: i + 1 })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
