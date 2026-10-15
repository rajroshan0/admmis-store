import "server-only";
import { cookies } from "next/headers";
import { isLang, translate, type DictKey } from "@/shared/i18n";
import type { Lang } from "@/shared/types";

export const LANG_COOKIE = "lang";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return isLang(value) ? value : "en";
}

/** Language + translate function for Server Components. */
export async function getT() {
  const lang = await getLang();
  const t = (key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
  return { lang, t };
}
