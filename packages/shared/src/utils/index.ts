// General-purpose helpers with no UI or platform dependency.
import type { Price } from "../types";

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

export interface EbaySearchQuery {
  cardName: string;
  setName?: string;
  /** Card number within its set, e.g. "136". */
  localId?: string;
  /** e.g. "PSA 10", "CGC 10", or "Raw" for ungraded. */
  grade: string;
}

/**
 * Builds an eBay search URL for a card in a given grade. Kept as the one
 * place that knows how to turn a card + grade into a place to find it for
 * sale, so swapping this for a real eBay API call (returning actual
 * listings instead of a search page) later only means changing this function.
 */
export function buildEbaySearchUrl(query: EbaySearchQuery): string {
  const terms = [query.cardName, query.setName, query.localId ? `#${query.localId}` : undefined, query.grade].filter(
    (term): term is string => Boolean(term),
  );
  const params = new URLSearchParams({ _nkw: terms.join(" ") });
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}
