import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, TextInput, View } from "react-native";
import { TabScreen } from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import { Button, Container, Empty, ErrorState, H1, Loading, Muted, Pill } from "@/components/ui";
import { getCategories, getProducts, type ProductSort } from "@/lib/data";
import { colors, fonts, radius } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import { useLang } from "@/providers/Providers";
import { pickLang } from "@/shared/format";

export default function ShopScreen() {
  const { lang, t } = useLang();
  const params = useLocalSearchParams<{ category?: string; q?: string }>();
  const [category, setCategory] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<ProductSort>("new");

  // Opened from "View all" on the home page with a category chosen.
  useEffect(() => {
    if (typeof params.category === "string") setCategory(params.category || null);
    if (typeof params.q === "string") {
      setInput(params.q);
      setQ(params.q);
    }
  }, [params.category, params.q]);

  const cats = useAsync(() => getCategories(), []);
  const { data, error, loading, reload } = useAsync(
    () => getProducts({ q, categoryId: category ?? undefined, sort }),
    [q, category, sort],
  );

  function search() {
    setQ(input.trim());
  }

  return (
    <TabScreen>
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={colors.brand} />}
    >
      <Container style={{ paddingTop: 20, gap: 14 }}>
        <H1>{t("shop.title")}</H1>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <View
            style={{
              flex: 1,
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 14,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: radius.pill,
            }}
          >
            <Ionicons name="search-outline" size={20} color={colors.inkMute} />
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={search}
              returnKeyType="search"
              placeholder={t("shop.search_placeholder")}
              placeholderTextColor={colors.inkMute}
              accessibilityLabel={t("nav.search")}
              style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.ink, minHeight: 46 }}
            />
          </View>
          <Button title={t("shop.search_btn")} onPress={search} style={{ minHeight: 48, paddingHorizontal: 18 }} />
        </View>
      </Container>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 14 }}>
        <Pill label={t("home.all")} selected={category === null} onPress={() => setCategory(null)} />
        {(cats.data ?? []).map((c) => (
          <Pill key={c.id} label={pickLang(lang, c.name_en, c.name_ne)} selected={category === c.id} onPress={() => setCategory(c.id)} />
        ))}
      </ScrollView>

      <Container style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <Muted>
          {data ? (q ? t("shop.results_for", { q }) + " · " : "") + (data.length === 1 ? t("shop.result_one") : t("shop.results", { n: data.length })) : ""}
        </Muted>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pill label={t("shop.sort_new")} selected={sort === "new"} onPress={() => setSort("new")} />
          <Pill label={t("shop.sort_low")} selected={sort === "price_asc"} onPress={() => setSort("price_asc")} />
          <Pill label={t("shop.sort_high")} selected={sort === "price_desc"} onPress={() => setSort("price_desc")} />
        </View>
      </Container>

      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorState onRetry={reload} /> : null}
      {data && data.length === 0 ? (
        <Empty
          title={t("shop.none")}
          action={
            q || category
              ? {
                  label: t("shop.clear"),
                  onPress: () => {
                    setInput("");
                    setQ("");
                    setCategory(null);
                  },
                }
              : undefined
          }
        />
      ) : null}
      {data && data.length > 0 ? <ProductGrid products={data} /> : null}
    </ScrollView>
    </TabScreen>
  );
}
