"use client";

import { generateJSON } from "@tiptap/react";
import { defaultDocSettings, type DocContent, type PMNode } from "@vogwork/formats/docx";
import { useT } from "@vogwork/i18n";
import { saveBlob, useVogFiles } from "@vogwork/storage";
import { Workspace, type ImportResult } from "@vogwork/ui";
import { FileDown, FileText, Printer } from "lucide-react";
import { dict } from "./dict";
import { DocEditor } from "./editor";
import { editorExtensions } from "./extensions";
import { templates } from "./templates";

async function sanitize(html: string): Promise<string> {
  const DOMPurify = (await import("dompurify")).default;
  // Data URI gambar diizinkan; skrip, iframe, dan atribut event dibuang.
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_DATA_URI_TAGS: ["img"] });
}

function htmlToDoc(html: string): PMNode {
  return generateJSON(html, editorExtensions()) as PMNode;
}

async function importDocument(file: File): Promise<ImportResult<DocContent>> {
  const title = file.name.replace(/\.[^.]+$/, "") || "Dokumen";
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    const { docxToHtml } = await import("@vogwork/formats/docx");
    const result = await docxToHtml(await file.arrayBuffer());
    const settings = { ...defaultDocSettings(), ...result.settings };
    return { title, content: { settings, doc: htmlToDoc(await sanitize(result.html)) }, report: result.report };
  }
  if (name.endsWith(".doc")) throw new Error("Format .doc lama belum didukung. Simpan ulang sebagai .docx di Word lalu buka lagi.");
  const text = await file.text();
  if (name.endsWith(".html") || name.endsWith(".htm")) {
    return { title, content: { settings: defaultDocSettings(), doc: htmlToDoc(await sanitize(text)) }, report: [] };
  }
  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n").map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] }));
  return { title, content: { settings: defaultDocSettings(), doc: { type: "doc", content: paragraphs } }, report: [] };
}

async function measureImage(src: string) {
  const blob = await (await fetch(src)).blob();
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

export default function DocumentApp() {
  const t = useT(dict);
  const api = useVogFiles<DocContent>("document");

  return (
    <Workspace
      api={api}
      icon={<FileText />}
      templates={templates}
      importAccept=".docx,.doc,.txt,.html,.htm"
      importFile={importDocument}
      exports={[
        {
          label: t("exportDocx"),
          run: async (title) => {
            const content = api.getContent();
            if (!content) return;
            const { docToDocx } = await import("@vogwork/formats/docx");
            const bytes = await docToDocx(content, { measureImage });
            await saveBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), `${title}.docx`);
          },
        },
        {
          label: "PDF",
          icon: <FileDown />,
          run: async (title) => {
            const content = api.getContent();
            if (!content) return;
            const { docToPdf } = await import("@vogwork/formats/doc-pdf");
            const bytes = await docToPdf(content, { title });
            await saveBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), `${title}.pdf`);
          },
        },
        {
          label: t("exportPdf"),
          icon: <Printer />,
          run: async () => {
            document.body.classList.add("vog-printing");
            const done = () => document.body.classList.remove("vog-printing");
            window.addEventListener("afterprint", done, { once: true });
            window.print();
          },
        },
      ]}
    >
      {(content, onChange) => <DocEditor initial={content} onChange={onChange} />}
    </Workspace>
  );
}
