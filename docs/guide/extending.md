# Extending the atlas: layers, wind datasets and planets

The Earth atlas (https://map.geomorphlab.org/) and the Mars atlas (https://map.geomorphlab.org/mars/) are
two builds of one web app. Everything that is the same on both lives once; what differs per planet ("body")
lives in a per-body folder of the app and of the registry.

## Layout

```
app/src/main.ts                  entry module of both builds (map, panels, URL state)
app/src/core/                    shared modules (map adapters, registry merge, cell download writers, UI, ...)
app/src/bodies/<body>/           per-body modules, imported by shared code as @body/<module>
registry/layers.schema.json      one schema for every body (layers, basemaps, datasets)
registry/field_names.json        one name per quantity (both bodies)
registry/<body>/layers.yaml      hand-written registry of the body
registry/<body>/generated/       registry fragments written by the pipeline
registry/<body>/datasets/<id>/   additional wind datasets (entry + fragments)
```

`VITE_BODY` selects the body at build time (`mars`, anything else Earth). `vite.config.ts` resolves
`@body/<module>` to `app/src/bodies/<body>/<module>.ts`; `tsconfig.json` type-checks the shared code with
the Earth modules, `tsconfig.mars.json` with the Mars modules (`npm run typecheck` runs both), so a module
that one body lacks, or a name it does not export, fails the type check.

| `@body` module | provides |
|---|---|
| `profile.ts` | `PROFILE` (`BodyProfile`, `core/profile.ts`): radius and Web Mercator circumference, export file prefix and strip texts, wording of the dune-layer invert, the slider quantity (readout, TeX symbol, ⓘ, plot axes), coordinates tooltip, opening view |
| `app.ts` | `APP_HOOKS` (`AppHooks`, `core/apphooks.ts`): the cell-store class, default grid, scale control, map attribution, canvas label, extra map setup (Mars: basemap protocols, polar caps), tour example cell |
| `cellPanel.ts` | the cell panel class (Earth reads wind histograms, Mars hourly series); shared helpers in `core/ui/panelcommon.ts` |
| `citation.ts` | the body's citation sources (atlas, per-cell and layer sources), map attribution, image-export credit lines |
| `auxinfo.ts` | the per-cell sidecar variables shown in the panel and written to downloads |
| `fieldinfo.ts` | source attributes of the sand-flux fields (`registry/<body>/qsat_field_metadata.json`) |
| `helpText.ts` | help sections, tour steps, dataset ⓘ, share text and About texts |
| `config.ts` | build defaults: per-cell sidecar paths, site URL |
| `registry.ts` | the registry files of the body (`import.meta.glob` patterns) |
| `html.ts` | `index.html` title, description and noscript text (`scripts/body-html.ts`) |

`tests/mars/registry.test.ts` ("body contract") checks that both bodies provide every module shared code
imports through `@body`, with the names it imports.

## Add a map layer

One registry entry, usually written by a pipeline command into `registry/<body>/generated/`; no app code
for an existing layer type. See [adding-a-layer.md](adding-a-layer.md).

## Add a wind dataset (registry only)

A dataset whose cells have the same form as the body's existing ones (Earth: wind histograms per cell,
Mars: hourly series) needs no app code:

1. Write the stores under a new prefix (`dune-atlas/<body>/<dataset>/v<N>/` for new data; existing URLs
   stay as they are, see [infrastructure.md](infrastructure.md) and
   [storage-layout.md](../reference/storage-layout.md)).
