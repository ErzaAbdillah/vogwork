"use client";

import { createRegistry, type ToolCategory, type ToolManifest } from "@vogwork/core";
import { useLocale, useT } from "@vogwork/i18n";
import { Badge, cn, EmptyState, Input } from "@vogwork/ui";
import { ArrowRight, Download, Search, WifiOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { categoryLabels, shell } from "@/lib/dict";
import { ToolIcon } from "./tool-icon";

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
  const categories = registry.categories();

  return (
    <div id="alat" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-11 pl-9 text-base"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground sm:block">/</kbd>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Kategori">
        {(["all", ...categories] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((tool) => (
            <li key={tool.id}>
              <Link
                href={`/alat/${tool.slug}`}
                className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs transition-all outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5">
                    <ToolIcon name={tool.icon} />
                  </span>
                  <Badge variant="outline">{categoryLabels[tool.category][locale]}</Badge>
                </div>
                <div className="space-y-1">
                  <h2 className="font-semibold">{tool.name[locale]}</h2>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
