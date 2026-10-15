import { View, useWindowDimensions } from "react-native";
import ProductCard from "@/components/ProductCard";
import { MAX_WIDTH, gridColumns } from "@/lib/theme";
import type { Product } from "@/shared/types";

const GAP = 8;
const PAD = 8;

/** Responsive grid: 2 columns on phones, 3 on large phones/small tablets, 4 on tablets and wide windows. */
export default function ProductGrid({ products }: { products: Product[] }) {
  const { width } = useWindowDimensions();
  const cols = gridColumns(width);
  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += cols) rows.push(products.slice(i, i + cols));

  return (
    <View style={{ width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: PAD, gap: GAP }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: "row", gap: GAP }}>
          {row.map((p) => (
            <View key={p.id} style={{ flex: 1 }}>
              <ProductCard product={p} />
            </View>
          ))}
          {/* keep the last row's cards the same width as the others */}
          {Array.from({ length: cols - row.length }).map((_, k) => (
            <View key={`s${k}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
