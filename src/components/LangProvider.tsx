"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { translate, type DictKey } from "@/shared/i18n";
import type { Lang } from "@/shared/types";

interface LangContextValue {
  lang: Lang;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const router = useRouter();

  const setLang = useCallback(
    (next: Lang) => {
      document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LangContextValue>(
    () => ({ lang, t: (key, vars) => translate(lang, key, vars), setLang }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}
