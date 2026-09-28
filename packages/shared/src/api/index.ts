// A small typed wrapper around the TCGdex REST API (https://tcgdex.dev).
// We use plain fetch() instead of the official @tcgdex/sdk package because
// the SDK's React Native/Expo compatibility isn't documented, while fetch is
// built into every JS runtime we care about.
import type { Card, Price } from "../types";

const BASE_URL = "https://api.tcgdex.net/v2/en";

/** Raw shape of one entry in a /cards search response ("CardBrief"). */
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
  set?: { name: string };
  pricing?: CardPricingResponse;
}

/**
 * Searches TCGdex for cards whose name contains `query` (case-insensitive).
 * Returns lightweight "brief" results only — no set name or price yet, since
 * TCGdex doesn't include those in search results. Call getCardDetails() per
 * card to fill those in.
 */
export async function searchCards(query: string, signal?: AbortSignal): Promise<Card[]> {
  const url = `${BASE_URL}/cards?name=${encodeURIComponent(query)}&pagination:itemsPerPage=100`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`TCGdex search failed with status ${response.status}`);
  }
  const briefs: CardBriefResponse[] = await response.json();
  return briefs.map((brief) => ({
    id: brief.id,
    name: brief.name,
    localId: brief.localId,
    imageUrl: brief.image,
    detailsLoaded: false,
  }));
}

/** Fetches the full card so we can read its set name and price. */
export async function getCardDetails(id: string, signal?: AbortSignal): Promise<Card> {
  const response = await fetch(`${BASE_URL}/cards/${id}`, { signal });
  if (!response.ok) {
    throw new Error(`TCGdex card lookup failed with status ${response.status}`);
  }
  const data: CardDetailsResponse = await response.json();
  return {
    id: data.id,
    name: data.name,
    localId: data.localId,
    imageUrl: data.image,
    setName: data.set?.name,
    price: pickPrice(data.pricing),
    detailsLoaded: true,
  };
}

/** Picks one representative market price out of TCGdex's several price sources. */
function pickPrice(pricing?: CardPricingResponse): Price | undefined {
  const tcgplayer = pricing?.tcgplayer;
  if (tcgplayer) {
    const variantNames = Object.keys(tcgplayer).filter((key) => key !== "unit" && key !== "updated");
    const orderedNames = ["normal", ...variantNames.filter((name) => name !== "normal")];
    for (const name of orderedNames) {
      const variant = tcgplayer[name];
      if (variant && typeof variant === "object" && typeof variant.marketPrice === "number") {
        return { amount: variant.marketPrice, currency: "USD" };
      }
    }
  }

  const cardmarket = pricing?.cardmarket;
  if (cardmarket) {
    const amount = cardmarket.trend ?? cardmarket.avg;
    if (typeof amount === "number") {
      return { amount, currency: "EUR" };
    }
  }

  return undefined;
}

export type ImageQuality = "low" | "high";

/** Builds a displayable image URL from a card's base image path. */
export function buildCardImageUrl(imageUrl: string, quality: ImageQuality = "low"): string {
  return `${imageUrl}/${quality}.webp`;
}
