import type { Lang, Product } from "./types";

/** "Rs. 1,49,900" style (Indian/Nepali digit grouping), whole rupees. */
export function formatNPR(amount: number): string {
  const n = Math.round(amount);
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

/** Pick the Nepali text when the UI is Nepali and a translation exists. */
export function pickLang(lang: Lang, en: string | null | undefined, ne: string | null | undefined): string {
  if (lang === "ne" && ne && ne.trim()) return ne;
  return en ?? "";
}

export function productName(p: Pick<Product, "name_en" | "name_ne">, lang: Lang): string {
  return pickLang(lang, p.name_en, p.name_ne);
}

export function productDescription(
  p: Pick<Product, "description_en" | "description_ne">,
  lang: Lang,
): string {
  return pickLang(lang, p.description_en, p.description_ne);
}

export function discountPercent(price: number, compareAt: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Nepal mobile numbers: 98XXXXXXXX / 97XXXXXXXX (optionally +977 prefix). */
export function isValidNepalMobile(input: string): boolean {
  const digits = input.replace(/[\s-]/g, "");
  return /^(\+?977)?9[78]\d{8}$/.test(digits);
}
