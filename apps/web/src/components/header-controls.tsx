"use client";

import { useLocale, useT } from "@vogwork/i18n";
import { Button } from "@vogwork/ui";
import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { shell } from "@/lib/dict";

const THEME_KEY = "vog.theme";

/** Skrip kecil di <head> supaya tema terpasang sebelum halaman tergambar (tanpa kedip). */
export const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

/** Kelas `dark` pada <html> adalah sumber kebenaran tema; komponen hanya mengamatinya. */
function subscribeTheme(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

export function ThemeToggle() {
  const t = useT(shell);
  const dark = useSyncExternalStore(subscribeTheme, isDark, () => false);

  // Ikuti perubahan tema sistem selama pengguna belum memilih sendiri.
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(THEME_KEY)) return;
      } catch {
        // abaikan
      }
      document.documentElement.classList.toggle("dark", e.matches);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // abaikan
    }
  };

  const label = dark ? t("themeLight") : t("themeDark");
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  const t = useT(shell);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="font-semibold"
      onClick={() => setLocale(locale === "id" ? "en" : "id")}
      aria-label={t("switchLang")}
      title={t("switchLang")}
    >
      {locale === "id" ? "EN" : "ID"}
    </Button>
  );
}
