# Translations (French and Simplified Chinese)

Both atlases can be read in English, French (`fr`) and Simplified Chinese (`zh-Hans`). The switch is the
column of square buttons **EN / FR / 中文** on the map, below the planet button.

## What is translated

Everything on screen: interface, Help, tour, layer panel (names, legends, ⓘ popovers), About, the cell panel,
Concepts, tool panels, messages, tooltips and screen-reader labels, and the text of exported images. Downloads
(NetCDF, CSV, README, metadata) stay in English: they are data files that other software and readers parse.
Credit lines required by data licences, and references, stay as written.

Formulas, acronyms (DP, RDD, ERA5-Land …), names of datasets and providers, and references are kept as
written in every language.

## How it works

Two kinds of text:

1. **Keyed text** (help, tour, layer and group names, legends, basemap names, Concepts, interface labels): each
   string has a key (`earth.help.cell.body`, `header.layers` …) and is translated where it is shown
   (`tr`, `t` in `app/src/i18n`).
2. **Rendered text** (popovers, About, cell panel, tool panels, tooltips …): `app/src/i18n/dom.ts` translates
   what the page shows. Every element holding text is one unit; formulas, protected names, live numbers,
   controls and plain numbers in it become markers `⟦0⟧ …` / `⟦#0⟧ …`, and the unit is looked up by the
   fingerprint of that English template (key `c.<fingerprint>`). The translation is put back with the original
   nodes and numbers in the markers. A page observer does this for everything the atlas adds or changes.
   `npm run i18n` collects these templates from a full render of each atlas (`tests/i18ncollect.test.ts` ->
   `app/src/i18n/collected-<body>.json`).

Either way a translation is shown only for the exact English it was made from; otherwise the English is shown.

## Choosing the language

- The switch reloads the page in the same view, with `?lang=fr` or `?lang=zh-Hans` in the address; share links
  keep it. English has no `lang` in the address.
- The last choice is remembered in the browser, for both atlases.
- The atlas never switches by itself from the browser's language.
- The page declares its language (`<html lang>`); Chinese pages use the system's CJK fonts.

## Files

| File | What it is |
|---|---|
| `docs/translations/fr.md`, `docs/translations/zh-Hans.md` | **The translations.** Reviewers edit these. One block per string: `## key (area)`, the English (`EN:`), the translation (`FR:` / `ZH:`). |
| `app/src/i18n/fr.json`, `zh-Hans.json` | Generated from the `.md` by `npm run i18n`. Do not edit. Each entry holds the text and a fingerprint of the English it was translated from. |
| `app/src/i18n/ui.ts` | English of the interface labels (`t("key")`). |
| `app/src/i18n/catalogue.ts` | Every translatable string of an atlas (what the `.md` must cover). |
| `app/src/i18n/keys.ts`, `index.ts`, `switcher.ts`, `md.ts` | Keys, lookup (`tr`, `t`, `fill`), the switch, the `.md` format. |
| `app/scripts/i18n.ts` | `npm run i18n`. |

## For reviewers (PhD students)

1. Open `docs/translations/fr.md` or `docs/translations/zh-Hans.md`. Change only the text after `FR:` or `ZH:`,
   on one line. Keep `$…$` formulas, HTML tags (`<br>`, `<a …>…</a>`), `{placeholders}`, the markers `⟦0⟧`,
   `⟦#0⟧` (written attached as in the English), acronyms, names and references unchanged. Use the agreed terms
   of `translation-glossary.csv`. The file is grouped by area; screen-reader labels and tooltips come last.
2. An empty `FR:` / `ZH:` line shows the English on the site.
3. **STALE** after a heading means the English changed after the translation was made: check the translation
   against the new English, then delete the word STALE.
4. Reviewers who prefer Word get a document built from the `.md`
   (`python scripts/translations/review_docx.py build fr out.docx`); the returned document is applied with
   `python scripts/translations/review_docx.py apply fr edited.docx` (comments and accidental English edits are
   listed, the English is never taken from the document). Otherwise send the edited file back (or open a pull request). Someone runs `npm run i18n` and commits both the `.md`
   and the generated `.json`.

## For maintainers

- After editing any English text on screen, run `npm run i18n` in `app/`. It collects the rendered text of both
  atlases, adds new strings to both `.md` files (keyed ones that changed are marked STALE; a changed rendered text
  gets a new entry, and the old translation moves to "Unused"), and rewrites the `.json`. In our working
  sessions the new strings are machine-drafted at the same time, before release. Until a reviewer updates a STALE or empty entry, the site shows the English for it: a translation
  made from other English is never shown.
- New interface text that should be translated: add it to `app/src/i18n/ui.ts` and use `t("key")` where it is
  shown (or `tr(key, english)` for registry/help text, with a key from `keys.ts` and an entry in
  `catalogue.ts`), then run `npm run i18n` and translate the new entries.
- Checks (`tests/i18n.test.ts`, `tests/mars/i18n.test.ts`, `tests/i18nrender.test.ts`): every string is in the
  `.md` files; the `.json` matches the `.md`; each translation keeps the formulas, tags, placeholders and
  protected terms of its English; stale and untranslated entries are listed as warnings only, so English edits
  are never blocked.
- The two dictionaries add about 80 KB (gzip) to the page for every visitor.

## Status (October 2026)

All on-screen text of both atlases is in French and Simplified Chinese (first version machine-drafted with the
glossary and a review pass; live since 16 October 2026). No further native-speaker review is planned: text added
from 16 October 2026 on (for example the MERRA-2 and JRA-3Q dataset texts) is machine-drafted with the glossary
only, and the Word workflow above stays available should a reviewer join later. Mainland-China test (Oct 2026): the site, the data and the
default basemaps load without a VPN; OpenTopoMap and OpenPlanetaryMap do not (the atlas shows a notice). A
second check from China (language switch, Chinese text, a cell download and an image export) is planned.
