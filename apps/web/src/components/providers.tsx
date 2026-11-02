"use client";

import { LocaleProvider } from "@vogwork/i18n";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
