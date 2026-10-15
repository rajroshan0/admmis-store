import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/** eSewa sends the customer here when they cancel or the payment fails. */
export async function GET(_request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;
  const redirect = (path: string) => NextResponse.redirect(new URL(path, site.url), 303);

  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return redirect("/orders");

  // Only touch the order if it belongs to the signed-in customer (RLS).
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return redirect("/orders");

  if (order.payment_status === "unpaid") {
    await createAdminClient().from("orders").update({ payment_status: "failed" }).eq("id", order.id);
  }
  return redirect(`/orders/${order.id}?payment=failed`);
}
