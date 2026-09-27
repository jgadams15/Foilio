# apps/app

The Expo (React Native) app — the only user-facing client, targeting iOS, Android, and
web from one codebase.

Created with `create-expo-app` (default template, then reset to a blank screen).

## Running it

You need [Node.js](https://nodejs.org) (the LTS version) installed. On your phone,
install the free **Expo Go** app from the App Store or Google Play.

```
# 1. From the repo root (the Foilio folder), download all the packages once:
npm install

# 2. Move into the app folder and start the development server:
cd apps/app
npx expo start
```

A QR code appears in the terminal. Scan it with your phone's camera (iPhone) or from
inside Expo Go (Android), and the app opens on your phone. Press `w` in the terminal to
open it in your web browser instead. Save a file and the app reloads by itself.

## What's in here

- `src/app/` — the screens. Every file here is a screen (this is "file-based routing").
  `index.tsx` is the home screen; `_layout.tsx` wraps all screens.
- `assets/` — images such as the app icon and splash screen.
- `app.json` — app settings: name, icon, colors, and which Expo plugins to use.
- `package.json` — the list of packages this app depends on, and handy commands.
- `tsconfig.json` — settings for TypeScript (JavaScript with type checking).

Useful commands (run inside `apps/app`):

- `npx expo start` — start the app for development.
- `npx tsc --noEmit` — check the code for type errors without running it.
- `npx expo lint` — check the code for common mistakes and style problems.
- `npx expo install <package>` — add a package (use this instead of `npm install
  <package>` so you get a version that works with this Expo version).

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
