import { Platform, type TextStyle, type ViewStyle } from "react-native";

// Same palette as the website (tailwind.config.ts).
export const colors = {
  paper: "#f8f6fc",
  sand: "#ece8f6",
  line: "#ddd7ec",
  ink: "#1a1740",
  inkSoft: "#4d4a74",
  inkMute: "#7d7aa0",
  brand: "#d42a5b",
  brandDark: "#a81b45",
  brandLight: "#fde6ee",
  marigold: "#ffb224",
  marigoldDark: "#e69500",
  marigoldLight: "#fff1d1",
  night: "#120f30",
  ok: "#2f6f4e",
  okLight: "#e6f3ec",
  white: "#ffffff",
};

export const fonts = {
  body: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  bold: "DMSans_700Bold",
  display: "BricolageGrotesque_700Bold",
  displayXL: "BricolageGrotesque_800ExtraBold",
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export const shadow: ViewStyle = Platform.select({
  ios: { shadowColor: "#1a1740", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 4 },
  default: { boxShadow: "0 12px 28px -14px rgba(26,23,64,.35)" } as ViewStyle,
}) as ViewStyle;

export const text: Record<string, TextStyle> = {
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
};

/** Content never gets wider than this, so it stays readable on tablets and big browser windows. */
export const MAX_WIDTH = 1100;

/** Product grid columns for the current screen width. */
export function gridColumns(width: number): number {
  if (width >= 1000) return 4;
  if (width >= 640) return 3;
  return 2;
}
