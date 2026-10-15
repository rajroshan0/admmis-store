import type { Lang } from "@/shared/types";

export function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  try {
    return d.toLocaleDateString(lang === "ne" ? "ne-NP" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kathmandu" });
  } catch {
    return d.toDateString();
  }
}
