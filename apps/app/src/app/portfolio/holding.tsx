// One holding: every purchase ("lot") of the same card, finish, and grade,
// grouped together. The Portfolio list shows the combined row; this screen
// shows each purchase separately, so each one can be edited or removed.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  buildCardImageUrl,
  formatDisplayDate,
  formatPriceDisplay,
  formatUsd,
  gradingLabel,
  type PortfolioEntry,
} from "@foilio/shared";

import { Badge, Button, Card as CardSurface, HoldingValueText, SectionLabel } from "@/components";
import { usePortfolio } from "@/portfolio";
import { colors, fontFamily, fontSize, radii, spacing, tabularNums } from "@/theme";

function LotRow({ lot, onPress }: { lot: PortfolioEntry; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.lotRow, pressed && styles.pressed]} accessibilityRole="button">
      <View style={styles.lotInfo}>
        <Text style={styles.lotTitle}>
          ×{lot.quantity} ·{" "}
          {lot.purchasePrice !== undefined ? `${formatUsd(lot.purchasePrice)} each` : "No price recorded"}
        </Text>
        <Text style={styles.lotMeta}>
          {lot.purchaseDate ? `Bought ${formatDisplayDate(lot.purchaseDate)}` : `Added ${formatDisplayDate(lot.addedAt.slice(0, 10))}`}
        </Text>
        {lot.notes ? (
          <Text style={styles.lotMeta} numberOfLines={2}>
            {lot.notes}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={fontSize.lg} color={colors.textMuted} />
    </Pressable>
  );
}

function StatRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function HoldingScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const { summary } = usePortfolio();
  const holding = summary.holdings.find((candidate) => candidate.key === key);

  if (!holding) {
    // Every purchase in this holding was removed.
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Holding" }} />
        <Text style={styles.statLabel}>No purchases left here.</Text>
        <Button label="Back to portfolio" variant="secondary" onPress={() => router.dismissAll()} />
      </View>
    );
  }

  const { display, value } = holding;
  const imageUrl = display.imageUrl ? buildCardImageUrl(display.imageUrl, "high") : undefined;
  const editLot = (lot: PortfolioEntry) => router.push({ pathname: "/portfolio/entry", params: { entryId: lot.id } });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: display.cardName }} />

      <View style={styles.header}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" />
        ) : (
          <View style={styles.image} />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{display.cardName}</Text>
          <Text style={styles.lotMeta}>
            {display.setName ? `${display.setName} · ` : ""}#{display.localId}
          </Text>
          <Badge label={`${display.finish} · ${gradingLabel(display.grading)}`} />
          <Pressable onPress={() => router.push({ pathname: "/card/[id]", params: { id: display.cardId } })}>
            <Text style={styles.link}>View card details</Text>
          </Pressable>
        </View>
      </View>

      <CardSurface style={styles.stats}>
        <StatRow label="Quantity">
          <Text style={styles.statValue}>{holding.quantity}</Text>
        </StatRow>
        <StatRow label="Average cost (each)">
          <Text style={styles.statValue}>
            {holding.averageCost !== undefined ? formatUsd(holding.averageCost) : "—"}
          </Text>
        </StatRow>
        {value.status === "priced" && (
          <StatRow label="Current price (each)">
            <Text style={styles.statValue}>{formatPriceDisplay(value.unitPrice)}</Text>
          </StatRow>
        )}
        <StatRow label="Value">
          <HoldingValueText value={value} />
        </StatRow>
        {value.status === "priced" && value.gain && holding.costedQuantity < holding.quantity && (
          <Text style={styles.note}>
            Gain/loss covers the {holding.costedQuantity} of {holding.quantity} copies with a purchase price.
          </Text>
        )}
      </CardSurface>

      <SectionLabel style={styles.sectionLabel}>Purchases</SectionLabel>
      {holding.lots.map((lot) => (
        <LotRow key={lot.id} lot={lot} onPress={() => editLot(lot)} />
      ))}

      <View style={styles.addButton}>
        <Button
          label="Add another purchase"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/portfolio/entry",
              params: {
                cardId: display.cardId,
                finish: display.finish,
                ...(display.grading.kind === "graded"
                  ? { company: display.grading.company, grade: display.grading.grade }
                  : {}),
              },
            })
          }
        />
      </View>
    </ScrollView>
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
    gap: spacing.md,
    padding: spacing.xl,
  },
  header: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  image: {
    width: 110,
    height: 152,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.text,
  },
  link: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  stats: {
    gap: spacing.md,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  statValue: {
    ...tabularNums,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  note: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: 0,
  },
  lotRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  lotInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  lotTitle: {
    ...tabularNums,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  lotMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  addButton: {
    marginTop: spacing.xl,
  },
});
