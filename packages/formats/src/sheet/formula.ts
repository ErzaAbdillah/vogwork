import { addr, dateToSerial, parseAddr, serialToDate, type Workbook } from "./model";

export interface CellError {
  error: "#DIV/0!" | "#VALUE!" | "#REF!" | "#NAME?" | "#N/A" | "#NUM!" | "#SIKLUS!";
}
export type Value = number | string | boolean | null | CellError;
type Matrix = Value[][];
type Arg = Value | Matrix;

export const isError = (v: unknown): v is CellError => typeof v === "object" && v !== null && "error" in v;
const err = (error: CellError["error"]): CellError => ({ error });

// ---------- Tokenizer ----------

type Token =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "ref"; v: string; sheet?: string }
  | { t: "fn"; v: string }
  | { t: "op"; v: string }
  | { t: "("; v?: undefined }
  | { t: ")"; v?: undefined }
  | { t: ","; v?: undefined };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"') {
      let s = "";
      i++;
      while (i < src.length) {
        if (src[i] === '"' && src[i + 1] === '"') {
          s += '"';
          i += 2;
        } else if (src[i] === '"') break;
        else s += src[i++];
      }
      i++;
      tokens.push({ t: "str", v: s });
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const m = /^\d*\.?\d+(?:[eE][-+]?\d+)?/.exec(src.slice(i))!;
      tokens.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (ch === "'" || /[A-Za-z_$]/.test(ch)) {
      // Nama sheet bertanda kutip: 'Data 2026'!A1
      let sheet: string | undefined;
      let rest = src.slice(i);
      const quoted = /^'((?:[^']|'')+)'!/.exec(rest);
      const plain = /^([A-Za-z_][\w.]*)!/.exec(rest);
      if (quoted) {
        sheet = quoted[1]!.replace(/''/g, "'");
        i += quoted[0].length;
      } else if (plain) {
        sheet = plain[1];
        i += plain[0].length;
      }
      rest = src.slice(i);
      const ref = /^\$?[A-Za-z]{1,3}\$?\d+(?![\w(])/.exec(rest);
      if (ref) {
        tokens.push({ t: "ref", v: ref[0].replace(/\$/g, "").toUpperCase(), sheet });
        i += ref[0].length;
        continue;
      }
      const word = /^[A-Za-z_][\w.]*/.exec(rest);
      if (!word) throw new Error("#NAME?");
      i += word[0].length;
      const upper = word[0].toUpperCase();
      if (src[i] === "(") tokens.push({ t: "fn", v: upper });
      else if (upper === "TRUE" || upper === "FALSE") tokens.push({ t: "bool", v: upper === "TRUE" });
      else throw new Error("#NAME?");
      continue;
    }
    if (ch === "#") {
      const m = /^#(?:DIV\/0!|VALUE!|REF!|NAME\?|N\/A|NUM!)/.exec(src.slice(i));
      if (!m) throw new Error("#NAME?");
      tokens.push({ t: "str", v: m[0] });
      i += m[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "<>") {
      tokens.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/^&=<>%:".includes(ch)) tokens.push({ t: "op", v: ch });
    else if (ch === "(") tokens.push({ t: "(" });
    else if (ch === ")") tokens.push({ t: ")" });
    // Titik koma diterima sebagai pemisah argumen, seperti Excel berbahasa Indonesia.
    else if (ch === "," || ch === ";") tokens.push({ t: "," });
    else throw new Error("#NAME?");
    i++;
  }
  return tokens;
}

// ---------- Parser ----------

type Node =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "bool"; v: boolean }
  | { k: "ref"; sheet?: string; a: string }
  | { k: "range"; sheet?: string; a: string; b: string }
  | { k: "call"; name: string; args: Node[] }
  | { k: "un"; op: string; x: Node }
  | { k: "bin"; op: string; l: Node; r: Node };

const PRECEDENCE: Record<string, number> = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "*": 4, "/": 4, "^": 5 };

