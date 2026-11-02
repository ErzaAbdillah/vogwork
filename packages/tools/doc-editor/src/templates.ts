import { defaultDocSettings, type DocContent, type PMNode } from "@vogwork/formats/docx";
import type { WorkspaceTemplate } from "@vogwork/ui";

const t = (text: string, marks?: PMNode["marks"]): PMNode => ({ type: "text", text, ...(marks && { marks }) });
const p = (...content: PMNode[]): PMNode => ({ type: "paragraph", content });
const pa = (align: string, ...content: PMNode[]): PMNode => ({ type: "paragraph", attrs: { textAlign: align }, content });
const h = (level: number, text: string, align?: string): PMNode => ({ type: "heading", attrs: { level, ...(align && { textAlign: align }) }, content: [t(text)] });
const bullets = (...items: string[]): PMNode => ({ type: "bulletList", content: items.map((i) => ({ type: "listItem", content: [p(t(i))] })) });
const numbered = (...items: string[]): PMNode => ({ type: "orderedList", content: items.map((i) => ({ type: "listItem", content: [p(t(i))] })) });
const cell = (text: string, header = false): PMNode => ({ type: header ? "tableHeader" : "tableCell", content: [p(...(text ? [t(text)] : []))] });
const table = (rows: string[][]): PMNode => ({ type: "table", content: rows.map((r, i) => ({ type: "tableRow", content: r.map((c) => cell(c, i === 0)) })) });
const bold = [{ type: "bold" }];

const doc = (content: PMNode[], settings: Partial<DocContent["settings"]> = {}): DocContent => ({
  settings: { ...defaultDocSettings(), ...settings },
  doc: { type: "doc", content },
});

export const templates: WorkspaceTemplate<DocContent>[] = [
  {
    id: "blank",
    name: { id: "Dokumen kosong", en: "Blank document" },
    description: { id: "A4, Times New Roman 12", en: "A4, Times New Roman 12" },
    create: () => doc([p()]),
  },
  {
    id: "report",
    name: { id: "Laporan kegiatan", en: "Activity report" },
    description: { id: "Judul, bab, tabel anggaran", en: "Title, sections, budget table" },
    create: () =>
      doc(
        [
          h(1, "Laporan Kegiatan", "center"),
          pa("center", t("Pelatihan Literasi Digital — November 2026")),
          h(2, "1. Pendahuluan"),
          pa("justify", t("Kegiatan ini bertujuan meningkatkan kemampuan peserta dalam memanfaatkan perangkat digital secara aman dan produktif.")),
          h(2, "2. Pelaksanaan"),
          bullets("Waktu: 20–21 November 2026", "Tempat: Aula Serbaguna", "Peserta: 40 orang"),
          h(2, "3. Anggaran"),
          table([
            ["Uraian", "Volume", "Jumlah (Rp)"],
            ["Konsumsi", "80 kotak", "2.400.000"],
            ["Bahan pelatihan", "40 paket", "1.200.000"],
            ["Total", "", "3.600.000"],
          ]),
          h(2, "4. Penutup"),
          pa("justify", t("Demikian laporan ini disusun sebagai bahan evaluasi kegiatan berikutnya.")),
        ],
        { header: "Laporan Kegiatan", pageNumbers: true },
      ),
  },
  {
    id: "minutes",
    name: { id: "Notulen rapat", en: "Meeting minutes" },
    description: { id: "Peserta, pembahasan, tindak lanjut", en: "Attendees, discussion, actions" },
    create: () =>
      doc([
        h(1, "Notulen Rapat"),
        p(t("Hari, tanggal: ", bold), t("Senin, 9 November 2026")),
        p(t("Tempat: ", bold), t("Ruang Rapat Lantai 2")),
        p(t("Pimpinan rapat: ", bold), t("…")),
        h(2, "Peserta"),
        numbered("…", "…"),
        h(2, "Pembahasan"),
        bullets("…"),
        h(2, "Tindak lanjut"),
        table([
          ["Kegiatan", "Penanggung jawab", "Tenggat"],
          ["", "", ""],
        ]),
      ]),
  },
  {
    id: "letter",
    name: { id: "Surat resmi", en: "Formal letter" },
    description: { id: "Kerangka surat sederhana", en: "Simple letter outline" },
    create: () =>
      doc([
        pa("right", t("Kota Contoh, 2 November 2026")),
        p(t("Nomor    : …")),
        p(t("Lampiran : -")),
        p(t("Hal      : …")),
        p(),
        p(t("Yth. …")),
        p(t("di Tempat")),
        p(),
        p(t("Dengan hormat,")),
        pa("justify", t("…")),
        p(),
        pa("right", t("Hormat kami,")),
        p(),
        p(),
        pa("right", t("Nama Penanda Tangan", bold)),
      ]),
  },
];
