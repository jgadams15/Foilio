// General-purpose helpers with no UI or platform dependency.
import type { Card, Price } from "../types";

// A fixed, approximate EUR->USD rate, kept in one place so every EUR price
// gets converted consistently. This is only ever used to make prices in
// different currencies comparable (e.g. for sorting); we never show a
// converted number without also labeling it as an estimate.
export const EUR_TO_USD_RATE = 1.08;

/** Converts a price to an approximate USD amount, for comparing prices in different currencies. */
export function toUsdAmount(price: Price): number {
  return price.currency === "USD" ? price.amount : price.amount * EUR_TO_USD_RATE;
}

/** Prices we got directly in USD are shown as-is. A EUR price is always an
 * estimate once converted, so we show both numbers and mark it clearly. */
export function formatPriceDisplay(price: Price): string {
  if (price.currency === "USD") {
    return `$${price.amount.toFixed(2)}`;
  }
  return `≈ $${toUsdAmount(price).toFixed(2)} (from €${price.amount.toFixed(2)})`;
}

/** Same as formatPriceDisplay, but for a card that may have several prices
 * (different finishes). Shows a single number when they agree (or there's
 * only one), otherwise a "$min – $max" range. */
export function formatPriceRangeDisplay(prices: Price[]): string {
  if (prices.length <= 1) {
    return prices[0] ? formatPriceDisplay(prices[0]) : "No price";
  }
  const amounts = prices.map(toUsdAmount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (min === max) {
    return formatPriceDisplay(prices[0]);
  }
  const prefix = prices[0].currency === "EUR" ? "≈ " : "";
  return `${prefix}$${min.toFixed(2)} – $${max.toFixed(2)}`;
}

/** The finish to preselect for a card: whichever priced finish is worth the
 * most, or the card's first known finish if none are priced yet. */
export function pickDefaultFinish(card: Pick<Card, "finishes" | "prices">): string | undefined {
  if (card.prices.length > 0) {
    const mostValuable = card.prices.reduce((best, price) => (toUsdAmount(price) > toUsdAmount(best) ? price : best));
    return mostValuable.finish;
  }
  return card.finishes[0];
}

export interface EbaySearchQuery {
  cardName: string;
  setName?: string;
  /** Card number within its set, e.g. "136". */
  localId?: string;
  /** e.g. "Normal", "Holo", "Reverse Holo", "1st Edition". */
  finish: string;
  /** e.g. "PSA 10", "CGC 10", or "Raw" for ungraded. */
  grade: string;
}

/**
 * Builds an eBay search URL for a card in a given finish + grade. Kept as
 * the one place that knows how to turn a card + finish + grade into a place
 * to find it for sale, so swapping this for a real eBay API call (returning
 * actual listings instead of a search page) later only means changing this
 * function.
 */
export function buildEbaySearchUrl(query: EbaySearchQuery): string {
  const terms = [
    query.cardName,
    query.setName,
    query.localId ? `#${query.localId}` : undefined,
    query.finish !== "Normal" ? query.finish : undefined,
    query.grade,
  ].filter((term): term is string => Boolean(term));
  let keywords = terms.join(" ");
  // Sellers usually don't tag a normal (non-holo) card as "holo" at all, so
  // we only exclude "reverse" here — a blanket "-holo" would also hide
  // listings that describe a normal card as "non-holo".
  if (query.finish === "Normal") {
    keywords += " -reverse";
  }
  const params = new URLSearchParams({ _nkw: keywords });
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}
