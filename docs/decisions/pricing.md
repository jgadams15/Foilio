# Pricing: currency, condition, and graded prices

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
