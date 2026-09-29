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
  };
  tcgplayer?: {
    unit: "USD";
    [variant: string]: TcgplayerVariant | string | undefined;
  };
}

/** Raw shape of a full /cards/{id} response, trimmed to the fields we use. */
interface CardDetailsResponse {
  id: string;
  localId: string;
  name: string;
  image?: string;
  set?: { id: string; name: string };
  pricing?: CardPricingResponse;
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
    return {
      id: data.id,
      name: data.name,
      localId: data.localId,
      imageUrl: data.image,
      setId: data.set?.id,
      setName: data.set?.name,
      setReleaseDate,
      prices: pickPrices(data.pricing),
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

/** Turns TCGdex's pricing sources into our Price[] shape. TCGdex only ever gives us a raw (ungraded) price. */
function pickPrices(pricing?: CardPricingResponse): Price[] {
  const tcgplayer = pricing?.tcgplayer;
  if (tcgplayer) {
    const variantNames = Object.keys(tcgplayer).filter((key) => key !== "unit" && key !== "updated");
    const orderedNames = ["normal", ...variantNames.filter((name) => name !== "normal")];
    for (const name of orderedNames) {
      const variant = tcgplayer[name];
      if (variant && typeof variant === "object" && typeof variant.marketPrice === "number") {
        return [{ amount: variant.marketPrice, currency: "USD", condition: "Raw / Near Mint" }];
      }
    }
  }

  const cardmarket = pricing?.cardmarket;
  if (cardmarket) {
    const amount = cardmarket.trend ?? cardmarket.avg;
    if (typeof amount === "number") {
      return [{ amount, currency: "EUR", condition: "Raw / Near Mint" }];
    }
  }

  return [];
}

export type ImageQuality = "low" | "high";

/** Builds a displayable image URL from a card's base image path. */
export function buildCardImageUrl(imageUrl: string, quality: ImageQuality = "low"): string {
  return `${imageUrl}/${quality}.webp`;
}
