// Shares the portfolio with every screen. A React "context" is a value that
// any screen inside the provider can read with a hook — here,
// usePortfolio(). So when the card detail screen adds a card, the Portfolio
// tab sees it immediately, with no reload.
//
// It also keeps each owned card's current prices (fetched through
// cardDataProvider, like every other screen), so the Portfolio tab and the
// holding screen share one set of price lookups instead of each fetching
// their own.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  cardDataProvider,
  summarizePortfolio,
  type CardPriceState,
  type NewPortfolioEntry,
  type PortfolioEntry,
  type PortfolioSummary,
} from "@foilio/shared";

import { portfolioStore } from "./store";

// How many card price lookups to run at once, so a big portfolio doesn't
// fire dozens of requests at the same moment.
const MAX_CONCURRENT_LOOKUPS = 4;

interface PortfolioContextValue {
  status: "loading" | "ready" | "error";
  entries: PortfolioEntry[];
  summary: PortfolioSummary;
  add(entry: NewPortfolioEntry): Promise<void>;
  update(id: string, changes: Partial<NewPortfolioEntry>): Promise<void>;
  remove(id: string): Promise<void>;
  /** Re-reads saved entries (after an error) and re-fetches every card's current price. */
  refresh(): void;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PortfolioContextValue["status"]>("loading");
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [prices, setPrices] = useState<Record<string, CardPriceState>>({});
  // Card ids we've already started a lookup for, so re-renders don't refetch.
  const requested = useRef(new Set<string>());

  const readSaved = useCallback(() => {
    portfolioStore
      .list()
      .then((saved) => {
        setEntries(saved);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  // Read the saved portfolio once when the app starts (status already begins as "loading").
  useEffect(readSaved, [readSaved]);

  // Look up current prices for any owned card we haven't looked up yet.
  useEffect(() => {
    const missing = [...new Set(entries.map((entry) => entry.cardId))].filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    setPrices((current) => {
      const next = { ...current };
      missing.forEach((id) => (next[id] = { status: "loading" }));
      return next;
    });

    const queue = [...missing];
    const worker = async () => {
      for (let id = queue.shift(); id; id = queue.shift()) {
        let state: CardPriceState;
        try {
          const card = await cardDataProvider.getCardDetails(id);
          state = { status: "loaded", prices: card.prices };
        } catch {
          state = { status: "error" };
          // Allow a later refresh to try this card again.
          requested.current.delete(id);
        }
        setPrices((current) => ({ ...current, [id]: state }));
      }
    };
    for (let i = 0; i < Math.min(MAX_CONCURRENT_LOOKUPS, missing.length); i++) worker();
  }, [entries]);

  const refresh = useCallback(() => {
    requested.current.clear();
    setStatus("loading");
    readSaved();
  }, [readSaved]);

  const add = useCallback(async (entry: NewPortfolioEntry) => {
    await portfolioStore.add(entry);
    setEntries(await portfolioStore.list());
  }, []);

  const update = useCallback(async (id: string, changes: Partial<NewPortfolioEntry>) => {
    await portfolioStore.update(id, changes);
    setEntries(await portfolioStore.list());
  }, []);

  const remove = useCallback(async (id: string) => {
    await portfolioStore.remove(id);
    setEntries(await portfolioStore.list());
  }, []);

  const summary = useMemo(() => summarizePortfolio(entries, prices), [entries, prices]);

  const value = useMemo(
    () => ({ status, entries, summary, add, update, remove, refresh }),
    [status, entries, summary, add, update, remove, refresh],
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const value = useContext(PortfolioContext);
  if (!value) throw new Error("usePortfolio must be used inside <PortfolioProvider>");
  return value;
}
