import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { AppNotices } from "@/components/app-notices";
import { themeScript } from "@/components/header-controls";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import "./globals.css";

// Plus Jakarta Sans: huruf karya desainer Indonesia (Tokotype), lisensi OFL.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "VogWork — Alat kerja gratis di browser, file tetap di perangkat Anda",
    template: "%s — VogWork",
  },
  description: site.description,
  applicationName: site.name,
  keywords: ["gabung pdf", "sertifikat massal", "surat dinas", "invoice gratis", "kwitansi", "ocr bahasa indonesia", "hapus background", "qr code"],
  openGraph: { type: "website", locale: "id_ID", siteName: site.name },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7fbfa" },
    { media: "(prefers-color-scheme: dark)", color: "#12191c" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <Providers>
          <SiteHeader />
          <main id="konten" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <AppNotices />
        </Providers>
      </body>
    </html>
  );
}
