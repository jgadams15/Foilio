// The Search screen: type a Pokémon card name, optionally narrow to one
// set, and see matching cards with their image, set, number, and price.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// These come from packages/shared, so the same search logic and types could
// be reused by other screens later (e.g. adding a card to your portfolio)
// without copy-pasting. We only ever talk to `cardDataProvider` through the
// CardDataProvider interface — never to TCGdex specifics directly — so a
// future paid data source can be swapped in by changing that one export,
// with no changes here.
import { buildCardImageUrl, Card, CardSet, cardDataProvider, formatPriceDisplay, Price, toUsdAmount } from "@foilio/shared";

import { Button, Card as CardSurface, Chip } from "@/components";
import { colors, fontFamily, fontSize, radii, spacing, tabularNums } from "@/theme";

// The provider's search only returns "brief" info (name, image, card
// number) — no set name or price. We fetch those separately, per card,
// after the search comes back. To keep that fast and not hammer the API, we
// only fetch details for cards currently on screen, PAGE_SIZE at a time.
const PAGE_SIZE = 20;
// Wait this long after the user stops typing before actually searching, so
// we don't fire a network request on every keystroke.
const DEBOUNCE_MS = 400;

type Status = "idle" | "loading" | "results" | "empty" | "error";
type SortMode = "newest" | "price";

/** The highest-value price we have for a card, converted to USD for comparison. */
function primaryPrice(card: Card): Price | undefined {
  if (card.prices.length === 0) return undefined;
  return card.prices.reduce((best, price) => (toUsdAmount(price) > toUsdAmount(best) ? price : best));
}

// Cards missing the field being sorted on (no price loaded yet, or no
// release date loaded yet) always sink to the bottom instead of clumping at
// the top the way "undefined" would sort by default.
function compareByPrice(a: Card, b: Card): number {
  const aPrice = primaryPrice(a);
  const bPrice = primaryPrice(b);
  if (!aPrice && !bPrice) return 0;
  if (!aPrice) return 1;
  if (!bPrice) return -1;
  return toUsdAmount(bPrice) - toUsdAmount(aPrice);
}

function compareByNewestSet(a: Card, b: Card): number {
  const aDate = a.setReleaseDate;
  const bDate = b.setReleaseDate;
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return bDate.localeCompare(aDate);
}

/**
 * Tries to spot a real set name at the end of a free-typed query, e.g.
 * "charizard obsidian flames" -> set "Obsidian Flames", name query
 * "charizard". Tries the longest possible suffix first, and only accepts an
 * exact (case-insensitive) match against a known set name, to avoid false
 * positives. Returns null if nothing matches.
 */
