import ProductForm from "@/components/ProductForm";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/data";

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await getCategories();
  return (
    <div>
      <h2 className="mb-5 text-2xl font-semibold">Add product</h2>
      <ProductForm categories={categories} />
    </div>
  );
}
