import { blankDeck, contentSlide, THEMES, titleSlide, type Deck, type ThemeKey } from "@vogwork/formats/slides";
import type { WorkspaceTemplate } from "@vogwork/ui";

function deck(theme: ThemeKey, build: (t: (typeof THEMES)[ThemeKey]) => Deck["slides"]): Deck {
  return { theme, slides: build(THEMES[theme]) };
}

export const templates: WorkspaceTemplate<Deck>[] = [
  {
    id: "blank",
    name: { id: "Presentasi kosong", en: "Blank presentation" },
    description: { id: "Tema mindful terang", en: "Mindful light theme" },
    create: () => blankDeck("mindful-light"),
  },
  {
    id: "dark",
    name: { id: "Mindful gelap", en: "Mindful dark" },
    description: { id: "Latar gelap dengan cahaya lembut", en: "Dark with soft glows" },
    create: () => blankDeck("mindful-dark"),
  },
  {
    id: "meeting",
    name: { id: "Laporan rapat", en: "Meeting report" },
    description: { id: "Agenda, capaian, tindak lanjut", en: "Agenda, results, next steps" },
    create: () =>
      deck("mindful-light", (t) => [
        titleSlide(t, "Rapat Koordinasi Triwulan III", "Bagian Umum · November 2026"),
        contentSlide(t, "Agenda", ["Capaian program", "Kendala di lapangan", "Rencana triwulan IV"]),
        contentSlide(t, "Capaian", ["Realisasi anggaran 82%", "12 dari 15 kegiatan selesai", "Survei kepuasan 4,3/5"]),
        contentSlide(t, "Tindak lanjut", ["Percepat pengadaan", "Evaluasi bulanan", "Laporan akhir 15 Desember"]),
      ]),
  },
  {
    id: "pitch",
    name: { id: "Pitch UMKM", en: "Small business pitch" },
    description: { id: "Masalah, solusi, pasar, kebutuhan", en: "Problem, solution, market, ask" },
    create: () =>
      deck("forest", (t) => [
        titleSlide(t, "Kopi Contoh Nusantara", "Kopi lokal, segar setiap minggu"),
        contentSlide(t, "Masalah", ["Kopi lokal berkualitas sulit dijangkau", "Harga di kafe tidak terjangkau harian"]),
        contentSlide(t, "Solusi", ["Langganan biji kopi segar", "Langsung dari petani mitra", "Kirim tiap minggu"]),
        contentSlide(t, "Kebutuhan", ["Modal mesin sangrai Rp 45 juta", "Target 300 pelanggan dalam 6 bulan"]),
      ]),
  },
];
