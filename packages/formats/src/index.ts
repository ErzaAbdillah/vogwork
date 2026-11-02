// Ekspor ringan. Modul berat (pdf-flow, pdfjs, table, image) diimpor lewat subpath
// supaya halaman yang tidak memakainya tidak ikut memuat pdf-lib atau SheetJS.
export * from "./indonesia";
export * from "./ranges";
export { toWinAnsi } from "./winansi";
