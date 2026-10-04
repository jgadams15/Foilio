# Free services only

**Decided:** Foilio is a personal learning project, so it uses only free services. No
paid APIs, subscriptions, or paid plans.

- **Card data and raw prices:** [TCGdex](https://tcgdex.dev) — free, no API key.
- **Graded prices:** eBay Browse API, free tier.
- **Backend (accounts, sync, edge functions):** Supabase free plan.
- **Running the app:** Expo Go on a phone — no paid developer accounts or build services.

**Graded prices are asking prices:** The free eBay Browse API only returns *active*
listings — what sellers are currently asking — not what cards actually sold for. Sold
data (Marketplace Insights API) is restricted to approved partners, and paid sources like
PriceCharting are ruled out by this decision. So graded prices come from active eBay
listings and must always be labeled as asking prices in the app, never presented as
sold or market value. See [pricing.md](pricing.md).

**Why:** There's no revenue, and the goal is learning how apps are built — not paying
monthly bills for data. Free tiers are plenty for one person's collection.

**Tradeoff:** Asking prices run higher and noisier than sold prices, and free tiers have
rate limits (e.g. eBay's daily call quota, Supabase's free-plan limits), so the app may
need caching to stay within them.

**Revisit:** Only if Foilio stops being a personal project. Until then, if a feature
needs a paid service, find a free alternative or drop the feature.
