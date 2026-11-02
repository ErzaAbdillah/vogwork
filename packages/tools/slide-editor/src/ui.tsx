"use client";

import { dataUrlToBytes } from "@vogwork/formats/pdf-flow";
import { THEMES, type Deck } from "@vogwork/formats/slides";
import { useT } from "@vogwork/i18n";
import { bytesToBlob, saveBlob, useVogFiles } from "@vogwork/storage";
import { Workspace, type ImportResult } from "@vogwork/ui";
import { FileDown, Presentation } from "lucide-react";
import { dict } from "./dict";
import { DeckEditor } from "./editor";
import { templates } from "./templates";
import { themePng } from "./theme";

async function importDeck(file: File): Promise<ImportResult<Deck>> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".ppt")) throw new Error("Format .ppt lama belum didukung. Simpan ulang sebagai .pptx di PowerPoint lalu buka lagi.");
  const { pptxToDeck } = await import("@vogwork/formats/pptx");
  const { deck, report } = await pptxToDeck(await file.arrayBuffer());
  return { title: file.name.replace(/\.[^.]+$/, "") || "Presentasi", content: deck, report };
}

export default function SlidesApp() {
  const t = useT(dict);
  const api = useVogFiles<Deck>("slide");

  return (
    <Workspace
      api={api}
      icon={<Presentation />}
      templates={templates}
      importAccept=".pptx,.ppt"
      importFile={importDeck}
      exports={[
        {
          label: t("exportPptx"),
          icon: <Presentation />,
          run: async (title) => {
            const deck = api.getContent();
            if (!deck) return;
            const { deckToPptx } = await import("@vogwork/formats/pptx");
            const background = await themePng(THEMES[deck.theme]);
            const bytes = await deckToPptx(deck, { themeBackground: background ?? undefined });
            await saveBlob(bytesToBlob(bytes, "application/vnd.openxmlformats-officedocument.presentationml.presentation"), `${title}.pptx`);
          },
        },
        {
          label: t("exportPdf"),
          icon: <FileDown />,
          run: async (title) => {
            const deck = api.getContent();
            if (!deck) return;
            const { deckToPdf } = await import("@vogwork/formats/slides-pdf");
            const background = await themePng(THEMES[deck.theme]);
            const bytes = await deckToPdf(deck, { themeBackground: background ? dataUrlToBytes(background).bytes : undefined });
            await saveBlob(bytesToBlob(bytes, "application/pdf"), `${title}.pdf`);
          },
        },
      ]}
    >
      {(content, onChange) => <DeckEditor initial={content} onChange={onChange} />}
    </Workspace>
  );
}
