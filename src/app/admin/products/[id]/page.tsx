import { notFound } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import type { Product } from "@/shared/types";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data }, categories] = await Promise.all([
    supabase.from("products").select("*, product_variants(id, product_id, size, color, stock)").eq("id", id).maybeSingle(),
    getCategories(),
  ]);
  if (!data) notFound();

  return (
    <div>
      <h2 className="mb-5 text-2xl font-semibold">Edit product</h2>
      <ProductForm categories={categories} product={data as unknown as Product} />
    </div>
  );
}
