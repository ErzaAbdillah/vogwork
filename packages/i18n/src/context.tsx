"use client";

import type { Locale } from "@vogwork/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { interpolate, type Dict } from "./format";

const STORAGE_KEY = "vog.locale";
const listeners = new Set<() => void>();

function readLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Pilihan bahasa di tab lain ikut diterapkan.
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleState>({ locale: "id", setLocale: () => {} });

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Halaman statis dirender dalam bahasa Indonesia; pilihan pengguna diterapkan
  // setelah hidrasi supaya HTML server dan klien tetap cocok.
  const locale = useSyncExternalStore(subscribe, readLocale, () => "id" as const);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage diblokir: bahasa tetap bawaan.
    }
    listeners.forEach((l) => l());
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

/**
 * Penerjemah untuk satu kamus. Kunci kamus Inggris wajib sama dengan
 * kamus Indonesia, sehingga teks yang lupa diterjemahkan ketahuan saat type-check.
 */
export function useT<D extends Dict>(dict: { id: D; en: { [K in keyof D]: string } }) {
  const { locale } = useLocale();
  return useCallback(
    (key: keyof D, vars?: Record<string, string | number>) => interpolate(dict[locale][key] ?? dict.id[key], vars),
    [dict, locale],
  );
}
