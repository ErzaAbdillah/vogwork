"use client";

import { createRegistry, type ToolCategory, type ToolManifest } from "@vogwork/core";
import { useLocale, useT } from "@vogwork/i18n";
import { Badge, cn, EmptyState, Input } from "@vogwork/ui";
import { ArrowRight, Download, Search, WifiOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { categoryLabels, shell } from "@/lib/dict";
import { ToolIcon } from "./tool-icon";

function ToolCard({ tool }: { tool: ToolManifest }) {
  const t = useT(shell);
  const { locale } = useLocale();
  return (
    <Link
      href={`/alat/${tool.slug}`}
      className="group flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs backdrop-blur-xl transition-all outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <ToolIcon id={tool.id} icon={tool.icon} />
        <Badge variant="outline">{categoryLabels[tool.category][locale]}</Badge>
      </div>
      <div className="space-y-1">
        <h3 className="font-medium">{tool.name[locale]}</h3>
        <p className="text-sm text-muted-foreground">{tool.tagline[locale]}</p>
      </div>
      <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          {tool.downloadsOnFirstUse ? (
            <>
              <Download aria-hidden className="size-3.5" /> {t("firstUseDownload")}
            </>
          ) : (
            <>
              <WifiOff aria-hidden className="size-3.5" /> {t("worksOffline")}
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {t("open")} <ArrowRight aria-hidden className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

function AppCard({ tool }: { tool: ToolManifest }) {
  const { locale } = useLocale();
  return (
    <Link
      href={`/alat/${tool.slug}`}
      className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl border bg-card p-6 shadow-xs backdrop-blur-xl transition-all outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ToolIcon id={tool.id} icon={tool.icon} className="size-16" />
      <div className="space-y-1">
        <h3 className="text-xl font-light tracking-tight">{tool.name[locale]}</h3>
        <p className="text-sm text-muted-foreground">{tool.tagline[locale]}</p>
      </div>
      <ArrowRight aria-hidden className="absolute top-6 right-6 size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}

export function Hub({ tools }: { tools: ToolManifest[] }) {
  const t = useT(shell);
  const { locale } = useLocale();
  const registry = useMemo(() => createRegistry(tools), [tools]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | "all">("all");
  const input = useRef<HTMLInputElement>(null);

  // Tekan "/" untuk langsung mencari.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && !target.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = registry.search(query, locale).filter((tool) => category === "all" || tool.category === category);
  const apps = results.filter((tool) => tool.kind === "app");
  const utilities = results.filter((tool) => tool.kind !== "app");
  const categories = registry.categories();

  return (
    <div id="alat" className="space-y-8">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="h-12 rounded-full pl-10 text-base"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground sm:block">/</kbd>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Kategori">
        {(["all", ...categories] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3.5 py-1 text-sm backdrop-blur transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              category === c ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c === "all" ? t("all") : categoryLabels[c][locale]}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <EmptyState icon={<Search />} title={t("noResults", { q: query })}>
          {t("noResultsHint")}
        </EmptyState>
      ) : (
        <>
          {apps.length > 0 && (
            <section aria-labelledby="hub-apps" className="space-y-4">
              <h2 id="hub-apps" className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
                {t("appsTitle")}
              </h2>
              <ul className="grid gap-4 md:grid-cols-3">
                {apps.map((tool) => (
                  <li key={tool.id}>
                    <AppCard tool={tool} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {utilities.length > 0 && (
            <section aria-labelledby="hub-tools" className="space-y-4">
              <h2 id="hub-tools" className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
                {t("toolsTitle")}
              </h2>
              <ul data-testid="tool-list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {utilities.map((tool) => (
                  <li key={tool.id}>
                    <ToolCard tool={tool} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
