# Pricing: finish, condition, and graded prices

**Finish vs. condition vs. grade — three different things:**

- **Finish** is the physical print variant: "Normal", "Holo", "Reverse Holo",
  "1st Edition", "1st Edition Holo", etc. It's the single biggest driver of a
  card's price — a Legendary Collection reverse holo is worth many times its
  normal print — so every `Price` carries a `finish`, and TCGdex's per-variant
  TCGplayer prices (`pricing.tcgplayer.<variant-key>`) are all kept, not just
  one. TCGdex also reports a `variants` object of booleans (`normal`, `holo`,
  `reverse`, `firstEdition`, `wPromo`) for which finishes exist even when
  TCGplayer has no live price for one of them (common for 1st Edition) — those
  show up in `Card.finishes` with no matching `Price`, and the card detail
  screen shows "Price unavailable" for them rather than hiding the finish.
  Cardmarket's EUR pricing has no per-finish breakdown, so we only attach a
  finish label to a cardmarket price when the card's `variants` make it
  unambiguous (effectively: the card only has one non-holo finish); otherwise
  we skip that price rather than guess which finish it's for.
- **Condition** is wear state for a raw (ungraded) card, e.g. "Near Mint" vs.
  "Lightly Played". We don't have per-condition pricing yet, so `condition` is
  always `"Raw / Near Mint"` today — a placeholder for when that data exists.
- **Grade** is third-party authentication (PSA/BGS/CGC), covered below —
  still no live graded prices, just eBay search links, now finish-aware too
  (e.g. searching "PSA 10" for a card's selected Reverse Holo finish).
- The card detail screen defaults to whichever finish is currently worth the
  most (falls back to the card's first known finish if none are priced), and
  only shows a finish picker at all when a card has more than one finish —
  same "don't ask when there's nothing to choose" rule as
  `docs/decisions/scanner-finish.md`.

**Decided:**

- Every price carries a `condition` (e.g. "Raw / Near Mint", or a grade like "PSA 10")
  so raw and graded prices are never confused.
- USD is the primary currency. TCGdex only gives EUR (Cardmarket) prices for some cards;
  those convert to USD using a fixed rate (`EUR_TO_USD_RATE` in `packages/shared`) so
  cards can be sorted by price, and are displayed with a "≈" to signal it's an estimate.
- Graded prices (PSA/BGS/CGC) aren't available yet — the card detail screen only opens an
  eBay search link per grade for now, it doesn't show live graded prices.

**Plan for graded prices:** Use the eBay Browse API to show active listings (not
historical sold prices), called from a Supabase Edge Function so the eBay API secret
never ships in the app.

**Why not sold prices:** eBay's sold/completed-listings data (Marketplace Insights API)
is restricted to approved partners, and scraping eBay's sold listings is ruled out (fragile
and against eBay's terms).

**Revisit:** A paid source like PriceCharting is an option later if eBay's active-listing
data isn't good enough for graded prices.
