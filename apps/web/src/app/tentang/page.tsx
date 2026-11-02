import type { Metadata } from "next";
import { AboutContent } from "@/components/about-content";

export const metadata: Metadata = {
  title: "Tentang & privasi",
  description: "VogWork memproses file di browser Anda. Pelajari prinsip lokal-first, apa saja yang diunduh, dan pustaka open-source yang dipakai.",
  alternates: { canonical: "/tentang" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <AboutContent />
    </div>
  );
}
