import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import { requireAdmin } from "@/lib/auth";
import { formatNPR } from "@/shared/format";
import type { Product } from "@/shared/types";

export default async function AdminProducts() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("products")
    .select("*, product_variants(id, product_id, size, color, stock), categories(id, slug, name_en, name_ne)")
    .order("created_at", { ascending: false });
  const products = (data ?? []) as unknown as Product[];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">{products.length} products</p>
        <Link href="/admin/products/new" className="btn-brand">Add product</Link>
      </div>

      <div className="card divide-y divide-line">
        {products.length === 0 && <p className="p-8 text-center text-ink-soft">No products yet. Add your first one.</p>}
        {products.map((p) => {
          const stock = (p.product_variants ?? []).reduce((s, v) => s + v.stock, 0);
          return (
            <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-sand/30">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-sand">
                <ProductImage src={p.images[0]} alt={p.name_en} sizes="56px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name_en}</p>
                <p className="text-sm text-ink-soft">
                  {p.categories?.name_en ?? "No category"} · {formatNPR(p.price)}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className={stock === 0 ? "font-semibold text-brand" : ""}>{stock === 0 ? "Sold out" : `${stock} in stock`}</p>
                <p className="text-xs text-ink-mute">{p.is_active ? "Visible" : "Hidden"}{p.is_featured ? " · Featured" : ""}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
