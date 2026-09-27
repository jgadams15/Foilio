# Foilio

Foilio is a Pokémon card app for iOS, Android, and web from a single codebase. Point your
phone camera at a card, get it identified on-device, see live market prices, and track it
in a stock-portfolio-style view of your collection over time.

## Core features

1. **Card scanner (mobile-first)** — An on-device AI model identifies a physical card from
   the camera feed (no per-scan server API cost), matched against a card database built
   from a Pokémon TCG data API (pokemontcg.io or TCGdex). Once identified, the app fetches
   current prices (TCGplayer via pokemontcg.io/TCGdex, and eBay listings via the eBay
   Browse API) and lets the user add the card to their portfolio. Web may later support
   scanning from an uploaded photo instead of a live camera.
2. **Portfolio** — Tracks owned cards, current total value, gains/losses vs. purchase
   price, and value history over time via scheduled price snapshots.
3. **Card search** — Search by name/set, showing prices and card info (set, number,
   rarity, artist, image).

## Tech stack

- **Frontend:** Expo (React Native) with Expo Router, TypeScript — iOS, Android, and web
  from one codebase.
- **Backend:** Supabase (PostgreSQL, authentication, storage, edge functions, and
  scheduled functions).
- **Scanner AI:** Python pipeline that produces a model exported to mobile- and
  web-friendly formats.

## Architecture

This is a monorepo. Each top-level folder has its own README with more detail.

```
apps/app        Expo app: scanner, portfolio, search, auth (init later with create-expo-app)
supabase/       Supabase project: migrations, edge functions, scheduled functions (init later with supabase init)
packages/shared Shared TypeScript types, API client, and utilities used by apps/app
ml/             Python pipeline: data prep, training, evaluation, export to TFLite/Core ML/ONNX/web
docs/           Architecture notes and decisions
infra/          Deployment configuration
```

### How the pieces fit together

- `ml/` produces a trained card-recognition model, exported to on-device formats
  (TFLite/Core ML for mobile, ONNX Runtime Web/TensorFlow.js for web). `apps/app` bundles
  these exported models to run scanning locally, without a per-scan server call.
- `apps/app` calls Supabase (`supabase/`) for auth, storage, and data — including reading
  card/price data that Supabase's edge functions and scheduled functions keep in sync from
  the Pokémon TCG data API and the eBay Browse API.
- `supabase/`'s scheduled functions periodically snapshot prices into the database, which
  powers the portfolio's value-history charts in `apps/app`.
- `packages/shared` holds the TypeScript types (Card, Price, PortfolioEntry, etc.) and API
  client code shared between `apps/app` and, where useful, Supabase edge functions.
- `docs/` and `infra/` support the above with architecture notes and deployment config,
  respectively.

## Next steps

- Initialize `apps/app` with `create-expo-app` (TypeScript template, Expo Router).
- Initialize `supabase/` with `supabase init` and add the migrations/functions described
  in `supabase/README.md`.
- Set up `packages/shared` as a real TypeScript package and wire it into `apps/app`.
- Stand up the `ml/` pipeline: data collection, embedding/model training, evaluation, and
  export.
- Copy `.env.example` to `.env` and fill in real API keys and Supabase credentials.

## Suggested adjustments to consider

- `packages/shared` could be split into `packages/types` and `packages/api-client` if the
  API client grows enough logic (e.g. retries, caching) to warrant its own package and
  release cycle separate from plain type definitions.
- The scanner's card-fingerprint/embedding index (used to match a live camera frame
  against the full card database) could live in its own `ml/index/` or even a small
  service under `supabase/functions/` rather than being bundled fully on-device, if the
  card database grows too large for a mobile bundle — worth revisiting once the model size
  is known.
- `infra/` may eventually want per-environment subfolders (e.g. `infra/staging/`,
  `infra/production/`) once there's an actual deployment target to configure for.
