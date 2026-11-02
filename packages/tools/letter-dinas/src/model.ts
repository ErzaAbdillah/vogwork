import { formatNomor, formatTanggal, toIsoDate } from "@vogwork/formats";

export interface Kop {
  logo: string | null;
  line1: string;
  line2: string;
  line3: string;
  address: string;
  contact: string;
}

export interface Letter {
  pageSize: "A4" | "F4";
  font: "times" | "helvetica";
  fontSize: number;
  numberPattern: string;
  numberSeq: number;
  numberCode: string;
  numberUnit: string;
  place: string;
  date: string;
  sifat: string;
  lampiran: string;
  hal: string;
  recipient: string;
  recipientAddress: string;
  opening: string;
  body: string;
  details: { label: string; value: string }[];
  closing: string;
  signerTitle: string;
  signerName: string;
  signerRank: string;
  signerNip: string;
  tembusan: string;
}

export const defaultKop: Kop = {
  logo: null,
  line1: "PEMERINTAH KABUPATEN CONTOH",
  line2: "DINAS KOMUNIKASI DAN INFORMATIKA",
  line3: "",
  address: "Jalan Merdeka No. 1, Kota Contoh 12345",
  contact: "Telepon (021) 000000 · Pos-el info@contoh.go.id",
};

export function letterNumber(letter: Letter): string {
  return formatNomor(letter.numberPattern, {
    nomor: letter.numberSeq,
    kode: letter.numberCode,
    unit: letter.numberUnit,
    date: new Date(`${letter.date}T00:00:00`),
  });
}

export function placeAndDate(letter: Letter): string {
  return `${letter.place}, ${formatTanggal(letter.date)}`;
}

/** Paragraf dipisah oleh baris kosong. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

export function tembusanList(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
}

const base = (): Letter => ({
  pageSize: "A4",
  font: "times",
  fontSize: 12,
  numberPattern: "{kode}/{nomor:3}/{unit}/{tahun}",
  numberSeq: 1,
  numberCode: "005",
  numberUnit: "DISKOMINFO",
  place: "Kota Contoh",
  date: toIsoDate(new Date()),
  sifat: "Biasa",
  lampiran: "-",
  hal: "",
  recipient: "",
  recipientAddress: "di Tempat",
  opening: "",
  body: "",
  details: [],
  closing: "",
  signerTitle: "Kepala Dinas",
  signerName: "Nama Pejabat, S.Kom., M.T.",
  signerRank: "Pembina Tingkat I",
  signerNip: "NIP 19800101 200501 1 001",
  tembusan: "",
});

export type PresetKey = "undangan" | "pemberitahuan" | "permohonan";

export const presets: Record<PresetKey, { label: string; letter: () => Letter }> = {
  undangan: {
    label: "Surat undangan",
    letter: () => ({
      ...base(),
      numberCode: "005",
      hal: "Undangan Rapat Koordinasi",
      recipient: "Yth. Kepala Bagian Umum\nSekretariat Daerah Kabupaten Contoh",
      opening: "Dengan hormat,",
      body: "Dalam rangka evaluasi pelaksanaan program kerja triwulan III, kami mengundang Bapak/Ibu untuk menghadiri rapat koordinasi yang akan dilaksanakan pada:",
      details: [
        { label: "Hari, tanggal", value: "Senin, 9 November 2026" },
        { label: "Waktu", value: "09.00 WIB s.d. selesai" },
        { label: "Tempat", value: "Ruang Rapat Lantai 2" },
        { label: "Acara", value: "Evaluasi Program Kerja Triwulan III" },
      ],
      closing: "Mengingat pentingnya acara tersebut, kami mengharapkan kehadiran Bapak/Ibu tepat waktu. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.",
      tembusan: "Sekretaris Daerah Kabupaten Contoh\nArsip",
    }),
  },
  pemberitahuan: {
    label: "Surat pemberitahuan",
    letter: () => ({
      ...base(),
      numberCode: "800",
      hal: "Pemberitahuan Pemeliharaan Jaringan",
      recipient: "Yth. Seluruh Kepala Perangkat Daerah\nKabupaten Contoh",
      opening: "Dengan hormat,",
      body: "Sehubungan dengan pemeliharaan rutin jaringan internet pemerintah daerah, dengan ini kami beritahukan bahwa layanan jaringan akan terhenti sementara pada hari Sabtu, 14 November 2026 pukul 20.00 s.d. 23.00 WIB.\n\nKami mohon Bapak/Ibu menyimpan pekerjaan dan menghindari pengiriman data penting pada rentang waktu tersebut.",
      closing: "Demikian pemberitahuan ini kami sampaikan. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.",
      tembusan: "Sekretaris Daerah Kabupaten Contoh",
    }),
  },
  permohonan: {
    label: "Surat permohonan",
    letter: () => ({
      ...base(),
      numberCode: "027",
      lampiran: "1 (satu) berkas",
      hal: "Permohonan Peminjaman Aula",
      recipient: "Yth. Kepala Badan Pengelola Aset Daerah\nKabupaten Contoh",
      opening: "Dengan hormat,",
      body: "Dalam rangka pelaksanaan Pelatihan Literasi Digital bagi aparatur, kami bermaksud meminjam Aula Serbaguna pada tanggal 20 s.d. 21 November 2026. Rincian kegiatan kami lampirkan bersama surat ini.",
      closing: "Demikian permohonan ini kami sampaikan. Atas perhatian dan bantuan Bapak/Ibu, kami ucapkan terima kasih.",
      tembusan: "",
    }),
  },
};
