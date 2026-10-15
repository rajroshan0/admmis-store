import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { TopBar } from "@/components/Header";
import { PaymentBadge, StatusBadge } from "@/components/OrderBits";
import { Card, Container, Empty, ErrorState, H1, Loading, Muted } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import { useRequireUser } from "@/lib/useRequireUser";
import { useLang } from "@/providers/Providers";
import { formatNPR } from "@/shared/format";
import type { Order } from "@/shared/types";

export default function OrdersScreen() {
  const router = useRouter();
  const { lang, t } = useLang();
  const auth = useRequireUser("/orders");
  const { view } = useLocalSearchParams<{ view?: string }>();
  const history = view === "history";
  const active = view === "active";

  const { data, error, loading, reload } = useAsync(async () => {
    if (!auth.user) return [] as Order[];
    const { data: rows, error: err } = await supabase
      .from("orders")
      .select("*, order_items(id, name, quantity)")
      .order("created_at", { ascending: false });
    if (err) throw new Error(err.message);
    return (rows ?? []) as unknown as Order[];
  }, [auth.user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (auth.user) void reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth.user?.id]),
  );

  const title = history ? t("orders.history_title") : active ? t("orders.active_title") : t("orders.title");
  const rows = (data ?? []).filter((o) => {
    const open = o.status !== "delivered" && o.status !== "cancelled";
    return history ? !open : active ? open : true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <TopBar back title={title} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={colors.brand} />}
      >
        <Container style={{ paddingTop: 20, gap: 12, maxWidth: 720 }}>
          <H1>{title}</H1>
          {loading && !data ? <Loading /> : null}
          {error && !data ? <ErrorState onRetry={reload} /> : null}
          {data && rows.length === 0 ? (
            <Empty title={history ? t("orders.no_history") : active ? t("orders.no_active") : t("orders.empty")} action={{ label: t("cart.continue"), onPress: () => router.replace("/shop") }} />
          ) : null}
          {rows.map((o) => (
            <Pressable key={o.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/orders/[id]", params: { id: o.id } })}>
              <Card style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink }}>{t("orders.order", { n: o.order_number })}</Text>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>{formatNPR(o.total)}</Text>
                </View>
                <Muted>{t("orders.placed", { date: formatDate(o.created_at, lang) })}</Muted>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <StatusBadge status={o.status} />
                  <PaymentBadge status={o.payment_status} />
                </View>
                <Muted numberOfLines={1}>
                  {(o.order_items ?? []).map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                </Muted>
              </Card>
            </Pressable>
          ))}
        </Container>
      </ScrollView>
    </View>
  );
}
