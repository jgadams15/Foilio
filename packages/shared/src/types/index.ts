// Shared domain types used by apps/app (and potentially other future apps).

/** A single card result, merging the fast "brief" search data with the
 * slower per-card details (set name, price) that get filled in afterward. */
export interface Card {
  /** TCGdex card id, e.g. "swsh3-136" */
  id: string;
  name: string;
  /** Card number within its set, e.g. "136" */
  localId: string;
  /** Base image URL with no size/extension suffix, or undefined if the provider has none. */
  imageUrl?: string;
  /** Set id, e.g. "swsh3". Known immediately when browsing a set, otherwise undefined until details load. */
  setId?: string;
  /** Set name, e.g. "Darkness Ablaze". Undefined until details have loaded. */
  setName?: string;
  /** The set's release date as an ISO string ("2020-08-14"), for "newest set" sorting. */
  setReleaseDate?: string;
  /** Base URL for the set's symbol icon, with no extension. Undefined until details have loaded. */
  setSymbolUrl?: string;
  /** e.g. "Rare Holo". Undefined until details have loaded, or if the provider has none. */
  rarity?: string;
  /** The card's illustrator. Undefined until details have loaded, or if the provider has none. */
  artist?: string;
  /** Every known price for this card (different finish/condition/grade). Empty until details have loaded, or if the provider has none. */
  prices: Price[];
  /** Every finish this card exists in (e.g. "Normal", "Reverse Holo"), whether or not
   * it currently has a price in `prices`. Empty until details have loaded. */
  finishes: string[];
  /** True once the per-card detail request has finished (set name + prices are final). */
  detailsLoaded: boolean;
}

/** One market price for a card in a specific finish, condition, or grade. A
 * card can have several (different finishes, and once a graded data source
 * exists, several PSA/BGS grades). Always a real, known price — a finish
 * that exists but has no price shows up in `Card.finishes` instead. */
export interface Price {
  amount: number;
  currency: "USD" | "EUR";
  /** e.g. "Normal", "Holo", "Reverse Holo", "1st Edition". */
  finish: string;
  /** e.g. "Raw / Near Mint", "PSA 10", "BGS 9.5". */
  condition: string;
}

/** A card set (expansion), e.g. "Darkness Ablaze". */
export interface CardSet {
  id: string;
  name: string;
  logoUrl?: string;
}

/** A grading company we know how to label. */
export type GradingCompany = "PSA" | "BGS" | "CGC";

/** Whether a copy you own is raw (ungraded) or professionally graded. One
 * of two shapes, so impossible combinations like "Raw PSA 10" can't be
 * stored. Raw has no wear condition (Near Mint, Played…) yet because no
 * price source breaks prices down by condition. */
export type Grading = { kind: "raw" } | { kind: "graded"; company: GradingCompany; grade: string };

/** One purchase of a card in your portfolio — like a "lot" in a brokerage
 * account. Buying the same card again later is a new entry, so each
 * purchase keeps its own price and date. The Portfolio list groups entries
 * that share a card, finish, and grading into one row. */
export interface PortfolioEntry {
  /** A UUID, so entries can move to a cloud database later without new ids. */
  id: string;
  cardId: string;
  // A snapshot of the card's details at the time it was added, so the
  // portfolio list can show without re-fetching every card.
  cardName: string;
  setName?: string;
  /** Card number within its set, e.g. "136". */
  localId: string;
  /** Base image URL, same format as Card.imageUrl. */
  imageUrl?: string;
  /** e.g. "Normal", "Reverse Holo" — one of the card's `finishes`. */
  finish: string;
  grading: Grading;
  /** How many copies this purchase was. Always a whole number, 1 or more. */
  quantity: number;
  /** What you paid for ONE copy, in USD. Undefined if you didn't record it. */
  purchasePrice?: number;
  /** The day you bought it, as "YYYY-MM-DD". */
  purchaseDate?: string;
  notes?: string;
  /** When this entry was added to the app, as a full ISO timestamp. */
  addedAt: string;
}

/** What you provide to add an entry — the store fills in `id` and `addedAt`. */
export type NewPortfolioEntry = Omit<PortfolioEntry, "id" | "addedAt">;
