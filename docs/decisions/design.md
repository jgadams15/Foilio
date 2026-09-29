# Design: dark "brokerage app" look

**Decided:** Dark mode only for now, styled like a trading/brokerage app. All tokens
live in `apps/app/src/theme/theme.ts`.

- Background `#0F172A`, card surface `#1E293B`, border `#334155`
- Text `#F8FAFC`, muted text `#94A3B8`
- Accent (indigo) `#6366F1`
- Gain `#22C55E`, loss `#EF4444`
- Font: Inter (via `@expo-google-fonts/inter`)
- Prices and other numbers use tabular figures (`tabularNums` in the theme) so digits
  line up in columns instead of the row width wobbling as digits change.

**Why:** A card portfolio is financial data — a brokerage look (dark, numeric, gain/loss
colors) fits that better than a playful/casual style.

**Revisit:** Light mode isn't planned yet, but the theme file is the single place to add
it if that changes.
