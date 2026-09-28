// The Search screen: type a Pokémon card name, see matching cards with
// their image, set, number, and price.
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// These come from packages/shared, so the same search logic and Card type
// could be reused by other screens later (e.g. adding a card to your
// portfolio) without copy-pasting.
import { buildCardImageUrl, Card, getCardDetails, Price, searchCards } from "@foilio/shared";

// TCGdex's search only returns "brief" info (name, image, card number) — no
// set name or price. We fetch those separately, per card, after the search
// comes back. To keep that fast and not hammer the API, we only fetch
// details for cards currently on screen, PAGE_SIZE at a time.
const PAGE_SIZE = 20;
// Wait this long after the user stops typing before actually searching, so
// we don't fire a network request on every keystroke.
const DEBOUNCE_MS = 400;

type Status = "idle" | "loading" | "results" | "empty" | "error";
type SortMode = "newest" | "price";

// Cards missing the field being sorted on (no price loaded yet, or no
// release date loaded yet) always sink to the bottom instead of clumping at
// the top the way "undefined" would sort by default.
function compareByPrice(a: Card, b: Card): number {
  const aAmount = a.price?.amount;
  const bAmount = b.price?.amount;
  if (aAmount == null && bAmount == null) return 0;
  if (aAmount == null) return 1;
  if (bAmount == null) return -1;
  return bAmount - aAmount;
}

function compareByNewestSet(a: Card, b: Card): number {
  const aDate = a.setReleaseDate;
  const bDate = b.setReleaseDate;
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return bDate.localeCompare(aDate);
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [status, setStatus] = useState<Status>("idle");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  // Typing quickly can start several searches before the first one replies.
  // "generation" is a counter: each new search gets the next number, and we
  // only trust a response if its generation still matches the latest one —
  // that's what stops an older, slower search from overwriting newer results.
  // The AbortController actually cancels the in-flight network request too,
  // so we're not left waiting on responses nobody needs anymore.
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const pendingDetailIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const trimmed = query.trim();

    const timeout = setTimeout(() => {
      controllerRef.current?.abort();
      const generation = ++generationRef.current;
      pendingDetailIdsRef.current = new Set();

      if (!trimmed) {
        controllerRef.current = null;
        setCards([]);
        setStatus("idle");
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      setCards([]);
      setStatus("loading");

      searchCards(trimmed, controller.signal)
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
  }, [query]);

  // Once brief results are in, load full details (set name + price) for
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
      getCardDetails(card.id, controller.signal)
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

      {status === "loading" && <ActivityIndicator style={styles.spinner} size="large" />}

      {status === "idle" && (
        <Text style={styles.message}>Search for a card to see prices and details.</Text>
      )}

      {status === "empty" && (
        <Text style={styles.message}>No cards found for &quot;{query.trim()}&quot;.</Text>
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
          renderItem={({ item }) => <CardRow card={item} />}
          ListFooterComponent={
            hasMore ? (
              <Pressable style={styles.loadMoreButton} onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                <Text style={styles.loadMoreText}>Load more</Text>
              </Pressable>
            ) : null
          }
        />
      )}
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

function CardRow({ card }: { card: Card }) {
  const imageUri = card.imageUrl ? buildCardImageUrl(card.imageUrl) : undefined;

  return (
    <View style={styles.row}>
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
          <Text style={styles.cardPrice}>{card.price ? formatPrice(card.price) : "No price"}</Text>
        )}
      </View>
    </View>
  );
}

function formatPrice(price: Price): string {
  const symbol = price.currency === "USD" ? "$" : "€";
  return `${symbol}${price.amount.toFixed(2)}`;
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
});
