import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

/**
 * Ekstensi editor (semuanya open-source MIT). Daftar yang sama dipakai untuk
 * mengubah HTML hasil impor DOCX menjadi JSON dokumen.
 */
export function editorExtensions(placeholder = "") {
  return [
    StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TextStyleKit,
    Highlight.configure({ multicolor: true }),
    TableKit.configure({ table: { resizable: true } }),
    Image.configure({ allowBase64: true }),
    Placeholder.configure({ placeholder }),
  ];
}
