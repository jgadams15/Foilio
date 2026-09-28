// Shared domain types used by apps/app (and potentially other future apps).

/** A single card result, merging the fast "brief" search data with the
 * slower per-card details (set name, price) that get filled in afterward. */
export interface Card {
  /** TCGdex card id, e.g. "swsh3-136" */
  id: string;
  name: string;
  /** Card number within its set, e.g. "136" */
  localId: string;
  /** Base image URL with no size/extension suffix, or undefined if TCGdex has none. */
  imageUrl?: string;
  /** Set name, e.g. "Darkness Ablaze". Undefined until details have loaded. */
  setName?: string;
  /** The set's release date as an ISO string ("2020-08-14"), for "newest set" sorting. */
  setReleaseDate?: string;
  price?: Price;
  /** True once the per-card detail request has finished (set name + price are final). */
  detailsLoaded: boolean;
}

export interface Price {
  amount: number;
  currency: "USD" | "EUR";
}
