"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { kvGet, kvSet } from "./db";
import { requestPersistence } from "./persist";

let persistenceRequested = false;

/**
 * Seperti `useState`, tetapi nilainya disimpan otomatis di IndexedDB
 * sehingga draf tetap ada setelah halaman ditutup.
 */
export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    kvGet<T>(key)
      .then((saved) => {
        if (!alive) return;
        if (saved !== undefined) setValue(saved);
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      kvSet(key, value)
        .then(() => {
          if (!persistenceRequested) {
            persistenceRequested = true;
            void requestPersistence();
          }
        })
        .catch(() => {
          // Mode privat atau kuota penuh: draf tetap ada di memori selama halaman terbuka.
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [key, value, loaded]);

  return [value, setValue, loaded];
}
