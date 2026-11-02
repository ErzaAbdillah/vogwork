"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { PAPER_MM, type DocContent, type DocSettings, type PMNode } from "@vogwork/formats/docx";
import { useT } from "@vogwork/i18n";
import { cn, Field, Input, Segmented, Select } from "@vogwork/ui";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Settings2,
  Strikethrough,
  Table as TableIcon,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { dict } from "./dict";
import { editorExtensions } from "./extensions";

function Tool({ label, active, onClick, disabled, children }: { label: string; active?: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md text-foreground/80 transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40 [&_svg]:size-4",
        active && "bg-primary/15 text-primary",
      )}
    >
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-border" />;

const FONT_SIZES = ["10pt", "11pt", "12pt", "14pt", "16pt", "18pt", "20pt", "24pt", "28pt", "36pt"];
const FONTS = ["Times New Roman", "Arial", "Calibri", "Georgia", "Courier New"];

async function pickImage(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const { toPngDataUrl, blobToDataUrl } = await import("@vogwork/formats/image");
      // JPEG dan PNG dipertahankan; WEBP diubah ke PNG supaya bisa masuk ke DOCX.
      resolve(file.type === "image/jpeg" || file.type === "image/png" ? await blobToDataUrl(file) : await toPngDataUrl(file, 2000));
    };
    input.click();
  });
}

