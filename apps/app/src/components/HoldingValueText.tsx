// The value side of a holding: its current value and gain/loss, or a plain
// explanation of why there's no number. Never shows a made-up value.
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { formatUsd, type HoldingValue } from "@foilio/shared";

import { colors, fontFamily, fontSize, spacing, tabularNums } from "@/theme";

import { PriceChange } from "./PriceChange";

const NO_VALUE_TEXT: Record<Exclude<HoldingValue["status"], "priced" | "loading">, string> = {
  graded: "No graded price yet",
  noPrice: "Price unavailable",
  error: "Couldn't load price",
};

interface HoldingValueTextProps {
  value: HoldingValue;
  /** "end" right-aligns, for the right-hand side of a list row. */
  align?: "start" | "end";
}

export function HoldingValueText({ value, align = "end" }: HoldingValueTextProps) {
  const alignItems = align === "end" ? "flex-end" : "flex-start";

  if (value.status === "loading") {
    return <ActivityIndicator size="small" color={colors.textMuted} />;
  }
  if (value.status !== "priced") {
    return (
      <View style={{ alignItems }}>
        <Text style={styles.muted}>{NO_VALUE_TEXT[value.status]}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.column, { alignItems }]}>
      <Text style={styles.value}>
        {value.estimated ? "≈ " : ""}
        {formatUsd(value.total)}
      </Text>
      {value.gain && <PriceChange amount={value.gain.amount} percent={value.gain.percent} />}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: spacing.xs / 2,
  },
  value: {
    ...tabularNums,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  muted: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
