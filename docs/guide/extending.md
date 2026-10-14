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
     each with entries `{label, text, doi | url, license?}`.
3. Add the dataset's layer fragments in `registry/<body>/datasets/<id>/`: a file with the same name as a
   `generated/` fragment replaces it for this dataset (e.g. `qsat_fields.yaml` with sources
   `'{dataset}/fields/<var>.zarr'` and the dataset's colour limits). For Earth reanalysis datasets the
   pipeline writes the entry and the fragments (`python -m dune_atlas_pipeline.dataset_registry write
   --dataset <id>`) and keeps the hand-written `info`, `credits` and `citationSources`.
4. Validate: `npm run validate-registry` (or `:mars`) and, for a dataset folder,
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
Earth longitudes -180..180, Mars planetocentric 0..360° east, set by `PROFILE.search`). Named places come from
`registry/<body>/places.yaml` (schema `registry/places.schema.json`; checked by `npm run validate-registry`):

```yaml
enabled: false        # the named search, and the naming note in the dune layer's ⓘ, are shown only when true
places:
  - id: rub-al-khali
    line1: Rubʿ al Khali                     # Latin-script name
    line2: { text: الربع الخالي, lang: ar }   # optional: non-Latin name and its language (BCP 47)
    aliases: [Empty Quarter]
    lat: 20.0
    lon: 50.0                                # Mars: planetocentric, east-positive 0..360
    radius_km: 500                           # sets the zoom
    countries: [Saudi Arabia, Oman, United Arab Emirates, Yemen]
    sources: ["<where the name and the location come from>"]
```

Matching (`core/search/places.ts`) ignores case, diacritics and apostrophe-like marks, covers both lines and
the aliases and tolerates small typing errors. Both lists ship empty and disabled until the names are
approved.

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
