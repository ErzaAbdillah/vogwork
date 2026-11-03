import type { PMNode } from "./docx";

type Mark = NonNullable<PMNode["marks"]>[number];

const MARK_TAGS: Record<string, Mark> = {
  STRONG: { type: "bold" },
  B: { type: "bold" },
  EM: { type: "italic" },
  I: { type: "italic" },
  U: { type: "underline" },
  S: { type: "strike" },
  DEL: { type: "strike" },
  CODE: { type: "code" },
  SUP: { type: "superscript" },
  SUB: { type: "subscript" },
};

/**
 * Mengubah HTML sederhana (hasil mammoth) menjadi JSON dokumen VogWork.
 * Hanya tag yang dikenal yang dibaca; skrip dan atribut lain diabaikan karena
 * DOMParser tidak menjalankan apa pun dan hasilnya tidak dimasukkan ke halaman.
 */
export function htmlToDoc(html: string): PMNode {
  const root = new DOMParser().parseFromString(html, "text/html").body;

  const inline = (node: Node, marks: Mark[]): PMNode[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").replace(/\s+/g, " ");
      return text ? [{ type: "text", text, ...(marks.length && { marks }) }] : [];
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return [];
    const el = node as Element;
    if (el.tagName === "BR") return [{ type: "hardBreak" }];
    if (el.tagName === "IMG") return [];
    let next = marks;
    if (MARK_TAGS[el.tagName]) next = [...marks, MARK_TAGS[el.tagName]!];
    if (el.tagName === "A" && el.getAttribute("href")?.match(/^(https?:|mailto:)/)) next = [...marks, { type: "link", attrs: { href: el.getAttribute("href") } }];
    return [...el.childNodes].flatMap((c) => inline(c, next));
  };

  const trimEdges = (nodes: PMNode[]) => {
    const first = nodes[0];
    const last = nodes.at(-1);
    if (first?.text) first.text = first.text.replace(/^\s+/, "");
    if (last?.text) last.text = last.text.replace(/\s+$/, "");
    return nodes.filter((n) => n.type !== "text" || n.text);
  };

  const paragraph = (el: Element, type = "paragraph", attrs?: Record<string, unknown>): PMNode => ({ type, ...(attrs && { attrs }), content: trimEdges(inline(el, [])) });

  const blocks = (parent: Element): PMNode[] => {
    const out: PMNode[] = [];
    for (const child of parent.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (child.textContent?.trim()) out.push({ type: "paragraph", content: [{ type: "text", text: child.textContent.trim() }] });
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as Element;
      const tag = el.tagName;
      if (/^H[1-6]$/.test(tag)) out.push(paragraph(el, "heading", { level: Math.min(4, Number(tag[1])) }));
      else if (tag === "P") {
        const images = [...el.querySelectorAll("img")].map((img) => ({ type: "image", attrs: { src: img.getAttribute("src") } }));
        const para = paragraph(el);
        if ((para.content?.length ?? 0) > 0 || images.length === 0) out.push(para);
        out.push(...images);
      } else if (tag === "UL" || tag === "OL")
        out.push({
          type: tag === "UL" ? "bulletList" : "orderedList",
          content: [...el.children]
            .filter((li) => li.tagName === "LI")
            .map((li) => {
              const nested = [...li.children].filter((c) => c.tagName === "UL" || c.tagName === "OL");
              const textOnly = li.cloneNode(true) as Element;
              textOnly.querySelectorAll("ul,ol").forEach((n) => n.remove());
              return { type: "listItem", content: [paragraph(textOnly), ...nested.flatMap((n) => blocks({ childNodes: [n] } as unknown as Element))] };
            }),
        });
      else if (tag === "TABLE")
        out.push({
          type: "table",
          content: [...el.querySelectorAll("tr")].map((tr) => ({
            type: "tableRow",
            content: [...tr.children].map((cell) => ({
              type: cell.tagName === "TH" ? "tableHeader" : "tableCell",
              attrs: { colspan: Number(cell.getAttribute("colspan") ?? 1), rowspan: Number(cell.getAttribute("rowspan") ?? 1) },
              content: cell.querySelector("p") ? blocks(cell) : [paragraph(cell)],
            })),
          })),
        });
      else if (tag === "BLOCKQUOTE") out.push({ type: "blockquote", content: blocks(el) });
      else if (tag === "PRE") out.push({ type: "codeBlock", content: [{ type: "text", text: el.textContent ?? "" }] });
      else if (tag === "HR") out.push({ type: "horizontalRule" });
      else if (tag === "IMG") out.push({ type: "image", attrs: { src: el.getAttribute("src") } });
      else out.push(...blocks(el));
    }
    return out;
  };

  const content = blocks(root);
  return { type: "doc", content: content.length ? content : [{ type: "paragraph", content: [] }] };
}
