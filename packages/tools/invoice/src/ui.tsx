"use client";

import { formatRupiah, terbilangRupiah } from "@vogwork/formats";
import { toPngDataUrl } from "@vogwork/formats/image";
import { common, useT } from "@vogwork/i18n";
import { safeFilename, saveBlob, usePersistentState } from "@vogwork/storage";
import { Alert, Button, Checkbox, Dropzone, Field, Input, PreviewPanel, Section, SplitLayout, Tabs, Textarea } from "@vogwork/ui";
import { PdfPreview } from "@vogwork/ui/pdf-preview";
import { ArrowRight, FileDown, ImagePlus, Plus, ReceiptText, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  computeTotals,
  defaultBusiness,
  defaultInvoice,
  defaultReceipt,
  invoiceNumber,
  METERAI_THRESHOLD,
  receiptNumber,
  type Business,
  type Invoice,
  type Receipt,
} from "./model";

const dict = {
  id: {
    tabs: "Jenis dokumen",
    invoice: "Invoice",
    receipt: "Kwitansi",
    business: "Profil usaha",
    businessHint: "Disimpan di perangkat ini dan dipakai ulang untuk invoice dan kwitansi.",
    logo: "Logo (opsional)",
    removeLogo: "Hapus logo",
    name: "Nama usaha",
    address: "Alamat",
    phone: "Telepon/WA",
    email: "Email",
    npwp: "NPWP (opsional)",
    bank: "Info pembayaran / rekening",
    signer: "Nama penanda tangan",
    details: "Detail invoice",
    pattern: "Pola nomor",
    seq: "Nomor urut",
    nextNumber: "Nomor berikutnya",
    number: "Nomor: {value}",
    date: "Tanggal",
    dueDate: "Jatuh tempo",
    client: "Pelanggan",
    clientName: "Nama pelanggan",
    clientAddress: "Alamat pelanggan",
    items: "Barang / jasa",
    description: "Deskripsi",
    qty: "Jumlah",
    unit: "Satuan",
    price: "Harga satuan",
    addItem: "Tambah baris",
    discount: "Diskon (%)",
    tax: "Pajak (%)",
    taxLabel: "Nama pajak",
    subtotal: "Subtotal",
    total: "Total",
    notes: "Catatan",
    paid: "Tandai LUNAS",
    toReceipt: "Buat kwitansi dari invoice ini",
    receiptDetails: "Detail kwitansi",
    receivedFrom: "Telah terima dari",
    amount: "Uang sejumlah (Rp)",
    purpose: "Untuk pembayaran",
    place: "Tempat",
    receiver: "Nama penerima",
    meterai: "Nominal di atas Rp5.000.000: kotak meterai Rp10.000 ditambahkan.",
    preview: "Pratinjau",
    previewError: "Pratinjau gagal dibuat. Periksa logo dan isian.",
  },
  en: {
    tabs: "Document type",
    invoice: "Invoice",
    receipt: "Receipt",
    business: "Business profile",
    businessHint: "Saved on this device and reused for invoices and receipts.",
    logo: "Logo (optional)",
    removeLogo: "Remove logo",
    name: "Business name",
    address: "Address",
    phone: "Phone/WhatsApp",
    email: "Email",
    npwp: "Tax ID / NPWP (optional)",
    bank: "Payment / bank details",
    signer: "Signer name",
    details: "Invoice details",
    pattern: "Number pattern",
    seq: "Sequence",
    nextNumber: "Next number",
    number: "Number: {value}",
    date: "Date",
    dueDate: "Due date",
    client: "Customer",
    clientName: "Customer name",
    clientAddress: "Customer address",
    items: "Items / services",
    description: "Description",
    qty: "Qty",
    unit: "Unit",
    price: "Unit price",
    addItem: "Add row",
    discount: "Discount (%)",
    tax: "Tax (%)",
    taxLabel: "Tax name",
    subtotal: "Subtotal",
    total: "Total",
    notes: "Notes",
    paid: "Mark as PAID",
    toReceipt: "Create a receipt from this invoice",
    receiptDetails: "Receipt details",
    receivedFrom: "Received from",
    amount: "Amount (Rp)",
    purpose: "Payment for",
    place: "Place",
    receiver: "Receiver name",
    meterai: "Amount above Rp5,000,000: a Rp10,000 stamp-duty box is added.",
    preview: "Preview",
    previewError: "The preview failed. Check the logo and fields.",
  },
};

