import { supabase } from "./supabase";
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
  const { data } = await supabase
    .from("store_settings")
    .select("shipping_fee, free_shipping_over, cod_enabled, esewa_enabled")
    .eq("id", 1)
    .maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export type ProductSort = "new" | "price_asc" | "price_desc";

export interface ProductQuery {
  q?: string;
  categoryId?: string;
  sort?: ProductSort;
  featured?: boolean;
  limit?: number;
  excludeId?: string;
}

/** Strip characters that have a special meaning inside a search filter. */
function sanitizeSearch(q: string): string {
  return q.replace(/[%,()*\\:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function getProducts(opts: ProductQuery = {}): Promise<Product[]> {
  let query = supabase.from("products").select(PRODUCT_SELECT).eq("is_active", true);
  if (opts.categoryId) query = query.eq("category_id", opts.categoryId);
  if (opts.featured) query = query.eq("is_featured", true);
  if (opts.excludeId) query = query.neq("id", opts.excludeId);
  const q = opts.q ? sanitizeSearch(opts.q) : "";
  if (q) query = query.or(`name_en.ilike.%${q}%,name_ne.ilike.%${q}%,description_en.ilike.%${q}%`);

  if (opts.sort === "price_asc") query = query.order("price", { ascending: true });
  else if (opts.sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
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

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", ids.slice(0, 100))
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  const byId = new Map(((data ?? []) as unknown as Product[]).map((p) => [p.id, p]));
  // keep the order the customer saved them in (newest favorite first)
  return ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
}
