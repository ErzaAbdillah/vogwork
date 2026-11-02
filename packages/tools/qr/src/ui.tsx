"use client";

import { toPngDataUrl } from "@vogwork/formats/image";
import { common, useT } from "@vogwork/i18n";
import { saveBlob, usePersistentState } from "@vogwork/storage";
import { Alert, Button, Checkbox, ColorInput, Dropzone, Field, Input, PreviewPanel, Section, Segmented, Select, SplitLayout, Tabs, Textarea } from "@vogwork/ui";
import { Contact, Copy, Download, ImagePlus, Link2, Mail, MessageCircle, Trash2, Wifi } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { buildPayload, contrastRatio, emptyData, type QrData, type QrKind } from "./payload";

const dict = {
  id: {
    type: "Jenis QR",
    kindText: "Tautan / teks",
    kindWifi: "WiFi",
    kindWa: "WhatsApp",
    kindEmail: "Email",
    kindVcard: "Kontak",
    content: "Isi QR",
    text: "Tautan atau teks",
    ssid: "Nama jaringan (SSID)",
    password: "Kata sandi",
    security: "Keamanan",
    noPassword: "Tanpa kata sandi",
    hidden: "Jaringan tersembunyi",
    phone: "Nomor WhatsApp",
    phoneHint: "Boleh diawali 0 atau +62.",
    message: "Pesan awal (opsional)",
    to: "Alamat email",
    subject: "Subjek",
    body: "Isi email",
    name: "Nama lengkap",
    org: "Instansi / perusahaan",
    jobTitle: "Jabatan",
    contactPhone: "Telepon",
    url: "Situs web",
    address: "Alamat",
    style: "Tampilan",
    size: "Ukuran unduhan",
    margin: "Tepi kosong",
    foreground: "Warna QR",
    background: "Warna latar",
    transparent: "Latar transparan (PNG/SVG)",
    ecc: "Koreksi galat",
    eccHint: "Makin tinggi, makin tahan rusak, tetapi pola makin rapat.",
    logo: "Logo di tengah",
    logoHint: "PNG/JPG. Koreksi galat otomatis dinaikkan ke H.",
    logoSize: "Ukuran logo",
    removeLogo: "Hapus logo",
    preview: "Pratinjau",
    empty: "Isi data di sebelah kiri untuk membuat QR.",
    tooLong: "Data terlalu panjang untuk satu QR code. Persingkat teksnya.",
    lowContrast: "Kontras warna rendah. QR mungkin sulit dipindai; pakai warna QR gelap di atas latar terang.",
    png: "PNG",
    svg: "SVG",
    copyImage: "Salin gambar",
    copied: "Gambar tersalin",
    copyFailed: "Browser ini tidak mengizinkan menyalin gambar.",
  },
  en: {
    type: "QR type",
    kindText: "Link / text",
    kindWifi: "Wi-Fi",
    kindWa: "WhatsApp",
    kindEmail: "Email",
    kindVcard: "Contact",
    content: "QR content",
    text: "Link or text",
    ssid: "Network name (SSID)",
    password: "Password",
    security: "Security",
    noPassword: "No password",
    hidden: "Hidden network",
    phone: "WhatsApp number",
    phoneHint: "May start with 0 or +62.",
    message: "Opening message (optional)",
    to: "Email address",
    subject: "Subject",
    body: "Body",
    name: "Full name",
    org: "Organization",
    jobTitle: "Job title",
    contactPhone: "Phone",
    url: "Website",
    address: "Address",
    style: "Appearance",
    size: "Download size",
    margin: "Quiet zone",
    foreground: "QR color",
    background: "Background color",
    transparent: "Transparent background (PNG/SVG)",
    ecc: "Error correction",
    eccHint: "Higher levels survive more damage but make the pattern denser.",
    logo: "Center logo",
    logoHint: "PNG/JPG. Error correction is raised to H automatically.",
    logoSize: "Logo size",
    removeLogo: "Remove logo",
    preview: "Preview",
    empty: "Fill in the data on the left to create a QR code.",
    tooLong: "The data is too long for a single QR code. Shorten the text.",
    lowContrast: "Low color contrast. The QR may be hard to scan; use a dark QR color on a light background.",
    png: "PNG",
    svg: "SVG",
    copyImage: "Copy image",
    copied: "Image copied",
    copyFailed: "This browser does not allow copying images.",
  },
};

