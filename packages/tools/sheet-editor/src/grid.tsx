"use client";

import {
  addr,
  colName,
  createEvaluator,
  defaultAlign,
  DEFAULT_COL_WIDTH,
  formatValue,
  isError,
  looksLikeDate,
  mergeAt,
  newSheet,
  NUMBER_FORMATS,
  parseRange,
  rangeText,
  SUPPORTED_FUNCTIONS,
  type CellStyle,
  type Range,
  type Sheet,
  type Workbook,
} from "@vogwork/formats/sheet";
import { useLocale, useT } from "@vogwork/i18n";
import { Button, cn, Segmented, Select } from "@vogwork/ui";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BarChart3,
  Bold,
  Combine,
  Italic,
  PaintBucket,
  Plus,
  Redo2,
  Sigma,
  Trash2,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { SheetChart } from "./chart";
import { dict } from "./dict";

interface Pos {
  r: number;
  c: number;
}

const ROW_H = 26;
const HEADER_W = 46;

function Tool({ label, active, onClick, children, disabled }: { label: string; active?: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("grid size-8 place-items-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40 [&_svg]:size-4", active && "bg-primary/15 text-primary")}
    >
      {children}
    </button>
  );
}

const clone = (wb: Workbook): Workbook => structuredClone(wb);
const norm = (a: Pos, b: Pos): Range => ({ r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) });

