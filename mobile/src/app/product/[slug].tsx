import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, ScrollView, Text, View, useWindowDimensions, type ViewToken } from "react-native";
import { TopBar } from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import { ProductImage } from "@/components/ProductCard";
import { Body, Button, Container, Empty, ErrorState, H1, H2, Loading, Muted, Pill, Stepper } from "@/components/ui";
import { getProductBySlug, getProducts } from "@/lib/data";
import { addRecent } from "@/lib/recent";
import { MAX_WIDTH, colors, fonts } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import { useCart, useLang } from "@/providers/Providers";
import { MAX_QTY_PER_LINE } from "@/shared/cart";
import { discountPercent, formatNPR, pickLang, productDescription, productName } from "@/shared/format";
import type { Product } from "@/shared/types";

function Gallery({ images, width, aspect }: { images: string[]; width: number; aspect: number }) {
  const [index, setIndex] = useState(0);
  const onChange = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const i = viewableItems[0]?.index;
    if (typeof i === "number") setIndex(i);
  }).current;

  if (images.length === 0) return <ProductImage aspect={aspect} />;
  return (
    <View>
      <FlatList
        data={images}
        keyExtractor={(u, i) => u + i}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onChange}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        style={{ width }}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <ProductImage uri={item} aspect={aspect} />
          </View>
        )}
      />
      {images.length > 1 ? (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 10 }}>
          {images.map((_, i) => (
            <View key={i} style={{ width: i === index ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === index ? colors.brand : colors.line }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Detail({ product }: { product: Product }) {
  const router = useRouter();
  const { lang, t } = useLang();
  const cart = useCart();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  useEffect(() => {
    void addRecent(product.id);
  }, [product.id]);
  const galleryW = wide ? Math.min(MAX_WIDTH, width) / 2 - 24 : width;

  const variants = product.product_variants ?? [];
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))], [variants]);
  const colorsList = useMemo(() => [...new Set(variants.map((v) => v.color).filter((c): c is string => !!c))], [variants]);

  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState<string | null>(colorsList.length === 1 ? colorsList[0] : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const needsSize = sizes.length > 0;
  const needsColor = colorsList.length > 0;
  const selected = variants.find(
    (v) => (!needsSize || v.size === size) && (!needsColor || v.color === color) && (needsSize ? !!size : true) && (needsColor ? !!color : true),
  );

  const stockFor = (s: string | null, c: string | null) =>
    variants
      .filter((v) => (!needsSize || !s || v.size === s) && (!needsColor || !c || v.color === c))
      .reduce((sum, v) => sum + v.stock, 0);

  const maxQty = selected ? Math.min(selected.stock, MAX_QTY_PER_LINE) : 1;
  const inCart = selected ? cart.lines.find((l) => l.variantId === selected.id)?.quantity ?? 0 : 0;
  const canAdd = !!selected && selected.stock > 0 && inCart < selected.stock;
  const allSold = variants.length === 0 || variants.every((v) => v.stock === 0);

  useEffect(() => {
    if (qty > maxQty) setQty(Math.max(1, maxQty));
  }, [maxQty, qty]);

  const name = productName(product, lang);
  const desc = productDescription(product, lang);
  const off = discountPercent(product.price, product.compare_at_price);

  function addLine(): boolean {
    if (!selected) {
      setHint(t("product.pick"));
      return false;
    }
    if (!canAdd) return false;
    setHint(null);
    cart.add({
      variantId: selected.id,
      productId: product.id,
      slug: product.slug,
      name_en: product.name_en,
      name_ne: product.name_ne,
      price: product.price,
      size: selected.size,
      color: selected.color,
      image: product.images[0] ?? null,
      quantity: Math.min(qty, selected.stock - inCart),
      maxStock: selected.stock,
    });
    return true;
  }

  function handleAdd() {
    if (addLine()) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    }
  }

  function handleBuyNow() {
    if (!selected) return setHint(t("product.pick"));
    if (selected.stock === 0) return;
    if (canAdd) addLine();
    router.push("/checkout");
  }

  return (
    <Container style={{ flexDirection: wide ? "row" : "column", gap: wide ? 32 : 0, paddingHorizontal: wide ? 16 : 0, paddingTop: wide ? 24 : 0 }}>
      <View style={{ width: wide ? galleryW : "100%" }}>
        <Gallery images={product.images} width={galleryW} aspect={wide ? 4 / 5 : 1} />
      </View>

      <View style={{ flex: 1, padding: wide ? 0 : 16, gap: 16 }}>
        <View style={{ gap: 6 }}>
          {product.categories ? (
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.brand, letterSpacing: 1 }}>
              {pickLang(lang, product.categories.name_en, product.categories.name_ne).toUpperCase()}
            </Text>
          ) : null}
          <H1>{name}</H1>
          <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: 10 }}>
            <Text style={{ fontFamily: fonts.displayXL, fontSize: 26, color: colors.ink }}>{formatNPR(product.price)}</Text>
            {product.compare_at_price && product.compare_at_price > product.price ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 16, color: colors.inkMute, textDecorationLine: "line-through" }}>
                {formatNPR(product.compare_at_price)}
              </Text>
            ) : null}
            {off > 0 ? (
              <View style={{ backgroundColor: colors.brand, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.white }}>{t("product.off", { n: off })}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {allSold ? (
          <View style={{ backgroundColor: colors.sand, borderRadius: 14, padding: 14 }}>
            <Body style={{ fontFamily: fonts.medium, color: colors.inkSoft }}>{t("product.sold_out")}</Body>
          </View>
        ) : (
          <>
            {needsSize ? (
              <View style={{ gap: 8 }}>
                <Body style={{ fontFamily: fonts.medium }}>{t("product.size")}</Body>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {sizes.map((s) => (
                    <Pill key={s} label={s} selected={size === s} disabled={stockFor(s, color) === 0} onPress={() => { setSize(s); setHint(null); }} />
                  ))}
                </View>
              </View>
            ) : null}
            {needsColor ? (
              <View style={{ gap: 8 }}>
                <Body style={{ fontFamily: fonts.medium }}>{t("product.color")}</Body>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {colorsList.map((c) => (
                    <Pill key={c} label={c} selected={color === c} disabled={stockFor(size, c) === 0} onPress={() => { setColor(c); setHint(null); }} />
                  ))}
                </View>
              </View>
            ) : null}

            {selected ? (
              <Muted style={{ color: selected.stock <= 3 ? colors.brandDark : colors.ok, fontFamily: fonts.medium }}>
                {selected.stock === 0 ? t("product.sold_out") : selected.stock <= 3 ? t("product.low_stock", { n: selected.stock }) : t("product.in_stock")}
              </Muted>
            ) : null}
            {hint ? <Muted style={{ color: colors.brandDark }}>{hint}</Muted> : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Body style={{ fontFamily: fonts.medium }}>{t("cart.qty")}</Body>
              <Stepper value={qty} min={1} max={maxQty} onChange={setQty} />
            </View>

            <View style={{ gap: 10 }}>
              <Button title={t("product.buy_now")} variant="marigold" onPress={handleBuyNow} disabled={!!selected && selected.stock === 0} />
              <Button
                title={added ? t("product.added") : t("product.add")}
                variant="primary"
                onPress={handleAdd}
                disabled={!!selected && !canAdd}
              />
              {added ? (
                <Button title={t("product.go_cart")} variant="ghost" onPress={() => router.navigate("/cart")} />
              ) : null}
            </View>
          </>
        )}

        {desc ? (
          <View style={{ gap: 6, marginTop: 4 }}>
            <H2 style={{ fontSize: 18 }}>{t("product.details")}</H2>
            <Body style={{ color: colors.inkSoft }}>{desc}</Body>
          </View>
        ) : null}
      </View>
    </Container>
  );
}

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useLang();
  const router = useRouter();

  const main = useAsync(() => getProductBySlug(String(slug)), [slug]);
  const product = main.data;

  // "You may also like": same category first, then everything else, newest first.
  const more = useAsync(async () => {
    if (!product) return { related: [] as Product[], rest: [] as Product[] };
    const related = product.category_id
      ? await getProducts({ categoryId: product.category_id, excludeId: product.id, limit: 4 })
      : [];
    const rest = await getProducts({ excludeId: product.id, limit: 16 });
    const seen = new Set(related.map((p) => p.id));
    return { related, rest: rest.filter((p) => !seen.has(p.id)).slice(0, 8) };
  }, [product?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <TopBar back />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {main.loading && !product ? <Loading /> : null}
        {main.error ? <ErrorState onRetry={main.reload} /> : null}
        {!main.loading && !main.error && !product ? (
          <Empty title={t("product.not_found")} action={{ label: t("common.go_home"), onPress: () => router.replace("/") }} />
        ) : null}
        {product ? <Detail key={product.id} product={product} /> : null}

        {product && more.data && more.data.related.length > 0 ? (
          <View style={{ marginTop: 36, gap: 14 }}>
            <Container>
              <H2>{t("product.related")}</H2>
            </Container>
            <ProductGrid products={more.data.related} />
          </View>
        ) : null}
        {product && more.data && more.data.rest.length > 0 ? (
          <View style={{ marginTop: 32, gap: 14 }}>
            <Container>
              <H2>{t("product.more")}</H2>
            </Container>
            <ProductGrid products={more.data.rest} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
