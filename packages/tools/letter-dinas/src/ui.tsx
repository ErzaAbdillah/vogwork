"use client";

import { toPngDataUrl } from "@vogwork/formats/image";
import { common, useT } from "@vogwork/i18n";
import { safeFilename, saveBlob, usePersistentState } from "@vogwork/storage";
import { Alert, Button, Dropzone, Field, Input, PreviewPanel, Section, Segmented, Select, SplitLayout, Textarea } from "@vogwork/ui";
import { PdfPreview } from "@vogwork/ui/pdf-preview";
import { FileDown, FileText, ImagePlus, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { defaultKop, letterNumber, presets, type Kop, type Letter, type PresetKey } from "./model";

const dict = {
  id: {
    template: "Contoh surat",
    apply: "Terapkan",
    applyConfirm: "Ganti isi surat dengan contoh ini? Kop dan penandatangan tetap dipakai.",
    kop: "Kop surat",
    kopHint: "Tersimpan otomatis untuk surat berikutnya.",
    logo: "Logo instansi (PNG/JPG)",
    removeLogo: "Hapus logo",
    line1: "Baris 1 (mis. pemerintah daerah)",
    line2: "Baris 2 (nama instansi)",
    line3: "Baris 3 (opsional)",
    address: "Alamat",
    contact: "Telepon, pos-el, laman",
    numbering: "Nomor dan tanggal",
    pattern: "Pola nomor",
    patternHint: "Token: {kode} {nomor:3} {unit} {bulan} {bulan-romawi} {tahun}",
    code: "Kode klasifikasi",
    seq: "Nomor urut",
    unit: "Kode unit",
    nextNumber: "Nomor berikutnya",
    result: "Hasil: {value}",
    place: "Tempat",
    date: "Tanggal",
    sifat: "Sifat",
    lampiran: "Lampiran",
    hal: "Hal",
    recipientSection: "Tujuan",
    recipient: "Yth.",
    recipientHint: "Satu baris per baris tujuan.",
    recipientAddress: "Alamat tujuan",
    content: "Isi surat",
    opening: "Salam pembuka",
    body: "Paragraf isi",
    bodyHint: "Pisahkan paragraf dengan satu baris kosong.",
    details: "Rincian (opsional)",
    detailsHint: "Mis. hari, waktu, tempat acara. Ditampilkan setelah paragraf isi.",
    addDetail: "Tambah rincian",
    label: "Label",
    value: "Isi",
    closing: "Paragraf penutup",
    signer: "Penandatangan",
    signerTitle: "Jabatan",
    signerName: "Nama",
    signerRank: "Pangkat/golongan (opsional)",
    signerNip: "NIP (opsional)",
    tembusan: "Tembusan",
    tembusanHint: "Satu tujuan per baris. Kosongkan bila tidak ada.",
    page: "Pengaturan halaman",
    paper: "Kertas",
    font: "Huruf",
    fontSize: "Ukuran huruf",
    preview: "Pratinjau",
    docx: "Word",
    previewError: "Pratinjau gagal dibuat. Periksa logo atau isi surat.",
    downloadError: "Gagal membuat file: {message}",
  },
  en: {
    template: "Sample letter",
    apply: "Apply",
    applyConfirm: "Replace the letter content with this sample? The letterhead and signer are kept.",
    kop: "Letterhead",
    kopHint: "Saved automatically for your next letters.",
    logo: "Organization logo (PNG/JPG)",
    removeLogo: "Remove logo",
    line1: "Line 1 (e.g. local government)",
    line2: "Line 2 (organization name)",
    line3: "Line 3 (optional)",
    address: "Address",
    contact: "Phone, email, website",
    numbering: "Number and date",
    pattern: "Number pattern",
    patternHint: "Tokens: {kode} {nomor:3} {unit} {bulan} {bulan-romawi} {tahun}",
    code: "Classification code",
    seq: "Sequence number",
    unit: "Unit code",
    nextNumber: "Next number",
    result: "Result: {value}",
    place: "Place",
    date: "Date",
    sifat: "Nature",
    lampiran: "Attachment",
    hal: "Subject",
    recipientSection: "Recipient",
    recipient: "To (Yth.)",
    recipientHint: "One line per recipient line.",
    recipientAddress: "Recipient address",
    content: "Content",
    opening: "Opening greeting",
    body: "Body paragraphs",
    bodyHint: "Separate paragraphs with a blank line.",
    details: "Details (optional)",
    detailsHint: "E.g. day, time, venue. Shown after the body paragraphs.",
    addDetail: "Add detail",
    label: "Label",
    value: "Value",
    closing: "Closing paragraph",
    signer: "Signer",
    signerTitle: "Position",
    signerName: "Name",
    signerRank: "Rank/grade (optional)",
    signerNip: "Employee ID / NIP (optional)",
    tembusan: "Copies to (tembusan)",
    tembusanHint: "One recipient per line. Leave empty if none.",
    page: "Page settings",
    paper: "Paper",
    font: "Font",
    fontSize: "Font size",
    preview: "Preview",
    docx: "Word",
    previewError: "The preview failed. Check the logo or letter content.",
    downloadError: "Could not create the file: {message}",
  },
};

export default function LetterTool() {
  const t = useT(dict);
  const c = useT(common);
  const [kop, setKop] = usePersistentState<Kop>("tool.letter.kop", defaultKop);
  const [letter, setLetter] = usePersistentState<Letter>("tool.letter.draft", () => presets.undangan.letter());
  const [preset, setPreset] = useState<PresetKey>("undangan");
  const [pdf, setPdf] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Letter>(key: K, value: Letter[K]) => setLetter((l) => ({ ...l, [key]: value }));
  const setK = <K extends keyof Kop>(key: K, value: Kop[K]) => setKop((k) => ({ ...k, [key]: value }));

  // Pratinjau dibuat ulang setelah pengguna berhenti mengetik sejenak.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { renderLetterPdf } = await import("./render-pdf");
        const bytes = await renderLetterPdf(kop, letter);
        if (!cancelled) {
          setPdf(bytes);
          setError(null);
        }
      } catch {
        if (!cancelled) setError(t("previewError"));
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kop, letter, t]);

  const fileBase = safeFilename(`Surat ${letter.hal || "Dinas"}`, "surat-dinas");

  const download = async (kind: "pdf" | "docx") => {
    try {
      if (kind === "pdf") {
        const { renderLetterPdf } = await import("./render-pdf");
        const bytes = await renderLetterPdf(kop, letter);
        await saveBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), `${fileBase}.pdf`);
      } else {
        const { renderLetterDocx } = await import("./render-docx");
        await saveBlob(await renderLetterDocx(kop, letter), `${fileBase}.docx`);
      }
    } catch (e) {
      setError(t("downloadError", { message: (e as Error).message }));
    }
  };

  const form = (
    <>
      <Section title={t("template")}>
        <div className="flex gap-2">
          <Select aria-label={t("template")} value={preset} onChange={(e) => setPreset(e.target.value as PresetKey)}>
            {Object.entries(presets).map(([key, p]) => (
              <option key={key} value={key}>
                {p.label}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              if (!window.confirm(t("applyConfirm"))) return;
              const next = presets[preset].letter();
              setLetter((l) => ({
                ...next,
                pageSize: l.pageSize,
                font: l.font,
                fontSize: l.fontSize,
                numberPattern: l.numberPattern,
                numberSeq: l.numberSeq,
                numberUnit: l.numberUnit,
                place: l.place,
                signerTitle: l.signerTitle,
                signerName: l.signerName,
                signerRank: l.signerRank,
                signerNip: l.signerNip,
              }));
            }}
          >
            <RotateCcw /> {t("apply")}
          </Button>
        </div>
      </Section>

      <Section title={t("kop")} description={t("kopHint")}>
        {kop.logo ? (
          <div className="flex items-center gap-3">
            <img src={kop.logo} alt="" className="size-16 rounded border bg-white object-contain p-1" />
            <Button variant="ghost" size="sm" onClick={() => setK("logo", null)}>
              <X /> {t("removeLogo")}
            </Button>
          </div>
        ) : (
          <Dropzone compact accept="image/*" icon={<ImagePlus />} title={t("logo")} onFiles={async ([f]) => setK("logo", await toPngDataUrl(f!, 500))} />
        )}
        <Field label={t("line1")}>{(p) => <Input {...p} value={kop.line1} onChange={(e) => setK("line1", e.target.value)} />}</Field>
        <Field label={t("line2")}>{(p) => <Input {...p} value={kop.line2} onChange={(e) => setK("line2", e.target.value)} />}</Field>
        <Field label={t("line3")}>{(p) => <Input {...p} value={kop.line3} onChange={(e) => setK("line3", e.target.value)} />}</Field>
        <Field label={t("address")}>{(p) => <Input {...p} value={kop.address} onChange={(e) => setK("address", e.target.value)} />}</Field>
        <Field label={t("contact")}>{(p) => <Input {...p} value={kop.contact} onChange={(e) => setK("contact", e.target.value)} />}</Field>
      </Section>

      <Section title={t("numbering")}>
        <Field label={t("pattern")} hint={t("patternHint")}>
          {(p) => <Input {...p} className="font-mono text-xs" value={letter.numberPattern} onChange={(e) => set("numberPattern", e.target.value)} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("code")}>{(p) => <Input {...p} value={letter.numberCode} onChange={(e) => set("numberCode", e.target.value)} />}</Field>
          <Field label={t("seq")}>{(p) => <Input {...p} type="number" min={1} value={letter.numberSeq} onChange={(e) => set("numberSeq", Math.max(1, Number(e.target.value)))} />}</Field>
          <Field label={t("unit")}>{(p) => <Input {...p} value={letter.numberUnit} onChange={(e) => set("numberUnit", e.target.value)} />}</Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
          <p className="font-mono text-sm">{t("result", { value: letterNumber(letter) })}</p>
          <Button size="sm" variant="secondary" onClick={() => set("numberSeq", letter.numberSeq + 1)}>
            <Plus /> {t("nextNumber")}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("place")}>{(p) => <Input {...p} value={letter.place} onChange={(e) => set("place", e.target.value)} />}</Field>
          <Field label={t("date")}>{(p) => <Input {...p} type="date" value={letter.date} onChange={(e) => e.target.value && set("date", e.target.value)} />}</Field>
          <Field label={t("sifat")}>
            {(p) => (
              <Select {...p} value={letter.sifat} onChange={(e) => set("sifat", e.target.value)}>
                {["Biasa", "Penting", "Segera", "Sangat Segera", "Rahasia"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("lampiran")}>{(p) => <Input {...p} value={letter.lampiran} onChange={(e) => set("lampiran", e.target.value)} />}</Field>
        </div>
        <Field label={t("hal")}>{(p) => <Input {...p} value={letter.hal} onChange={(e) => set("hal", e.target.value)} />}</Field>
      </Section>

      <Section title={t("recipientSection")}>
        <Field label={t("recipient")} hint={t("recipientHint")}>
          {(p) => <Textarea {...p} rows={2} value={letter.recipient} onChange={(e) => set("recipient", e.target.value)} />}
        </Field>
        <Field label={t("recipientAddress")}>{(p) => <Input {...p} value={letter.recipientAddress} onChange={(e) => set("recipientAddress", e.target.value)} />}</Field>
      </Section>

      <Section title={t("content")}>
        <Field label={t("opening")}>{(p) => <Input {...p} value={letter.opening} onChange={(e) => set("opening", e.target.value)} />}</Field>
        <Field label={t("body")} hint={t("bodyHint")}>
          {(p) => <Textarea {...p} rows={6} value={letter.body} onChange={(e) => set("body", e.target.value)} />}
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("details")}</p>
          <p className="text-xs text-muted-foreground">{t("detailsHint")}</p>
          {letter.details.map((d, i) => (
            <div key={i} className="flex gap-2">
              <Input
                aria-label={t("label")}
                placeholder={t("label")}
                className="w-36 shrink-0"
                value={d.label}
                onChange={(e) => set("details", letter.details.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <Input
                aria-label={t("value")}
                placeholder={t("value")}
                value={d.value}
                onChange={(e) => set("details", letter.details.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
              />
              <Button variant="ghost" size="icon" aria-label={c("remove")} onClick={() => set("details", letter.details.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set("details", [...letter.details, { label: "", value: "" }])}>
            <Plus /> {t("addDetail")}
          </Button>
        </div>
        <Field label={t("closing")}>{(p) => <Textarea {...p} rows={3} value={letter.closing} onChange={(e) => set("closing", e.target.value)} />}</Field>
      </Section>

      <Section title={t("signer")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("signerTitle")}>{(p) => <Input {...p} value={letter.signerTitle} onChange={(e) => set("signerTitle", e.target.value)} />}</Field>
          <Field label={t("signerName")}>{(p) => <Input {...p} value={letter.signerName} onChange={(e) => set("signerName", e.target.value)} />}</Field>
          <Field label={t("signerRank")}>{(p) => <Input {...p} value={letter.signerRank} onChange={(e) => set("signerRank", e.target.value)} />}</Field>
          <Field label={t("signerNip")}>{(p) => <Input {...p} value={letter.signerNip} onChange={(e) => set("signerNip", e.target.value)} />}</Field>
        </div>
        <Field label={t("tembusan")} hint={t("tembusanHint")}>
          {(p) => <Textarea {...p} rows={2} value={letter.tembusan} onChange={(e) => set("tembusan", e.target.value)} />}
        </Field>
      </Section>

      <Section title={t("page")}>
        <div className="flex flex-wrap gap-5">
          <Field label={t("paper")}>
            {() => (
              <Segmented
                label={t("paper")}
                value={letter.pageSize}
                onChange={(v) => set("pageSize", v)}
                options={[
                  { value: "A4", label: "A4" },
                  { value: "F4", label: "F4" },
                ]}
              />
            )}
          </Field>
          <Field label={t("font")}>
            {() => (
              <Segmented
                label={t("font")}
                value={letter.font}
                onChange={(v) => set("font", v)}
                options={[
                  { value: "times", label: "Times" },
                  { value: "helvetica", label: "Arial" },
                ]}
              />
            )}
          </Field>
          <Field label={t("fontSize")}>
            {() => (
              <Segmented
                label={t("fontSize")}
                value={String(letter.fontSize) as "11" | "12"}
                onChange={(v) => set("fontSize", Number(v))}
                options={[
                  { value: "11", label: "11 pt" },
                  { value: "12", label: "12 pt" },
                ]}
              />
            )}
          </Field>
        </div>
      </Section>
    </>
  );

  const preview = (
    <PreviewPanel
      title={t("preview")}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => download("docx")}>
            <FileText /> {t("docx")}
          </Button>
          <Button size="sm" onClick={() => download("pdf")}>
            <FileDown /> PDF
          </Button>
        </>
      }
    >
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <PdfPreview data={pdf} maxPages={3} errorLabel={t("previewError")} />
    </PreviewPanel>
  );

  return <SplitLayout form={form} preview={preview} />;
}
