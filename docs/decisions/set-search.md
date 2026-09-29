# Set search

**Decided:** The set filter (tap "Filter by set", pick from the list) is the main,
reliable way to search within a set. Typing a set name directly into the search box
(e.g. "charizard obsidian flames") is a best-effort extra: the app tries to detect a
known set name at the end of the typed query and auto-filter to it, but this only
matches an exact (case-insensitive) set name, so it won't catch typos or partial names.

**Why:** Free-text set detection is a nice shortcut but unreliable by nature. The
explicit set picker is the thing that has to always work.

**Revisit:** If detection turns out to be more confusing than helpful in practice
(e.g. people expect partial matches), consider fuzzy matching or dropping it in favor
of the picker alone.
