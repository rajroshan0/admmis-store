import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

export interface Tile {
  key: string;
  label: string;
  image?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  tint: string;
  onPress: () => void;
}

/** Row of rounded-square shortcuts (All + each category). Uses a product photo from that category when there is one. */
export default function CategoryTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}>
      {tiles.map((t) => (
        <Pressable key={t.key} accessibilityRole="button" accessibilityLabel={t.label} onPress={t.onPress} style={{ width: 78, alignItems: "center", gap: 6 }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, overflow: "hidden", backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}>
            {t.image ? (
              <Image source={{ uri: t.image }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
            ) : (
              <Ionicons name={t.icon ?? "shirt-outline"} size={32} color={colors.ink} />
            )}
          </View>
          <Text numberOfLines={2} style={{ fontFamily: fonts.medium, fontSize: 12, lineHeight: 15, color: colors.ink, textAlign: "center" }}>
            {t.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