function Toolbar({ editor, onSettings, settingsOpen }: { editor: Editor; onSettings: () => void; settingsOpen: boolean }) {
  const t = useT(dict);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      table: e.isActive("table"),
      align: (["left", "center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
      block: e.isActive("heading", { level: 1 }) ? "h1" : e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : "p",
      font: (e.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
      size: (e.getAttributes("textStyle").fontSize as string | undefined) ?? "",
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "#111111",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = editor.chain().focus();

  return (
    <div className="no-print sticky top-16 z-20 flex flex-wrap items-center gap-0.5 rounded-2xl border bg-card-solid/90 p-1.5 shadow-sm backdrop-blur-xl">
      <Tool label={t("undo")} disabled={!state.canUndo} onClick={() => c.undo().run()}>
        <Undo2 />
      </Tool>
      <Tool label={t("redo")} disabled={!state.canRedo} onClick={() => c.redo().run()}>
        <Redo2 />
      </Tool>
      <Divider />
      <Select
        aria-label={t("style")}
        className="h-8 w-32 text-xs"
        value={state.block}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") c.setParagraph().run();
          else c.setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
        }}
      >
        <option value="p">{t("normal")}</option>
        <option value="h1">{t("heading", { n: 1 })}</option>
        <option value="h2">{t("heading", { n: 2 })}</option>
        <option value="h3">{t("heading", { n: 3 })}</option>
      </Select>
      <Select aria-label={t("font")} className="h-8 w-36 text-xs" value={state.font} onChange={(e) => (e.target.value ? c.setFontFamily(e.target.value).run() : c.unsetFontFamily().run())}>
        <option value="">{t("defaultFont")}</option>
        {FONTS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </Select>
      <Select aria-label={t("size")} className="h-8 w-20 text-xs" value={state.size} onChange={(e) => (e.target.value ? c.setFontSize(e.target.value).run() : c.unsetFontSize().run())}>
        <option value="">—</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s.replace("pt", "")}
          </option>
        ))}
      </Select>
      <Divider />
      <Tool label={t("bold")} active={state.bold} onClick={() => c.toggleBold().run()}>
        <Bold />
      </Tool>
      <Tool label={t("italic")} active={state.italic} onClick={() => c.toggleItalic().run()}>
        <Italic />
      </Tool>
      <Tool label={t("underline")} active={state.underline} onClick={() => c.toggleUnderline().run()}>
        <Underline />
      </Tool>
      <Tool label={t("strike")} active={state.strike} onClick={() => c.toggleStrike().run()}>
        <Strikethrough />
      </Tool>
      <label className="relative grid size-8 cursor-pointer place-items-center rounded-md hover:bg-accent" title={t("color")}>
        <span className="text-sm font-semibold" style={{ borderBottom: `3px solid ${state.color}` }}>
          A
        </span>
        <input type="color" aria-label={t("color")} className="absolute inset-0 cursor-pointer opacity-0" value={state.color.startsWith("#") ? state.color : "#111111"} onChange={(e) => c.setColor(e.target.value).run()} />
      </label>
      <Tool label={t("highlight")} onClick={() => c.toggleHighlight({ color: "#fff176" }).run()}>
        <Highlighter />
      </Tool>
      <Tool label={t("clear")} onClick={() => c.unsetAllMarks().clearNodes().run()}>
        <RemoveFormatting />
      </Tool>
      <Divider />
      {(
        [
          ["left", AlignLeft],
          ["center", AlignCenter],
          ["right", AlignRight],
          ["justify", AlignJustify],
        ] as const
      ).map(([align, Icon]) => (
        <Tool key={align} label={t(`align_${align}`)} active={state.align === align} onClick={() => c.setTextAlign(align).run()}>
          <Icon />
        </Tool>
      ))}
      <Divider />
      <Tool label={t("bullets")} active={state.bullet} onClick={() => c.toggleBulletList().run()}>
        <List />
      </Tool>
      <Tool label={t("numbers")} active={state.ordered} onClick={() => c.toggleOrderedList().run()}>
        <ListOrdered />
      </Tool>
      <Tool label={t("quote")} active={state.quote} onClick={() => c.toggleBlockquote().run()}>
        <Quote />
      </Tool>
      <Tool label={t("rule")} onClick={() => c.setHorizontalRule().run()}>
        <Minus />
      </Tool>
      <Divider />
      <Tool
        label={t("link")}
        active={state.link}
        onClick={() => {
          const previous = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt(t("linkPrompt"), previous ?? "https://");
          if (url === null) return;
          if (url === "") c.unsetLink().run();
          else c.extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        <Link2 />
      </Tool>
      <Tool
        label={t("image")}
        onClick={async () => {
          const src = await pickImage();
          if (src) editor.chain().focus().setImage({ src }).run();
        }}
      >
        <ImagePlus />
      </Tool>
      <Tool label={t("table")} onClick={() => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <TableIcon />
      </Tool>
      {state.table && (
        <span className="flex flex-wrap items-center gap-0.5 rounded-md bg-muted/70 px-1 text-xs">
          <button type="button" className="rounded px-1.5 py-1 hover:bg-accent" onClick={() => c.addRowAfter().run()}>
            {t("addRow")}
          </button>
          <button type="button" className="rounded px-1.5 py-1 hover:bg-accent" onClick={() => c.addColumnAfter().run()}>
            {t("addCol")}
          </button>
          <button type="button" className="rounded px-1.5 py-1 hover:bg-accent" onClick={() => c.deleteRow().run()}>
            {t("delRow")}
          </button>
          <button type="button" className="rounded px-1.5 py-1 hover:bg-accent" onClick={() => c.deleteColumn().run()}>
            {t("delCol")}
          </button>
          <button type="button" className="rounded px-1.5 py-1 hover:bg-accent" onClick={() => c.mergeOrSplit().run()}>
            {t("merge")}
          </button>
          <button type="button" className="rounded px-1.5 py-1 text-destructive hover:bg-accent" onClick={() => c.deleteTable().run()}>
            {t("delTable")}
          </button>
        </span>
      )}
      <span className="ml-auto" />
      <Tool label={t("pageSettings")} active={settingsOpen} onClick={onSettings}>
        <Settings2 />
      </Tool>
    </div>
  );
}

function PageSettings({ settings, onChange }: { settings: DocSettings; onChange: (s: DocSettings) => void }) {
  const t = useT(dict);
  const set = <K extends keyof DocSettings>(key: K, value: DocSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <div className="no-print grid gap-4 rounded-2xl border bg-card p-4 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
      <Field label={t("paper")}>
        {() => (
          <Segmented
            label={t("paper")}
            value={settings.pageSize}
            onChange={(v) => set("pageSize", v)}
            options={[
              { value: "A4", label: "A4" },
              { value: "F4", label: "F4" },
              { value: "Letter", label: "Letter" },
            ]}
          />
        )}
      </Field>
      <Field label={t("orientation")}>
        {() => (
          <Segmented
            label={t("orientation")}
            value={settings.orientation}
            onChange={(v) => set("orientation", v)}
            options={[
              { value: "portrait", label: t("portrait") },
              { value: "landscape", label: t("landscape") },
            ]}
          />
        )}
      </Field>
      <Field label={t("bodyFont")}>
        {(p) => (
          <Select {...p} value={settings.fontFamily} onChange={(e) => set("fontFamily", e.target.value as DocSettings["fontFamily"])}>
            <option>Times New Roman</option>
            <option>Arial</option>
            <option>Calibri</option>
          </Select>
        )}
      </Field>
      <Field label={t("bodySize")}>
        {(p) => (
          <Select {...p} value={settings.fontSize} onChange={(e) => set("fontSize", Number(e.target.value))}>
            {[10, 11, 12, 14].map((n) => (
              <option key={n} value={n}>
                {n} pt
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid grid-cols-4 gap-2 sm:col-span-2">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <Field key={side} label={`${t(`margin_${side}`)} (mm)`}>
            {(p) => (
              <Input
                {...p}
                type="number"
                min={5}
                max={60}
                value={settings.marginMm[side]}
                onChange={(e) => set("marginMm", { ...settings.marginMm, [side]: Math.min(60, Math.max(5, Number(e.target.value) || 0)) })}
              />
            )}
          </Field>
        ))}
      </div>
      <Field label={t("header")}>{(p) => <Input {...p} value={settings.header} onChange={(e) => set("header", e.target.value)} />}</Field>
      <Field label={t("footer")}>{(p) => <Input {...p} value={settings.footer} onChange={(e) => set("footer", e.target.value)} />}</Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
        <input type="checkbox" className="size-4 accent-primary" checked={settings.pageNumbers} onChange={(e) => set("pageNumbers", e.target.checked)} />
        {t("pageNumbers")}
      </label>
    </div>
  );
}

function countWords(doc: PMNode): number {
  let text = "";
  const walk = (n: PMNode) => {
    if (n.text) text += `${n.text} `;
    n.content?.forEach(walk);
    if (n.type === "paragraph" || n.type === "heading") text += " ";
  };
  walk(doc);
  return text.split(/\s+/).filter(Boolean).length;
}

/** Halaman dokumen dengan ukuran kertas dan margin sungguhan (satuan mm). */
export function DocEditor({ initial, onChange }: { initial: DocContent; onChange: (content: DocContent) => void }) {
  const t = useT(dict);
  const [settings, setSettings] = useState(initial.settings);
  const [doc, setDoc] = useState<PMNode>(initial.doc);
  const [showSettings, setShowSettings] = useState(false);
  // Callback editor dibuat sekali; ref menjaga pengaturan halaman terbaru tetap terbaca.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const editor = useEditor({
    extensions: editorExtensions(t("placeholder")),
    content: initial.doc,
    immediatelyRender: false,
    editorProps: { attributes: { class: "ProseMirror", spellcheck: "true", lang: "id" } },
    onUpdate: ({ editor: e }) => {
      const json = e.getJSON() as PMNode;
      setDoc(json);
      onChange({ settings: settingsRef.current, doc: json });
    },
  });

  const updateSettings = (next: DocSettings) => {
    setSettings(next);
    onChange({ settings: next, doc });
  };

  const [w, h] = PAPER_MM[settings.pageSize];
  const pageW = settings.orientation === "landscape" ? h : w;
  const pageH = settings.orientation === "landscape" ? w : h;
  const m = settings.marginMm;

  return (
    <div className="space-y-3">
      {editor && <Toolbar editor={editor} onSettings={() => setShowSettings((s) => !s)} settingsOpen={showSettings} />}
      {showSettings && <PageSettings settings={settings} onChange={updateSettings} />}
      <style>{`@page { size: ${pageW}mm ${pageH}mm; margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm; }`}</style>
      <div className="overflow-x-auto rounded-2xl bg-muted/40 py-6 sm:py-10">
        <div
          className="print-page vog-doc relative mx-auto bg-white shadow-[0_10px_40px_-12px_rgb(0_0_0/0.35)]"
          style={{
            width: `${pageW}mm`,
            maxWidth: "100%",
            minHeight: `${pageH}mm`,
            padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
            fontFamily: `"${settings.fontFamily}", serif`,
            fontSize: `${settings.fontSize}pt`,
          }}
        >
          {settings.header && <div className="no-print absolute inset-x-0 top-[8mm] text-center text-[9pt] text-neutral-500">{settings.header}</div>}
          <EditorContent editor={editor} />
          {(settings.footer || settings.pageNumbers) && (
            <div className="no-print absolute inset-x-0 bottom-[8mm] text-center text-[9pt] text-neutral-500">
              {settings.footer}
              {settings.footer && settings.pageNumbers && "   ·   "}
              {settings.pageNumbers && t("pageNumberPreview")}
            </div>
          )}
        </div>
      </div>
      <p className="no-print text-right text-xs text-muted-foreground">{t("words", { count: countWords(doc) })}</p>
    </div>
  );
}
