"use client";

import { addr, createEvaluator, formatValue, newSheet, parseAddr, type Workbook } from "@vogwork/formats/sheet";
import { useT } from "@vogwork/i18n";
import { bytesToBlob, saveBlob, useVogFiles } from "@vogwork/storage";
import { Workspace, type ImportResult } from "@vogwork/ui";
import { FileSpreadsheet, Sheet } from "lucide-react";
import { dict } from "./dict";
import { SheetEditor } from "./grid";
import { templates } from "./templates";

async function importWorkbook(file: File): Promise<ImportResult<Workbook>> {
  const title = file.name.replace(/\.[^.]+$/, "") || "Spreadsheet";
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const { xlsxToWorkbook } = await import("@vogwork/formats/xlsx");
    const { workbook, report } = await xlsxToWorkbook(await file.arrayBuffer());
    return { title, content: workbook, report };
  }
  if (name.endsWith(".xls") || name.endsWith(".ods")) {
    // Format lama dibaca lewat SheetJS: nilai saja, tanpa formula dan gaya.
    const { readTable } = await import("@vogwork/formats/table");
    const table = await readTable(file);
    return { title, content: tableToWorkbook(table.columns, table.rows.map((r) => table.columns.map((c) => r[c] ?? ""))), report: ["File .xls/.ods dibuka sebagai nilai saja; formula dan format tidak dibawa. Simpan sebagai .xlsx untuk hasil terbaik."] };
  }
  const { parsePastedTable } = await import("@vogwork/formats/table");
  const table = parsePastedTable(await file.text());
  return { title, content: tableToWorkbook(table.columns, table.rows.map((r) => table.columns.map((c) => r[c] ?? ""))), report: [] };
}

function tableToWorkbook(header: string[], rows: string[][]): Workbook {
  const sheet = newSheet("Sheet1", Math.max(100, rows.length + 20), Math.max(26, header.length + 2));
  [header, ...rows].forEach((row, r) =>
    row.forEach((value, c) => {
      if (value !== "") sheet.cells[addr(r, c)] = { v: value, ...(r === 0 && { s: { b: true } }) };
    }),
  );
  return { sheets: [sheet] };
}

/** CSV sheet pertama memakai nilai yang tampil (hasil formula), dengan BOM agar Excel membaca UTF-8. */
function workbookToCsv(workbook: Workbook): string {
  const sheet = workbook.sheets[0]!;
  const evaluate = createEvaluator(workbook);
  let maxR = 0;
  let maxC = 0;
  for (const a of Object.keys(sheet.cells)) {
    const p = parseAddr(a);
    if (p) [maxR, maxC] = [Math.max(maxR, p.row), Math.max(maxC, p.col)];
  }
  const lines: string[] = [];
  for (let r = 0; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxC; c++) {
      const a = addr(r, c);
      const v = sheet.cells[a]?.v ? evaluate(0, a) : null;
      const text = typeof v === "number" ? String(v) : formatValue(v);
      row.push(/[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
    }
    lines.push(row.join(";"));
  }
  return `﻿${lines.join("\r\n")}`;
}

export default function SpreadsheetApp() {
  const t = useT(dict);
  const api = useVogFiles<Workbook>("sheet");

  return (
    <Workspace
      api={api}
      icon={<Sheet />}
      templates={templates}
      importAccept=".xlsx,.xls,.ods,.csv,.tsv,.txt"
      importFile={importWorkbook}
      exports={[
        {
          label: t("exportXlsx"),
          icon: <FileSpreadsheet />,
          run: async (title) => {
            const content = api.getContent();
            if (!content) return;
            const [{ workbookToXlsx }, { chartImages }] = await Promise.all([import("@vogwork/formats/xlsx"), import("./chart")]);
            const bytes = await workbookToXlsx(content, { chartImages: await chartImages(content) });
            await saveBlob(bytesToBlob(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), `${title}.xlsx`);
          },
        },
        {
          label: t("exportCsv"),
          run: async (title) => {
            const content = api.getContent();
            if (content) await saveBlob(new Blob([workbookToCsv(content)], { type: "text/csv;charset=utf-8" }), `${title}.csv`);
          },
        },
      ]}
    >
      {(content, onChange) => <SheetEditor initial={content} onChange={onChange} />}
    </Workspace>
  );
}
