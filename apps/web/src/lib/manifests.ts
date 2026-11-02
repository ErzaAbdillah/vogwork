import type { ToolManifest } from "@vogwork/core";
import { manifest as bgRemove } from "@vogwork/tool-bg-remove/manifest";
import { manifest as certificate } from "@vogwork/tool-certificate/manifest";
import { manifest as converter } from "@vogwork/tool-converter/manifest";
import { manifest as docEditor } from "@vogwork/tool-doc-editor/manifest";
import { manifest as invoice } from "@vogwork/tool-invoice/manifest";
import { manifest as letterDinas } from "@vogwork/tool-letter-dinas/manifest";
import { manifest as ocr } from "@vogwork/tool-ocr/manifest";
import { manifest as pdfSign } from "@vogwork/tool-pdf-sign/manifest";
import { manifest as pdfToolkit } from "@vogwork/tool-pdf-toolkit/manifest";
import { manifest as qr } from "@vogwork/tool-qr/manifest";
import { manifest as sheetEditor } from "@vogwork/tool-sheet-editor/manifest";
import { manifest as slideEditor } from "@vogwork/tool-slide-editor/manifest";

/**
 * Metadata ringan semua tool, aman untuk halaman statis. Editor (Fase 2) lebih dulu,
 * lalu tool Fase 1 sesuai prioritas roadmap.
 */
export const manifests: ToolManifest[] = [docEditor, sheetEditor, slideEditor, pdfToolkit, pdfSign, qr, certificate, letterDinas, invoice, ocr, bgRemove, converter];

export function findManifest(slug: string) {
  return manifests.find((m) => m.slug === slug);
}
