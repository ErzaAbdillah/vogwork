import { Award, Box, Eraser, FileStack, Landmark, QrCode, ReceiptText, Repeat2, ScanText, type LucideIcon } from "lucide-react";

// Hanya ikon yang dipakai manifest yang diimpor, supaya bundle tetap kecil.
const icons: Record<string, LucideIcon> = {
  "file-stack": FileStack,
  "qr-code": QrCode,
  award: Award,
  landmark: Landmark,
  "receipt-text": ReceiptText,
  "scan-text": ScanText,
  eraser: Eraser,
  "repeat-2": Repeat2,
};

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Box;
  return <Icon aria-hidden className={className} />;
}
