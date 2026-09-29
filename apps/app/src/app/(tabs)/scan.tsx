// This is a placeholder screen for the Scan tab. Like index.tsx, its file
// name ("scan") becomes its route, and the tab bar shows the title we set
// for it in _layout.tsx.
import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, spacing } from "@/theme";

export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan</Text>
      <Text style={styles.subtitle}>Scan a card to add it to your portfolio.</Text>
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
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
});
