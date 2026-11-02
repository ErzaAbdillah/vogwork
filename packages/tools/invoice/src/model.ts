import { formatNomor, toIsoDate } from "@vogwork/formats";

export interface Business {
  name: string;
  address: string;
  phone: string;
  email: string;
  npwp: string;
  logo: string | null;
  bank: string;
  signer: string;
}

export interface LineItem {
  description: string;
  qty: number;
  unit: string;
  price: number;
}

export interface Invoice {
  numberPattern: string;
  seq: number;
  date: string;
  dueDate: string;
  clientName: string;
  clientAddress: string;
  items: LineItem[];
  discountPercent: number;
  taxPercent: number;
  taxLabel: string;
  notes: string;
  paid: boolean;
}

export interface Receipt {
  numberPattern: string;
  seq: number;
  receivedFrom: string;
  amount: number;
  purpose: string;
  place: string;
  date: string;
  receiverName: string;
}

export const defaultBusiness: Business = {
  name: "Toko Contoh Sejahtera",
  address: "Jl. Pahlawan No. 10, Kota Contoh",
  phone: "0812-0000-0000",
  email: "halo@tokocontoh.id",
  npwp: "",
  logo: null,
  bank: "Bank Contoh 1234567890 a.n. Toko Contoh Sejahtera",
  signer: "Nama Pemilik",
};

const today = () => toIsoDate(new Date());
const inDays = (days: number) => toIsoDate(new Date(Date.now() + days * 86_400_000));

export const defaultInvoice = (): Invoice => ({
  numberPattern: "INV/{tahun}/{bulan}/{nomor:3}",
  seq: 1,
  date: today(),
  dueDate: inDays(14),
  clientName: "CV Pelanggan Setia",
  clientAddress: "Jl. Melati No. 5, Kota Contoh",
  items: [
    { description: "Desain logo dan identitas usaha", qty: 1, unit: "paket", price: 1_500_000 },
    { description: "Cetak kartu nama (box isi 100)", qty: 3, unit: "box", price: 85_000 },
  ],
  discountPercent: 0,
  taxPercent: 0,
  taxLabel: "PPN",
  notes: "Terima kasih atas kepercayaan Anda.",
  paid: false,
});

export const defaultReceipt = (): Receipt => ({
  numberPattern: "KW/{tahun}/{bulan}/{nomor:3}",
  seq: 1,
  receivedFrom: "CV Pelanggan Setia",
  amount: 1_755_000,
  purpose: "Pembayaran desain logo dan cetak kartu nama",
  place: "Kota Contoh",
  date: today(),
  receiverName: "Nama Pemilik",
});

export interface Totals {
  subtotal: number;
  discount: number;
  base: number;
  tax: number;
  total: number;
}

/** Diskon dihitung dari subtotal; pajak dihitung dari dasar setelah diskon. Dibulatkan ke rupiah. */
export function computeTotals(invoice: Pick<Invoice, "items" | "discountPercent" | "taxPercent">): Totals {
  const subtotal = invoice.items.reduce((sum, item) => sum + Math.round((item.qty || 0) * (item.price || 0)), 0);
  const discount = Math.round((subtotal * (invoice.discountPercent || 0)) / 100);
  const base = subtotal - discount;
  const tax = Math.round((base * (invoice.taxPercent || 0)) / 100);
  return { subtotal, discount, base, tax, total: base + tax };
}

export function invoiceNumber(invoice: Invoice): string {
  return formatNomor(invoice.numberPattern, { nomor: invoice.seq, date: new Date(`${invoice.date}T00:00:00`) });
}

export function receiptNumber(receipt: Receipt): string {
  return formatNomor(receipt.numberPattern, { nomor: receipt.seq, date: new Date(`${receipt.date}T00:00:00`) });
}

/** Batas nominal dokumen yang dikenai bea meterai Rp10.000 (UU 10/2020). */
export const METERAI_THRESHOLD = 5_000_000;
