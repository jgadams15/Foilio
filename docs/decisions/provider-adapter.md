# Provider adapter: CardDataProvider

**Decided:** All card data access goes through the `CardDataProvider` interface
(`packages/shared/src/api/provider.ts`), currently implemented by `TcgdexProvider`.

**Why:** [TCGdex](card-data-source.md) is free but may not stay sufficient (e.g. no
graded prices, limited image coverage). Screens call `cardDataProvider` from
`packages/shared`, never a specific provider directly, so swapping to a paid API later
means writing one new class and changing one line — no screen changes.

**Revisit:** If/when a paid data source is added (e.g. for graded prices or better
images), write a new `CardDataProvider` implementation rather than editing
`TcgdexProvider` in place, so both can coexist if needed.