function detectSetInQuery(trimmedQuery: string, sets: CardSet[]): { set: CardSet; nameQuery: string } | null {
  if (!trimmedQuery || sets.length === 0) return null;
  const words = trimmedQuery.split(/\s+/);
  for (let splitIndex = 0; splitIndex < words.length; splitIndex++) {
    const candidate = words.slice(splitIndex).join(" ").toLowerCase();
    if (candidate.length < 3) continue;
    const match = sets.find((set) => set.name.toLowerCase() === candidate);
    if (match) {
      return { set: match, nameQuery: words.slice(0, splitIndex).join(" ") };
    }
  }
  return null;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [status, setStatus] = useState<Status>("idle");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const [sets, setSets] = useState<CardSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<CardSet | null>(null);
  const [detectedSet, setDetectedSet] = useState<CardSet | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerFilter, setPickerFilter] = useState("");

  // Typing quickly can start several searches before the first one replies.
  // "generation" is a counter: each new search gets the next number, and we
  // only trust a response if its generation still matches the latest one —
  // that's what stops an older, slower search from overwriting newer results.
  // The AbortController actually cancels the in-flight network request too,
  // so we're not left waiting on responses nobody needs anymore.
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const pendingDetailIdsRef = useRef<Set<string>>(new Set());
  // Kept alongside `sets` state so the debounced search below can always
  // read the latest set list without needing to re-run every time it loads.
  const setsRef = useRef<CardSet[]>([]);

  useEffect(() => {
    let cancelled = false;
    cardDataProvider
      .listSets()
      .then((result) => {
        if (!cancelled) {
          setSets(result);
          setsRef.current = result;
        }
      })
      .catch(() => {
        // Set browsing/detection just won't be available; plain name search still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    const timeout = setTimeout(() => {
      controllerRef.current?.abort();
      const generation = ++generationRef.current;
      pendingDetailIdsRef.current = new Set();

      if (!trimmed && !selectedSet) {
        controllerRef.current = null;
        setCards([]);
        setDetectedSet(null);
        setStatus("idle");
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      setCards([]);
      setStatus("loading");

      let request: Promise<Card[]>;
      if (selectedSet) {
        setDetectedSet(null);
        request = trimmed
          ? cardDataProvider.searchCards(trimmed, selectedSet.id, controller.signal)
          : cardDataProvider.getSetCards(selectedSet.id, controller.signal);
      } else {
        const detected = detectSetInQuery(trimmed, setsRef.current);
        setDetectedSet(detected?.set ?? null);
        if (detected) {
          request = detected.nameQuery
            ? cardDataProvider.searchCards(detected.nameQuery, detected.set.id, controller.signal)
            : cardDataProvider.getSetCards(detected.set.id, controller.signal);
        } else {
          request = cardDataProvider.searchCards(trimmed, undefined, controller.signal);
        }
      }

      request
        .then((results) => {
          if (generationRef.current !== generation) return; // a newer search replaced this one
          setCards(results);
          setVisibleCount(PAGE_SIZE);
          setStatus(results.length === 0 ? "empty" : "results");
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || generationRef.current !== generation) return;
          setStatus("error");
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query, selectedSet]);

  // Once brief results are in, load full details (set name + prices) for
  // whichever cards are currently visible, in parallel, filling each row in
  // as its own request finishes rather than waiting for all of them.
  useEffect(() => {
    const generation = generationRef.current;
    const controller = controllerRef.current;
    if (!controller) return;

    const toLoad = cards
      .slice(0, visibleCount)
      .filter((card) => !card.detailsLoaded && !pendingDetailIdsRef.current.has(card.id));

    for (const card of toLoad) {
      pendingDetailIdsRef.current.add(card.id);
      cardDataProvider
        .getCardDetails(card.id, controller.signal)
        .then((details) => {
          if (generationRef.current !== generation) return;
          setCards((current) => current.map((c) => (c.id === details.id ? details : c)));
        })
        .catch(() => {
          // Leave the brief version in place; that row just won't show a set/price.
        })
        .finally(() => {
          pendingDetailIdsRef.current.delete(card.id);
        });
    }
  }, [cards, visibleCount]);

  const visibleCards = cards
    .slice(0, visibleCount)
    .sort(sortMode === "price" ? compareByPrice : compareByNewestSet);
  const hasMore = visibleCount < cards.length;

  const filteredSets = pickerFilter.trim()
    ? sets.filter((set) => set.name.toLowerCase().includes(pickerFilter.trim().toLowerCase()))
    : sets;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Search for a card name…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.setFilterRow}>
        <Chip
          label={selectedSet ? `Set: ${selectedSet.name}` : "Filter by set"}
          selected={Boolean(selectedSet)}
          onPress={() => setPickerVisible(true)}
        />
        {selectedSet && (
          <Pressable style={styles.clearSetButton} onPress={() => setSelectedSet(null)}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {!selectedSet && detectedSet && (
        <Text style={styles.detectedSetHint}>Matched set: {detectedSet.name}</Text>
      )}

      {status === "loading" && <ActivityIndicator style={styles.spinner} size="large" color={colors.accent} />}

      {status === "idle" && (
        <Text style={styles.message}>Search for a card, or filter by set, to see prices and details.</Text>
      )}

      {status === "empty" && (
        <Text style={styles.message}>
          {query.trim() ? `No cards found for "${query.trim()}".` : "No cards found in this set."}
        </Text>
      )}

      {status === "error" && (
        <Text style={styles.message}>Something went wrong. Check your connection and try again.</Text>
      )}

      {status === "results" && (
        <View style={styles.sortRow}>
          <Chip label="Newest set" selected={sortMode === "newest"} onPress={() => setSortMode("newest")} />
          <Chip label="Highest price" selected={sortMode === "price"} onPress={() => setSortMode("price")} />
        </View>
      )}

      {status === "results" && (
        <FlatList
          data={visibleCards}
          keyExtractor={(card) => card.id}
          renderItem={({ item }) => (
            <CardRow card={item} onPress={() => router.push({ pathname: "/card/[id]", params: { id: item.id } })} />
          )}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.loadMoreWrap}>
                <Button label="Load more" variant="secondary" onPress={() => setVisibleCount((count) => count + PAGE_SIZE)} />
              </View>
            ) : null
          }
        />
      )}

      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choose a set</Text>
            <Pressable onPress={() => setPickerVisible(false)}>
              <Text style={styles.pickerClose}>Close</Text>
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Search sets…"
              placeholderTextColor={colors.textMuted}
              value={pickerFilter}
              onChangeText={setPickerFilter}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          <FlatList
            data={filteredSets}
            keyExtractor={(set) => set.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.setRow}
                onPress={() => {
                  setSelectedSet(item);
                  setPickerVisible(false);
                  setPickerFilter("");
                }}
              >
                <Text style={styles.setRowText}>{item.name}</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.message}>No sets match that search.</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

function CardRow({ card, onPress }: { card: Card; onPress: () => void }) {
  const imageUri = card.imageUrl ? buildCardImageUrl(card.imageUrl) : undefined;
  const price = primaryPrice(card);
  const subtitle = card.detailsLoaded ? `${card.setName ?? "Unknown set"} · #${card.localId}` : "Loading…";

  return (
    <Pressable onPress={onPress}>
      <CardSurface style={styles.row}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>No image</Text>
          </View>
        )}
        <View style={styles.rowMiddle}>
          <Text style={styles.cardName} numberOfLines={1}>
            {card.name}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {card.detailsLoaded && (
          <Text style={styles.cardPrice}>{price ? formatPriceDisplay(price) : "No price"}</Text>
        )}
      </CardSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.text,
  },
  setFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  clearSetButton: {
    padding: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detectedSetHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  spinner: {
    marginTop: spacing.xl,
  },
  sortRow: {
    flexDirection: "row",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  message: {
    marginTop: spacing.xl,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  image: {
    width: 52,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
  },
  rowMiddle: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  cardName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  cardSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardPrice: {
    ...tabularNums,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  loadMoreWrap: {
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  pickerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.text,
  },
  pickerClose: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.accent,
  },
  setRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  setRowText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.text,
  },
});
