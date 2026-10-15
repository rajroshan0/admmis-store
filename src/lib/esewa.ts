import "server-only";
import crypto from "node:crypto";
import { site } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

/**
 * eSewa ePay v2 integration.
 * Docs: https://developer.esewa.com.np/pages/Epay-V2
 *
 * Flow:  1) we sign the payment fields with HMAC-SHA256 and POST the browser to eSewa
 *        2) eSewa redirects back to our success URL with ?data=<base64 JSON>
 *        3) we verify that JSON's signature (+ ask eSewa's status API) before marking the order paid
 */

function config() {
  const secret = process.env.ESEWA_SECRET_KEY;
  if (!secret) throw new Error("ESEWA_SECRET_KEY is not set (see .env.example).");
  return {
    secret,
    productCode: process.env.ESEWA_PRODUCT_CODE || "EPAYTEST",
    formUrl:
      process.env.ESEWA_FORM_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    statusUrl:
      process.env.ESEWA_STATUS_URL || "https://rc.esewa.com.np/api/epay/transaction/status/",
  };
}

function sign(message: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

export interface EsewaFormPayload {
  formUrl: string;
  fields: Record<string, string>;
}

export interface EsewaCallbackData {
  transaction_code?: string;
  status?: string;
  total_amount?: string | number;
  transaction_uuid?: string;
  product_code?: string;
  signed_field_names?: string;
  signature?: string;
  [key: string]: unknown;
}

/** Build the signed form fields the browser must POST to eSewa. */
export function buildPaymentForm(params: {
  orderId: string;
  transactionUuid: string;
  subtotal: number;
  deliveryCharge: number;
  total: number;
}): EsewaFormPayload {
  const cfg = config();
  const total = String(params.total);
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const message = `total_amount=${total},transaction_uuid=${params.transactionUuid},product_code=${cfg.productCode}`;

  return {
    formUrl: cfg.formUrl,
    fields: {
      amount: String(params.subtotal),
      tax_amount: "0",
      total_amount: total,
      transaction_uuid: params.transactionUuid,
      product_code: cfg.productCode,
      product_service_charge: "0",
      product_delivery_charge: String(params.deliveryCharge),
      success_url: `${site.url}/api/payments/esewa/success`,
      failure_url: `${site.url}/api/payments/esewa/failure/${params.orderId}`,
      signed_field_names: signedFieldNames,
      signature: sign(message, cfg.secret),
    },
  };
}

/** Decode eSewa's ?data= payload and verify its signature. */
export function verifyCallback(
  dataParam: string | null,
): { ok: true; data: EsewaCallbackData } | { ok: false } {
  if (!dataParam) return { ok: false };
  try {
    // "+" can arrive as a space when the query string was not strictly encoded.
    const b64 = dataParam.replace(/ /g, "+");
    const data = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as EsewaCallbackData;
    if (!data.signature || !data.signed_field_names) return { ok: false };

    const cfg = config();
    const message = data.signed_field_names
      .split(",")
      .map((name) => `${name}=${data[name] ?? ""}`)
      .join(",");
    const expected = Buffer.from(sign(message, cfg.secret));
    const received = Buffer.from(String(data.signature));
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      return { ok: false };
    }
    if (data.product_code !== cfg.productCode) return { ok: false };
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

export function parseAmount(value: string | number | undefined): number {
  return Number(String(value ?? "").replace(/,/g, ""));
}

/** Ask eSewa directly whether a transaction completed. Returns null if eSewa could not be reached. */
export async function checkTransactionStatus(params: {
  transactionUuid: string;
  total: number;
}): Promise<{ status: string; refId?: string } | null> {
  const cfg = config();
  const url = new URL(cfg.statusUrl);
  url.searchParams.set("product_code", cfg.productCode);
  url.searchParams.set("total_amount", String(params.total));
  url.searchParams.set("transaction_uuid", params.transactionUuid);
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { status?: string; ref_id?: string };
    return { status: json.status ?? "UNKNOWN", refId: json.ref_id };
  } catch {
    return null;
  }
}

/**
 * Create a fresh eSewa attempt for an order the signed-in user owns.
 * A new transaction_uuid is issued every time so a failed attempt can be retried.
 */
export async function prepareEsewaPayment(
  userClient: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
): Promise<{ ok: true; payload: EsewaFormPayload } | { ok: false; error: string }> {
  // RLS guarantees the user can only read their own orders.
  const { data: order } = await userClient
    .from("orders")
    .select("id, status, payment_method, payment_status, subtotal, shipping_fee, total")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: "not_found" };
  if (order.payment_method !== "esewa") return { ok: false, error: "wrong_method" };
  if (order.status === "cancelled") return { ok: false, error: "cancelled" };
  if (order.payment_status === "paid" || order.payment_status === "refunded") {
    return { ok: false, error: "already_paid" };
  }

  const transactionUuid = `${order.id}-${Date.now().toString(36)}`;
  const admin = createAdminClient();
  const { error } = await admin
    .from("orders")
    .update({ esewa_transaction_uuid: transactionUuid })
    .eq("id", order.id);
  if (error) return { ok: false, error: "db" };

  return {
    ok: true,
    payload: buildPaymentForm({
      orderId: order.id,
      transactionUuid,
      subtotal: order.subtotal,
      deliveryCharge: order.shipping_fee,
      total: order.total,
    }),
  };
}
