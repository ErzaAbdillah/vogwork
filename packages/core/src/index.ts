export * from "./types";
export * from "./registry";
export * from "./pipeline";

import type { ToolManifest, VogTool } from "./types";

/** Menggabungkan manifest ringan dengan implementasi yang dimuat lazy. */
export function defineTool(manifest: ToolManifest, impl: Pick<VogTool, "run" | "ui">): VogTool {
  return { ...manifest, ...impl };
}

export function pick<T>(text: Record<"id" | "en", T>, locale: "id" | "en"): T {
  return text[locale] ?? text.id;
}
