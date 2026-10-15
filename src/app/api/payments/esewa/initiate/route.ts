import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prepareEsewaPayment } from "@/lib/esewa";

export const dynamic = "force-dynamic";

const schema = z.object({ orderId: z.string().uuid() });

/** Start (or retry) an eSewa payment for an existing unpaid order. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "generic" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const result = await prepareEsewaPayment(supabase, parsed.data.orderId);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ esewa: result.payload });
}
