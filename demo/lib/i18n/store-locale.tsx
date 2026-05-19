"use client";

// Demo-side locale provider that reads/writes the locale on the demo store
// (`state.profile.locale`) and exposes it via the same React context used by
// `useT()` / `useLocale()` in lib/i18n/client.tsx.

import type { ReactNode } from "react";
import { LocaleProvider } from "./client";
import { useDemoStore } from "@/lib/demo/store";
import type { Locale } from "./dict";

function asLocale(v: unknown): Locale {
  return v === "tr" ? "tr" : "en";
}

export function DemoLocaleProvider({ children }: { children: ReactNode }) {
  const { state } = useDemoStore();
  const locale = asLocale(state?.profile?.locale);
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}
