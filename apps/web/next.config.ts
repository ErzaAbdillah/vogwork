import type { NextConfig } from "next";

const config: NextConfig = {
  // Situs diekspor statis (Cloudflare Pages); semua pemrosesan file berjalan di browser.
  output: "export",
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  transpilePackages: [
    "@vogwork/core",
    "@vogwork/formats",
    "@vogwork/i18n",
    "@vogwork/storage",
    "@vogwork/ui",
    "@vogwork/workers",
    "@vogwork/tool-bg-remove",
    "@vogwork/tool-doc-editor",
    "@vogwork/tool-sheet-editor",
    "@vogwork/tool-slide-editor",
    "@vogwork/tool-certificate",
    "@vogwork/tool-converter",
    "@vogwork/tool-invoice",
    "@vogwork/tool-letter-dinas",
    "@vogwork/tool-ocr",
    "@vogwork/tool-pdf-sign",
    "@vogwork/tool-pdf-toolkit",
    "@vogwork/tool-qr",
  ],
};

export default config;