interface Style {
  size: number;
  margin: number;
  fg: string;
  bg: string;
  transparent: boolean;
  ecc: "L" | "M" | "Q" | "H";
  logo: string | null;
  logoScale: number;
}

const defaultStyle: Style = { size: 1024, margin: 2, fg: "#0f172a", bg: "#ffffff", transparent: false, ecc: "M", logo: null, logoScale: 0.22 };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderQr(canvas: HTMLCanvasElement, payload: string, style: Style, width: number) {
  await QRCode.toCanvas(canvas, payload, {
    width,
    margin: style.margin,
    errorCorrectionLevel: style.logo ? "H" : style.ecc,
    color: { dark: style.fg, light: style.transparent ? "#00000000" : style.bg },
  });
  // qrcode memasang lebar/tinggi inline; biarkan CSS yang mengatur ukuran tampilan.
  canvas.style.removeProperty("width");
  canvas.style.removeProperty("height");
  if (!style.logo) return;
  const ctx = canvas.getContext("2d")!;
  const img = await loadImage(style.logo);
  const box = canvas.width * style.logoScale;
  const ratio = img.width / img.height;
  const w = ratio >= 1 ? box : box * ratio;
  const h = ratio >= 1 ? box / ratio : box;
  const pad = box * 0.1;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  ctx.fillStyle = style.transparent ? "#ffffff" : style.bg;
  ctx.beginPath();
  ctx.roundRect(x - pad, y - pad, w + pad * 2, h + pad * 2, pad);
  ctx.fill();
  ctx.drawImage(img, x, y, w, h);
}

async function buildSvg(payload: string, style: Style): Promise<string> {
  let svg = await QRCode.toString(payload, {
    type: "svg",
    width: style.size,
    margin: style.margin,
    errorCorrectionLevel: style.logo ? "H" : style.ecc,
    color: { dark: style.fg, light: style.transparent ? "#00000000" : style.bg },
  });
  if (style.logo) {
    const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
    const n = Number(viewBox?.[1] ?? 0);
    const img = await loadImage(style.logo);
    const box = n * style.logoScale;
    const ratio = img.width / img.height;
    const w = ratio >= 1 ? box : box * ratio;
    const h = ratio >= 1 ? box / ratio : box;
    const pad = box * 0.1;
    const x = (n - w) / 2;
    const y = (n - h) / 2;
    const fill = style.transparent ? "#ffffff" : style.bg;
    svg = svg.replace(
      "</svg>",
      `<rect x="${x - pad}" y="${y - pad}" width="${w + pad * 2}" height="${h + pad * 2}" rx="${pad}" fill="${fill}"/><image href="${style.logo}" x="${x}" y="${y}" width="${w}" height="${h}"/></svg>`,
    );
  }
  return svg;
}

