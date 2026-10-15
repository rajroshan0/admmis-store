import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { TopBar } from "@/components/Header";
import { PaymentBadge, StatusBadge, Timeline } from "@/components/OrderBits";
import { ProductImage } from "@/components/ProductCard";
import { Body, Button, Card, Container, Empty, ErrorState, H1, Loading, Muted, Row } from "@/components/ui";
import { ApiError, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import { useRequireUser } from "@/lib/useRequireUser";
import { useLang } from "@/providers/Providers";
import { formatNPR } from "@/shared/format";
import type { Order } from "@/shared/types";

export default function OrderScreen() {
  const router = useRouter();
  const { lang, t } = useLang();
  const sp = useLocalSearchParams<{ id: string; placed?: string; paid?: string; payment?: string }>();
  const id = String(sp.id);
  const auth = useRequireUser(`/orders/${id}`);

  const { data: order, error, loading, reload } = useAsync(async () => {
    if (!auth.user) return null;
    const { data, error: err } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
    if (err) throw new Error(err.message);
    return (data as unknown as Order) ?? null;
  }, [id, auth.user?.id]);

  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function pay() {
    setActionError(null);
    setBusy("pay");
    try {
      const res = await apiPost<{ esewa: { formUrl: string; fields: Record<string, string> } }>("/api/payments/esewa/initiate", { orderId: id });
      router.replace({ pathname: "/pay", params: { orderId: id, payload: JSON.stringify(res.esewa) } });
    } catch (e) {
      setActionError(e instanceof ApiError && e.code === "network" ? t("err.network") : t("err.generic"));
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setActionError(null);
    setBusy("cancel");
    const { error: err } = await supabase.rpc("cancel_my_order", { p_order_id: id });
    setBusy(null);
    setConfirmCancel(false);
    if (err) return setActionError(t("err.generic"));
    void reload();
  }

  let body: React.ReactNode;
  if (!auth.ready || !auth.user || (loading && !order)) body = <Loading />;
  else if (error) body = <ErrorState onRetry={reload} />;
  else if (!order) body = <Empty title={t("common.not_found")} action={{ label: t("orders.back"), onPress: () => router.replace("/orders") }} />;
  else {
    const canPay = order.payment_method === "esewa" && order.status !== "cancelled" && (order.payment_status === "unpaid" || order.payment_status === "failed");
    const canCancel = order.status === "pending" && order.payment_status !== "paid";

    let banner: { ok: boolean; text: string } | null = null;
    if (sp.paid === "1" || (sp.placed === "1" && order.payment_status === "paid")) banner = { ok: true, text: `${t("orders.thanks")} ${t("orders.thanks_paid")}` };
    else if (sp.placed === "1") banner = { ok: true, text: order.payment_method === "cod" ? `${t("orders.thanks")} ${t("orders.thanks_cod")}` : t("orders.thanks") };
    else if (sp.payment === "failed") banner = { ok: false, text: t("orders.payment_failed") };
    else if (sp.payment === "pending") banner = { ok: false, text: t("orders.payment_pending") };

    body = (
      <Container style={{ paddingTop: 20, gap: 14, maxWidth: 720 }}>
        {banner ? (
          <View accessibilityRole="alert" style={{ backgroundColor: banner.ok ? colors.okLight : colors.brandLight, borderRadius: 14, padding: 14 }}>
            <Body style={{ color: banner.ok ? colors.ok : colors.brandDark, fontFamily: fonts.medium }}>{banner.text}</Body>
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <H1>{t("orders.order", { n: order.order_number })}</H1>
          <Muted>{t("orders.placed", { date: formatDate(order.created_at, lang) })}</Muted>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.payment_status} />
          </View>
        </View>

        <Card style={{ gap: 14 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.inkMute, letterSpacing: 1 }}>{t("orders.track").toUpperCase()}</Text>
          <Timeline status={order.status} />
        </Card>

        {canPay || canCancel ? (
          <View style={{ gap: 10 }}>
            {canPay ? <Button title={busy === "pay" ? t("checkout.redirecting") : t("orders.pay_now")} onPress={pay} loading={busy === "pay"} disabled={busy !== null} /> : null}
            {canCancel && !confirmCancel ? <Button title={t("orders.cancel")} variant="danger" onPress={() => setConfirmCancel(true)} disabled={busy !== null} /> : null}
            {canCancel && confirmCancel ? (
              <Card style={{ gap: 10, borderColor: colors.brand }}>
                <Body>{t("orders.cancel_confirm")}</Body>
                <Button title={t("orders.cancel")} variant="danger" onPress={cancel} loading={busy === "cancel"} />
                <Button title={t("common.close")} variant="ghost" onPress={() => setConfirmCancel(false)} />
              </Card>
            ) : null}
            {actionError ? <Muted style={{ color: colors.brandDark }}>{actionError}</Muted> : null}
          </View>
        ) : null}

        <Card style={{ gap: 12 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.inkMute, letterSpacing: 1 }}>{t("orders.items").toUpperCase()}</Text>
          {(order.order_items ?? []).map((i) => (
            <View key={i.id} style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 56, borderRadius: 8, overflow: "hidden" }}>
                <ProductImage uri={i.image ?? undefined} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.ink }}>{i.name}</Text>
                <Muted>
                  {[i.size, i.color].filter(Boolean).join(" · ")} × {i.quantity}
                </Muted>
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>{formatNPR(i.unit_price * i.quantity)}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <Row label={t("cart.subtotal")} value={formatNPR(order.subtotal)} />
          {order.discount > 0 ? <Row label={`${t("checkout.discount")}${order.promo_code ? ` (${order.promo_code})` : ""}`} value={`−${formatNPR(order.discount)}`} /> : null}
          <Row label={t("cart.shipping")} value={order.shipping_fee === 0 ? t("cart.free") : formatNPR(order.shipping_fee)} />
          <Row label={t("cart.total")} value={formatNPR(order.total)} big />
        </Card>

        <Card style={{ gap: 4 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.inkMute, letterSpacing: 1, marginBottom: 4 }}>{t("orders.delivery_to").toUpperCase()}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.ink }}>{order.shipping_name}</Text>
          <Muted>{order.shipping_phone}</Muted>
          <Muted>{[order.shipping_address, order.shipping_city, order.shipping_district].filter(Boolean).join(", ")}</Muted>
          {order.notes ? <Muted style={{ fontStyle: "italic" }}>“{order.notes}”</Muted> : null}
        </Card>

        <Card style={{ gap: 4 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.inkMute, letterSpacing: 1, marginBottom: 4 }}>{t("orders.payment").toUpperCase()}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.ink }}>
            {order.payment_method === "cod" ? t("orders.method_cod") : t("orders.method_esewa")}
          </Text>
          {order.esewa_ref_id ? (
            <Muted>
              {t("orders.ref")}: {order.esewa_ref_id}
            </Muted>
          ) : null}
        </Card>

        <Muted>{t("orders.contact_help")}</Muted>
      </Container>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <TopBar back title={t("orders.title")} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={loading && !!order} onRefresh={reload} tintColor={colors.brand} />}
      >
        {body}
      </ScrollView>
    </View>
  );
}
