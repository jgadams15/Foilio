// This file is the app's home screen.
//
// Expo Router uses "file-based routing": every file inside src/app/ becomes a
// screen, and its file name becomes its address. index.tsx is the first screen
// people see (like index.html on a website).

import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, spacing } from "@/theme";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello Foilio 👋</Text>
      <Text style={styles.subtitle}>Your Pokémon card portfolio starts here.</Text>
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
