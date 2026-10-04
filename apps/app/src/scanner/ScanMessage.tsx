// A centered icon + title + explanation + buttons panel. The Scan tab shows
// one of these whenever it can't show the camera: asking for permission,
// permission turned off, or "upload a photo" on web.
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, radii, sizes, spacing } from "@/theme";

interface ScanMessageProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  /** Buttons, stacked under the text. */
  children?: ReactNode;
}

export function ScanMessage({ icon, title, body, children }: ScanMessageProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={fontSize.xxl} color={colors.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  iconCircle: {
    width: sizes.iconCircle,
    height: sizes.iconCircle,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: fontSize.md * 1.5,
    maxWidth: sizes.readableWidth,
  },
  actions: {
    width: "100%",
    maxWidth: sizes.readableWidth,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
});
