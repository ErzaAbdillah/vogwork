import { createRegistry } from "@vogwork/core";
import bgRemove from "@vogwork/tool-bg-remove";
import certificate from "@vogwork/tool-certificate";
import converter from "@vogwork/tool-converter";
import docEditor from "@vogwork/tool-doc-editor";
import invoice from "@vogwork/tool-invoice";
import letterDinas from "@vogwork/tool-letter-dinas";
import ocr from "@vogwork/tool-ocr";
import pdfConvert from "@vogwork/tool-pdf-convert";
import pdfSign from "@vogwork/tool-pdf-sign";
import pdfToolkit from "@vogwork/tool-pdf-toolkit";
import qr from "@vogwork/tool-qr";
import sheetEditor from "@vogwork/tool-sheet-editor";
import slideEditor from "@vogwork/tool-slide-editor";

/** Registry di sisi klien: setiap tool membawa `run` dan `ui` yang dimuat lazy. */
export const registry = createRegistry([docEditor, sheetEditor, slideEditor, pdfToolkit, pdfSign, pdfConvert, qr, certificate, letterDinas, invoice, ocr, bgRemove, converter]);
