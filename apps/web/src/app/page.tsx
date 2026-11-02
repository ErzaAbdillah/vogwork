import { ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { Hub } from "@/components/hub";
import { MindfulFigure } from "@/components/mindful-figure";
import { T } from "@/components/t";
import { manifests } from "@/lib/manifests";
import { site } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  url: site.url,
  inLanguage: "id-ID",
  description: site.description,
};

export default function HomePage() {
  return (
    <>
      <section className="relative">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-12 pb-8 md:grid-cols-[1.25fr_1fr] md:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <ShieldCheck aria-hidden className="size-3.5 text-primary" />
              <T k="heroBadge" />
            </p>
            <h1 className="mt-6 max-w-2xl text-5xl leading-[1.02] font-light tracking-tight text-balance sm:text-6xl">
              <T k="heroTitle" />
            </h1>
            <p className="mt-5 max-w-xl text-lg font-light text-pretty text-muted-foreground">
              <T k="heroBody" />
            </p>
          </div>
          <MindfulFigure className="mx-auto max-w-[17rem] md:max-w-sm" />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <Hub tools={manifests} />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="kenapa">
        <h2 id="kenapa" className="text-3xl font-light tracking-tight">
          <T k="whyTitle" />
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(
            [
              [ShieldCheck, "why1Title", "why1Body"],
              [Wallet, "why2Title", "why2Body"],
              [Sparkles, "why3Title", "why3Body"],
            ] as const
          ).map(([Icon, title, body]) => (
            <div key={title} className="rounded-2xl border bg-card p-5 backdrop-blur-xl">
              <Icon aria-hidden className="size-5 text-primary" />
              <h3 className="mt-3 font-medium">
                <T k={title} />
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                <T k={body} />
              </p>
            </div>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
