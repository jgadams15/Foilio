// The portfolio math: grouping purchases into holdings and working out
// current value and gain/loss. Kept here (no UI, no storage) so every
// screen computes these numbers the same way.
//
// The rule throughout: never invent a number. A holding only counts toward
// a total if we have a real current price for it, and gain/loss only counts
// copies whose purchase price was recorded.
import type { Grading, GradingCompany, PortfolioEntry, Price } from "../types";
import { toUsdAmount } from "../utils";

export const GRADING_COMPANIES: GradingCompany[] = ["PSA", "BGS", "CGC"];

/** The grades each company actually gives, best first. */
export const GRADES_BY_COMPANY: Record<GradingCompany, string[]> = {
  PSA: ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"],
  BGS: ["10", "9.5", "9", "8.5", "8", "7.5", "7", "6", "5", "4", "3", "2", "1"],
  CGC: ["10", "9.5", "9", "8.5", "8", "7.5", "7", "6", "5", "4", "3", "2", "1"],
};

/** "Raw", or e.g. "PSA 10". */
export function gradingLabel(grading: Grading): string {
  return grading.kind === "raw" ? "Raw" : `${grading.company} ${grading.grade}`;
}

/** Entries with the same key are copies of the same thing and get grouped into one holding. */
export function holdingKey(entry: Pick<PortfolioEntry, "cardId" | "finish" | "grading">): string {
  return `${entry.cardId}|${entry.finish}|${gradingLabel(entry.grading)}`;
}

/** Where we are with fetching one card's current prices. */
export type CardPriceState = { status: "loading" } | { status: "error" } | { status: "loaded"; prices: Price[] };

/** A signed change in USD. `percent` is undefined when the cost was $0 (e.g. pulled from a pack). */
export interface GainLoss {
  amount: number;
  percent?: number;
}

export type HoldingValue =
  | { status: "loading" }
  /** Couldn't reach the price source (e.g. offline). */
  | { status: "error" }
  /** Graded copy — we have no graded price source yet. */
  | { status: "graded" }
  /** The card loaded, but has no current price for this finish. */
  | { status: "noPrice" }
  | {
      status: "priced";
      /** Current price for ONE copy. */
      unitPrice: Price;
      /** unitPrice × quantity, in USD. */
      total: number;
      /** True if converted from EUR, so it's an estimate. */
      estimated: boolean;
      /** Only covers copies with a recorded purchase price; undefined if none have one. */
      gain?: GainLoss;
    };

/** One row in the Portfolio list: every purchase of the same card, finish, and grading. */
export interface Holding {
  key: string;
  /** Newest purchase first. */
  lots: PortfolioEntry[];
  /** The newest lot, for the card name, image, finish, and grading to show. */
  display: PortfolioEntry;
  quantity: number;
  /** How many of those copies have a recorded purchase price. */
  costedQuantity: number;
  /** Total paid for the costed copies, in USD. */
  costBasis: number;
  /** Average price paid per copy, across copies with a recorded price. */
  averageCost?: number;
  value: HoldingValue;
}

export interface PortfolioSummary {
  /** Highest current value first; holdings without a value go last, by name. */
  holdings: Holding[];
  totalCopies: number;
  /** Sum of every priced holding, in USD. */
  totalValue: number;
  /** True if any part of totalValue was converted from EUR. */
  totalEstimated: boolean;
  /** Across priced copies with a recorded purchase price; undefined if there are none. */
  totalGain?: GainLoss;
  /** Copies counted in totalValue. */
  pricedCopies: number;
  /** Priced copies that also have a purchase price (the ones in totalGain). */
  costedPricedCopies: number;
  /** Copies left out of totalValue, by reason. */
  excluded: { graded: number; unpriced: number; loading: number };
}

function lotDate(entry: PortfolioEntry): string {
  return entry.purchaseDate ?? entry.addedAt.slice(0, 10);
}

/** The current raw price for a finish, preferring a direct USD price over a converted EUR one. */
function rawPriceFor(prices: Price[], finish: string): Price | undefined {
  const matches = prices.filter((price) => price.finish === finish && price.condition.startsWith("Raw"));
  return matches.find((price) => price.currency === "USD") ?? matches[0];
}

