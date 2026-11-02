import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VogWork — Alat kerja di browser",
    short_name: site.name,
    description: site.description,
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#d9dee5",
    theme_color: "#2f9a45",
    categories: ["productivity", "business", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
