# Portfolio: on-device storage first, behind PortfolioStore

**Decided:** The portfolio is saved on the device (AsyncStorage — a file in the
app's sandbox on iOS/Android, `localStorage` on web), behind a `PortfolioStore`
interface (`packages/shared/src/portfolio/store.ts`). Screens only use
`usePortfolio()`; the one store instance is chosen in
`apps/app/src/portfolio/store.ts`.

**Why:** No account is needed to start tracking cards, and it's free. The interface
means a Supabase-backed store can replace the local one later by changing one line,
the same way `CardDataProvider` works ([provider-adapter](provider-adapter.md)).
Entry ids are UUIDs so local entries can be uploaded to a database as-is.

**Known limit:** Deleting the app (or Expo Go, while testing) deletes the portfolio.
It isn't backed up anywhere. Accounts + cloud sync fix this; until then, that's the
trade-off for no sign-up.

**Lots, not one row per card:** Each purchase is its own `PortfolioEntry` (like a
stock "lot"), so every purchase keeps its own price and date. The Portfolio list
groups entries with the same card + finish + grading into one holding, showing total
quantity and average cost per copy; tapping a holding shows the individual purchases.
Purchase price is per copy.

**No made-up numbers:**

- A holding's value is the current raw price for its finish × quantity. If there's no
  price for that finish, or prices couldn't load, it shows that and is left out of
  the total — we never fall back to another finish's price or an old saved price.
- Graded entries show "No graded price yet" and are left out of totals until a graded
  price source exists (see [pricing](pricing.md)). When one does, decide then whether
  graded *asking* prices belong in a total that's otherwise market value.
- Gain/loss only counts copies that have a purchase price, and the screen says so
  when that's not every priced copy.
- The total shows "≈" when any part of it came from a EUR price converted to USD.

**Revisit:** When adding Supabase sync, decide how to merge an existing on-device
portfolio into a new account (likely: upload it on first sign-in).
