"use client";

import { useT } from "@vogwork/i18n";
import { Tabs } from "@vogwork/ui";
import { Combine, Image as ImageIcon, Minimize2, Scissors } from "lucide-react";
import { useState } from "react";
import { CompressPanel } from "./compress";
import { dict } from "./dict";
import { ImagesPanel } from "./images";
import { MergePanel } from "./merge";
import { SplitPanel } from "./split";

type Tab = "merge" | "split" | "compress" | "images";

export default function PdfToolkit() {
  const t = useT(dict);
  const [tab, setTab] = useState<Tab>("merge");
  return (
    <div className="space-y-5">
      <Tabs
        label={t("tabs")}
        value={tab}
        onChange={setTab}
        items={[
          { value: "merge", label: t("merge"), icon: <Combine /> },
          { value: "split", label: t("split"), icon: <Scissors /> },
          { value: "compress", label: t("compress"), icon: <Minimize2 /> },
          { value: "images", label: t("images"), icon: <ImageIcon /> },
        ]}
      />
      <div className="max-w-3xl">
        {tab === "merge" && <MergePanel />}
        {tab === "split" && <SplitPanel />}
        {tab === "compress" && <CompressPanel />}
        {tab === "images" && <ImagesPanel />}
      </div>
    </div>
  );
}
