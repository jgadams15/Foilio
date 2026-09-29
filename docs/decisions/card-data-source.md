# Card data source: TCGdex

**Decided:** Use [TCGdex](https://tcgdex.dev) as the card data API.

**Why:** It's free, requires no API key, and is open source — good fit for a project
that isn't generating revenue yet.

**Tradeoff:** TCGdex's image coverage has gaps. Most missing images are promos and
special subsets (Black Star Promos, Trainer Gallery, Shiny Vault, Classic Collection).
Cards with no image sort last in search results rather than breaking the layout.

**Revisit:** When building the ML scanner, consider a pokemontcg.io image fallback for
cards TCGdex is missing images for.
