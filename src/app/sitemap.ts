import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/app"), priority: 0.5 },
    { url: absoluteUrl("/legal/returns"), priority: 0.2 },
    { url: absoluteUrl("/legal/privacy"), priority: 0.2 },
    { url: absoluteUrl("/legal/terms"), priority: 0.2 },
  ];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("products").select("slug, updated_at").eq("is_active", true).limit(5000);
    for (const p of data ?? []) {
      entries.push({
        url: absoluteUrl(`/product/${p.slug}`),
        lastModified: p.updated_at,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    /* database unreachable — still serve the static entries */
  }
  return entries;
}
