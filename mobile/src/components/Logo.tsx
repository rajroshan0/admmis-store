import { Text, type StyleProp, type TextStyle } from "react-native";
import { STORE_NAME } from "@/lib/config";
import { colors, fonts } from "@/lib/theme";

/** Wordmark: "Admmis" in ink with ".fashion" in the brand colour (same as the website). */
export default function Logo({ size = 24, light = false, style }: { size?: number; light?: boolean; style?: StyleProp<TextStyle> }) {
  const i = STORE_NAME.indexOf(".");
  const main = i === -1 ? STORE_NAME : STORE_NAME.slice(0, i);
  const rest = i === -1 ? "." : STORE_NAME.slice(i);
  return (
    <Text accessibilityRole="header" style={[{ fontFamily: fonts.displayXL, fontSize: size, color: light ? colors.white : colors.ink }, style]}>
      {main}
      <Text style={{ fontFamily: fonts.display, color: light ? colors.marigold : colors.brand }}>{rest}</Text>
    </Text>
  );
}
