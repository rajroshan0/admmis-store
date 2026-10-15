import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prepareEsewaPayment } from "@/lib/esewa";
import { isValidNepalMobile } from "@/shared/format";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(50),
  shipping: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(7).max(20),
    address: z.string().trim().min(3).max(300),
    city: z.string().trim().min(2).max(100),
    district: z.string().trim().max(100).optional().default(""),
    notes: z.string().trim().max(500).optional().default(""),
  }),
  paymentMethod: z.enum(["cod", "esewa"]),
  promo: z.string().trim().max(40).optional(),
});

function mapRpcError(message: string): { code: string; status: number; name?: string } {
  if (message.startsWith("out_of_stock:")) {
    return { code: "out_of_stock", status: 409, name: message.slice("out_of_stock:".length) };
  }
  if (message.includes("item_unavailable")) return { code: "unavailable", status: 409 };
  if (message.includes("payment_method_disabled")) return { code: "method_disabled", status: 400 };
  if (message.includes("invalid_shipping")) return { code: "invalid_shipping", status: 400 };
  const promo = /promo_(invalid|expired|used_up|already_used|min)/.exec(message);
  if (promo) return { code: `promo_${promo[1]}`, status: 400 };
  if (message.includes("not_authenticated")) return { code: "not_authenticated", status: 401 };
  if (message.includes("empty_cart") || message.includes("invalid_quantity")) {
    return { code: "invalid_cart", status: 400 };
  }
  return { code: "generic", status: 500 };
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "generic" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_shipping" }, { status: 400 });
  }
  const { items, shipping, paymentMethod, promo } = parsed.data;

  if (!isValidNepalMobile(shipping.phone)) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // Prices, stock and shipping are all calculated inside the database function —
  // the browser's prices are never trusted.
  const { data, error } = await supabase.rpc("place_order", {
    p_items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_name: shipping.name,
    p_phone: shipping.phone,
    p_address: shipping.address,
    p_city: shipping.city,
    p_district: shipping.district,
    p_notes: shipping.notes,
    p_payment_method: paymentMethod,
    p_promo: promo || null,
  });

  if (error || !data) {
    const mapped = mapRpcError(error?.message ?? "");
    if (mapped.code === "generic") console.error("place_order failed:", error?.message);
    return NextResponse.json({ error: mapped.code, name: mapped.name }, { status: mapped.status });
  }

  const order = data as { id: string; order_number: number; total: number };

  if (paymentMethod === "esewa") {
    const prepared = await prepareEsewaPayment(supabase, order.id);
    if (!prepared.ok) {
      // The order exists and is unpaid; the customer can retry payment from the order page.
      return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, esewa: null });
    }
    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      esewa: prepared.payload,
    });
  }

  return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, esewa: null });
}
