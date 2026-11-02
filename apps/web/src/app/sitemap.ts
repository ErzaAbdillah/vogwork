import type { MetadataRoute } from "next";
import { manifests } from "@/lib/manifests";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/`, changeFrequency: "weekly", priority: 1 },
    ...manifests.map((m) => ({ url: `${site.url}/alat/${m.slug}`, changeFrequency: "monthly" as const, priority: 0.9 })),
    { url: `${site.url}/tentang`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
