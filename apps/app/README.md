# apps/app

The Expo (React Native) app — the only user-facing client, targeting iOS, Android, and
web from one codebase.

**Not yet initialized.** This folder is a placeholder. Initialize it with:

```
npx create-expo-app@latest . --template
```

(run from inside `apps/app`), using the TypeScript template with Expo Router.

## Planned feature organization

Once initialized, organize app code by feature rather than by file type:

- `app/` (Expo Router routes) — screen entry points for each feature: scanner, portfolio,
  search, auth, wiring them together via file-based routing.
- `features/scanner/` — camera capture UI, on-device model invocation (loading the
  exported model from `ml/export/mobile`), card-match result screen, add-to-portfolio
  flow. On web, this will also house the upload-a-photo fallback.
- `features/portfolio/` — owned-cards list, total value / gains-losses summary, value
  history chart, individual card detail with purchase price entry.
- `features/search/` — search-by-name/set UI, results list with price + card info
  (set, number, rarity, artist, image).
- `features/auth/` — sign in / sign up / session handling against Supabase auth.
- `lib/` — app-local glue code (Supabase client instance, navigation helpers, etc.) that
  isn't shared outside this app.

Cross-app-boundary code (types, API client, utilities) belongs in `packages/shared`
instead of here.
