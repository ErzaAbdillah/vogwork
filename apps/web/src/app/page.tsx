import { FileSpreadsheet, FileText, Presentation, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { Hub } from "@/components/hub";
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
      <section className="relative overflow-hidden border-b">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background:var(--brand-gradient)] dark:opacity-[0.12]" />
        <div aria-hidden className="pointer-events-none absolute -top-24 right-[-10%] size-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-12 sm:pt-20 sm:pb-16">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
            <ShieldCheck aria-hidden className="size-3.5 text-primary" />
            <T k="heroBadge" />
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl">
            <T k="heroTitle" />
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
            <T k="heroBody" />
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <Hub tools={manifests} />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="kenapa">
        <h2 id="kenapa" className="text-2xl font-bold tracking-tight">
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
            <div key={title} className="rounded-xl border bg-card p-5">
              <Icon aria-hidden className="size-5 text-primary" />
              <h3 className="mt-3 font-semibold">
                <T k={title} />
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                <T k={body} />
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-dashed p-5 sm:flex-row sm:items-center">
          <div className="flex gap-2 text-muted-foreground">
            <FileText aria-hidden className="size-5" />
            <FileSpreadsheet aria-hidden className="size-5" />
            <Presentation aria-hidden className="size-5" />
          </div>
          <div>
            <p className="font-semibold">
              <T k="soonTitle" />
            </p>
            <p className="text-sm text-muted-foreground">
              <T k="soonBody" />
            </p>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