function gainLoss(value: number, cost: number): GainLoss {
  const amount = value - cost;
  return { amount, percent: cost > 0 ? (amount / cost) * 100 : undefined };
}

function valueHolding(
  display: PortfolioEntry,
  quantity: number,
  costedQuantity: number,
  costBasis: number,
  priceState: CardPriceState | undefined,
): HoldingValue {
  // Graded copies are left out until we have a graded price source — the
  // raw price for the same card would be very wrong for a PSA 10.
  if (display.grading.kind === "graded") return { status: "graded" };
  if (!priceState || priceState.status === "loading") return { status: "loading" };
  if (priceState.status === "error") return { status: "error" };

  const unitPrice = rawPriceFor(priceState.prices, display.finish);
  if (!unitPrice) return { status: "noPrice" };

  const unitUsd = toUsdAmount(unitPrice);
  return {
    status: "priced",
    unitPrice,
    total: unitUsd * quantity,
    estimated: unitPrice.currency !== "USD",
    gain: costedQuantity > 0 ? gainLoss(unitUsd * costedQuantity, costBasis) : undefined,
  };
}

/** Groups entries into holdings and totals them up using each card's current prices. */
export function summarizePortfolio(entries: PortfolioEntry[], prices: Record<string, CardPriceState>): PortfolioSummary {
  const groups = new Map<string, PortfolioEntry[]>();
  for (const entry of entries) {
    const key = holdingKey(entry);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  const holdings: Holding[] = [...groups].map(([key, groupLots]) => {
    const lots = [...groupLots].sort(
      (a, b) => lotDate(b).localeCompare(lotDate(a)) || b.addedAt.localeCompare(a.addedAt),
    );
    let quantity = 0;
    let costedQuantity = 0;
    let costBasis = 0;
    for (const lot of lots) {
      quantity += lot.quantity;
      if (lot.purchasePrice !== undefined) {
        costedQuantity += lot.quantity;
        costBasis += lot.purchasePrice * lot.quantity;
      }
    }
    const display = lots[0];
    return {
      key,
      lots,
      display,
      quantity,
      costedQuantity,
      costBasis,
      averageCost: costedQuantity > 0 ? costBasis / costedQuantity : undefined,
      value: valueHolding(display, quantity, costedQuantity, costBasis, prices[display.cardId]),
    };
  });

  holdings.sort((a, b) => {
    const aTotal = a.value.status === "priced" ? a.value.total : -1;
    const bTotal = b.value.status === "priced" ? b.value.total : -1;
    return bTotal - aTotal || a.display.cardName.localeCompare(b.display.cardName);
  });

  const summary: PortfolioSummary = {
    holdings,
    totalCopies: 0,
    totalValue: 0,
    totalEstimated: false,
    pricedCopies: 0,
    costedPricedCopies: 0,
    excluded: { graded: 0, unpriced: 0, loading: 0 },
  };
  // Current value and cost of just the copies that have a purchase price,
  // so gain/loss compares like with like.
  let costedValue = 0;
  let costedCost = 0;
  for (const holding of holdings) {
    summary.totalCopies += holding.quantity;
    const value = holding.value;
    if (value.status === "priced") {
      summary.totalValue += value.total;
      summary.totalEstimated ||= value.estimated;
      summary.pricedCopies += holding.quantity;
      if (holding.costedQuantity > 0) {
        summary.costedPricedCopies += holding.costedQuantity;
        costedValue += toUsdAmount(value.unitPrice) * holding.costedQuantity;
        costedCost += holding.costBasis;
      }
    } else if (value.status === "graded") {
      summary.excluded.graded += holding.quantity;
    } else if (value.status === "loading") {
      summary.excluded.loading += holding.quantity;
    } else {
      summary.excluded.unpriced += holding.quantity;
    }
  }
  if (summary.costedPricedCopies > 0) {
    summary.totalGain = gainLoss(costedValue, costedCost);
  }
  return summary;
}

/** e.g. "$1,234.56". */
export function formatUsd(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
