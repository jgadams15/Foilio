// A green ▲ or red ▼ showing a price change, as an amount and a percent.
// Not wired up to real data anywhere yet (nothing in the app computes a
// gain/loss over time), but the app's dark theme needs this piece ready for
// when a portfolio view does.
import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, tabularNums } from "@/theme";

interface PriceChangeProps {
  /** Signed change in the underlying currency, e.g. 1.23 or -0.45. */
  amount: number;
  /** Signed percent change, e.g. 4.5 or -2.1. */
  percent: number;
  currencySymbol?: string;
}

export function PriceChange({ amount, percent, currencySymbol = "$" }: PriceChangeProps) {
  const isGain = amount >= 0;
  const color = isGain ? colors.gain : colors.loss;
  const arrow = isGain ? "▲" : "▼";

  return (
    <View style={styles.row}>
      <Text style={[styles.text, tabularNums, { color }]}>
        {arrow} {currencySymbol}
        {Math.abs(amount).toFixed(2)} ({isGain ? "+" : "-"}
        {Math.abs(percent).toFixed(2)}%)
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
});
