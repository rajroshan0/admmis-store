import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTransactionStatus, parseAmount, verifyCallback } from "@/lib/esewa";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, site.url), 303);
}

/**
 * eSewa redirects the customer here after a payment attempt: ?data=<base64 JSON>.
 * We never trust the redirect itself. We verify the signature, match the amount
 * to the order, and (when reachable) confirm with eSewa's status API before
 * marking the order as paid.
 */
export async function GET(request: NextRequest) {
  const verified = verifyCallback(request.nextUrl.searchParams.get("data"));
  if (!verified.ok) {
    console.warn("eSewa callback rejected: bad or missing signature");
    return redirectTo("/orders?payment=invalid");
  }
  const { data } = verified;

  const transactionUuid = String(data.transaction_uuid ?? "");
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, payment_status, total, esewa_transaction_uuid")
    .eq("esewa_transaction_uuid", transactionUuid)
    .maybeSingle();

  if (!order) {
    console.warn("eSewa callback for unknown transaction", transactionUuid);
    return redirectTo("/orders?payment=invalid");
  }

  const orderPath = `/orders/${order.id}`;

  if (order.payment_status === "paid") {
    return redirectTo(`${orderPath}?paid=1`); // already recorded (page refresh / double callback)
  }

  if (data.status !== "COMPLETE") {
    await admin
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", order.id)
      .eq("payment_status", "unpaid");
    return redirectTo(`${orderPath}?payment=failed`);
  }

  if (parseAmount(data.total_amount) !== order.total) {
    console.error("eSewa amount mismatch", { order: order.id, got: data.total_amount, want: order.total });
    return redirectTo(`${orderPath}?payment=pending`);
  }

  // Second opinion straight from eSewa. If it is unreachable we rely on the verified signature.
  const remote = await checkTransactionStatus({ transactionUuid, total: order.total });
  if (remote && remote.status !== "COMPLETE") {
    console.error("eSewa status check disagrees", { order: order.id, status: remote.status });
    return redirectTo(`${orderPath}?payment=pending`);
  }

  const update: Record<string, unknown> = {
    payment_status: "paid",
    esewa_ref_id: remote?.refId ?? data.transaction_code ?? null,
    paid_at: new Date().toISOString(),
  };
  // A paid order that is still waiting moves forward. A cancelled one stays cancelled
  // (and shows as "paid" in admin so you remember to refund it).
  if (order.status === "pending") update.status = "confirmed";

  const { error } = await admin
    .from("orders")
    .update(update)
    .eq("id", order.id)
    .neq("payment_status", "paid");

  if (error) {
    console.error("Could not record eSewa payment", error.message);
    return redirectTo(`${orderPath}?payment=pending`);
  }
  return redirectTo(`${orderPath}?paid=1`);
}
