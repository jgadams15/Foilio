// The card detail screen. Its file name, "[id]", is a *dynamic route*: the
// square brackets mean "this part of the URL is a variable, not a fixed
// word". So this one file handles /card/swsh3-136, /card/base1-4, and every
// other card — whatever was in the URL shows up here as the `id` param,
// via useLocalSearchParams(). Compare that to a normal file like
// (tabs)/search.tsx, whose URL ("/search") never changes.
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

// Same rule as every other screen: talk to `cardDataProvider` through the
// CardDataProvider interface, never to TCGdex specifics directly.
import {
  buildCardImageUrl,
  buildEbaySearchUrl,
  buildSetSymbolUrl,
  Card,
  cardDataProvider,
  formatPriceDisplay,
  pickDefaultFinish,
} from "@foilio/shared";

import { Card as CardSurface, Chip, FinishShimmer, SectionLabel } from "@/components";
import { colors, fontFamily, fontSize, radii, spacing, tabularNums } from "@/theme";

type Status = "loading" | "ready" | "error";

// A shimmer effect only reads as "holo" on finishes that are actually
// holographic in real life.
const SHIMMER_FINISHES = new Set(["Holo", "Reverse Holo", "1st Edition Holo"]);

// eBay doesn't have an official free "look up sold listings" API we can call
// from the client, so for now each button opens an eBay search in the
// browser. Keeping the URL-building in one shared helper (buildEbaySearchUrl)
// means swapping this for real eBay API listings later only touches that
// one function, not this screen.
const EBAY_GRADES = ["Raw", "PSA 10", "PSA 9", "CGC 10"];

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<Card | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedFinish, setSelectedFinish] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    // Deferred a tick so this reset isn't a synchronous setState call inside
    // the effect body itself (React flags that as a cascading-render risk).
    queueMicrotask(() => {
      setStatus("loading");
      setCard(null);
    });

    cardDataProvider
      .getCardDetails(id, controller.signal)
      .then((result) => {
        setCard(result);
        setSelectedFinish(pickDefaultFinish(result));
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus("error");
      });

    return () => controller.abort();
  }, [id]);

  const imageUrl = card?.imageUrl ? buildCardImageUrl(card.imageUrl, "high") : undefined;
  const selectedPrice = card?.prices.find((price) => price.finish === selectedFinish);
  const showsShimmer = Boolean(selectedFinish && SHIMMER_FINISHES.has(selectedFinish));

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: card?.name ?? "Card",
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontFamily: fontFamily.semiBold, color: colors.text },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      {status === "loading" && <ActivityIndicator style={styles.spinner} size="large" color={colors.accent} />}

      {status === "error" && <Text style={styles.message}>Something went wrong. Check your connection and try again.</Text>}

      {status === "ready" && card && (
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable disabled={!imageUrl} onPress={() => setImageViewerVisible(true)}>
            <View style={styles.imageWrap}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Text style={styles.imagePlaceholderText}>No image</Text>
                </View>
              )}
              {showsShimmer && <FinishShimmer />}
              {selectedFinish && (
                <View style={styles.finishBadge}>
                  <Text style={styles.finishBadgeText}>{selectedFinish}</Text>
                </View>
              )}
            </View>
          </Pressable>

          <Text style={styles.name}>{card.name}</Text>

          <View style={styles.setRow}>
            {card.setSymbolUrl && (
              <Image source={{ uri: buildSetSymbolUrl(card.setSymbolUrl) }} style={styles.setSymbol} contentFit="contain" />
            )}
            <Text style={styles.setName}>{card.setName ?? "Unknown set"}</Text>
          </View>

          <Text style={styles.meta}>#{card.localId}</Text>
          {card.rarity && <Text style={styles.meta}>{card.rarity}</Text>}
          {card.artist && <Text style={styles.meta}>Illustrated by {card.artist}</Text>}

          {card.finishes.length > 1 && (
            <View style={styles.section}>
              <SectionLabel>Finish</SectionLabel>
              <View style={styles.finishRow}>
                {card.finishes.map((finish) => (
                  <Chip
                    key={finish}
                    label={finish}
                    selected={finish === selectedFinish}
                    onPress={() => setSelectedFinish(finish)}
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <SectionLabel>Price</SectionLabel>
            <CardSurface style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceCondition}>{selectedPrice?.condition ?? "Raw / Near Mint"}</Text>
                <Text style={styles.priceAmount}>
                  {selectedPrice ? formatPriceDisplay(selectedPrice) : "Price unavailable"}
                </Text>
              </View>
            </CardSurface>
          </View>

          <View style={styles.section}>
            <SectionLabel>Find on eBay</SectionLabel>
            <View style={styles.ebayRow}>
              {EBAY_GRADES.map((grade) => (
                <Chip
                  key={grade}
                  label={grade}
                  onPress={() => {
                    const url = buildEbaySearchUrl({
                      cardName: card.name,
                      setName: card.setName,
                      localId: card.localId,
                      finish: selectedFinish ?? "Normal",
                      grade,
                    });
                    Linking.openURL(url);
                  }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setImageViewerVisible(false)}>
          {imageUrl && <Image source={{ uri: imageUrl }} style={styles.viewerImage} contentFit="contain" />}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    alignItems: "center",
  },
  spinner: {
    marginTop: spacing.xl,
  },
  message: {
    marginTop: spacing.xl,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
  imageWrap: {
    width: 240,
    height: 330,
  },
  image: {
    width: 240,
    height: 330,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  finishBadge: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  finishBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.text,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.xs + 2,
  },
  setSymbol: {
    width: 18,
    height: 18,
  },
  setName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: colors.text,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  section: {
    alignSelf: "stretch",
    marginTop: spacing.xl,
  },
  priceCard: {
    padding: 0,
    overflow: "hidden",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  finishRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  priceCondition: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  priceAmount: {
    ...tabularNums,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  ebayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: "100%",
    height: "80%",
  },
});