2. Add the dataset entry. The ERA5-Land entry is in `registry/earth/layers.yaml` (`datasets`), ERA5 in
   `registry/earth/datasets/era5/dataset.yaml`, MCMC FV3 in `registry/mars/layers.yaml`. Besides `id`,
   `title`, `prefix`, `description`, `citation` and `cellAuxStores`, the entry carries what the app says
   about the dataset (schema: `registry/layers.schema.json`, `datasets.items`):
   * `info`: name, grid (`resolution`, `resDeg`), `period`, `nHours`, land-cell rule and threshold, the
     message for cells without data (`nonLandReason`; empty when every cell has data), dune rule,
     `fieldsFrom` (`paper` or `atlas`) and the About item (`sourceHtml`, optional `sourceTitle`);
   * `credits`: the citation sources cited for it (`sources`, in order), its wind-data source
     (`dataSource`, also listed in About), the citation and licence of its map fields, the wind line of
     image exports (`windSourceText`) and an optional data notice written into downloads (`notice`);
   * `citationSources`: the sources the dataset defines (e.g. the reanalysis paper and data record),
     each with entries `{label, text, doi | url, license?}`;
   * Mars (hourly-series cells): `info.grid` (the cell-store grid `{lat0, dlat, lon0, dlon, ny, nx}`; cells may be
     non-square and the rows need not reach the poles) and `info.series` (`samplesPerSol`, and `indexText` /
     `solText`, the long names of the `hour` and `sol` columns of the downloads). The app uses them until the cell
     store is open, then the store's root attrs (`grid`, `dataset.samples_per_sol`, series length); the panel and
     downloads word the samples by the sampling ("hourly", "two-hourly"). EMARS and MACDA
     (`registry/mars/datasets/<id>/dataset.yaml`) are examples.
