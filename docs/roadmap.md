# Roadmap

Rough build order, updated as work lands. See `docs/decisions/` for the reasoning
behind each piece. Everything here uses free services only — see
[free-only](decisions/free-only.md).

- ✅ Tabs (Home, Search, Scan placeholder)
- ✅ Card search by name
- ✅ Set search + [provider adapter](decisions/provider-adapter.md)
- ✅ Dark UI theme
- ✅ Card detail page with prices and "Find on eBay" search links
- ⬜ Planned — graded asking prices from active eBay listings (eBay Browse API free tier,
  via Supabase Edge Function — see [pricing](decisions/pricing.md))
- ⬜ Planned — portfolio saved on-device (no account needed yet)
- ⬜ Planned — accounts + cloud sync (Supabase free plan)
- ⬜ Planned — price history chart
- ⬜ Planned — on-device ML card scanner (last — see `ml/README.md`)
