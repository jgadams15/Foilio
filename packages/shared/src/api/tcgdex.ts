// TCGdex (https://tcgdex.dev) implementation of CardDataProvider. We use
// plain fetch() instead of the official @tcgdex/sdk package because the
// SDK's React Native/Expo compatibility isn't documented, while fetch is
// built into every JS runtime we care about.
import type { Card, CardSet, Price } from "../types";
import type { CardDataProvider } from "./provider";

const BASE_URL = "https://api.tcgdex.net/v2/en";

/** Raw shape of one entry in a /cards or /sets/{id} "cards" search response ("CardBrief"). */
interface CardBriefResponse {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

/** Raw shape of a single TCGplayer price variant, e.g. "normal" or "reverse-holofoil". */
interface TcgplayerVariant {
  marketPrice: number | null;
}

interface CardPricingResponse {
  cardmarket?: {
    unit: "EUR";
    avg?: number;
    trend?: number;
    "avg-holo"?: number;
    "trend-holo"?: number;
  };
  tcgplayer?: {
    unit: "USD";
    [variant: string]: TcgplayerVariant | string | undefined;
  };
}

/** Which finishes/prints this card exists in, independent of whether TCGplayer
 * currently has a live price for each one (e.g. 1st Edition often has no price key). */
interface CardVariantsResponse {
  normal?: boolean;
  reverse?: boolean;
  holo?: boolean;
  firstEdition?: boolean;
  wPromo?: boolean;
}

/** Raw shape of a full /cards/{id} response, trimmed to the fields we use. */
interface CardDetailsResponse {
  id: string;
  localId: string;
  name: string;
  image?: string;
  rarity?: string;
  illustrator?: string;
  set?: { id: string; name: string; symbol?: string };
  pricing?: CardPricingResponse;
  variants?: CardVariantsResponse;
}

/** Raw shape of a full /sets/{id} response, trimmed to the fields we use. */
interface SetDetailsResponse {
  releaseDate?: string;
  cards: CardBriefResponse[];
}

/** Raw shape of one entry in a /sets list response ("SetBrief"). */
interface SetBriefResponse {
  id: string;
  name: string;
  logo?: string;
}

export class TcgdexProvider implements CardDataProvider {
  /**
   * Searches for cards whose name contains `query` (case-insensitive),
   * optionally narrowed to one exact set. Returns lightweight "brief"
   * results only — no set name or price yet, since TCGdex doesn't include
   * those in search results. Call getCardDetails() per card to fill those in.
   */
  async searchCards(query: string, setId?: string, signal?: AbortSignal): Promise<Card[]> {
    let url = `${BASE_URL}/cards?name=${encodeURIComponent(query)}&pagination:itemsPerPage=100`;
    if (setId) {
      url += `&set.id=eq:${encodeURIComponent(setId)}`;
    }
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`TCGdex search failed with status ${response.status}`);
    }
    const briefs: CardBriefResponse[] = await response.json();
    return briefs.map(toBriefCard);
  }

  /** Fetches the full card so we can read its set name, release date, and prices. */
  async getCardDetails(id: string, signal?: AbortSignal): Promise<Card> {
    const response = await fetch(`${BASE_URL}/cards/${id}`, { signal });
    if (!response.ok) {
      throw new Error(`TCGdex card lookup failed with status ${response.status}`);
    }
    const data: CardDetailsResponse = await response.json();
    const setReleaseDate = data.set ? await getSetReleaseDate(data.set.id) : undefined;
    const prices = pickPrices(data.pricing, data.variants);
    return {
      id: data.id,
      name: data.name,
      localId: data.localId,
      imageUrl: data.image,
      setId: data.set?.id,
      setName: data.set?.name,
      setReleaseDate,
      setSymbolUrl: data.set?.symbol,
      rarity: data.rarity,
      artist: data.illustrator,
      prices,
      finishes: deriveFinishes(prices, data.variants),
      detailsLoaded: true,
    };
  }

  /** Every set, newest release first (TCGdex sorts this for us server-side). */
  async listSets(signal?: AbortSignal): Promise<CardSet[]> {
    const url = `${BASE_URL}/sets?sort:field=releaseDate&sort:order=DESC&pagination:itemsPerPage=500`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`TCGdex set list failed with status ${response.status}`);
    }
    const briefs: SetBriefResponse[] = await response.json();
    return briefs.map((brief) => ({ id: brief.id, name: brief.name, logoUrl: brief.logo }));
  }

  /** Every card in one set, in the order TCGdex returns them (by card number). */
  async getSetCards(setId: string, signal?: AbortSignal): Promise<Card[]> {
    const response = await fetch(`${BASE_URL}/sets/${setId}`, { signal });
    if (!response.ok) {
      throw new Error(`TCGdex set lookup failed with status ${response.status}`);
    }
    const data: SetDetailsResponse = await response.json();
    return data.cards.map((brief) => ({ ...toBriefCard(brief), setId }));
  }
}

function toBriefCard(brief: CardBriefResponse): Card {
  return {
    id: brief.id,
    name: brief.name,
    localId: brief.localId,
    imageUrl: brief.image,
    prices: [],
    finishes: [],
    detailsLoaded: false,
  };
}

