import { ChevronRight, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { L, T } from "@/components/t";
import { ToolHost } from "@/components/tool-host";
import { ToolIcon } from "@/components/tool-icon";
import { findManifest, manifests } from "@/lib/manifests";
import { site } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return manifests.map((m) => ({ slug: m.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = findManifest((await params).slug);
  if (!tool) return {};
  return {
    title: tool.seo.title,
    description: tool.seo.description,
    keywords: tool.keywords,
    alternates: { canonical: `/alat/${tool.slug}` },
    openGraph: { title: tool.seo.title, description: tool.seo.description, url: `/alat/${tool.slug}` },
  };
}

export default async function ToolPage({ params }: Props) {
  const tool = findManifest((await params).slug);
  if (!tool) notFound();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: tool.name.id,
      url: `${site.url}/alat/${tool.slug}`,
      description: tool.seo.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Semua (browser)",
      inLanguage: "id-ID",
      offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: tool.seo.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <div className={tool.wide ? "mx-auto max-w-[1440px] px-4 py-6 sm:py-8" : "mx-auto max-w-6xl px-4 py-6 sm:py-8"}>
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          <T k="home" />
        </Link>
        <ChevronRight aria-hidden className="size-3.5" />
        <span className="text-foreground">
          <L text={tool.name} />
        </span>
      </nav>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <ToolIcon id={tool.id} icon={tool.icon} className="size-14" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-light tracking-tight sm:text-4xl">
            <L text={tool.name} />
          </h1>
          <p className="mt-1 text-muted-foreground">
            <L text={tool.tagline} />
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success sm:self-center">
          <ShieldCheck aria-hidden className="size-3.5" />
          <T k="privacyNote" />
        </p>
      </header>

      {tool.downloadsOnFirstUse && (
        <p className="mb-4 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <L text={tool.downloadsOnFirstUse} />
        </p>
      )}

      <ToolHost id={tool.id} />

      <section className="mt-16 grid gap-10 border-t pt-10 lg:grid-cols-2" lang="id">
        <div>
          <h2 className="text-xl font-bold">
            <T k="howTo" />
          </h2>
          <ol className="mt-4 space-y-3">
            {tool.seo.steps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                <span className="pt-0.5 text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="text-xl font-bold">
            <T k="faq" />
          </h2>
          <dl className="mt-4 space-y-4">
            {tool.seo.faq.map((f) => (
              <div key={f.q}>
                <dt className="font-medium">{f.q}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
