# docs

Architecture notes and decisions for the project — e.g. why Expo + Supabase, how the
on-device scanner model interacts with the price-fetching backend, data model rationale,
and any significant tradeoffs made along the way. Not user-facing documentation.

- [roadmap.md](roadmap.md) — build order, what's done and what's planned.
- `decisions/` — one short note per decision:
  - [card-data-source.md](decisions/card-data-source.md) — why TCGdex.
  - [provider-adapter.md](decisions/provider-adapter.md) — why card data goes through one interface.
  - [pricing.md](decisions/pricing.md) — currency, condition/grade, and the graded-price plan.
  - [set-search.md](decisions/set-search.md) — how searching by set works.
  - [design.md](decisions/design.md) — the dark UI theme.
