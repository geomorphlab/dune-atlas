# Translations (French and Simplified Chinese)

Both atlases can be read in English, French (`fr`) and Simplified Chinese (`zh-Hans`). The switch is the
column of square buttons **EN / FR / 中文** on the map, below the planet button.

## What is translated

The interface labels, the Help panel, the guided tour, layer and group names, legends and units, basemap
names and the Concepts panel (including the DP comparison figure). Layer ⓘ popovers, About, most of the cell
panel and all downloads stay in English (translation plan, option 2): a browser's own page translator can
still be used for those parts.

Formulas, acronyms (DP, RDD, ERA5-Land …), names of datasets and providers, and references are kept as
written in every language.

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
   on one line. Keep `$…$` formulas, HTML tags (`<br>`, `<a …>…</a>`), `{placeholders}`, acronyms, names
   and references unchanged. Use the agreed terms of `translation-glossary.csv`.
2. An empty `FR:` / `ZH:` line shows the English on the site.
3. **STALE** after a heading means the English changed after the translation was made: check the translation
   against the new English, then delete the word STALE.
4. Send the edited file back (or open a pull request). Someone runs `npm run i18n` and commits both the `.md`
   and the generated `.json`.

## For maintainers

- After editing English text that is translated (help, tour, layer titles, legends, Concepts, `ui.ts`), run
  `npm run i18n` in `app/`. It adds new strings to both `.md` files, marks changed ones STALE, and rewrites the
  `.json`. Until a reviewer updates a STALE or empty entry, the site shows the English for it: a translation
  made from other English is never shown.
- New interface text that should be translated: add it to `app/src/i18n/ui.ts` and use `t("key")` where it is
  shown (or `tr(key, english)` for registry/help text, with a key from `keys.ts` and an entry in
  `catalogue.ts`), then run `npm run i18n` and translate the new entries.
- Checks (`tests/i18n.test.ts`, `tests/mars/i18n.test.ts`, `tests/i18nrender.test.ts`): every string is in the
  `.md` files; the `.json` matches the `.md`; each translation keeps the formulas, tags, placeholders and
  protected terms of its English; stale and untranslated entries are listed as warnings only, so English edits
  are never blocked.
- The two dictionaries add about 40 KB (gzip) to the page for every visitor.

## Status (October 2026)

The first French and Chinese versions were machine-drafted (with the glossary) and are live; they await review
by native-speaker aeolian scientists. Mainland-China test (Oct 2026): the site, the data and the default
basemaps load without a VPN; OpenTopoMap and OpenPlanetaryMap do not (the atlas shows a notice). A second check
from China (language switch, Chinese text, a cell download and an image export) is planned.
