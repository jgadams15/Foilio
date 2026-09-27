# supabase

The Supabase project: database schema/migrations, edge functions, and scheduled
functions.

**Not yet initialized.** This folder is a placeholder. Initialize it with:

```
supabase init
```

(run from inside `supabase`).

## Planned database tables

- `users` — app user profiles (extends Supabase auth users).
- `cards` — the card catalog synced from the Pokémon TCG data API (pokemontcg.io/TCGdex):
  name, set, number, rarity, artist, image URL, etc.
- `portfolio_entries` — cards a user owns: card reference, purchase price, purchase date,
  quantity, owning user.
- `price_snapshots` — periodic price records per card (TCGplayer price and eBay listing
  data) used to build portfolio value history over time.

## Planned edge functions

- `fetch-card-prices` — fetches current TCGplayer prices (via pokemontcg.io/TCGdex) and
  eBay listings (via the eBay Browse API) for a given card.
- `sync-card-data` — fetches/updates card metadata from the Pokémon TCG data API.
- `match-scanned-card` — supporting lookup for the on-device scanner result (e.g.
  resolving a matched card ID to full card data), if needed beyond what ships in the
  on-device database.

## Planned scheduled functions (cron)

- `daily-price-snapshot` — runs daily, writes a `price_snapshots` row per tracked card so
  portfolio value-history charts have data points.
- `sync-new-sets` — periodically checks the Pokémon TCG data API for newly released sets
  and syncs new `cards` rows.