export default function QrTool() {
  const t = useT(dict);
  const c = useT(common);
  const [kind, setKind] = usePersistentState<QrKind>("tool.qr.kind", "text");
  const [data, setData] = usePersistentState<QrData>("tool.qr.data", emptyData);
  const [style, setStyle] = usePersistentState<Style>("tool.qr.style", defaultStyle);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const preview = useRef<HTMLCanvasElement>(null);

  const built = buildPayload(kind, data);
  const payload = built.trim() && built !== "https://" ? built : "";
  const update = <K extends keyof QrData>(key: K, value: QrData[K]) => setData((d) => ({ ...d, [key]: value }));
  const lowContrast = !style.transparent && contrastRatio(style.fg, style.bg) < 3;

  useEffect(() => {
    if (!payload || !preview.current) return;
    const timer = setTimeout(() => {
      renderQr(preview.current!, payload, style, 640)
        .then(() => setError(null))
        .catch(() => setError(t("tooLong")));
    }, 120);
    return () => clearTimeout(timer);
  }, [payload, style, t]);

  const pngBlob = async () => {
    const canvas = document.createElement("canvas");
    await renderQr(canvas, payload, style, style.size);
    return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG gagal"))), "image/png"));
  };

  const filename = `qr-${kind}`;

  return (
    <SplitLayout
      form={
        <>
          <Tabs
            label={t("type")}
            value={kind}
            onChange={setKind}
            items={[
              { value: "text", label: t("kindText"), icon: <Link2 /> },
              { value: "wifi", label: t("kindWifi"), icon: <Wifi /> },
              { value: "whatsapp", label: t("kindWa"), icon: <MessageCircle /> },
              { value: "email", label: t("kindEmail"), icon: <Mail /> },
              { value: "vcard", label: t("kindVcard"), icon: <Contact /> },
            ]}
          />

          <Section title={t("content")}>
            {kind === "text" && (
              <Field label={t("text")}>{(p) => <Textarea {...p} rows={3} value={data.text} onChange={(e) => update("text", e.target.value)} />}</Field>
            )}
            {kind === "wifi" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("ssid")}>{(p) => <Input {...p} value={data.wifiSsid} onChange={(e) => update("wifiSsid", e.target.value)} />}</Field>
                <Field label={t("security")}>
                  {(p) => (
                    <Select {...p} value={data.wifiSecurity} onChange={(e) => update("wifiSecurity", e.target.value as QrData["wifiSecurity"])}>
                      <option value="WPA">WPA/WPA2/WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">{t("noPassword")}</option>
                    </Select>
                  )}
                </Field>
                {data.wifiSecurity !== "nopass" && (
                  <Field label={t("password")}>{(p) => <Input {...p} value={data.wifiPassword} onChange={(e) => update("wifiPassword", e.target.value)} />}</Field>
                )}
                <Checkbox className="self-end pb-2" label={t("hidden")} checked={data.wifiHidden} onChange={(e) => update("wifiHidden", e.target.checked)} />
              </div>
            )}
            {kind === "whatsapp" && (
              <>
                <Field label={t("phone")} hint={t("phoneHint")}>
                  {(p) => <Input {...p} inputMode="tel" placeholder="0812 3456 7890" value={data.waPhone} onChange={(e) => update("waPhone", e.target.value)} />}
                </Field>
                <Field label={t("message")}>{(p) => <Textarea {...p} rows={2} value={data.waMessage} onChange={(e) => update("waMessage", e.target.value)} />}</Field>
              </>
            )}
            {kind === "email" && (
              <>
                <Field label={t("to")}>{(p) => <Input {...p} type="email" value={data.emailTo} onChange={(e) => update("emailTo", e.target.value)} />}</Field>
                <Field label={t("subject")}>{(p) => <Input {...p} value={data.emailSubject} onChange={(e) => update("emailSubject", e.target.value)} />}</Field>
                <Field label={t("body")}>{(p) => <Textarea {...p} rows={2} value={data.emailBody} onChange={(e) => update("emailBody", e.target.value)} />}</Field>
              </>
            )}
            {kind === "vcard" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("name")}>{(p) => <Input {...p} value={data.vName} onChange={(e) => update("vName", e.target.value)} />}</Field>
                <Field label={t("contactPhone")}>{(p) => <Input {...p} inputMode="tel" value={data.vPhone} onChange={(e) => update("vPhone", e.target.value)} />}</Field>
                <Field label={t("org")}>{(p) => <Input {...p} value={data.vOrg} onChange={(e) => update("vOrg", e.target.value)} />}</Field>
                <Field label={t("jobTitle")}>{(p) => <Input {...p} value={data.vTitle} onChange={(e) => update("vTitle", e.target.value)} />}</Field>
                <Field label="Email">{(p) => <Input {...p} type="email" value={data.vEmail} onChange={(e) => update("vEmail", e.target.value)} />}</Field>
                <Field label={t("url")}>{(p) => <Input {...p} value={data.vUrl} onChange={(e) => update("vUrl", e.target.value)} />}</Field>
                <Field label={t("address")} className="sm:col-span-2">
                  {(p) => <Input {...p} value={data.vAddress} onChange={(e) => update("vAddress", e.target.value)} />}
                </Field>
              </div>
            )}
          </Section>

          <Section title={t("style")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("foreground")}>{() => <ColorInput label={t("foreground")} value={style.fg} onChange={(fg) => setStyle((s) => ({ ...s, fg }))} />}</Field>
              <Field label={t("background")}>{() => <ColorInput label={t("background")} value={style.bg} onChange={(bg) => setStyle((s) => ({ ...s, bg }))} />}</Field>
              <Field label={`${t("size")}: ${style.size}px`}>
                {(p) => <input {...p} type="range" min={256} max={2048} step={128} value={style.size} onChange={(e) => setStyle((s) => ({ ...s, size: Number(e.target.value) }))} className="accent-primary" />}
              </Field>
              <Field label={`${t("margin")}: ${style.margin}`}>
                {(p) => <input {...p} type="range" min={0} max={8} value={style.margin} onChange={(e) => setStyle((s) => ({ ...s, margin: Number(e.target.value) }))} className="accent-primary" />}
              </Field>
              <Field label={t("ecc")} hint={t("eccHint")}>
                {() => (
                  <Segmented
                    label={t("ecc")}
                    value={style.logo ? "H" : style.ecc}
                    onChange={(ecc) => setStyle((s) => ({ ...s, ecc }))}
                    options={(["L", "M", "Q", "H"] as const).map((v) => ({ value: v, label: v }))}
                  />
                )}
              </Field>
              <Checkbox className="self-start pt-7" label={t("transparent")} checked={style.transparent} onChange={(e) => setStyle((s) => ({ ...s, transparent: e.target.checked }))} />
            </div>
            {lowContrast && <Alert>{t("lowContrast")}</Alert>}

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("logo")}</p>
              {style.logo ? (
                <div className="flex flex-wrap items-center gap-4">
                  <img src={style.logo} alt="" className="size-14 rounded-md border bg-white object-contain p-1" />
                  <Field label={`${t("logoSize")}: ${Math.round(style.logoScale * 100)}%`} className="min-w-40 flex-1">
                    {(p) => (
                      <input {...p} type="range" min={0.12} max={0.3} step={0.01} value={style.logoScale} onChange={(e) => setStyle((s) => ({ ...s, logoScale: Number(e.target.value) }))} className="accent-primary" />
                    )}
                  </Field>
                  <Button variant="ghost" size="sm" onClick={() => setStyle((s) => ({ ...s, logo: null }))}>
                    <Trash2 /> {t("removeLogo")}
                  </Button>
                </div>
              ) : (
                <Dropzone
                  compact
                  accept="image/*"
                  icon={<ImagePlus />}
                  title={t("logo")}
                  hint={t("logoHint")}
                  onFiles={async ([file]) => {
                    const logo = await toPngDataUrl(file!, 400);
                    setStyle((s) => ({ ...s, logo }));
                  }}
                />
              )}
            </div>
          </Section>
        </>
      }
      preview={
        <PreviewPanel
          title={t("preview")}
          actions={
            payload && !error ? (
              <>
                <Button size="sm" variant="outline" onClick={async () => saveBlob(new Blob([await buildSvg(payload, style)], { type: "image/svg+xml" }), `${filename}.svg`)}>
                  <Download /> {t("svg")}
                </Button>
                <Button size="sm" onClick={async () => saveBlob(await pngBlob(), `${filename}.png`)}>
                  <Download /> {t("png")}
                </Button>
              </>
            ) : null
          }
        >
          {!payload ? (
            <p className="py-24 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {error && <Alert variant="error">{error}</Alert>}
              {/* Kanvas tetap terpasang saat galat supaya pratinjau pulih begitu teks dipersingkat. */}
              <div className={error ? "hidden" : "checkerboard rounded-lg p-3 shadow-sm"}>
                <canvas ref={preview} className="block aspect-square w-full max-w-[320px]" aria-label={t("preview")} role="img" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob() })]);
                    setCopied("ok");
                  } catch {
                    setCopied("fail");
                  }
                  setTimeout(() => setCopied(null), 2500);
                }}
              >
                <Copy /> {copied === "ok" ? t("copied") : copied === "fail" ? t("copyFailed") : t("copyImage")}
              </Button>
              <p className="max-w-full truncate font-mono text-xs text-muted-foreground" title={payload}>
                {payload.split("\n")[0]}
              </p>
            </div>
          )}
          <span className="sr-only">{c("preview")}</span>
        </PreviewPanel>
      }
    />
  );
}
