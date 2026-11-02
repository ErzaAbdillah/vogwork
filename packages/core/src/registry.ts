import type { Locale, ToolCategory, ToolManifest } from "./types";

export interface Registry<T extends ToolManifest> {
  list(): readonly T[];
  get(id: string): T | undefined;
  bySlug(slug: string): T | undefined;
  categories(): ToolCategory[];
  search(query: string, locale: Locale): T[];
}

/** Huruf kecil tanpa diakritik, supaya "sertifikat" cocok dengan "Sertifikát". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function score(tool: ToolManifest, terms: string[], locale: Locale): number {
  const name = normalize(tool.name[locale]);
  const otherName = normalize(tool.name[locale === "id" ? "en" : "id"]);
  const tagline = normalize(`${tool.tagline.id} ${tool.tagline.en}`);
  const keywords = tool.keywords.map(normalize);

  let total = 0;
  for (const term of terms) {
    let best = 0;
    if (name.startsWith(term)) best = 10;
    else if (name.includes(term)) best = 8;
    else if (otherName.includes(term)) best = 6;
    else if (keywords.some((k) => k.startsWith(term))) best = 5;
    else if (keywords.some((k) => k.includes(term))) best = 4;
    else if (tagline.includes(term)) best = 2;
    else if (tool.category.startsWith(term)) best = 1;
    // Semua kata harus cocok; satu kata yang tidak cocok menggugurkan tool.
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

export function createRegistry<T extends ToolManifest>(tools: readonly T[]): Registry<T> {
  const byId = new Map<string, T>();
  const bySlug = new Map<string, T>();
  for (const tool of tools) {
    if (byId.has(tool.id)) throw new Error(`Tool dengan id "${tool.id}" terdaftar dua kali`);
    if (bySlug.has(tool.slug)) throw new Error(`Slug "${tool.slug}" dipakai dua tool`);
    byId.set(tool.id, tool);
    bySlug.set(tool.slug, tool);
  }

  return {
    list: () => tools,
    get: (id) => byId.get(id),
    bySlug: (slug) => bySlug.get(slug),
    categories: () => [...new Set(tools.map((t) => t.category))],
    search(query, locale) {
      const terms = normalize(query).split(/\s+/).filter(Boolean);
      if (terms.length === 0) return [...tools];
      return tools
        .map((tool) => ({ tool, s: score(tool, terms, locale) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((r) => r.tool);
    },
  };
}
