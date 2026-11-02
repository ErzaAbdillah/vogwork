import type { ToolManifest } from "@vogwork/core";
import { manifest as bgRemove } from "@vogwork/tool-bg-remove/manifest";
import { manifest as certificate } from "@vogwork/tool-certificate/manifest";
import { manifest as converter } from "@vogwork/tool-converter/manifest";
import { manifest as invoice } from "@vogwork/tool-invoice/manifest";
import { manifest as letterDinas } from "@vogwork/tool-letter-dinas/manifest";
import { manifest as ocr } from "@vogwork/tool-ocr/manifest";
import { manifest as pdfToolkit } from "@vogwork/tool-pdf-toolkit/manifest";
import { manifest as qr } from "@vogwork/tool-qr/manifest";

/**
 * Metadata ringan semua tool, aman untuk halaman statis. Urutan mengikuti
 * prioritas roadmap Fase 1.
 */
export const manifests: ToolManifest[] = [pdfToolkit, qr, certificate, letterDinas, invoice, ocr, bgRemove, converter];

export function findManifest(slug: string) {
  return manifests.find((m) => m.slug === slug);
}
