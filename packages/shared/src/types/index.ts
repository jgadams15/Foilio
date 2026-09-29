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
  /** Every known price for this card (different condition/grade). Empty until details have loaded, or if the provider has none. */
  prices: Price[];
  /** True once the per-card detail request has finished (set name + prices are final). */
  detailsLoaded: boolean;
}

/** One market price for a card in a specific condition or grade. A card can
 * have several (e.g. a raw price and, once a graded data source exists,
 * several PSA/BGS grades). */
export interface Price {
  amount: number;
  currency: "USD" | "EUR";
  /** e.g. "Raw / Near Mint", "PSA 10", "BGS 9.5". */
  condition: string;
}

/** A card set (expansion), e.g. "Darkness Ablaze". */
export interface CardSet {
  id: string;
  name: string;
  logoUrl?: string;
}
