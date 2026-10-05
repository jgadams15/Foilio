# apps/app

The Expo (React Native) app — the only user-facing client, targeting iOS, Android, and
web from one codebase.

Created with `create-expo-app`, using Expo Router for navigation.

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
  - `(tabs)/` — the three tabs: `index.tsx` (Portfolio, the home screen), `scan.tsx`,
    and `search.tsx`.
  - `card/[id].tsx` — card detail; `[id]` means the card id comes from the URL.
  - `portfolio/` — `entry.tsx` (add/edit a purchase) and `holding.tsx` (one holding).
  - `_layout.tsx` — wraps all screens (fonts, navigation stack).
- `src/components/` — reusable UI pieces (buttons, chips, holding rows, price change).
- `src/portfolio/` — `usePortfolio()` and the one `PortfolioStore` instance the app uses.
- `src/scanner/` — camera capture with the card-outline guide (photo upload on web).
- `src/theme/` — every color, font, and spacing value. Screens never hard-code these.
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

Card data, portfolio storage, and shared types live in `packages/shared`, not here.