3. Add the dataset's layer fragments in `registry/<body>/datasets/<id>/`: a file with the same name as a
   `generated/` fragment replaces it for this dataset (e.g. `qsat_fields.yaml` with sources
   `'{dataset}/fields/<var>.zarr'` and the dataset's colour limits). For Earth reanalysis datasets the
   pipeline writes the entry and the fragments (`python -m dune_atlas_pipeline.dataset_registry write
   --dataset <id>`) and keeps the hand-written `info`, `credits` and `citationSources`.
4. Validate: `npm run validate-registry` (or `:mars`, which also merges `registry/mars/datasets/<id>/`) and, for an
   Earth dataset folder,
   `npx vite-node ../scripts/validate_dataset_registry.ts <id>` (in `app/`). The validator rejects a
   dataset without `info` or `credits`, and a `dataSource` that no `citationSources` defines.

The dataset selector appears with more than one dataset. Share links encode a dataset id missing from the
append-only table `SHARE_IDS.datasets` (`core/share/shortlink.ts`) inline; appending the id there makes
new links shorter (never reorder or remove entries).

A dataset with a different cell form (e.g. hourly series on Earth) needs a cell store, analysis, export
and cell panel for that form; these are per body today (`core/cell/{cellstore,analysis,flux,export}.ts` and
`bodies/earth/cellPanel.ts` for Earth, `bodies/mars/cell/*` and `bodies/mars/cellPanel.ts` for Mars).

## Named places (search box)

The search box (top of the layer panel, `core/ui/search.ts`) reads typed coordinates (`core/search/coords.ts`;
-180..180 east-positive on both atlases, Mars planetocentric; Mars also accepts 0–360° E and converts it; set by `PROFILE.search`). Named places come from
`registry/<body>/places.yaml` (schema `registry/places.schema.json`; checked by `npm run validate-registry`):

```yaml
enabled: false        # the named search, and the naming note in the dune layer's ⓘ, are shown only when true
note: "<naming note>" # optional: the note in the dune layer's ⓘ (default: the app's PLACES_DISCLAIMER)
places:
  - id: rub-al-khali
    line1: Rubʿ al Khali                     # Latin-script name
    line2: { text: الربع الخالي, lang: ar }   # optional: non-Latin name and its language (BCP 47)
    type: Erg                                # optional: feature type, shown with the name in the results
    aliases: [Empty Quarter]
    lat: 20.0
    lon: 50.0                                # -180..180 east-positive (Mars: planetocentric)
    radius_km: 500                           # sets the zoom
    dune_km2: 250000                         # optional: mapped dune area; ranks equally good matches
    countries: [Saudi Arabia, Oman, United Arab Emirates, Yemen]
    sources: ["<where the name and the location come from>"]
```

Matching (`core/search/places.ts`) ignores case, diacritics and apostrophe-like marks, covers both lines and
the aliases and tolerates small typing errors; equally good matches are ordered by `dune_km2` (largest
first), then by name. The Mars list is enabled: IAU-approved feature names of the Gazetteer of Planetary
Nomenclature whose official-diameter circle contains mapped dunes, each with its feature type, the
Gazetteer feature page as a source and a few informal names as aliases (e.g. Bagnold Dunes for Gale
crater); its header says how it was made and checked. The Earth list (274 dune fields, approved October
2026) is generated by `scripts/places/build_earth_places.py` from the approved name table: line 1 verbatim,
line 2 with its BCP 47 language, the English name and sub-units as `aliases`, the alternative names with
their notes as `alt_names` (searchable; shown with the notes in the popup), sub-units as `includes`,
countries or territories as given, and the references; review columns are not shipped. Edit the table and
re-run the script rather than the YAML. Country names are searchable too: typed in full they come first,
partly typed below every name match. Each list's `note` (with `note_links`) is the approved naming note,
shown verbatim in the dune layer's ⓘ, beside 'Show names', in About and under the search results ('About
these names'); the user-text sweep skips it (tests/usertextlib.ts `VERBATIM_NOTES`).

### Name labels on the map ('Show names')

The same list feeds the name labels (`core/map/placelabels.ts`): a symbol layer over a GeoJSON point per
place, above the data layers and below the selected-cell highlight. The toggle is for finding fields, so
the names are obvious once it is on: a haloed centre dot (an SDF image, coloured like the text) with the
name beside it on whichever side has room (`text-variable-anchor`), italic text 13–20 px with the
feature's size (line 2 2 px smaller), a wide, nearly opaque halo, and dense placement (padding 1 px). The
size is `labelRadius`, the geometric mean of `radius_km` and the radius of a disc of `dune_km2`: every
feature of 100 km or more is labelled from the whole-globe view, smaller ones from a zoom falling
log-linearly to 4.5 at 8 km (`LABEL_ZOOM`), and collisions are resolved by size, then `dune_km2`
(`symbol-sort-key`). While the names are shown, the basemap's own labels other than countries and states
(`BASEMAP_LABELS_KEPT`) are hidden, and shown again when the toggle is off; the kept basemap labels are
drawn above the names and never overlap them.
Colours follow the basemap's `tone` in the registry (`dark`: pale sand with a dark halo; `light`: dark
brown with a light halo), so a new basemap needs a `tone`. The toggle sits in the Dunes group when the
list is enabled; it is kept for the visit, per body (`core/visit.ts`), and is part of both link forms (`names=1`; short-link flag 64).
A click on a label (or a pick in the search box) zooms to the feature and opens a popup with the name,
line 2, type or countries, other names (spelling-only variants of the name left out), named parts and the sources. The list's optional `credit` is the
source line of map image exports while the names are shown; `note` is the naming note of the dune
layer's ⓘ.

