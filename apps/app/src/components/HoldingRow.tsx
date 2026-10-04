// One row in the Portfolio list: every copy you own of one card in one
// finish and grade, with how many, what you paid on average, and what
// they're worth now.
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { buildCardImageUrl, formatUsd, gradingLabel, type Holding } from "@foilio/shared";

import { colors, fontFamily, fontSize, radii, spacing, tabularNums } from "@/theme";

import { Badge } from "./Badge";
import { HoldingValueText } from "./HoldingValueText";

interface HoldingRowProps {
  holding: Holding;
  onPress: () => void;
}

export function HoldingRow({ holding, onPress }: HoldingRowProps) {
  const { display } = holding;
  const imageUrl = display.imageUrl ? buildCardImageUrl(display.imageUrl, "low") : undefined;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" />
      ) : (
        <View style={styles.image} />
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {display.cardName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {display.setName ? `${display.setName} · ` : ""}#{display.localId}
        </Text>
        <Badge label={`${display.finish} · ${gradingLabel(display.grading)}`} />
        <Text style={styles.meta}>
          ×{holding.quantity}
          {holding.averageCost !== undefined && ` · avg ${formatUsd(holding.averageCost)}`}
        </Text>
      </View>

      <HoldingValueText value={holding.value} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  image: {
    width: 48,
    height: 66,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  info: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  name: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  meta: {
    ...tabularNums,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
