// A green ▲ or red ▼ showing a price change, as an amount and a percent.
// Used for gain/loss in the portfolio: current value vs. what you paid.
import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, tabularNums } from "@/theme";

interface PriceChangeProps {
  /** Signed change in the underlying currency, e.g. 1.23 or -0.45. */
  amount: number;
  /** Signed percent change, e.g. 4.5 or -2.1. Left out when there's no
   * meaningful percent (e.g. the card cost $0). */
  percent?: number;
  currencySymbol?: string;
  size?: "sm" | "md";
}

export function PriceChange({ amount, percent, currencySymbol = "$", size = "sm" }: PriceChangeProps) {
  const isGain = amount >= 0;
  const color = isGain ? colors.gain : colors.loss;
  const arrow = isGain ? "▲" : "▼";
  const formattedAmount = Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <View style={styles.row}>
      <Text style={[styles.text, tabularNums, size === "md" && styles.textMd, { color }]}>
        {arrow} {currencySymbol}
        {formattedAmount}
        {percent !== undefined && ` (${isGain ? "+" : "-"}${Math.abs(percent).toFixed(2)}%)`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  textMd: {
    fontSize: fontSize.md,
  },
});
