// The Search screen: type a Pokémon card name, optionally narrow to one
// set, and see matching cards with their image, set, number, and price.
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
      <TextInput
        style={styles.input}
        placeholder="Search for a card name…"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      <View style={styles.setFilterRow}>
        <Pressable style={styles.setFilterButton} onPress={() => setPickerVisible(true)}>
          <Text style={styles.setFilterButtonText}>
            {selectedSet ? `Set: ${selectedSet.name}` : "Filter by set"}
          </Text>
        </Pressable>
        {selectedSet && (
          <Pressable style={styles.clearSetButton} onPress={() => setSelectedSet(null)}>
            <Text style={styles.clearSetButtonText}>✕</Text>
          </Pressable>
        )}
      </View>

      {!selectedSet && detectedSet && (
        <Text style={styles.detectedSetHint}>Matched set: {detectedSet.name}</Text>
      )}

      {status === "loading" && <ActivityIndicator style={styles.spinner} size="large" />}

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
          <SortOption
            label="Newest set"
            active={sortMode === "newest"}
            onPress={() => setSortMode("newest")}
          />
          <SortOption
            label="Highest price"
            active={sortMode === "price"}
            onPress={() => setSortMode("price")}
          />
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
              <Pressable style={styles.loadMoreButton} onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                <Text style={styles.loadMoreText}>Load more</Text>
              </Pressable>
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
          <TextInput
            style={styles.input}
            placeholder="Search sets…"
            value={pickerFilter}
            onChangeText={setPickerFilter}
            autoCorrect={false}
            autoCapitalize="none"
          />
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

function SortOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.sortOption, active && styles.sortOptionActive]} onPress={onPress}>
      <Text style={[styles.sortOptionText, active && styles.sortOptionTextActive]}>{label}</Text>
    </Pressable>
  );
}

function CardRow({ card, onPress }: { card: Card; onPress: () => void }) {
  const imageUri = card.imageUrl ? buildCardImageUrl(card.imageUrl) : undefined;
  const price = primaryPrice(card);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>No image</Text>
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.cardName}>{card.name}</Text>
        <Text style={styles.cardMeta}>#{card.localId}</Text>
        <Text style={styles.cardMeta}>{card.detailsLoaded ? (card.setName ?? "Unknown set") : "Loading…"}</Text>
        {card.detailsLoaded && (
          <Text style={styles.cardPrice}>{price ? formatPriceDisplay(price) : "No price"}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  setFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  setFilterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#eee",
  },
  setFilterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  clearSetButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#eee",
  },
  clearSetButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  detectedSetHint: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  spinner: {
    marginTop: 24,
  },
  sortRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  sortOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#eee",
  },
  sortOptionActive: {
    backgroundColor: "#333",
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  sortOptionTextActive: {
    color: "#fff",
  },
  message: {
    marginTop: 24,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    marginBottom: 16,
  },
  image: {
    width: 80,
    height: 110,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  rowText: {
    marginLeft: 12,
    justifyContent: "center",
    flexShrink: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cardMeta: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  loadMoreButton: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginVertical: 16,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "600",
  },
  pickerContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  pickerClose: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  setRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  setRowText: {
    fontSize: 16,
  },
});
