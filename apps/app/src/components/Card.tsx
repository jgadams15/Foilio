// A dark surface panel — the basic building block for grouped content
// (a row, a section, a list item) that should stand out from the screen background.
import { StyleSheet, View, ViewProps } from "react-native";

import { colors, radii, spacing } from "@/theme";

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
});
