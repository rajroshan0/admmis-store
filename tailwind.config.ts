import type { Config } from "tailwindcss";

// Palette: night indigo (ink), rhododendron red (brand, Nepal's national flower),
// marigold (offers, festival garlands) on a cool pearl white.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f8f6fc",
        sand: "#ece8f6",
        line: "#ddd7ec",
        ink: { DEFAULT: "#1a1740", soft: "#4d4a74", mute: "#7d7aa0" },
        brand: { DEFAULT: "#d42a5b", dark: "#a81b45", light: "#fde6ee" },
        marigold: { DEFAULT: "#ffb224", dark: "#e69500", light: "#fff1d1" },
        night: "#120f30",
        ok: "#2f6f4e",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', '"Noto Sans Devanagari"', "system-ui", "sans-serif"],
        sans: ['"DM Sans Variable"', '"Noto Sans Devanagari"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,23,64,.06), 0 12px 28px -14px rgba(26,23,64,.28)",
        pop: "0 18px 40px -16px rgba(18,15,48,.55)",
      },
    },
  },
  plugins: [],
};

export default config;
