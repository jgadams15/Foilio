// Small uppercase muted text, used as a heading above a group of content
// (e.g. "PRICES", "FIND ON EBAY").
import { StyleSheet, Text, TextProps } from "react-native";

import { colors, fontFamily, fontSize, spacing } from "@/theme";

export function SectionLabel({ style, ...props }: TextProps) {
  return <Text style={[styles.label, style]} {...props} />;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
});