Glyphs: the label font is "Noto Sans Italic" (served by the OpenFreeMap glyph server on its styles; on
styles without a glyph server every glyph is drawn from the visitor's system fonts). CJK is always drawn
locally (`localIdeographFontFamily`); Arabic-script names (Arabic, Persian, Urdu) load the RTL text plugin
(`@mapbox/mapbox-gl-rtl-text`, bundled as an asset of the build, registered lazily only for a list with
such names). Scripts that need complex shaping MapLibre does not do (e.g. Tibetan, Devanagari, Mongolian)
(Thar's Hindi name) show line 2 in the popup only. `tests/placelabels.test.ts` checks this on a fixture
list and `tests/earthplaces.test.ts` on the deployed one (with a size budget for the place file, which is
loaded with the app: about 119 kB, 25 kB gzipped).

## Concepts panel

The mortarboard button opens the entries of [docs/concepts/concepts-earth-mars.md](../concepts/concepts-earth-mars.md),
read at build time (`core/ui/concepts.ts`); entries are tagged Earth, Mars or both. `CONCEPT_OF_LAYER` maps
each layer ⓘ (and the slider and dataset ⓘ, `@threshold`, `@dataset`) to its entry; a new layer that should
link to an entry is added there.

## Bulk data and region export

* **Get the whole grid** (`core/ui/bulkguide.ts`; Download & cite and About): the public store URLs, the
  variable list, the slider axis and the licence come from the registry for the selected dataset (map-field
  sources `{dataset}/fields/<var>.zarr`, level `0`; `cellStore`; `credits.fieldsLicence`), so a new dataset
  appears there without text changes.
* **Download a region** (`core/export/region.ts` builders, `core/map/boxdraw.ts` drawing,
  `core/ui/regionExport.ts` popover): the cells of the selected dataset whose centres lie in a box, read with the
  cell store's `query(iy, ix, { wind })` (`wind: false` skips the histogram / hourly series), written as one
  CF-1.8 NetCDF-3 file with a README. What the file holds follows the cells: sand-flux fields, the wind
  histogram (cells with `hist`) or the hourly series (cells with `series`), `AUX_META` variables, the dune
  flag. Limits: `REGION_LIMITS` (cells and bytes). `npm run check-region` reads a fixture export back with
  xarray and compares it with the per-cell exports.
* **Other-dataset line** (Earth cell panel): every other dataset of the registry gets one line (its DP, RDD and
  RDP/DP at the same location and threshold); the cell panel option `otherDatasets` (main.ts) opens their cell
  stores on first use. The Mars cell panel accepts the option and shows nothing (one dataset).

## Add a planet

1. **Registry**: `registry/<body>/layers.yaml` (same schema; `threshold` is the slider, e.g. Mars grain
   diameter), its generated fragments and dataset entries with `info` and `credits`.
2. **App modules**: `app/src/bodies/<body>/` with every module of the table above. The Mars folder is the
   closer template where the winds are hourly series; `bodies/mars/body.ts` and
   `bodies/mars/marsphysics.ts` (port of the pipeline physics, constants generated into
   `bodies/mars/generated/`) show where body constants and physics go.
3. **Build**: in `app/vite.config.ts`, map the body id to its folder and `html.ts` (today the build knows
   `earth` and `mars`), add a `tsconfig.<body>.json` like `tsconfig.mars.json` to `npm run typecheck`, and
   package scripts like `build:mars` / `test:mars`. `core/body.ts` holds the body id, the per-body
   storage-key prefix and the planet button; the button switches between two atlases and needs extending
   for a third.
4. **Pipeline**: the body's constants and store writers under `pipeline/src/dune_atlas_pipeline/<body>/`
   (Mars: `mars/`), data under `dune-atlas/<body>/...`.
5. **Tests and CI**: `app/tests/<body>/` (vitest runs `tests/mars/` for `VITE_BODY=mars`), a synthetic
   fixture for CI, and the build and test steps in `.github/workflows/ci.yml`; `app/scripts/check-pages-layout.sh`
   puts each body's build into the Pages tree (`dist-mars` → `dist/mars`) before the upload.

## Checks after a change

`npm run test:all` and both builds; `bash app/scripts/test-ci.sh` runs what CI runs from a clean export.
For refactors, `bash tools/checks/equivalence.sh <baseline-dir>` compares both builds with a recorded
baseline (registry, info popovers, help, layer panel, data URLs, image-export texts, per-cell requests,
cell-panel DOM and download hashes); see [getting-started.md](getting-started.md#refactoring-checks).
