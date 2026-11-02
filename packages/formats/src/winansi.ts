// Karakter di luar Latin-1 yang tetap ada di WinAnsiEncoding (font standar PDF).
const WINANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

const REPLACEMENTS: Record<string, string> = {
  "≥": ">=",
  "≤": "<=",
  "≠": "!=",
  "→": "->",
  "←": "<-",
  " ": " ",
  " ": " ",
  "​": "",
  "\t": "    ",
};

/**
 * Font standar PDF (Helvetica, Times, Courier) hanya mendukung WinAnsi.
 * Karakter lain diganti padanannya atau "?" supaya pembuatan PDF tidak gagal.
 */
export function toWinAnsi(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    const code = ch.codePointAt(0)!;
    if (ch in REPLACEMENTS) out += REPLACEMENTS[ch];
    else if (code === 10 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255) || WINANSI_EXTRA.has(ch)) out += ch;
    else out += "?";
  }
  return out;
}
