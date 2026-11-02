import type { Registry } from "./registry";
import type { PortSpec, ToolContext, ToolInput, ToolManifest, ToolOutput, VogTool } from "./types";

/**
 * Definisi pipeline berupa graf JSON sederhana: node = tool, edge = port.
 * Bentuk ini sengaja polos supaya bisa dibagikan sebagai template.
 */
export interface PipelineNode {
  id: string;
  tool: string;
  params?: Record<string, unknown>;
}

export interface PipelineEdge {
  from: { node: string; port: string };
  to: { node: string; port: string };
}

export interface PipelineDef {
  version: 1;
  name?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export function portsCompatible(output: PortSpec, input: PortSpec): boolean {
  if (output.multiple && !input.multiple) return false;
  if (output.type === input.type) return true;
  return input.type === "file/any" && output.type.startsWith("file/");
}

/** Semua pasangan port yang bisa menyambungkan tool `a` ke tool `b`. */
export function chainablePorts(a: ToolManifest, b: ToolManifest) {
  const pairs: { from: string; to: string }[] = [];
  for (const out of a.outputs) {
    for (const inp of b.inputs) {
      if (portsCompatible(out, inp)) pairs.push({ from: out.name, to: inp.name });
    }
  }
  return pairs;
}

/** Urutan topologis node; melempar galat bila graf memiliki siklus. */
export function topoSort(def: PipelineDef): string[] {
  const indegree = new Map(def.nodes.map((n) => [n.id, 0]));
  const next = new Map<string, string[]>(def.nodes.map((n) => [n.id, []]));
  for (const edge of def.edges) {
    indegree.set(edge.to.node, (indegree.get(edge.to.node) ?? 0) + 1);
    next.get(edge.from.node)?.push(edge.to.node);
  }
  const queue = def.nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const to of next.get(id) ?? []) {
      const d = (indegree.get(to) ?? 0) - 1;
      indegree.set(to, d);
      if (d === 0) queue.push(to);
    }
  }
  if (order.length !== def.nodes.length) throw new Error("Pipeline memiliki siklus");
  return order;
}

export function validatePipeline(def: PipelineDef, registry: Registry<ToolManifest>): string[] {
  const errors: string[] = [];
  const nodes = new Map(def.nodes.map((n) => [n.id, n]));
  if (nodes.size !== def.nodes.length) errors.push("Ada id node yang dipakai dua kali");

  for (const node of def.nodes) {
    if (!registry.get(node.tool)) errors.push(`Node "${node.id}": tool "${node.tool}" tidak dikenal`);
  }

  for (const edge of def.edges) {
    const fromNode = nodes.get(edge.from.node);
    const toNode = nodes.get(edge.to.node);
    if (!fromNode || !toNode) {
      errors.push(`Edge ${edge.from.node} → ${edge.to.node} merujuk node yang tidak ada`);
      continue;
    }
    const fromTool = registry.get(fromNode.tool);
    const toTool = registry.get(toNode.tool);
    if (!fromTool || !toTool) continue;
    const out = fromTool.outputs.find((p) => p.name === edge.from.port);
    const inp = toTool.inputs.find((p) => p.name === edge.to.port);
    if (!out) errors.push(`Tool "${fromTool.id}" tidak punya output "${edge.from.port}"`);
    if (!inp) errors.push(`Tool "${toTool.id}" tidak punya input "${edge.to.port}"`);
    if (out && inp && !portsCompatible(out, inp)) {
      errors.push(`Output ${fromTool.id}.${out.name} (${out.type}) tidak cocok dengan input ${toTool.id}.${inp.name} (${inp.type})`);
    }
  }

  try {
    topoSort(def);
  } catch (e) {
    errors.push((e as Error).message);
  }
  return errors;
}

/**
 * Menjalankan pipeline node demi node. `inputs` berisi masukan awal per id node,
 * misalnya file yang dipilih pengguna untuk node pertama.
 */
export async function runPipeline(
  def: PipelineDef,
  registry: Registry<VogTool>,
  inputs: Record<string, ToolInput>,
  ctx: ToolContext,
): Promise<Record<string, ToolOutput>> {
  const errors = validatePipeline(def, registry);
  if (errors.length > 0) throw new Error(errors.join("\n"));

  const order = topoSort(def);
  const nodes = new Map(def.nodes.map((n) => [n.id, n]));
  const results: Record<string, ToolOutput> = {};

  for (const [index, id] of order.entries()) {
    ctx.signal?.throwIfAborted();
    const node = nodes.get(id)!;
    const tool = registry.get(node.tool)!;
    const input: ToolInput = { ...inputs[id] };

    for (const edge of def.edges.filter((e) => e.to.node === id)) {
      const value = results[edge.from.node]?.[edge.from.port];
      const spec = tool.inputs.find((p) => p.name === edge.to.port)!;
      if (spec.multiple) {
        const prev = (input[edge.to.port] as unknown[] | undefined) ?? [];
        input[edge.to.port] = prev.concat(value as never);
      } else {
        input[edge.to.port] = value;
      }
    }

    results[id] = await tool.run(input, {
      ...ctx,
      params: node.params,
      onProgress: (p, message) => ctx.onProgress?.((index + p) / order.length, message),
    });
  }
  return results;
}
