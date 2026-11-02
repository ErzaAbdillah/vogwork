import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import type { ReactNode } from "react";
import { AppNotices } from "@/components/app-notices";
import { themeScript } from "@/components/header-controls";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import "./globals.css";

// Inter Tight: grotesk tipis dan tenang untuk tema "mindful", lisensi OFL.
const tight = Inter_Tight({ subsets: ["latin"], variable: "--font-tight", display: "swap" });

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
    { media: "(prefers-color-scheme: light)", color: "#d9dee5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1013" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={tight.variable} suppressHydrationWarning>
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
