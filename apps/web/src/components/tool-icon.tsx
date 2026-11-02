import { BlobIcon, type BlobShape } from "@vogwork/ui";
import {
  Award,
  Box,
  Eraser,
  FileStack,
  FileText,
  Landmark,
  Presentation,
  QrCode,
  ReceiptText,
  Repeat2,
  ScanText,
  Sheet,
  Signature,
  type LucideIcon,
} from "lucide-react";

// Hanya ikon yang dipakai manifest yang diimpor, supaya bundle tetap kecil.
const glyphs: Record<string, LucideIcon> = {
  "file-stack": FileStack,
  "file-text": FileText,
  sheet: Sheet,
  signature: Signature,
  presentation: Presentation,
  "qr-code": QrCode,
  award: Award,
  landmark: Landmark,
  "receipt-text": ReceiptText,
  "scan-text": ScanText,
  eraser: Eraser,
  "repeat-2": Repeat2,
};

/** Bentuk dan gradasi blob per tool, terinspirasi elemen blur gradient. */
const art: Record<string, { shape: BlobShape; from: string; to: string }> = {
  "doc-editor": { shape: "circle", from: "#4d7cff", to: "#62d0ff" },
  "sheet-editor": { shape: "arc", from: "#c8ec2a", to: "#2fbf71" },
  "slide-editor": { shape: "bean", from: "#ffa53c", to: "#ff4f8b" },
  "pdf-toolkit": { shape: "drop", from: "#2f8cff", to: "#49e3ff" },
  "pdf-sign": { shape: "comet", from: "#7ad1ff", to: "#3a5bff" },
  qr: { shape: "star", from: "#d8f53a", to: "#4fd16b" },
  certificate: { shape: "leaf", from: "#ffd84a", to: "#ff9a1f" },
  "letter-dinas": { shape: "comet", from: "#ff4fc8", to: "#9a4dff" },
  invoice: { shape: "wave", from: "#4fe0ff", to: "#2f7dd6" },
  ocr: { shape: "teardrop", from: "#ff5aa5", to: "#a24dff" },
  "bg-remove": { shape: "drop", from: "#8a7bff", to: "#ff7ad9" },
  converter: { shape: "arc", from: "#f5e34a", to: "#7ed957" },
};

export function ToolIcon({ id, icon, className }: { id: string; icon: string; className?: string }) {
  const Glyph = glyphs[icon] ?? Box;
  const a = art[id] ?? { shape: "circle" as const, from: "#8cc63f", to: "#f2c94c" };
  return (
    <BlobIcon shape={a.shape} from={a.from} to={a.to} className={className}>
      <Glyph aria-hidden />
    </BlobIcon>
  );
}
