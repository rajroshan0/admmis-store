import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { colors, fonts, radius } from "@/lib/theme";
import { discountPercent, formatNPR, pickLang, productName } from "@/shared/format";
import { useFavorites, useLang } from "@/providers/Providers";
import type { Product } from "@/shared/types";

/** Plain product picture with a calm fallback when there is no picture yet (or it fails to load). Used in cart/orders. */
export function ProductImage({ uri, aspect = 4 / 5 }: { uri?: string; aspect?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ width: "100%", aspectRatio: aspect, backgroundColor: colors.sand }}>
      {uri && !failed ? (
        <Image source={{ uri }} resizeMode="cover" onError={() => setFailed(true)} style={{ width: "100%", height: "100%" }} />
      ) : null}
    </View>
  );
}

/**
 * Marketplace-style card: big swipeable photo with a heart, price first (in the brand colour) with old price and
 * % off, an "only N left" nudge when stock is low, then the name and category.
 */
export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { lang, t } = useLang();
  const favs = useFavorites();
  const [w, setW] = useState(0);
  const [idx, setIdx] = useState(0);

  const name = productName(product, lang);
  const off = discountPercent(product.price, product.compare_at_price);
  const stock = (product.product_variants ?? []).reduce((s, v) => s + v.stock, 0);
  const soldOut = (product.product_variants?.length ?? 0) > 0 && stock === 0;
  const lowStock = !soldOut && stock > 0 && stock <= 5;
  const isNew = Date.now() - new Date(product.created_at).getTime() < 14 * 24 * 3600 * 1000;
  const images = product.images.slice(0, 6);
  const liked = favs.has(product.id);

  const open = () => router.push({ pathname: "/product/[slug]", params: { slug: product.slug } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, overflow: "hidden" }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ width: "100%", aspectRatio: 4 / 5, backgroundColor: colors.sand }}>
        {images.length > 0 && w > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / w))}
            style={{ width: "100%", height: "100%" }}
          >
            {images.map((uri, i) => (
              <Pressable key={uri + i} accessibilityRole="button" accessibilityLabel={name} onPress={open} style={{ width: w, height: "100%" }}>
                <Image source={{ uri }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={open} style={{ flex: 1 }} />
        )}

        {isNew && !soldOut ? (
          <View pointerEvents="none" style={{ position: "absolute", top: 10, left: 10, backgroundColor: colors.marigold, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.night }}>{t("product.new")}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("nav.favorites")}
          accessibilityState={{ selected: liked }}
          onPress={() => favs.toggle(product.id)}
          hitSlop={8}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,.85)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? colors.brand : colors.ink} />
        </Pressable>

        {soldOut ? (
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(26,23,64,.82)", paddingVertical: 6 }}>
            <Text style={{ textAlign: "center", fontFamily: fonts.medium, fontSize: 12, color: colors.paper }}>{t("product.sold_out")}</Text>
          </View>
        ) : null}
      </View>

      {/* dots: one per photo */}
      <View style={{ height: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4 }}>
        {images.length > 1
          ? images.map((_, i) => (
              <View key={i} style={{ width: i === idx ? 7 : 5, height: i === idx ? 7 : 5, borderRadius: 4, backgroundColor: i === idx ? colors.brand : colors.line }} />
            ))
          : null}
      </View>

      <Pressable accessibilityRole="button" onPress={open} style={{ paddingHorizontal: 12, paddingBottom: 14, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: 7 }}>
          <Text style={{ fontFamily: fonts.displayXL, fontSize: 20, color: off > 0 ? colors.brand : colors.ink }}>{formatNPR(product.price)}</Text>
          {product.compare_at_price && product.compare_at_price > product.price ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkMute, textDecorationLine: "line-through" }}>
              {formatNPR(product.compare_at_price)}
            </Text>
          ) : null}
          {off > 0 ? <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.brand }}>−{off}%</Text> : null}
        </View>
        {lowStock ? <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.brand }}>{t("product.low_stock", { n: stock })}</Text> : null}
        <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: colors.ink }}>
          {name}
        </Text>
        {product.categories ? (
          <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkMute }}>
            {pickLang(lang, product.categories.name_en, product.categories.name_ne)}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}
