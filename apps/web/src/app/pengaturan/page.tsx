import type { Metadata } from "next";
import { SettingsPanel } from "@/components/settings-panel";
import { T } from "@/components/t";

export const metadata: Metadata = {
  title: "Data lokal & pengaturan",
  description: "Kelola data VogWork yang tersimpan di browser: cadangan, pemulihan, penyimpanan permanen, dan mode offline.",
  robots: { index: false },
};

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
        <T k="navData" />
      </h1>
      <SettingsPanel />
    </div>
  );
}
