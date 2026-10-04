import type { TextStyle } from "react-native";

// Design tokens for Foilio's dark "brokerage app" look. Every screen and
// component should pull its colors, spacing, radii, and font sizes from
// here rather than hardcoding values, so the whole app stays visually
// consistent and a future theme (e.g. light mode) only means changing this
// file.
//
// Dark mode only for now (see app.json's "userInterfaceStyle": "dark").

export const colors = {
  background: "#0F172A",
  surface: "#1E293B",
  border: "#334155",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  accent: "#6366F1",
  gain: "#22C55E",
  loss: "#EF4444",
  /** Behind the live camera preview, before the first frame arrives. */
  cameraBackground: "#000000",
  /** See-through dark wash laid over the camera, outside the card outline. */
  scrim: "rgba(15, 23, 42, 0.6)",
} as const;

// A consistent multiple-of-4 spacing scale, used for padding, margin, and gaps.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Fixed sizes for specific controls that don't fit the spacing scale.
export const sizes = {
  /** The round shutter button on the Scan tab. */
  captureButton: 72,
  /** The circle around a big icon heading a message, e.g. "Allow camera". */
  iconCircle: 72,
  /** Widest a block of centered text or buttons should get on big screens. */
  readableWidth: 360,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  /** Big headline numbers, e.g. the portfolio's total value. */
  display: 36,
} as const;

// Inter, loaded via @expo-google-fonts/inter in the root layout. These
// exact family names are what expo-font registers the weights under.
export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

// Fixed-width digits, so a column of prices lines up instead of each row's
// width wobbling as digits change. Spread this into any Text style showing
// a price or other number that sits in a list/column.
// (Typed as TextStyle, not `as const`, so spreading it into a
// StyleSheet.create() object doesn't widen that style's inferred type.)
export const tabularNums: TextStyle = {
  fontVariant: ["tabular-nums"],
};
