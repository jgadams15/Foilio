# ml/test_photos

Your own card photos, used by `scripts/evaluate.py` to measure how often the scanner
gets the right card. Photos and your `labels.csv` stay on your computer: they're
gitignored, so they never get uploaded to GitHub. Only this README and
`labels.example.csv` are tracked.

## 1. Take the photos

Put each card on a table and take a photo with your phone, the way you'd scan it in the
app. `.jpg`, `.png` and iPhone `.heic` all work, so you can copy them straight off the
phone. Put them in this folder.

Try to include a mix, especially these two, which are the hardest for the auto-crop to
find the card's edges:

- **A card on a light background** (white table, sheet of paper). Cards with silver or
  white borders barely stand out from it.
- **A card in a sleeve or toploader.** The plastic adds an extra edge and shiny glare.

Some easy ones (dark table, card filling most of the photo) are good too. That way the
results show where the scanner works, not only where it struggles. 10–20 photos is
plenty to start.

## 2. Fill in labels.csv

Copy the example to make your own:

```powershell
cd ml\test_photos
Copy-Item labels.example.csv labels.csv
```

Open `labels.csv` in Notepad or Excel and write one line per photo:

| column   | what to write                                   | example         |
|----------|-------------------------------------------------|-----------------|
| `photo`  | the photo's file name in this folder            | `pikachu.jpg`   |
| `name`   | the card's name as printed at the top           | `Pikachu`       |
| `number` | the number printed at the bottom, with the `/`  | `025/165`       |

Capital letters, accents (`Pokemon` vs `Pokémon`), and leading zeros (`025` vs `25`)
don't matter. The script uses the name, the number, and the set size after the `/`
to work out which card it is. You don't need to know any TCGdex ids.

**If a card can't be worked out**, the script skips it and tells you why, often with a
list of likely cards. For those, you can add a 4th column `card_id` with the exact
TCGdex id (e.g. `sv03.5-025`), which overrides `name` and `number`:

```csv
photo,name,number,card_id
promo.jpg,Pikachu,SWSH020,swshp-SWSH020
```

Cards with no `/` in their number (promos, for example) also work. The script then
just can't use the set size, so several cards may count as correct.

## 3. Run it

See [ml/README.md](../README.md#test-accuracy-on-your-own-photos).
