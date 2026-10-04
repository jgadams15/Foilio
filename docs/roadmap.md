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
- ✅ Portfolio saved on-device (no account needed yet) — see
  [portfolio-storage](decisions/portfolio-storage.md)
- ⬜ Planned — accounts + cloud sync (Supabase free plan)
- ⬜ Planned — price history chart
- ✅ Scanner phase 1: camera capture with card outline (web: upload a photo)
- ✅ Scanner phase 2: card recognition prototype in Python — pretrained DINOv2
  embeddings + nearest-neighbor search over every card image (see
  [scanner](decisions/scanner.md) and `ml/README.md`)
- ⬜ Planned — scanner phase 3: automatic card cropping and accuracy testing on real
  phone photos
- ⬜ Planned — scanner phase 4: run recognition on the phone and connect it to the Scan tab
