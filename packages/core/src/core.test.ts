import { describe, expect, it } from "vitest";
import { createRegistry, portsCompatible, runPipeline, topoSort, validatePipeline, type PipelineDef, type VogTool } from "./index";

function tool(id: string, partial: Partial<VogTool>): VogTool {
  return {
    id,
    slug: id,
    name: { id: id, en: id },
    tagline: { id: "", en: "" },
    category: "util",
    icon: "box",
    keywords: [],
    inputs: [],
    outputs: [],
    seo: { title: "", description: "", steps: [], faq: [] },
    run: async () => ({}),
    ui: async () => ({ default: () => null }),
    ...partial,
  };
}

const upper = tool("upper", {
  name: { id: "Huruf Besar", en: "Uppercase" },
  keywords: ["kapital"],
  inputs: [{ name: "text", type: "text" }],
  outputs: [{ name: "text", type: "text" }],
  run: async (input) => ({ text: String(input.text).toUpperCase() }),
});
const exclaim = tool("exclaim", {
  inputs: [{ name: "text", type: "text" }],
  outputs: [{ name: "text", type: "text" }],
  run: async (input, ctx) => ({ text: `${input.text}${"!".repeat(Number(ctx.params?.count ?? 1))}` }),
});
const pdf = tool("pdf", {
  name: { id: "Gabung PDF", en: "Merge PDF" },
  inputs: [{ name: "files", type: "file/pdf", multiple: true }],
  outputs: [{ name: "pdf", type: "file/pdf" }],
});

describe("registry", () => {
  const registry = createRegistry([upper, exclaim, pdf]);

  it("menolak id ganda", () => {
    expect(() => createRegistry([upper, upper])).toThrow(/dua kali/);
  });

  it("mencari berdasarkan nama, kata kunci, dan bahasa lain", () => {
    expect(registry.search("gabung", "id").map((t) => t.id)).toEqual(["pdf"]);
    expect(registry.search("merge", "id").map((t) => t.id)).toEqual(["pdf"]);
    expect(registry.search("kapital", "en").map((t) => t.id)).toEqual(["upper"]);
    expect(registry.search("", "id")).toHaveLength(3);
    expect(registry.search("tidakada", "id")).toHaveLength(0);
  });
});

describe("pipeline", () => {
  const registry = createRegistry([upper, exclaim, pdf]);
  const def: PipelineDef = {
    version: 1,
    nodes: [
      { id: "a", tool: "upper" },
      { id: "b", tool: "exclaim", params: { count: 3 } },
    ],
    edges: [{ from: { node: "a", port: "text" }, to: { node: "b", port: "text" } }],
  };

  it("mencocokkan port", () => {
    expect(portsCompatible({ name: "o", type: "file/pdf" }, { name: "i", type: "file/any" })).toBe(true);
    expect(portsCompatible({ name: "o", type: "text" }, { name: "i", type: "file/pdf" })).toBe(false);
    expect(portsCompatible({ name: "o", type: "file/pdf", multiple: true }, { name: "i", type: "file/pdf" })).toBe(false);
  });

  it("mendeteksi port yang tidak cocok dan siklus", () => {
    expect(validatePipeline(def, registry)).toEqual([]);
    const bad: PipelineDef = { ...def, edges: [{ from: { node: "a", port: "text" }, to: { node: "b", port: "files" } }] };
    expect(validatePipeline(bad, registry).join()).toMatch(/tidak punya input/);
    const cyclic: PipelineDef = { ...def, edges: [...def.edges, { from: { node: "b", port: "text" }, to: { node: "a", port: "text" } }] };
    expect(() => topoSort(cyclic)).toThrow(/siklus/);
  });

  it("menjalankan node berurutan dan meneruskan params", async () => {
    const result = await runPipeline(def, registry, { a: { text: "halo" } }, { locale: "id" });
    expect(result.b?.text).toBe("HALO!!!");
  });
});
