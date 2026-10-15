import PromoManager, { type PromoRow } from "@/components/PromoManager";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Promo codes" };

export default async function AdminPromos() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
  if (error) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold">Promo codes are not set up yet</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Open Supabase → SQL Editor, paste the file <code>supabase/migrations/002_promo_codes.sql</code> and click Run. Then reload this page.
        </p>
      </div>
    );
  }
  return <PromoManager initial={(data ?? []) as PromoRow[]} />;
}
