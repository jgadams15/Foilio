// The Portfolio tab, and the first screen people see (index.tsx is the
// home route, like index.html on a website). Brokerage-style: total value
// up top, gain/loss vs. what you paid, then one row per holding.
//
// The cards come from usePortfolio(), which reads them from the device (see
// src/portfolio). Current prices load in afterward, so the list shows right
// away and each value fills in as its price arrives.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { formatUsd, type PortfolioSummary } from "@foilio/shared";

import { Button, Card as CardSurface, HoldingRow, PriceChange, SectionLabel } from "@/components";
import { usePortfolio } from "@/portfolio";
import { colors, fontFamily, fontSize, spacing, tabularNums } from "@/theme";

function copies(count: number): string {
  return count === 1 ? "1 card" : `${count} cards`;
}

/** Small notes explaining anything that isn't counted in the totals. */
function summaryNotes(summary: PortfolioSummary): string[] {
  const notes: string[] = [];
  const { graded, unpriced, loading } = summary.excluded;
  if (loading > 0) notes.push(`Loading prices for ${copies(loading)}…`);
  if (graded > 0) notes.push(`${copies(graded)} graded — not included, no graded price yet.`);
  if (unpriced > 0) notes.push(`${copies(unpriced)} with no current price — not included.`);
  if (summary.totalGain && summary.costedPricedCopies < summary.pricedCopies) {
    notes.push(`Gain/loss based on ${summary.costedPricedCopies} of ${copies(summary.pricedCopies)} with a purchase price.`);
  }
  if (summary.totalEstimated) notes.push("≈ Includes prices converted from EUR.");
  return notes;
}

function SummaryHeader({ summary }: { summary: PortfolioSummary }) {
  const notes = summaryNotes(summary);
  return (
    <View>
      <Text style={styles.totalLabel}>Total value</Text>
      <Text style={styles.totalValue}>
        {summary.totalEstimated ? "≈ " : ""}
        {formatUsd(summary.totalValue)}
      </Text>
      <View style={styles.gainRow}>
        {summary.totalGain ? (
          <>
            <PriceChange amount={summary.totalGain.amount} percent={summary.totalGain.percent} size="md" />
            <Text style={styles.gainLabel}>all time</Text>
          </>
        ) : (
          <Text style={styles.note}>Add what you paid to see your gain/loss.</Text>
        )}
      </View>
      {notes.map((note) => (
        <Text key={note} style={styles.note}>
          {note}
        </Text>
      ))}

      <CardSurface style={styles.chartPlaceholder}>
        <Ionicons name="analytics-outline" size={fontSize.xl} color={colors.textMuted} />
        <Text style={styles.chartPlaceholderText}>Value history coming soon</Text>
      </CardSurface>

      <SectionLabel style={styles.listLabel}>Holdings · {copies(summary.totalCopies)}</SectionLabel>
    </View>
  );
}

export default function PortfolioScreen() {
  const router = useRouter();
  const { status, entries, summary, refresh } = usePortfolio();

  if (status === "loading" && entries.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Couldn&apos;t read your saved portfolio.</Text>
        <Button label="Try again" onPress={refresh} variant="secondary" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="albums-outline" size={fontSize.display} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Your portfolio is empty</Text>
        <Text style={styles.emptyText}>Find a card you own and tap “Add to portfolio” to start tracking its value.</Text>
        <Button label="Search for cards" onPress={() => router.push("/search")} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={summary.holdings}
      keyExtractor={(holding) => holding.key}
      ListHeaderComponent={<SummaryHeader summary={summary} />}
      renderItem={({ item }) => (
        <HoldingRow
          holding={item}
          onPress={() => router.push({ pathname: "/portfolio/holding", params: { key: item.key } })}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={status === "loading"}
          onRefresh={refresh}
          tintColor={colors.textMuted}
          colors={[colors.accent]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.text,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  totalValue: {
    ...tabularNums,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    color: colors.text,
    marginTop: spacing.xs,
  },
  gainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  gainLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  note: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs / 2,
  },
  chartPlaceholder: {
    marginTop: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  chartPlaceholderText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  listLabel: {
    marginTop: spacing.xl,
    marginBottom: 0,
  },
});
