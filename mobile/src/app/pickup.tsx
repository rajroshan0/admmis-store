import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { TopBar } from "@/components/Header";
import { StatusBadge } from "@/components/OrderBits";
import { Card, Container, Empty, ErrorState, H1, Loading, Muted } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import { useRequireUser } from "@/lib/useRequireUser";
import { useLang } from "@/providers/Providers";
import { formatNPR } from "@/shared/format";
import type { Order } from "@/shared/types";

/** One QR code per open order. The code holds the order id so the shop can look the order up when the customer collects it. */
export default function PickupScreen() {
  const { t } = useLang();
  const auth = useRequireUser("/pickup");

  const { data, error, loading, reload } = useAsync(async () => {
    if (!auth.user) return [] as Order[];
    const { data: rows, error: err } = await supabase
      .from("orders")
      .select("id, order_number, status, total, payment_method, payment_status")
      .in("status", ["pending", "confirmed", "processing", "shipped"])
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <TopBar back title={t("pickup.title")} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={colors.brand} />}
      >
        <Container style={{ paddingTop: 20, gap: 14, maxWidth: 520 }}>
          <H1>{t("pickup.title")}</H1>
          <Muted>{t("pickup.sub")}</Muted>
          {loading && !data ? <Loading /> : null}
          {error && !data ? <ErrorState onRetry={reload} /> : null}
          {data && data.length === 0 ? <Empty title={t("pickup.empty")} /> : null}
          {(data ?? []).map((o) => (
            <Card key={o.id} style={{ alignItems: "center", gap: 12, paddingVertical: 20 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink }}>{t("orders.order", { n: o.order_number })}</Text>
              <View style={{ padding: 12, backgroundColor: "#fff", borderRadius: 12 }}>
                <QRCode value={`admmis:order:${o.id}`} size={190} color={colors.ink} backgroundColor="#fff" />
              </View>
              <Muted>
                {t("pickup.code")}: #{o.order_number} · {formatNPR(o.total)}
              </Muted>
              <StatusBadge status={o.status} />
            </Card>
          ))}
        </Container>
      </ScrollView>
    </View>
  );
}
