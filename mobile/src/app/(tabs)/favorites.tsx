import { useRouter } from "expo-router";
import { RefreshControl, ScrollView } from "react-native";
import { TabScreen } from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import { Container, Empty, ErrorState, H1, Loading } from "@/components/ui";
import { getProductsByIds } from "@/lib/data";
import { colors } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import { useFavorites, useLang } from "@/providers/Providers";

export default function FavoritesScreen() {
  const router = useRouter();
  const { t } = useLang();
  const favs = useFavorites();
  const key = favs.ids.join(",");
  const { data, error, loading, reload } = useAsync(() => getProductsByIds(favs.ids), [key]);

  return (
    <TabScreen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={colors.brand} />}
      >
        <Container style={{ paddingTop: 18, paddingBottom: 12 }}>
          <H1>{t("fav.title")}</H1>
        </Container>
        {favs.ids.length === 0 ? (
          <Empty title={t("fav.empty")} sub={t("fav.empty_sub")} action={{ label: t("cart.continue"), onPress: () => router.navigate("/") }} />
        ) : null}
        {favs.ids.length > 0 && loading && !data ? <Loading /> : null}
        {error && !data ? <ErrorState onRetry={reload} /> : null}
        {data && data.length > 0 ? <ProductGrid products={data} /> : null}
      </ScrollView>
    </TabScreen>
  );
}
