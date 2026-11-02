export type QrKind = "text" | "wifi" | "whatsapp" | "email" | "vcard";

export interface QrData {
  text: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: "WPA" | "WEP" | "nopass";
  wifiHidden: boolean;
  waPhone: string;
  waMessage: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  vName: string;
  vOrg: string;
  vTitle: string;
  vPhone: string;
  vEmail: string;
  vUrl: string;
  vAddress: string;
}

export const emptyData: QrData = {
  text: "https://",
  wifiSsid: "",
  wifiPassword: "",
  wifiSecurity: "WPA",
  wifiHidden: false,
  waPhone: "",
  waMessage: "",
  emailTo: "",
  emailSubject: "",
  emailBody: "",
  vName: "",
  vOrg: "",
  vTitle: "",
  vPhone: "",
  vEmail: "",
  vUrl: "",
  vAddress: "",
};

const escapeWifi = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
const escapeVcard = (s: string) => s.replace(/([\\;,])/g, "\\$1").replace(/\n/g, "\\n");

/** Nomor lokal "0812-3456-789" menjadi format internasional "628123456789". */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits;
}

export function buildPayload(kind: QrKind, d: QrData): string {
  switch (kind) {
    case "text":
      return d.text;
    case "wifi":
      if (!d.wifiSsid) return "";
      return `WIFI:T:${d.wifiSecurity};S:${escapeWifi(d.wifiSsid)};${d.wifiSecurity === "nopass" ? "" : `P:${escapeWifi(d.wifiPassword)};`}${d.wifiHidden ? "H:true;" : ""};`;
    case "whatsapp": {
      const phone = normalizePhone(d.waPhone);
      if (!phone) return "";
      return `https://wa.me/${phone}${d.waMessage ? `?text=${encodeURIComponent(d.waMessage)}` : ""}`;
    }
    case "email": {
      if (!d.emailTo) return "";
      const params = new URLSearchParams();
      if (d.emailSubject) params.set("subject", d.emailSubject);
      if (d.emailBody) params.set("body", d.emailBody);
      const query = params.toString().replace(/\+/g, "%20");
      return `mailto:${d.emailTo}${query ? `?${query}` : ""}`;
    }
    case "vcard": {
      if (!d.vName) return "";
      const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:;${escapeVcard(d.vName)};;;`, `FN:${escapeVcard(d.vName)}`];
      if (d.vOrg) lines.push(`ORG:${escapeVcard(d.vOrg)}`);
      if (d.vTitle) lines.push(`TITLE:${escapeVcard(d.vTitle)}`);
      if (d.vPhone) lines.push(`TEL;TYPE=CELL:+${normalizePhone(d.vPhone)}`);
      if (d.vEmail) lines.push(`EMAIL:${d.vEmail}`);
      if (d.vUrl) lines.push(`URL:${d.vUrl}`);
      if (d.vAddress) lines.push(`ADR:;;${escapeVcard(d.vAddress)};;;;`);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
  }
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Rasio kontras WCAG; pemindai QR butuh modul gelap di atas latar terang. */
export function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