// Many cards share the same set, and a set's release date never changes, so
// we fetch each set only once (per app session) and reuse the result. This
// is deliberately not tied to any particular search's AbortController: even
// if the search that first requested it gets cancelled, the release date is
// still valid and worth keeping for the next card (or search) that needs it.
const setReleaseDateCache = new Map<string, Promise<string | undefined>>();

function getSetReleaseDate(setId: string): Promise<string | undefined> {
  let cached = setReleaseDateCache.get(setId);
  if (!cached) {
    cached = fetch(`${BASE_URL}/sets/${setId}`)
      .then((response) => (response.ok ? (response.json() as Promise<SetDetailsResponse>) : undefined))
      .then((data) => data?.releaseDate)
      .catch(() => undefined);
    setReleaseDateCache.set(setId, cached);
  }
  return cached;
}

/** Maps TCGdex's kebab-case TCGplayer variant keys to a friendly finish label.
 * Unrecognized keys still get shown (title-cased) instead of being dropped. */
const TCGPLAYER_FINISH_LABELS: Record<string, string> = {
  normal: "Normal",
  holofoil: "Holo",
  "reverse-holofoil": "Reverse Holo",
  "1st-edition": "1st Edition",
  "1st-edition-holofoil": "1st Edition Holo",
};

function finishLabelForVariantKey(key: string): string {
  return (
    TCGPLAYER_FINISH_LABELS[key] ??
    key
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

/** Turns TCGdex's pricing sources into our Price[] shape, keeping every
 * finish's price instead of just one (that was the bug: a card's reverse
 * holo can be worth far more than its normal print, and we used to drop it). */
function pickPrices(pricing?: CardPricingResponse, variants?: CardVariantsResponse): Price[] {
  const tcgplayer = pricing?.tcgplayer;
  if (tcgplayer) {
    const variantKeys = Object.keys(tcgplayer).filter((key) => key !== "unit" && key !== "updated");
    const prices: Price[] = [];
    for (const key of variantKeys) {
      const variant = tcgplayer[key];
      if (variant && typeof variant === "object" && typeof variant.marketPrice === "number") {
        prices.push({
          amount: variant.marketPrice,
          currency: "USD",
          finish: finishLabelForVariantKey(key),
          condition: "Raw / Near Mint",
        });
      }
    }
    return prices;
  }

  // Cardmarket (EUR) has no per-finish breakdown — just a base set of fields
  // and a "-holo"-suffixed set. We only label one with a finish when the
  // card's variants make it unambiguous which finish it is; otherwise we'd
  // be guessing, so we skip it (the finish still shows up via deriveFinishes).
  const cardmarket = pricing?.cardmarket;
  if (cardmarket) {
    const prices: Price[] = [];
    const baseAmount = cardmarket.trend ?? cardmarket.avg;
    if (typeof baseAmount === "number") {
      const baseFinish = unambiguousNonHoloFinish(variants);
      if (baseFinish) {
        prices.push({ amount: baseAmount, currency: "EUR", finish: baseFinish, condition: "Raw / Near Mint" });
      }
    }
    const holoAmount = cardmarket["trend-holo"] ?? cardmarket["avg-holo"];
    if (typeof holoAmount === "number" && variants?.holo) {
      prices.push({ amount: holoAmount, currency: "EUR", finish: "Holo", condition: "Raw / Near Mint" });
    }
    return prices;
  }

  return [];
}

/** The non-holo finish cardmarket's base (non "-holo") fields refer to, or
 * undefined if the card's variants don't make that unambiguous. */
function unambiguousNonHoloFinish(variants?: CardVariantsResponse): string | undefined {
  if (variants?.normal && !variants.reverse) return "Normal";
  if (variants?.reverse && !variants.normal) return "Reverse Holo";
  return undefined;
}

/** Every finish this card exists in, whether or not it currently has a price:
 * union of what TCGdex's `variants` flags say exists and whatever finishes we
 * already have prices for (covers cards where `variants` is missing). */
function deriveFinishes(prices: Price[], variants?: CardVariantsResponse): string[] {
  const finishes = new Set(prices.map((price) => price.finish));

  if (variants?.normal) finishes.add("Normal");
  if (variants?.holo) finishes.add("Holo");
  if (variants?.reverse) finishes.add("Reverse Holo");
  if (variants?.firstEdition) {
    finishes.add(variants.holo && !variants.normal ? "1st Edition Holo" : "1st Edition");
  }
  if (variants?.wPromo) finishes.add("W Promo");

  return Array.from(finishes);
}

export type ImageQuality = "low" | "high";

/** Builds a displayable image URL from a card's base image path. */
export function buildCardImageUrl(imageUrl: string, quality: ImageQuality = "low"): string {
  return `${imageUrl}/${quality}.webp`;
}

/** Builds a displayable image URL from a set's base symbol path (no quality option, unlike card images). */
export function buildSetSymbolUrl(symbolUrl: string): string {
  return `${symbolUrl}.webp`;
}