function parse(tokens: Token[]): Node {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  const primary = (): Node => {
    const tok = next();
    if (!tok) throw new Error("#VALUE!");
    switch (tok.t) {
      case "num":
        return { k: "num", v: tok.v };
      case "str":
        return { k: "str", v: tok.v };
      case "bool":
        return { k: "bool", v: tok.v };
      case "ref": {
        const after = peek();
        if (after?.t === "op" && after.v === ":") {
          next();
          const end = next();
          if (end?.t !== "ref") throw new Error("#REF!");
          return { k: "range", sheet: tok.sheet, a: tok.v, b: end.v };
        }
        return { k: "ref", sheet: tok.sheet, a: tok.v };
      }
      case "fn": {
        next(); // (
        const args: Node[] = [];
        if (peek()?.t !== ")") {
          for (;;) {
            args.push(expr(0));
            if (peek()?.t === ",") next();
            else break;
          }
        }
        if (next()?.t !== ")") throw new Error("#VALUE!");
        return { k: "call", name: tok.v, args };
      }
      case "(": {
        const inner = expr(0);
        if (next()?.t !== ")") throw new Error("#VALUE!");
        return inner;
      }
      case "op":
        if (tok.v === "-" || tok.v === "+") return { k: "un", op: tok.v, x: unary() };
        throw new Error("#VALUE!");
      default:
        throw new Error("#VALUE!");
    }
  };

  const unary = (): Node => {
    let node = primary();
    while (peek()?.t === "op" && peek()!.v === "%") {
      next();
      node = { k: "bin", op: "/", l: node, r: { k: "num", v: 100 } };
    }
    return node;
  };

  const expr = (minPrec: number): Node => {
    let left = unary();
    for (;;) {
      const tok = peek();
      if (tok?.t !== "op") break;
      const prec = PRECEDENCE[tok.v];
      if (prec === undefined || prec < minPrec) break;
      next();
      // ^ asosiatif kanan, sisanya kiri.
      const right = expr(tok.v === "^" ? prec : prec + 1);
      left = { k: "bin", op: tok.v, l: left, r: right };
    }
    return left;
  };

  const tree = expr(0);
  if (pos < tokens.length) throw new Error("#VALUE!");
  return tree;
}

const parseCache = new Map<string, Node | CellError>();
function compile(formula: string): Node | CellError {
  let cached = parseCache.get(formula);
  if (!cached) {
    try {
      cached = parse(tokenize(formula));
    } catch (e) {
      const message = (e as Error).message;
      cached = err((["#NAME?", "#REF!", "#VALUE!"].includes(message) ? message : "#VALUE!") as CellError["error"]);
    }
    if (parseCache.size > 5000) parseCache.clear();
    parseCache.set(formula, cached);
  }
  return cached;
}

// ---------- Nilai mentah ----------

/** Mengubah teks yang diketik menjadi angka, tanggal, boolean, atau teks. */
export function parseLiteral(raw: string): Value {
  const text = raw.trim();
  if (text === "") return null;
  if (/^[-+]?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(text)) return Number(text);
  if (/^[-+]?\d+,\d+$/.test(text)) return Number(text.replace(",", "."));
  if (/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) return Number(text.replace(/\./g, "").replace(",", "."));
  if (/^[-+]?\d+([.,]\d+)?%$/.test(text)) return Number(text.slice(0, -1).replace(",", ".")) / 100;
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (dmy) return dateToSerial(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return dateToSerial(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === "true";
  return raw;
}

export function looksLikeDate(raw: string): boolean {
  return /^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})$/.test(raw.trim());
}

// ---------- Evaluator ----------

const num = (v: Value): number | CellError => {
  if (isError(v)) return v;
  if (v === null || v === "") return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const parsed = parseLiteral(v);
  return typeof parsed === "number" ? parsed : err("#VALUE!");
};
const str = (v: Value): string => (v === null ? "" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : isError(v) ? v.error : String(v));
const truthy = (v: Value): boolean | CellError => {
  if (isError(v)) return v;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (v === null || v === "") return false;
  const u = v.toUpperCase();
  if (u === "TRUE") return true;
  if (u === "FALSE") return false;
  return err("#VALUE!");
};
const flat = (args: Arg[]): Value[] => args.flatMap((a) => (Array.isArray(a) ? a.flat() : [a]));
const isMatrix = (a: Arg | undefined): a is Matrix => Array.isArray(a);
const scalar = (a: Arg | undefined): Value => (isMatrix(a) ? (a.length === 1 && a[0]!.length === 1 ? a[0]![0]! : err("#VALUE!")) : (a ?? null));

