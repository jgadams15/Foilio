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
} from "@foilio/shared";

type Status = "loading" | "ready" | "error";

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
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus("error");
      });

    return () => controller.abort();
  }, [id]);

  const imageUrl = card?.imageUrl ? buildCardImageUrl(card.imageUrl, "high") : undefined;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: card?.name ?? "Card" }} />

      {status === "loading" && <ActivityIndicator style={styles.spinner} size="large" />}

      {status === "error" && <Text style={styles.message}>Something went wrong. Check your connection and try again.</Text>}

      {status === "ready" && card && (
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable disabled={!imageUrl} onPress={() => setImageViewerVisible(true)}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={styles.imagePlaceholderText}>No image</Text>
              </View>
            )}
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prices</Text>
            {card.prices.length === 0 ? (
              <Text style={styles.message}>No price available.</Text>
            ) : (
              card.prices.map((price, index) => (
                <View key={index} style={styles.priceRow}>
                  <Text style={styles.priceCondition}>{price.condition}</Text>
                  <Text style={styles.priceAmount}>{formatPriceDisplay(price)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Find on eBay</Text>
            <View style={styles.ebayRow}>
              {EBAY_GRADES.map((grade) => (
                <Pressable
                  key={grade}
                  style={styles.ebayButton}
                  onPress={() => {
                    const url = buildEbaySearchUrl({
                      cardName: card.name,
                      setName: card.setName,
                      localId: card.localId,
                      grade,
                    });
                    Linking.openURL(url);
                  }}
                >
                  <Text style={styles.ebayButtonText}>{grade}</Text>
                </Pressable>
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
  },
  content: {
    padding: 16,
    alignItems: "center",
  },
  spinner: {
    marginTop: 24,
  },
  message: {
    marginTop: 24,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  image: {
    width: 240,
    height: 330,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: "#999",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  setSymbol: {
    width: 18,
    height: 18,
  },
  setName: {
    fontSize: 16,
    color: "#333",
  },
  meta: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  section: {
    alignSelf: "stretch",
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  priceCondition: {
    fontSize: 15,
    color: "#333",
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: "600",
  },
  ebayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ebayButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#eee",
  },
  ebayButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
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
