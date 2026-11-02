"use client";

import type { Localized } from "@vogwork/core";
import { useLocale, useT } from "@vogwork/i18n";
import { shell } from "@/lib/dict";

/** Teks antarmuka shell yang ikut berganti bahasa, bisa dipakai di komponen server. */
export function T({ k, vars }: { k: keyof typeof shell.id; vars?: Record<string, string | number> }) {
  const t = useT(shell);
  return <>{t(k, vars)}</>;
}

/** Teks dwibahasa dari manifest tool. */
export function L({ text }: { text: Localized }) {
  const { locale } = useLocale();
  return <>{text[locale] ?? text.id}</>;
}
