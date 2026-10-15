import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { TopBar } from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import { Button, Container, Empty, ErrorState, H1, Loading } from "@/components/ui";
import { getProductsByIds } from "@/lib/data";
import { clearRecent, getRecentIds } from "@/lib/recent";
import { colors } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import { useLang } from "@/providers/Providers";
import { View } from "react-native";

export default function RecentScreen() {
  const router = useRouter();
  const { t } = useLang();
  const [tick, setTick] = useState(0);
  const { data, error, loading, reload } = useAsync(async () => getProductsByIds(await getRecentIds()), [tick]);

  useFocusEffect(useCallback(() => setTick((n) => n + 1), []));

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <TopBar back title={t("recent.title")} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Container style={{ paddingTop: 18, paddingBottom: 12 }}>
          <H1>{t("recent.title")}</H1>
        </Container>
        {loading && !data ? <Loading /> : null}
        {error && !data ? <ErrorState onRetry={reload} /> : null}
        {data && data.length === 0 ? (
          <Empty title={t("recent.empty")} sub={t("recent.empty_sub")} action={{ label: t("cart.continue"), onPress: () => router.navigate("/shop") }} />
        ) : null}
        {data && data.length > 0 ? (
          <>
            <ProductGrid products={data} />
            <Container style={{ paddingTop: 16 }}>
              <Button
                title={t("recent.clear")}
                variant="outline"
                onPress={() => {
                  void clearRecent().then(() => setTick((n) => n + 1));
                }}
              />
            </Container>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