type Tab = "invoice" | "receipt";

function usePdf(render: () => Promise<Uint8Array>, deps: unknown[]) {
  const [pdf, setPdf] = useState<Uint8Array | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      render()
        .then((bytes) => {
          if (cancelled) return;
          setPdf(bytes);
          setFailed(false);
        })
        .catch(() => !cancelled && setFailed(true));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { pdf, failed };
}

const toPdfBlob = (bytes: Uint8Array) => new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });

export default function InvoiceTool() {
  const t = useT(dict);
  const c = useT(common);
  const [tab, setTab] = usePersistentState<Tab>("tool.invoice.tab", "invoice");
  const [business, setBusiness] = usePersistentState<Business>("tool.invoice.business", defaultBusiness);
  const [invoice, setInvoice] = usePersistentState<Invoice>("tool.invoice.draft", defaultInvoice);
  const [receipt, setReceipt] = usePersistentState<Receipt>("tool.invoice.receipt", defaultReceipt);

  const setB = <K extends keyof Business>(key: K, value: Business[K]) => setBusiness((b) => ({ ...b, [key]: value }));
  const setI = <K extends keyof Invoice>(key: K, value: Invoice[K]) => setInvoice((i) => ({ ...i, [key]: value }));
  const setR = <K extends keyof Receipt>(key: K, value: Receipt[K]) => setReceipt((r) => ({ ...r, [key]: value }));
  const totals = computeTotals(invoice);

  const invoicePdf = usePdf(async () => (await import("./render")).renderInvoicePdf(business, invoice), [business, invoice]);
  const receiptPdf = usePdf(async () => (await import("./render")).renderReceiptPdf(business, receipt), [business, receipt]);
  const current = tab === "invoice" ? invoicePdf : receiptPdf;

  const download = async () => {
    const { renderInvoicePdf, renderReceiptPdf } = await import("./render");
    if (tab === "invoice") {
      await saveBlob(toPdfBlob(await renderInvoicePdf(business, invoice)), `${safeFilename(`Invoice ${invoiceNumber(invoice).replace(/\//g, "-")}`)}.pdf`);
    } else {
      await saveBlob(toPdfBlob(await renderReceiptPdf(business, receipt)), `${safeFilename(`Kwitansi ${receiptNumber(receipt).replace(/\//g, "-")}`)}.pdf`);
    }
  };

  const businessSection = (
    <Section title={t("business")} description={t("businessHint")}>
      {business.logo ? (
        <div className="flex items-center gap-3">
          <img src={business.logo} alt="" className="size-14 rounded border bg-white object-contain p-1" />
          <Button variant="ghost" size="sm" onClick={() => setB("logo", null)}>
            <X /> {t("removeLogo")}
          </Button>
        </div>
      ) : (
        <Dropzone compact accept="image/*" icon={<ImagePlus />} title={t("logo")} onFiles={async ([f]) => setB("logo", await toPngDataUrl(f!, 500))} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")}>{(p) => <Input {...p} value={business.name} onChange={(e) => setB("name", e.target.value)} />}</Field>
        <Field label={t("signer")}>{(p) => <Input {...p} value={business.signer} onChange={(e) => setB("signer", e.target.value)} />}</Field>
        <Field label={t("address")} className="sm:col-span-2">
          {(p) => <Input {...p} value={business.address} onChange={(e) => setB("address", e.target.value)} />}
        </Field>
        <Field label={t("phone")}>{(p) => <Input {...p} value={business.phone} onChange={(e) => setB("phone", e.target.value)} />}</Field>
        <Field label={t("email")}>{(p) => <Input {...p} type="email" value={business.email} onChange={(e) => setB("email", e.target.value)} />}</Field>
        <Field label={t("npwp")}>{(p) => <Input {...p} value={business.npwp} onChange={(e) => setB("npwp", e.target.value)} />}</Field>
        <Field label={t("bank")}>{(p) => <Input {...p} value={business.bank} onChange={(e) => setB("bank", e.target.value)} />}</Field>
      </div>
    </Section>
  );

  const invoiceForm = (
    <>
      <Section title={t("details")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("pattern")}>{(p) => <Input {...p} className="font-mono text-xs" value={invoice.numberPattern} onChange={(e) => setI("numberPattern", e.target.value)} />}</Field>
          <Field label={t("seq")}>{(p) => <Input {...p} type="number" min={1} value={invoice.seq} onChange={(e) => setI("seq", Math.max(1, Number(e.target.value)))} />}</Field>
          <Field label={t("date")}>{(p) => <Input {...p} type="date" value={invoice.date} onChange={(e) => e.target.value && setI("date", e.target.value)} />}</Field>
          <Field label={t("dueDate")}>{(p) => <Input {...p} type="date" value={invoice.dueDate} onChange={(e) => e.target.value && setI("dueDate", e.target.value)} />}</Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
          <p className="font-mono text-sm">{t("number", { value: invoiceNumber(invoice) })}</p>
          <Button size="sm" variant="secondary" onClick={() => setI("seq", invoice.seq + 1)}>
            <Plus /> {t("nextNumber")}
          </Button>
        </div>
      </Section>

      <Section title={t("client")}>
        <Field label={t("clientName")}>{(p) => <Input {...p} value={invoice.clientName} onChange={(e) => setI("clientName", e.target.value)} />}</Field>
        <Field label={t("clientAddress")}>{(p) => <Textarea {...p} rows={2} value={invoice.clientAddress} onChange={(e) => setI("clientAddress", e.target.value)} />}</Field>
      </Section>

      <Section title={t("items")}>
        <div className="space-y-3">
          {invoice.items.map((item, i) => {
            const update = (patch: Partial<typeof item>) => setI("items", invoice.items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <div key={i} className="grid grid-cols-6 gap-2 rounded-lg border p-2 sm:grid-cols-12">
                <Input aria-label={t("description")} placeholder={t("description")} className="col-span-6 sm:col-span-5" value={item.description} onChange={(e) => update({ description: e.target.value })} />
                <Input aria-label={t("qty")} type="number" min={0} step="any" className="col-span-2 sm:col-span-2" value={Number.isFinite(item.qty) ? item.qty : ""} onChange={(e) => update({ qty: e.target.valueAsNumber })} />
                <Input aria-label={t("unit")} placeholder={t("unit")} className="col-span-2 sm:col-span-2" value={item.unit} onChange={(e) => update({ unit: e.target.value })} />
                <Input aria-label={t("price")} type="number" min={0} step="any" placeholder={t("price")} className="col-span-2 sm:col-span-2" value={Number.isFinite(item.price) ? item.price : ""} onChange={(e) => update({ price: e.target.valueAsNumber })} />
                <Button variant="ghost" size="icon" aria-label={c("remove")} className="col-span-6 justify-self-end sm:col-span-1" onClick={() => setI("items", invoice.items.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
                <p className="col-span-6 text-right text-xs text-muted-foreground sm:col-span-12">{formatRupiah(Math.round((item.qty || 0) * (item.price || 0)))}</p>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => setI("items", [...invoice.items, { description: "", qty: 1, unit: "pcs", price: 0 }])}>
            <Plus /> {t("addItem")}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("discount")}>{(p) => <Input {...p} type="number" min={0} max={100} step="any" value={invoice.discountPercent} onChange={(e) => setI("discountPercent", e.target.valueAsNumber || 0)} />}</Field>
          <Field label={t("taxLabel")}>{(p) => <Input {...p} value={invoice.taxLabel} onChange={(e) => setI("taxLabel", e.target.value)} />}</Field>
          <Field label={t("tax")}>{(p) => <Input {...p} type="number" min={0} max={100} step="any" value={invoice.taxPercent} onChange={(e) => setI("taxPercent", e.target.valueAsNumber || 0)} />}</Field>
        </div>
        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span>{formatRupiah(totals.subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-base font-semibold">
            <span>{t("total")}</span>
            <span>{formatRupiah(totals.total)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground italic">{terbilangRupiah(totals.total)}</p>
        </div>
        <Field label={t("notes")}>{(p) => <Textarea {...p} rows={2} value={invoice.notes} onChange={(e) => setI("notes", e.target.value)} />}</Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox label={t("paid")} checked={invoice.paid} onChange={(e) => setI("paid", e.target.checked)} />
          <Button
            variant="secondary"
            onClick={() => {
              setReceipt((r) => ({
                ...r,
                receivedFrom: invoice.clientName,
                amount: totals.total,
                purpose: `Pelunasan invoice ${invoiceNumber(invoice)}`,
                receiverName: business.signer,
              }));
              setTab("receipt");
            }}
          >
            {t("toReceipt")} <ArrowRight />
          </Button>
        </div>
      </Section>
    </>
  );

  const receiptForm = (
    <Section title={t("receiptDetails")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("pattern")}>{(p) => <Input {...p} className="font-mono text-xs" value={receipt.numberPattern} onChange={(e) => setR("numberPattern", e.target.value)} />}</Field>
        <Field label={t("seq")}>{(p) => <Input {...p} type="number" min={1} value={receipt.seq} onChange={(e) => setR("seq", Math.max(1, Number(e.target.value)))} />}</Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
        <p className="font-mono text-sm">{t("number", { value: receiptNumber(receipt) })}</p>
        <Button size="sm" variant="secondary" onClick={() => setR("seq", receipt.seq + 1)}>
          <Plus /> {t("nextNumber")}
        </Button>
      </div>
      <Field label={t("receivedFrom")}>{(p) => <Input {...p} value={receipt.receivedFrom} onChange={(e) => setR("receivedFrom", e.target.value)} />}</Field>
      <Field label={t("amount")} hint={terbilangRupiah(receipt.amount || 0)}>
        {(p) => <Input {...p} type="number" min={0} step="any" value={Number.isFinite(receipt.amount) ? receipt.amount : ""} onChange={(e) => setR("amount", e.target.valueAsNumber || 0)} />}
      </Field>
      {receipt.amount > METERAI_THRESHOLD && <Alert>{t("meterai")}</Alert>}
      <Field label={t("purpose")}>{(p) => <Textarea {...p} rows={2} value={receipt.purpose} onChange={(e) => setR("purpose", e.target.value)} />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("place")}>{(p) => <Input {...p} value={receipt.place} onChange={(e) => setR("place", e.target.value)} />}</Field>
        <Field label={t("date")}>{(p) => <Input {...p} type="date" value={receipt.date} onChange={(e) => e.target.value && setR("date", e.target.value)} />}</Field>
        <Field label={t("receiver")} className="sm:col-span-2">
          {(p) => <Input {...p} value={receipt.receiverName} onChange={(e) => setR("receiverName", e.target.value)} />}
        </Field>
      </div>
    </Section>
  );

  return (
    <div className="space-y-5">
      <Tabs
        label={t("tabs")}
        value={tab}
        onChange={setTab}
        items={[
          { value: "invoice", label: t("invoice"), icon: <FileDown /> },
          { value: "receipt", label: t("receipt"), icon: <ReceiptText /> },
        ]}
      />
      <SplitLayout
        form={
          <>
            {tab === "invoice" ? invoiceForm : receiptForm}
            {businessSection}
          </>
        }
        preview={
          <PreviewPanel
            title={t("preview")}
            actions={
              <Button size="sm" onClick={download}>
                <FileDown /> {c("downloadPdf")}
              </Button>
            }
          >
            {current.failed && <Alert variant="error" className="mb-3">{t("previewError")}</Alert>}
            <PdfPreview data={current.pdf} maxPages={2} errorLabel={t("previewError")} />
          </PreviewPanel>
        }
      />
    </div>
  );
}
