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
