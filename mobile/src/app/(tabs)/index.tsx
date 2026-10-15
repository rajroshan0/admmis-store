import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import BannerCarousel, { type Slide } from "@/components/BannerCarousel";
import CategoryTiles, { type Tile } from "@/components/CategoryTiles";
import HomeHeader from "@/components/HomeHeader";
import ProductGrid from "@/components/ProductGrid";
import { Body, Button, Container, ErrorState, H2, Loading, Muted } from "@/components/ui";
import { API_URL, offer } from "@/lib/config";
import { getCategories, getProducts, getSettings } from "@/lib/data";
import { colors } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import { useLang } from "@/providers/Providers";
import { formatNPR, pickLang } from "@/shared/format";
import type { Product } from "@/shared/types";

const PHOTO_NAMES = ["hero-model.jpg", "hero-model.jpeg", "hero-model.webp", "hero-model.png"];
const TINTS = ["#fde6ee", "#fff1d1", "#e6f3ec", "#e9e7ff", "#e8f0fe", "#ece8f6"];
const PAGE = 12;

export default function HomeScreen() {
  const router = useRouter();
  const { lang, t } = useLang();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [shown, setShown] = useState(PAGE);

  const { data, error, loading, reload } = useAsync(async () => {
    const [categories, featured, newest, settings] = await Promise.all([
      getCategories(),
      getProducts({ featured: true, limit: 8 }),
      getProducts({ sort: "new", limit: 60 }),
      getSettings(),
    ]);
    return { categories, featured, newest, settings };
  }, []);

  const photo = photoIdx < PHOTO_NAMES.length ? `${API_URL}/images/${PHOTO_NAMES[photoIdx]}` : null;
  const freeOver = data ? formatNPR(data.settings.free_shipping_over) : "";

  const slides: Slide[] = [
    ...(offer.active
      ? [
          {
            key: "offer",
            bg: colors.night,
            fg: colors.white,
            accent: colors.marigold,
            title: pickLang(lang, offer.title.en, offer.title.ne),
            sub: t("home.hero_sub"),
            cta: t("home.hero_cta"),
            onPress: () => router.navigate({ pathname: "/shop", params: { q: "", category: "" } }),
            photo,
            photoFocusX: 0.72,
            photoAspect: 1400 / 785,
            onPhotoError: () => setPhotoIdx((i) => i + 1),
            badge: `${offer.percent}%`,
            badgeSub: t("offer.off"),
          } satisfies Slide,
        ]
      : []),
    {
      key: "delivery",
      bg: colors.marigold,
      fg: colors.night,
      accent: colors.night,
      title: t("home.trust_delivery"),
      sub: t("home.trust_delivery_sub", { amount: freeOver || "—" }),
      cta: t("home.view_all"),
      onPress: () => router.navigate({ pathname: "/shop", params: { q: "", category: "" } }),
      icon: "bicycle-outline",
    },
    {
      key: "pay",
      bg: colors.brand,
      fg: colors.white,
      accent: colors.white,
      title: t("home.trust_esewa"),
      sub: `${t("home.trust_esewa_sub")} · ${t("home.trust_cod")}`,
      cta: t("home.hero_cta"),
      onPress: () => router.navigate({ pathname: "/shop", params: { q: "", category: "" } }),
      icon: "phone-portrait-outline",
    },
    {
      key: "new",
      bg: colors.sand,
      fg: colors.ink,
      accent: colors.marigold,
      title: t("home.new"),
      sub: t("home.categories"),
      cta: t("home.view_all"),
      onPress: () => router.navigate({ pathname: "/shop", params: { q: "", category: "" } }),
      icon: "sparkles-outline",
    },
  ];

  const tiles: Tile[] = useMemo(() => {
    if (!data) return [];
    const cover = new Map<string, string>();
    for (const p of data.newest) if (p.category_id && p.images[0] && !cover.has(p.category_id)) cover.set(p.category_id, p.images[0]);
    return [
      {
        key: "all",
        label: t("home.all"),
        icon: "grid-outline",
        tint: colors.sand,
        onPress: () => router.navigate({ pathname: "/shop", params: { q: "", category: "" } }),
      },
      ...data.categories.map((c, i) => ({
        key: c.id,
        label: pickLang(lang, c.name_en, c.name_ne),
        image: cover.get(c.id) ?? null,
        tint: TINTS[i % TINTS.length],
        onPress: () => router.navigate({ pathname: "/shop", params: { q: "", category: c.id } }),
      })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lang]);

  // One feed: featured items first, then the newest, without repeats.
  const feed: Product[] = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    return [...data.featured, ...data.newest].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [data]);

  const trust = [
    { icon: "cash-outline" as const, title: t("home.trust_cod"), sub: t("home.trust_cod_sub") },
    { icon: "phone-portrait-outline" as const, title: t("home.trust_esewa"), sub: t("home.trust_esewa_sub") },
    { icon: "bicycle-outline" as const, title: t("home.trust_delivery"), sub: t("home.trust_delivery_sub", { amount: freeOver }) },
    { icon: "swap-horizontal-outline" as const, title: t("home.trust_returns"), sub: t("home.trust_returns_sub") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView
        stickyHeaderIndices={[]}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={colors.brand} />}
        keyboardShouldPersistTaps="handled"
      >
        <HomeHeader />
        <View style={{ height: 12 }} />
        <BannerCarousel slides={slides} />

        {loading && !data ? <Loading /> : null}
        {error && !data ? <ErrorState onRetry={reload} /> : null}

        {data ? (
          <>
            <View style={{ backgroundColor: colors.white, marginTop: 14, paddingVertical: 16 }}>
              <CategoryTiles tiles={tiles} />
            </View>

            <Container style={{ marginTop: 20, paddingHorizontal: 12 }}>
              <H2>{t("home.recommended")}</H2>
            </Container>
            <View style={{ height: 10 }} />
            {feed.length > 0 ? <ProductGrid products={feed.slice(0, shown)} /> : <Container><Muted>{t("home.empty")}</Muted></Container>}
            {feed.length > shown ? (
              <Container style={{ marginTop: 14 }}>
                <Button title={t("home.show_more")} variant="outline" onPress={() => setShown((n) => n + PAGE)} />
              </Container>
            ) : null}

            <View style={{ marginTop: 28, backgroundColor: colors.white, paddingVertical: 22 }}>
              <Container style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 18, columnGap: 12 }}>
                {trust.map((x) => (
                  <View key={x.title} style={{ flexBasis: "47%", flexGrow: 1, flexDirection: "row", gap: 10, alignItems: "flex-start", minWidth: 200 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandLight, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={x.icon} size={20} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontFamily: "DMSans_700Bold", fontSize: 14 }}>{x.title}</Body>
                      <Muted>{x.sub}</Muted>
                    </View>
                  </View>
                ))}
              </Container>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