function compare(a: Value, b: Value): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a === null) return compare(typeof b === "number" ? 0 : "", b);
  if (b === null) return compare(a, typeof a === "number" ? 0 : "");
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return str(a).toLowerCase().localeCompare(str(b).toLowerCase());
}

/** Kriteria SUMIF/COUNTIF: ">=10", "<>Lunas", "Budi", "B*". */
function matcher(criteria: Value): (v: Value) => boolean {
  const text = str(criteria);
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/s.exec(text)!;
  const op = m[1] ?? "=";
  const target = parseLiteral(m[2]!);
  if (typeof target === "string" && /[*?]/.test(target) && (op === "=" || op === "<>")) {
    const re = new RegExp(`^${target.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
    return (v) => re.test(str(v)) === (op === "=");
  }
  return (v) => {
    if (typeof target === "number" && typeof v !== "number") {
      if (op === "<>") return true;
      return false;
    }
    const c = compare(v, target);
    return { "=": c === 0, "<>": c !== 0, "<": c < 0, ">": c > 0, "<=": c <= 0, ">=": c >= 0 }[op]!;
  };
}

const round = (n: number, digits: number, mode: "round" | "up" | "down") => {
  const f = 10 ** digits;
  const x = n * f;
  const r = mode === "round" ? Math.sign(x) * Math.round(Math.abs(x) + 1e-9) : mode === "up" ? Math.sign(x) * Math.ceil(Math.abs(x) - 1e-9) : Math.trunc(x);
  return r / f;
};

type Fn = (args: Arg[], lazy: { raw: Node[]; eval: (n: Node) => Arg }) => Value;

const numeric = (fn: (nums: number[]) => Value): Fn => (args) => {
  const nums: number[] = [];
  for (const a of args) {
    if (isMatrix(a)) {
      for (const v of a.flat()) {
        if (isError(v)) return v;
        if (typeof v === "number") nums.push(v);
      }
    } else {
      const n = num(a);
      if (isError(n)) return n;
      nums.push(n);
    }
  }
  return fn(nums);
};

const one = (f: (n: number, ...rest: number[]) => Value): Fn => (args) => {
  const values = args.map((a) => num(scalar(a)));
  const bad = values.find(isError);
  if (bad) return bad;
  return f(...(values as [number, ...number[]]));
};

const FUNCTIONS: Record<string, Fn> = {
  SUM: numeric((n) => n.reduce((a, b) => a + b, 0)),
  AVERAGE: numeric((n) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : err("#DIV/0!"))),
  MIN: numeric((n) => (n.length ? Math.min(...n) : 0)),
  MAX: numeric((n) => (n.length ? Math.max(...n) : 0)),
  PRODUCT: numeric((n) => n.reduce((a, b) => a * b, 1)),
  COUNT: (args) => flat(args).filter((v) => typeof v === "number").length,
  COUNTA: (args) => flat(args).filter((v) => v !== null && v !== "").length,
  COUNTBLANK: (args) => flat(args).filter((v) => v === null || v === "").length,
  ROUND: one((n, d = 0) => round(n, d, "round")),
  ROUNDUP: one((n, d = 0) => round(n, d, "up")),
  ROUNDDOWN: one((n, d = 0) => round(n, d, "down")),
  ABS: one((n) => Math.abs(n)),
  INT: one((n) => Math.floor(n)),
  SQRT: one((n) => (n < 0 ? err("#NUM!") : Math.sqrt(n))),
  POWER: one((a, b = 1) => a ** b),
  MOD: one((a, b = 1) => (b === 0 ? err("#DIV/0!") : a - b * Math.floor(a / b))),
  IF: (_args, lazy) => {
    const cond = truthy(scalar(lazy.eval(lazy.raw[0]!)));
    if (isError(cond)) return cond;
    const branch = cond ? lazy.raw[1] : lazy.raw[2];
    return branch ? scalar(lazy.eval(branch)) : cond;
  },
  IFERROR: (_args, lazy) => {
    const v = scalar(lazy.eval(lazy.raw[0]!));
    return isError(v) ? scalar(lazy.eval(lazy.raw[1]!)) : v;
  },
  AND: (args) => {
    for (const v of flat(args)) {
      const b = truthy(v);
      if (isError(b)) return b;
      if (!b) return false;
    }
    return true;
  },
  OR: (args) => {
    for (const v of flat(args)) {
      const b = truthy(v);
      if (isError(b)) return b;
      if (b) return true;
    }
    return false;
  },
  NOT: (args) => {
    const b = truthy(scalar(args[0]));
    return isError(b) ? b : !b;
  },
  SUMIF: (args) => {
    const range = isMatrix(args[0]) ? args[0] : [[scalar(args[0])]];
    const sum = isMatrix(args[2]) ? args[2] : range;
    const test = matcher(scalar(args[1]));
    let total = 0;
    range.forEach((row, r) =>
      row.forEach((v, c) => {
        const target = sum[r]?.[c];
        if (test(v) && typeof target === "number") total += target;
      }),
    );
    return total;
  },
  AVERAGEIF: (args) => {
    const range = isMatrix(args[0]) ? args[0] : [[scalar(args[0])]];
    const values = isMatrix(args[2]) ? args[2] : range;
    const test = matcher(scalar(args[1]));
    const picked: number[] = [];
    range.forEach((row, r) => row.forEach((v, c) => test(v) && typeof values[r]?.[c] === "number" && picked.push(values[r]![c] as number)));
    return picked.length ? picked.reduce((a, b) => a + b, 0) / picked.length : err("#DIV/0!");
  },
  COUNTIF: (args) => {
    const test = matcher(scalar(args[1]));
    return flat([args[0]!]).filter(test).length;
  },
  VLOOKUP: (args) => {
    const key = scalar(args[0]);
    const table = args[1];
    const col = num(scalar(args[2]));
    const approximate = args[3] === undefined ? true : truthy(scalar(args[3]));
    if (!isMatrix(table) || isError(col) || isError(approximate)) return err("#VALUE!");
    if (col < 1 || col > (table[0]?.length ?? 0)) return err("#REF!");
    let found = -1;
    for (let r = 0; r < table.length; r++) {
      const c = compare(table[r]![0]!, key);
      if (c === 0) {
        found = r;
        break;
      }
      if (approximate && c < 0) found = r;
    }
    return found < 0 ? err("#N/A") : (table[found]![col - 1] ?? null);
  },
  INDEX: (args) => {
    const table = args[0];
    const r = num(scalar(args[1]));
    const c = args[2] === undefined ? 1 : num(scalar(args[2]));
    if (!isMatrix(table) || isError(r) || isError(c)) return err("#VALUE!");
    return table[r - 1]?.[c - 1] ?? err("#REF!");
  },
  MATCH: (args) => {
    const key = scalar(args[0]);
    const values = flat([args[1]!]);
    const index = values.findIndex((v) => compare(v, key) === 0);
    return index < 0 ? err("#N/A") : index + 1;
  },
  CONCAT: (args) => flat(args).map(str).join(""),
  CONCATENATE: (args) => flat(args).map(str).join(""),
  LEN: (args) => str(scalar(args[0])).length,
  UPPER: (args) => str(scalar(args[0])).toUpperCase(),
  LOWER: (args) => str(scalar(args[0])).toLowerCase(),
  PROPER: (args) => str(scalar(args[0])).toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, s: string, l: string) => s + l.toUpperCase()),
  TRIM: (args) => str(scalar(args[0])).replace(/\s+/g, " ").trim(),
  LEFT: (args) => str(scalar(args[0])).slice(0, args[1] === undefined ? 1 : Number(num(scalar(args[1])))),
  RIGHT: (args) => {
    const s = str(scalar(args[0]));
    const n = args[1] === undefined ? 1 : Number(num(scalar(args[1])));
    return n <= 0 ? "" : s.slice(-n);
  },
  MID: (args) => {
    const s = str(scalar(args[0]));
    const start = Number(num(scalar(args[1])));
    const len = Number(num(scalar(args[2])));
    return s.slice(start - 1, start - 1 + len);
  },
  TODAY: () => {
    const d = new Date();
    return dateToSerial(d.getFullYear(), d.getMonth() + 1, d.getDate());
  },
  DATE: one((y, m = 1, d = 1) => dateToSerial(y, m, d)),
  YEAR: one((n) => serialToDate(n).getUTCFullYear()),
  MONTH: one((n) => serialToDate(n).getUTCMonth() + 1),
  DAY: one((n) => serialToDate(n).getUTCDate()),
};

export const SUPPORTED_FUNCTIONS = Object.keys(FUNCTIONS).sort();

/**
 * Evaluator lazy untuk satu versi workbook: nilai sel dihitung saat diminta
 * lalu disimpan, dengan deteksi referensi melingkar.
 */
export function createEvaluator(workbook: Workbook) {
  const memo = new Map<string, Value>();
  const visiting = new Set<string>();
  const sheetIndex = new Map(workbook.sheets.map((s, i) => [s.name.toLowerCase(), i]));

  const resolveSheet = (current: number, name?: string) => (name === undefined ? current : sheetIndex.get(name.toLowerCase()));

  const cell = (sheet: number, row: number, col: number): Value => {
    const key = `${sheet}:${row}:${col}`;
    if (memo.has(key)) return memo.get(key)!;
    if (visiting.has(key)) return err("#SIKLUS!");
    const raw = workbook.sheets[sheet]?.cells[addr(row, col)]?.v ?? "";
    let value: Value;
    if (raw.startsWith("=") && raw.length > 1) {
      visiting.add(key);
      const tree = compile(raw.slice(1));
      value = isError(tree) ? tree : scalar(evaluate(tree, sheet));
      visiting.delete(key);
    } else {
      value = parseLiteral(raw);
    }
    memo.set(key, value);
    return value;
  };

  const evaluate = (node: Node, sheet: number): Arg => {
    switch (node.k) {
      case "num":
      case "str":
      case "bool":
        return node.v;
      case "ref": {
        const s = resolveSheet(sheet, node.sheet);
        const p = parseAddr(node.a);
        if (s === undefined || !p) return err("#REF!");
        return cell(s, p.row, p.col);
      }
      case "range": {
        const s = resolveSheet(sheet, node.sheet);
        const a = parseAddr(node.a);
        const b = parseAddr(node.b);
        if (s === undefined || !a || !b) return err("#REF!");
        const rows: Matrix = [];
        for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
          const line: Value[] = [];
          for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) line.push(cell(s, r, c));
          rows.push(line);
        }
        return rows;
      }
      case "call": {
        const fn = FUNCTIONS[node.name];
        if (!fn) return err("#NAME?");
        const lazyFns = node.name === "IF" || node.name === "IFERROR";
        const args = lazyFns ? [] : node.args.map((a) => evaluate(a, sheet));
        if (!lazyFns) {
          const bad = args.find((a) => !isMatrix(a) && isError(a)) as CellError | undefined;
          if (bad && node.name !== "COUNTA" && node.name !== "COUNT") return bad;
        }
        return fn(args, { raw: node.args, eval: (n) => evaluate(n, sheet) });
      }
      case "un": {
        const v = num(scalar(evaluate(node.x, sheet)));
        return isError(v) ? v : node.op === "-" ? -v : v;
      }
      case "bin": {
        const l = scalar(evaluate(node.l, sheet));
        const r = scalar(evaluate(node.r, sheet));
        if (isError(l)) return l;
        if (isError(r)) return r;
        if (node.op === "&") return str(l) + str(r);
        if (["=", "<>", "<", ">", "<=", ">="].includes(node.op)) {
          const c = compare(l, r);
          return { "=": c === 0, "<>": c !== 0, "<": c < 0, ">": c > 0, "<=": c <= 0, ">=": c >= 0 }[node.op]!;
        }
        const a = num(l);
        const b = num(r);
        if (isError(a)) return a;
        if (isError(b)) return b;
        switch (node.op) {
          case "+":
            return a + b;
          case "-":
            return a - b;
          case "*":
            return a * b;
          case "/":
            return b === 0 ? err("#DIV/0!") : a / b;
          case "^":
            return a ** b;
        }
        return err("#VALUE!");
      }
    }
  };

  return (sheet: number, address: string): Value => {
    const p = parseAddr(address);
    return p ? cell(sheet, p.row, p.col) : err("#REF!");
  };
}
