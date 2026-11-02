import type { TableData } from "@vogwork/core";
import { newField, type CertField } from "./model";

/** Data contoh dengan nama umum (bukan orang tertentu) untuk mencoba alat ini. */
export const sampleTable: TableData = {
  columns: ["Nama", "Peran", "Nomor"],
  rows: [
    { Nama: "Andi Pratama", Peran: "Peserta", Nomor: "001/SRT/XI/2026" },
    { Nama: "Siti Rahmawati", Peran: "Pemateri", Nomor: "002/SRT/XI/2026" },
    { Nama: "Rizky Maulana Ibrahim", Peran: "Peserta", Nomor: "003/SRT/XI/2026" },
    { Nama: "Nur Aini Safitri", Peran: "Panitia", Nomor: "004/SRT/XI/2026" },
    { Nama: "Bagus Setiawan", Peran: "Peserta", Nomor: "005/SRT/XI/2026" },
  ],
};

export const sampleFields = (): CertField[] => [
  newField({ text: "{Nama}", y: 0.485, size: 0.05, font: "times-bold", color: "#0f3d3a" }),
  newField({ text: "sebagai {Peran}", y: 0.585, size: 0.022, font: "helvetica", color: "#374151" }),
  newField({ text: "No. {Nomor}", y: 0.14, size: 0.016, font: "helvetica", color: "#6b7280" }),
];

/** Template sertifikat sederhana tanpa logo atau kop instansi mana pun. */
export async function drawSampleTemplate(): Promise<Blob> {
  const W = 1754;
  const H = 1240;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#fbfaf6";
  ctx.fillRect(0, 0, W, H);

  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#14917f");
  gradient.addColorStop(1, "#1f6fa3");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W * 0.22, 0);
  ctx.lineTo(0, H * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W, H);
  ctx.lineTo(W * 0.8, H);
  ctx.lineTo(W, H * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#b08d3c";
  ctx.lineWidth = 6;
  ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.lineWidth = 2;
  ctx.strokeRect(78, 78, W - 156, H - 156);

  ctx.textAlign = "center";
  ctx.fillStyle = "#0f3d3a";
  ctx.font = "700 112px Georgia, 'Times New Roman', serif";
  ctx.fillText("SERTIFIKAT", W / 2, 330);
  ctx.fillStyle = "#b08d3c";
  ctx.font = "600 34px Helvetica, Arial, sans-serif";
  ctx.fillText("P E N G H A R G A A N", W / 2, 395);

  ctx.fillStyle = "#4b5563";
  ctx.font = "400 34px Helvetica, Arial, sans-serif";
  ctx.fillText("Diberikan kepada:", W / 2, 505);

  ctx.strokeStyle = "#b08d3c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.25, 655);
  ctx.lineTo(W * 0.75, 655);
  ctx.stroke();

  ctx.fillStyle = "#4b5563";
  ctx.font = "400 30px Helvetica, Arial, sans-serif";
  ctx.fillText("atas partisipasinya dalam Pelatihan Contoh Tahun 2026", W / 2, 800);
  ctx.fillText("yang diselenggarakan pada 2 November 2026", W / 2, 845);

  ctx.font = "400 28px Helvetica, Arial, sans-serif";
  ctx.fillText("Ketua Panitia", W * 0.72, 945);
  ctx.beginPath();
  ctx.moveTo(W * 0.62, 1065);
  ctx.lineTo(W * 0.82, 1065);
  ctx.stroke();
  ctx.font = "700 28px Helvetica, Arial, sans-serif";
  ctx.fillText("Nama Penandatangan", W * 0.72, 1105);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat template"))), "image/png"));
}
