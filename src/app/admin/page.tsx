import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatNPR } from "@/shared/format";

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [{ data: orders }, { data: lowStock }, { count: productCount }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, payment_status, payment_method, total, created_at")
      .gte("created_at", since)
      .limit(5000),
    supabase
      .from("product_variants")
      .select("id, size, color, stock, products!inner(name_en, slug, is_active)")
      .lte("stock", 3)
      .eq("products.is_active", true)
      .order("stock", { ascending: true })
      .limit(12),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ]);

  const list = orders ?? [];
  const live = list.filter((o) => o.status !== "cancelled");
  const revenue = live.reduce((s, o) => s + o.total, 0);
  const collected = list.filter((o) => o.payment_status === "paid").reduce((s, o) => s + o.total, 0);
  const pending = list.filter((o) => o.status === "pending").length;
  const toRefund = list.filter((o) => o.status === "cancelled" && o.payment_status === "paid").length;

  const stats = [
    { label: "Orders (30 days)", value: String(list.length) },
    { label: "Waiting for confirmation", value: String(pending), href: "/admin/orders?status=pending" },
    { label: "Sales (30 days, excl. cancelled)", value: formatNPR(revenue) },
    { label: "Paid online (30 days)", value: formatNPR(collected) },
  ];

  type LowRow = { id: string; size: string | null; color: string | null; stock: number; products: { name_en: string; slug: string } | { name_en: string; slug: string }[] };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <>
              <p className="text-sm text-ink-soft">{s.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold">{s.value}</p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="card p-4 hover:shadow-card">{body}</Link>
          ) : (
            <div key={s.label} className="card p-4">{body}</div>
          );
        })}
      </div>

      {toRefund > 0 && (
        <p className="rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark">
          {toRefund} cancelled order{toRefund > 1 ? "s were" : " was"} paid online and may need a refund.{" "}
          <Link href="/admin/orders?status=cancelled" className="font-semibold underline">Review</Link>
        </p>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Low stock</h2>
          <Link href="/admin/products" className="text-sm font-medium text-brand hover:underline">
            {productCount ?? 0} products →
          </Link>
        </div>
        {(lowStock ?? []).length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing is running low.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {(lowStock as unknown as LowRow[]).map((v) => {
              const p = Array.isArray(v.products) ? v.products[0] : v.products;
              return (
                <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    {p.name_en}
                    <span className="text-ink-soft"> — {[v.size, v.color].filter(Boolean).join(" · ") || "one size"}</span>
                  </span>
                  <span className={`font-semibold ${v.stock === 0 ? "text-brand" : ""}`}>{v.stock === 0 ? "Sold out" : `${v.stock} left`}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
