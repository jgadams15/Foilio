# packages/shared

Shared TypeScript code used by `apps/app` (and potentially Supabase edge functions):
domain types, an API client, and general utilities.

- `src/types/` — shared domain types: `Card`, `Price`, `PortfolioEntry`, and related
  types.
- `src/api/` — a typed client for talking to Supabase and any other backend endpoints
  (price fetching, card search, etc.), so `apps/app` doesn't duplicate request/response
  shapes.
- `src/portfolio/` — the `PortfolioStore` interface, its on-device implementation
  (`LocalPortfolioStore`), and the portfolio math (grouping purchases into holdings,
  value, gain/loss).
- `src/utils/` — general-purpose helpers (formatting, calculations like gain/loss, etc.)
  with no UI or platform dependency.
- `tests/` — tests for this package's types, API client, and utilities.
