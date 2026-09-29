// The interface every card data source implements. Screens should only ever
// import CardDataProvider (and the shared `cardDataProvider` instance from
// ./index) — never a specific provider like TcgdexProvider directly. That
// way, swapping TCGdex for a different (e.g. paid) API later means writing
// one new class here and changing one line in index.ts; no screen changes.
import type { Card, CardSet } from "../types";

export interface CardDataProvider {
  /** Cards whose name contains `query`, optionally narrowed to one set. Brief info only (see Card.detailsLoaded). */
  searchCards(query: string, setId?: string, signal?: AbortSignal): Promise<Card[]>;
  /** The full card, including set name, release date, and prices. */
  getCardDetails(id: string, signal?: AbortSignal): Promise<Card>;
  /** Every set, newest release first. */
  listSets(signal?: AbortSignal): Promise<CardSet[]>;
  /** Every card in one set, ordered by card number. Brief info only. */
  getSetCards(setId: string, signal?: AbortSignal): Promise<Card[]>;
}
