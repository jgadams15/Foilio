## What Foilio is

Foilio is a Pokémon card scanner, price checker, and portfolio tracker. It's an Expo
(React Native) mobile app first; a Supabase backend comes next (accounts, cloud sync,
eBay price lookups); an on-device ML card scanner comes last.

## Where things live

- `apps/app` — the Expo mobile app (screens, components, theme).
- `packages/shared` — card data types and the `CardDataProvider` API client, shared code that isn't UI.
- `supabase` — database schema, edge functions, and cron jobs (not yet initialized — see `supabase/README.md`).
- `ml` — Python pipeline for the card-scanner recognition model (not started yet).
- `docs` — architecture notes and decisions; see `docs/decisions/` and `docs/roadmap.md`.

## Rules

- Free services only — TCGdex, eBay Browse API free tier, Supabase free plan, Expo Go. No paid APIs or plans. See `docs/decisions/free-only.md`.
- Get card data only through `CardDataProvider` (`packages/shared/src/api`). Never call TCGdex or any other API from a screen directly — that's how we can swap providers later without touching UI.
- All colors, fonts, and spacing come from `apps/app/src/theme`. Never hard-code a color or size in a screen or component.
- Secrets and API keys never go in the app. They live in `.env` (local, gitignored) or on the Supabase server side.
- Check `docs/decisions/` before making a big architectural change — it may already be decided, or explain why something is the way it is.
- Use `npx expo install <package>` to add packages, not npm/yarn/pnpm/bun add — it resolves versions compatible with the installed Expo SDK.
- Run the app from `apps/app` (`npx expo start`).

## Working with me

I'm a beginner learning how apps are built. After every change:

- Give me a short plain-English summary: what you changed, why, and any new concept I should know (2-3 sentences, no jargon without explaining it).
- Always work on a new git branch — never commit directly to `main`.
- Run `npx tsc --noEmit` before saying you're done.