/** Lembar kerja interaktif: pilih, ketik, formula, format, salin-tempel, grafik. */
export function SheetEditor({ initial, onChange }: { initial: Workbook; onChange: (wb: Workbook) => void }) {
  const t = useT(dict);
  const { locale } = useLocale();
  const [wb, setWb] = useState<Workbook>(initial);
  const [active, setActive] = useState(0);
  const [anchor, setAnchor] = useState<Pos>({ r: 0, c: 0 });
  const [focus, setFocus] = useState<Pos>({ r: 0, c: 0 });
  const [editing, setEditing] = useState<{ value: string; fromBar: boolean } | null>(null);
  const dragging = useRef(false);
  const [past, setPast] = useState<Workbook[]>([]);
  const [future, setFuture] = useState<Workbook[]>([]);
  const grid = useRef<HTMLDivElement>(null);

  const sheet = wb.sheets[active] ?? wb.sheets[0]!;
  const evaluate = useMemo(() => createEvaluator(wb), [wb]);
  const sel = norm(anchor, focus);
  const activeAddr = addr(anchor.r, anchor.c);
  const activeCell = sheet.cells[activeAddr];

  const commit = (mutate: (draft: Workbook, sheet: Sheet) => void) => {
    const next = clone(wb);
    mutate(next, next.sheets[active]!);
    setPast((p) => [...p.slice(-59), wb]);
    setFuture([]);
    setWb(next);
    onChange(next);
  };

  const setRaw = (s: Sheet, address: string, raw: string) => {
    const cell = s.cells[address] ?? {};
    // Tanggal yang diketik otomatis diberi format tanggal.
    const style = looksLikeDate(raw) && !cell.s?.fmt ? { ...cell.s, fmt: "date" as const } : cell.s;
    if (!raw && !style) delete s.cells[address];
    else s.cells[address] = { ...(raw && { v: raw }), ...(style && { s: style }) };
  };

  const forRange = (s: Sheet, fn: (address: string) => void) => {
    for (let r = sel.r1; r <= sel.r2; r++) for (let c = sel.c1; c <= sel.c2; c++) fn(addr(r, c));
  };

  const styleRange = (patch: (s: CellStyle) => CellStyle) =>
    commit((_, s) =>
      forRange(s, (a) => {
        const cell = s.cells[a] ?? {};
        const style = patch({ ...cell.s });
        const clean = Object.fromEntries(Object.entries(style).filter(([, v]) => v !== undefined && v !== false && v !== ""));
        s.cells[a] = { ...cell, s: Object.keys(clean).length ? clean : undefined };
        if (!s.cells[a]!.v && !s.cells[a]!.s) delete s.cells[a];
      }),
    );

  const move = (dr: number, dc: number, extend = false) => {
    const next = { r: Math.min(sheet.rows - 1, Math.max(0, focus.r + dr)), c: Math.min(sheet.cols - 1, Math.max(0, focus.c + dc)) };
    if (extend) setFocus(next);
    else {
      setAnchor(next);
      setFocus(next);
    }
  };

  const finishEdit = (dr: number, dc: number) => {
    if (editing) {
      const value = editing.value;
      commit((_, s) => setRaw(s, activeAddr, value));
    }
    setEditing(null);
    if (dr || dc) {
      const next = { r: Math.min(sheet.rows - 1, Math.max(0, anchor.r + dr)), c: Math.min(sheet.cols - 1, Math.max(0, anchor.c + dc)) };
      setAnchor(next);
      setFocus(next);
    }
    grid.current?.focus();
  };

  const startEdit = (value: string) => setEditing({ value, fromBar: false });

  useEffect(() => {
    if (!editing) grid.current?.focus({ preventScroll: true });
  }, [anchor, editing]);

  const undoAction = () => {
    const prev = past.at(-1);
    if (!prev) return;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, wb]);
    setWb(prev);
    onChange(prev);
  };

  const redoAction = () => {
    const next = future.at(-1);
    if (!next) return;
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, wb]);
    setWb(next);
    onChange(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editing) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undoAction();
      return;
    }
    if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redoAction();
      return;
    }
    if (mod && ["b", "i", "u"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      const key = e.key.toLowerCase() as "b" | "i" | "u";
      const on = !activeCell?.s?.[key];
      styleRange((s) => ({ ...s, [key]: on }));
      return;
    }
    if (mod) return;
    const arrows: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arrows[e.key]) {
      e.preventDefault();
      move(arrows[e.key]![0], arrows[e.key]![1], e.shiftKey);
    } else if (e.key === "Enter") {
      e.preventDefault();
      move(e.shiftKey ? -1 : 1, 0);
    } else if (e.key === "Tab") {
      e.preventDefault();
      move(0, e.shiftKey ? -1 : 1);
    } else if (e.key === "F2") {
      e.preventDefault();
      startEdit(activeCell?.v ?? "");
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      commit((_, s) => forRange(s, (a) => setRaw(s, a, "")));
    } else if (e.key.length === 1 && !e.altKey) {
      e.preventDefault();
      startEdit(e.key);
    }
  };

  const tsvOfSelection = () => {
    const lines: string[] = [];
    for (let r = sel.r1; r <= sel.r2; r++) {
      const row: string[] = [];
      for (let c = sel.c1; c <= sel.c2; c++) row.push(sheet.cells[addr(r, c)]?.v ?? "");
      lines.push(row.join("\t"));
    }
    return lines.join("\n");
  };

  const paste = (text: string) => {
    const rows = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").map((l) => l.split("\t"));
    commit((_, s) => {
      rows.forEach((row, dr) =>
        row.forEach((value, dc) => {
          const r = anchor.r + dr;
          const c = anchor.c + dc;
          if (r < s.rows && c < s.cols) setRaw(s, addr(r, c), value);
        }),
      );
      s.rows = Math.max(s.rows, anchor.r + rows.length + 5);
    });
    setFocus({ r: Math.min(sheet.rows - 1, anchor.r + rows.length - 1), c: Math.min(sheet.cols - 1, anchor.c + (rows[0]?.length ?? 1) - 1) });
  };

  // Statistik pilihan ditampilkan di bilah status, seperti spreadsheet umumnya.
  const stats = useMemo(() => {
    const nums: number[] = [];
    let count = 0;
    for (let r = sel.r1; r <= sel.r2 && r < sel.r1 + 500; r++)
      for (let c = sel.c1; c <= sel.c2; c++) {
        const v = evaluate(active, addr(r, c));
        if (v !== null && v !== "") count++;
        if (typeof v === "number") nums.push(v);
      }
    return { count, sum: nums.reduce((a, b) => a + b, 0), avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null, nums: nums.length };
  }, [sel.r1, sel.r2, sel.c1, sel.c2, evaluate, active]);

  const resizeCol = (c: number, startX: number, startW: number) => {
    const onMove = (ev: PointerEvent) => {
      const w = Math.max(40, startW + ev.clientX - startX);
      setWb((cur) => {
        const next = clone(cur);
        next.sheets[active]!.colWidths[c] = w;
        return next;
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setWb((cur) => {
        onChange(cur);
        return cur;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const widths = Array.from({ length: sheet.cols }, (_, c) => sheet.colWidths[c] ?? DEFAULT_COL_WIDTH);
  const merged = sheet.merges.map(parseRange).filter((r): r is Range => r !== null);
  const covered = new Set<string>();
  for (const m of merged) for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) if (r !== m.r1 || c !== m.c1) covered.add(`${r}:${c}`);
  const fmtLabel = (f: (typeof NUMBER_FORMATS)[number]) => (locale === "id" ? f.id : f.en);
  const activeMerge = mergeAt(sheet, anchor.r, anchor.c);

  return (
    <div className="space-y-2">
      <div className="no-print flex flex-wrap items-center gap-0.5 rounded-2xl border bg-card-solid/90 p-1.5 shadow-sm backdrop-blur-xl">
        <Tool label={t("undo")} disabled={past.length === 0} onClick={undoAction}>
          <Undo2 />
        </Tool>
        <Tool label={t("redo")} disabled={future.length === 0} onClick={redoAction}>
          <Redo2 />
        </Tool>
        <span className="mx-1 h-6 w-px bg-border" />
        <Tool label={t("bold")} active={activeCell?.s?.b} onClick={() => styleRange((s) => ({ ...s, b: !activeCell?.s?.b }))}>
          <Bold />
        </Tool>
        <Tool label={t("italic")} active={activeCell?.s?.i} onClick={() => styleRange((s) => ({ ...s, i: !activeCell?.s?.i }))}>
          <Italic />
        </Tool>
        <Tool label={t("underline")} active={activeCell?.s?.u} onClick={() => styleRange((s) => ({ ...s, u: !activeCell?.s?.u }))}>
          <Underline />
        </Tool>
        <span className="mx-1 h-6 w-px bg-border" />
        {(
          [
            ["left", AlignLeft, "alignLeft"],
            ["center", AlignCenter, "alignCenter"],
            ["right", AlignRight, "alignRight"],
          ] as const
        ).map(([align, Icon, label]) => (
          <Tool key={align} label={t(label)} active={activeCell?.s?.align === align} onClick={() => styleRange((s) => ({ ...s, align: s.align === align ? undefined : align }))}>
            <Icon />
          </Tool>
        ))}
        <Select aria-label={t("format")} className="mx-1 h-8 w-40 text-xs" value={activeCell?.s?.fmt ?? "general"} onChange={(e) => styleRange((s) => ({ ...s, fmt: e.target.value === "general" ? undefined : (e.target.value as CellStyle["fmt"]) }))}>
          {NUMBER_FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {fmtLabel(f)}
            </option>
          ))}
        </Select>
        <label className="relative grid size-8 cursor-pointer place-items-center rounded-md hover:bg-accent" title={t("fill")}>
          <PaintBucket className="size-4" style={{ color: activeCell?.s?.fill }} />
          <input type="color" aria-label={t("fill")} className="absolute inset-0 cursor-pointer opacity-0" value={activeCell?.s?.fill ?? "#ffffff"} onChange={(e) => styleRange((s) => ({ ...s, fill: e.target.value === "#ffffff" ? undefined : e.target.value }))} />
        </label>
        <label className="relative grid size-8 cursor-pointer place-items-center rounded-md hover:bg-accent" title={t("textColor")}>
          <span className="text-sm font-semibold" style={{ borderBottom: `3px solid ${activeCell?.s?.color ?? "#111"}` }}>
            A
          </span>
          <input type="color" aria-label={t("textColor")} className="absolute inset-0 cursor-pointer opacity-0" value={activeCell?.s?.color ?? "#111111"} onChange={(e) => styleRange((s) => ({ ...s, color: e.target.value }))} />
        </label>
        <span className="mx-1 h-6 w-px bg-border" />
        <Tool
          label={activeMerge ? t("unmerge") : t("merge")}
          active={Boolean(activeMerge)}
          onClick={() =>
            commit((_, s) => {
              if (activeMerge) s.merges = s.merges.filter((m) => m !== rangeText(activeMerge));
              else if (sel.r1 !== sel.r2 || sel.c1 !== sel.c2) {
                s.merges = s.merges.filter((m) => {
                  const r = parseRange(m);
                  return !r || r.r2 < sel.r1 || r.r1 > sel.r2 || r.c2 < sel.c1 || r.c1 > sel.c2;
                });
                s.merges.push(rangeText(sel));
              }
            })
          }
        >
          <Combine />
        </Tool>
        <Tool
          label={t("autosum")}
          onClick={() => {
            let top = anchor.r - 1;
            while (top >= 0 && typeof evaluate(active, addr(top, anchor.c)) === "number") top--;
            const from = top + 1;
            if (from < anchor.r) commit((_, s) => setRaw(s, activeAddr, `=SUM(${addr(from, anchor.c)}:${addr(anchor.r - 1, anchor.c)})`));
            else startEdit("=SUM(");
          }}
        >
          <Sigma />
        </Tool>
        <Tool
          label={`${t("chart")} — ${t("chartHint")}`}
          disabled={sel.c2 === sel.c1}
          onClick={() =>
            commit((_, s) => {
              const hasHeader = typeof evaluate(active, addr(sel.r1, sel.c1 + 1)) === "string";
              const r1 = hasHeader ? sel.r1 + 1 : sel.r1;
              s.chart = {
                type: "bar",
                labels: rangeText({ r1, r2: sel.r2, c1: sel.c1, c2: sel.c1 }),
                series: Array.from({ length: sel.c2 - sel.c1 }, (_, i) => rangeText({ r1, r2: sel.r2, c1: sel.c1 + i + 1, c2: sel.c1 + i + 1 })),
                title: "",
              };
            })
          }
        >
          <BarChart3 />
        </Tool>
        <span className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => commit((_, s) => void (s.rows += 10))}>
            {t("addRows")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => commit((_, s) => void (s.cols += 1))}>
            {t("addCols")}
          </Button>
        </span>
      </div>

      <div className="no-print flex items-center gap-2 rounded-xl border bg-card-solid px-2">
        <span aria-label={t("cellName")} className="w-20 shrink-0 border-r py-1.5 font-mono text-xs text-muted-foreground">
          {rangeText(sel)}
        </span>
        <span className="text-sm text-muted-foreground italic">fx</span>
        <input
          aria-label={t("formulaBar")}
          list="vog-functions"
          className="h-8 min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
          value={editing ? editing.value : (activeCell?.v ?? "")}
          onFocus={() => !editing && setEditing({ value: activeCell?.v ?? "", fromBar: true })}
          onChange={(e) => setEditing({ value: e.target.value, fromBar: true })}
          onKeyDown={(e) => {
            if (e.key === "Enter") finishEdit(1, 0);
            if (e.key === "Escape") {
              setEditing(null);
              grid.current?.focus();
            }
          }}
          onBlur={() => editing?.fromBar && finishEdit(0, 0)}
        />
        <datalist id="vog-functions">
          {SUPPORTED_FUNCTIONS.map((f) => (
            <option key={f} value={`=${f}(`} />
          ))}
        </datalist>
      </div>

      <div
        ref={grid}
        tabIndex={0}
        role="grid"
        aria-label={t("gridLabel")}
        aria-rowcount={sheet.rows}
        aria-colcount={sheet.cols}
        onKeyDown={onKeyDown}
        onCopy={(e) => {
          if (editing) return;
          e.preventDefault();
          e.clipboardData.setData("text/plain", tsvOfSelection());
        }}
        onCut={(e) => {
          if (editing) return;
          e.preventDefault();
          e.clipboardData.setData("text/plain", tsvOfSelection());
          commit((_, s) => forRange(s, (a) => setRaw(s, a, "")));
        }}
        onPaste={(e) => {
          if (editing) return;
          e.preventDefault();
          paste(e.clipboardData.getData("text/plain"));
        }}
        onPointerUp={() => (dragging.current = false)}
        className="relative max-h-[65vh] overflow-auto rounded-xl border bg-white text-[13px] text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <table className="border-separate border-spacing-0" style={{ tableLayout: "fixed", width: HEADER_W + widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>
            <col style={{ width: HEADER_W }} />
            {widths.map((w, c) => (
              <col key={c} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-30 border-r border-b border-neutral-300 bg-neutral-100" />
              {widths.map((w, c) => (
                <th
                  key={c}
                  scope="col"
                  className={cn(
                    "sticky top-0 z-20 border-r border-b border-neutral-300 bg-neutral-100 text-xs font-medium text-neutral-600 select-none",
                    c >= sel.c1 && c <= sel.c2 && "bg-[#dfeedd] text-neutral-900",
                  )}
                  style={{ height: ROW_H }}
                  onPointerDown={() => {
                    setAnchor({ r: 0, c });
                    setFocus({ r: sheet.rows - 1, c });
                  }}
                >
                  {colName(c)}
                  <span
                    aria-hidden
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      resizeCol(c, e.clientX, w);
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: sheet.rows }, (_, r) => (
              <tr key={r} style={{ height: ROW_H }}>
                <th
                  scope="row"
                  className={cn("sticky left-0 z-10 border-r border-b border-neutral-300 bg-neutral-100 text-xs font-medium text-neutral-600 select-none", r >= sel.r1 && r <= sel.r2 && "bg-[#dfeedd] text-neutral-900")}
                  onPointerDown={() => {
                    setAnchor({ r, c: 0 });
                    setFocus({ r, c: sheet.cols - 1 });
                  }}
                >
                  {r + 1}
                </th>
                {widths.map((_, c) => {
                  if (covered.has(`${r}:${c}`)) return null;
                  const a = addr(r, c);
                  const cell = sheet.cells[a];
                  const merge = merged.find((m) => m.r1 === r && m.c1 === c);
                  const isActive = r === anchor.r && c === anchor.c;
                  const inSel = r >= sel.r1 && r <= sel.r2 && c >= sel.c1 && c <= sel.c2;
                  const value = cell?.v ? evaluate(active, a) : null;
                  const text = cell?.s?.fmt === "text" ? (cell.v ?? "") : formatValue(value, cell?.s?.fmt);
                  return (
                    <td
                      key={c}
                      role="gridcell"
                      aria-selected={inSel}
                      colSpan={merge ? merge.c2 - merge.c1 + 1 : undefined}
                      rowSpan={merge ? merge.r2 - merge.r1 + 1 : undefined}
                      onPointerDown={(e) => {
                        if (editing) finishEdit(0, 0);
                        dragging.current = true;
                        if (e.shiftKey) setFocus({ r, c });
                        else {
                          setAnchor({ r, c });
                          setFocus({ r, c });
                        }
                      }}
                      onPointerEnter={() => dragging.current && setFocus({ r, c })}
                      onDoubleClick={() => startEdit(cell?.v ?? "")}
                      className={cn("relative overflow-hidden border-r border-b border-neutral-200 px-1.5 whitespace-nowrap", isError(value) && "text-red-600")}
                      style={{
                        background: inSel && !isActive ? "rgb(63 174 85 / 0.12)" : cell?.s?.fill,
                        color: cell?.s?.color,
                        fontWeight: cell?.s?.b ? 700 : undefined,
                        fontStyle: cell?.s?.i ? "italic" : undefined,
                        textDecoration: cell?.s?.u ? "underline" : undefined,
                        textAlign: cell?.s?.align ?? (merge ? "center" : defaultAlign(value)),
                        outline: isActive ? "2px solid #2f9a45" : undefined,
                        outlineOffset: -2,
                      }}
                    >
                      {isActive && editing && !editing.fromBar ? (
                        <input
                          autoFocus
                          aria-label={a}
                          className="absolute inset-0 z-10 h-full w-full bg-white px-1.5 font-mono outline-2 outline-primary"
                          value={editing.value}
                          onChange={(e) => setEditing({ value: e.target.value, fromBar: false })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              finishEdit(e.shiftKey ? -1 : 1, 0);
                            } else if (e.key === "Tab") {
                              e.preventDefault();
                              finishEdit(0, e.shiftKey ? -1 : 1);
                            } else if (e.key === "Escape") {
                              setEditing(null);
                              grid.current?.focus();
                            }
                          }}
                          onBlur={() => finishEdit(0, 0)}
                        />
                      ) : (
                        text
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="no-print flex flex-wrap items-center gap-1">
        <span className="sr-only">{t("sheets")}</span>
        {wb.sheets.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setActive(i);
              setAnchor({ r: 0, c: 0 });
              setFocus({ r: 0, c: 0 });
            }}
            onDoubleClick={() => {
              const name = window.prompt(t("renameSheet"), s.name)?.trim();
              if (name) commit((draft) => void (draft.sheets[i]!.name = name.slice(0, 31)));
            }}
            className={cn("rounded-t-lg border border-b-0 px-3 py-1.5 text-sm", i === active ? "bg-card-solid font-medium" : "bg-muted/60 text-muted-foreground hover:text-foreground")}
          >
            {s.name}
          </button>
        ))}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("addSheet")}
          onClick={() => {
            commit((draft) => void draft.sheets.push(newSheet(`Sheet${draft.sheets.length + 1}`)));
            setActive(wb.sheets.length);
          }}
        >
          <Plus />
        </Button>
        {wb.sheets.length > 1 && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("deleteSheet")}
            onClick={() => {
              if (!window.confirm(t("deleteSheetConfirm", { name: sheet.name }))) return;
              commit((draft) => void draft.sheets.splice(active, 1));
              setActive(Math.max(0, active - 1));
            }}
          >
            <Trash2 />
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          {stats.nums > 0 && `${t("sum")}: ${formatValue(stats.sum, "number")} · ${t("average")}: ${formatValue(Math.round((stats.avg ?? 0) * 100) / 100)} · `}
          {t("count")}: {stats.count}
        </span>
      </div>

      {sheet.chart && (
        <div className="no-print space-y-2 rounded-2xl border bg-card p-3 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label={t("chartTitle")}
              placeholder={t("chartTitle")}
              className="h-8 flex-1 rounded-md border border-input bg-card-solid px-2 text-sm"
              value={sheet.chart.title}
              onChange={(e) => commit((_, s) => void (s.chart = { ...s.chart!, title: e.target.value }))}
            />
            <Segmented
              label={t("chart")}
              value={sheet.chart.type}
              onChange={(type) => commit((_, s) => void (s.chart = { ...s.chart!, type }))}
              options={[
                { value: "bar", label: t("bar") },
                { value: "line", label: t("line") },
              ]}
            />
            <Button variant="ghost" size="icon-sm" aria-label={t("removeChart")} onClick={() => commit((_, s) => void (s.chart = null))}>
              <X />
            </Button>
          </div>
          <div className="mx-auto max-w-2xl">
            <SheetChart spec={sheet.chart} read={(a) => evaluate(active, a)} />
          </div>
        </div>
      )}
    </div>
  );
}
