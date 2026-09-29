# Scanner: asking about card finish

**Decided:** The scanner identifies the card first, then asks the user which finish
it is (e.g. normal, holo, reverse holo) only when that card actually exists in more
than one finish. The prompt pre-selects whichever finish is most common for that
card, so most users can just confirm instead of choosing.

**Why:** Finish changes a card's price a lot, but most cards only come in one
finish, and asking every time would be repetitive. Detecting the finish visually is
harder than identifying the card itself, so a quick confirm-or-change step is more
reliable than trying to guess it automatically from the scan.

**Not now:** Stamps like 1st Edition could in theory be detected automatically from
the scan, but that's a later improvement, not part of this first version.

**Escape hatch:** If the scanner (or the user) picks the wrong finish, the user can
edit the finish on the item afterward from their portfolio.
