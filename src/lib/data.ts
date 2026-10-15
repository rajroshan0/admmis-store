import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product, StoreSettings } from "@/shared/types";

const PRODUCT_SELECT =
  "*, product_variants(id, product_id, size, color, stock), categories(id, slug, name_en, name_ne)";

export const DEFAULT_SETTINGS: StoreSettings = {
  shipping_fee: 150,
  free_shipping_over: 5000,
  cod_enabled: true,
  esewa_enabled: true,
};

export async function getSettings(): Promise<StoreSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_settings")
    .select("shipping_fee, free_shipping_over, cod_enabled, esewa_enabled")
    .eq("id", 1)
    .maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type ProductSort = "new" | "price_asc" | "price_desc";

export interface ProductQuery {
  q?: string;
  categorySlug?: string;
  sort?: ProductSort;
  featured?: boolean;
  limit?: number;
  excludeId?: string;
  categoryId?: string;
}

/** Strip characters that have meaning inside a PostgREST filter string. */
function sanitizeSearch(q: string): string {
  return q.replace(/[%,()*\\:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function getProducts(opts: ProductQuery = {}): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase.from("products").select(PRODUCT_SELECT).eq("is_active", true);

  let categoryId = opts.categoryId;
  if (opts.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .maybeSingle();
    if (!cat) return [];
    categoryId = cat.id;
  }
  if (categoryId) query = query.eq("category_id", categoryId);
  if (opts.featured) query = query.eq("is_featured", true);
  if (opts.excludeId) query = query.neq("id", opts.excludeId);

  const q = opts.q ? sanitizeSearch(opts.q) : "";
  if (q) {
    query = query.or(
      `name_en.ilike.%${q}%,name_ne.ilike.%${q}%,description_en.ilike.%${q}%`,
    );
  }

  switch (opts.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as Product) ?? null;
}

export function totalStock(p: Pick<Product, "product_variants">): number {
  return (p.product_variants ?? []).reduce((sum, v) => sum + v.stock, 0);
}
