// The interface every place we save a portfolio implements — the same idea
// as CardDataProvider, but for *your* data instead of card data. Screens only
// ever talk to a PortfolioStore, never to a specific kind of storage, so
// today's on-device store can be swapped for a cloud (Supabase) one later
// without touching any screen.
import type { NewPortfolioEntry, PortfolioEntry } from "../types";

export interface PortfolioStore {
  /** Every entry, oldest first. */
  list(): Promise<PortfolioEntry[]>;
  /** Saves a new entry and returns it with its new `id` and `addedAt` filled in. */
  add(entry: NewPortfolioEntry): Promise<PortfolioEntry>;
  /** Changes some fields of an existing entry. Set an optional field to
   * `undefined` to clear it (e.g. remove a purchase price). */
  update(id: string, changes: Partial<NewPortfolioEntry>): Promise<PortfolioEntry>;
  remove(id: string): Promise<void>;
}
