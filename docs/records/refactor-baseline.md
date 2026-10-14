# Refactor baseline (2026-10-14)

Record of the state the repository refactor (layout, CI, per-planet architecture) is checked against.
Baseline commit `7d9c809` (tree of the live site plus one deployment record in `docs/`; the live
build was made from tree `e2967f3`, which differs from `7d9c809` in `docs/` only).

## How it was measured

Everything below runs from a clean `git archive` export with a fresh `npm ci` (Node 22.23.2, npm
10.9.8), on a 12-core macOS laptop. The tools are in `tools/checks/`:

| tool | what it records |
|---|---|
| `tree-hash.sh <dir>` | SHA-256 over every file of a build tree (sorted with `LC_ALL=C`) |
| `strings.mjs <dist>` | every string literal and template text of the bundled JavaScript (parsed with Rollup's parser) plus the `index.html` text: the text a build can show, independent of module layout and minifier renames |
| `snapshot.ts [--live]` | for one build (`VITE_BODY`): the merged registry per wind dataset, every layer's info-popover HTML, the help/tour/share/export texts, the layer-panel DOM per dataset, every data URL the registry resolves to, and (with `--live`) for each scenario cell the recorded data requests (method, URL, byte range) of opening the cell store and showing the cell, the cell-panel DOM at three slider positions and SHA-256 of each per-cell download (NetCDF, CSV bundle, citation text) |
| `make-share-corpus.ts` | the default view and 40 seeded random view states per atlas with their short-link codes, decoded states and opening app states (`app/tests/fixtures/share-links-{earth,mars}.json`); checked by `tests/sharecorpus.test.ts` and `tests/mars/sharecorpus.test.ts` |
| `equivalence.sh <baseline> [ref]` | all of the above for a commit, compared with a baseline directory |
| `compare.mjs a b` | section-by-section comparison of two snapshots or string inventories |

Snapshots are written to `staging/refactor/snap/` (not in git; about 6 MB per body). No headless
browser runs in the environment used for this refactor, so the strongest available proxy for
screenshots is the DOM of the layer panel and the cell panel rendered by the app modules in
happy-dom, plus the built-string inventory. The map canvas itself (MapLibre/WebGL) is not rendered.

## Builds (H1, H2)

| build | command | files | tree hash | repeat build |
|---|---|---:|---|---|
| Earth `dist/` | `VITE_DATA_BASE=https://data.geomorphlab.org npm run build` | 82 | `88abc8553dc9cad1` | identical |
| Mars `dist-mars/` | `VITE_BODY=mars VITE_BASE=/mars/ VITE_DATA_BASE=… VITE_SITE_URL=https://map.geomorphlab.org/mars/ npm run build:mars` | 82 | `1eb7f925041febf8` | identical |

The local `index.html` of both builds is byte-identical to the live `https://map.geomorphlab.org/`
and `https://map.geomorphlab.org/mars/` (same asset file names, so the same bundle contents).
The built-string inventories have 17,053 (Earth) and 17,125 (Mars) entries (asset file names masked).

## Tests

| suite | environment | tests | passed | skipped | failed |
|---|---|---:|---:|---:|---:|
| app Earth (`vitest`) | CI-like (no `staging/`, no `notes/`) | 563 | 540 | 23 | 0 |
| app Earth | with the local fixtures (`staging/fixture`) and the maintainer's local word list | 563 | 557 | 0 | 6 |
| app Mars (`VITE_BODY=mars`) | CI-like | 97 | 91 | 6 | 0 |
| app Mars | with `staging/fixture-mars` | 97 | 96 | 1 | 0 |
| pipeline (`pytest`, Python 3.13) | CI-like (no `staging/`, no `DUNE_WORLD_DATA`) | 148 | 101 | 40 | 7 |
| pipeline | with `staging/` and `DUNE_WORLD_DATA` | 148 | 134 | 14 | 0 |

**App tests that skip in CI** (they need `staging/`, which is not in git): Earth `parity` 5,
`era5` 7, `georef` 3, `cellstore` 2, `dunesonly`, `newlayers`, `vectorclip`, `vectors`,
`vegetation` 1 each, `repotext` 1 (needs the local word list); Mars `cellstore` 2, `body`,
`dunesonly`, `vectorclip` 1 each, `upstream` 1.

**App tests that fail with the local fixtures** (they never run in CI, so they were not updated
with the recent text changes): `era5.test.ts` 2 (the summary-table row text of the dune rule and the
citation-file head line), `parity.test.ts` 3 (the allowed ERA5-Land/ERA5 differences do not yet
include the dataset-specific fields citation and licence, and one row selector predates the grouped
summary table), and `repotext.test.ts` 1 (the maintainer's local word list matches `C1`, `C2` and
`correction` in the Mars transport-law code and records, which name the constants and the
correction terms of Pähtz & Durán 2023).

**Pipeline tests that need local data** (and fail or skip only for that reason):

| tests | needs | CI-like result |
|---|---|---|
| `test_cellstore.py` (6) | `staging/drift/qsat_drift.zarr` | **fail** (no skip guard) |
| `test_stream_upload.py::test_cells_band_roundtrip_and_resume` | `staging/drift/qsat_drift.zarr` | **fail** (no skip guard) |
| `test_crest_flux.py` (22) | `staging/fixture` | skip |
| `test_cellstore_validation.py` (8) | `DUNE_WORLD_DATA` and a written store | skip |
| `test_qsat_compute.py` (1), `test_qsat_view.py` (2) | `staging/drift/qsat_drift.zarr` | skip |
| `test_vegetation.py` (1) | a staged vegetation NetCDF | skip |
| `test_dunes.py`, `test_mars_dunes.py`, `test_mars_terrain.py` (3) | the `pmtiles` Python package | skip (also with data) |
| `test_mars_dunes.py` (2) | `tippecanoe` | skip (also with data) |
| `test_mars_fields.py` (1) | `numba` | skip (also with data) |

In this environment `topozarr` and `topozarr-core` 0.1.11 are installed (they are imported by the
pipeline but not declared in `pipeline/pyproject.toml`).

## Data requests and texts per scenario (snapshot S)

| atlas | datasets | layers | basemaps | data URLs from the registry | scenario cells |
|---|---|---:|---:|---:|---|
| Earth | `era5-land`, `era5` | 27 | 5 | 40 per dataset | Namib example cell in both datasets (ERA5-Land (1145, 1952), ERA5 (458, 781)); central Australia (ERA5-Land (1150, 3140)); an ocean cell (900, 1500), which shows the non-land message |
| Mars | `fv3-beta1` | 27 | 6 | 38 | Nili Patera example cell (40, 123); north polar erg (5, 70); south polar cell (87, 90) |

Each Earth land cell makes 30–32 data requests (store metadata, the shard index by suffix range,
the cell's byte range in `hist` and `fields`, the sidecar chunks); the ocean cell 27. Each Mars cell
makes 27. The cell-panel DOM is recorded at the default slider position (Earth index 14,
u\*,th = 0.15 m/s; Mars index 29) and at indices 0 and 63, and the three downloads of every land
cell are hashed. All snapshot sections are identical on a repeat run.

## Share links

`app/tests/fixtures/share-links-earth.json` and `share-links-mars.json`: 41 entries each (the
default view plus 40 seeded random states: camera, projection, dataset, basemap, slider index,
up to four layers with random opacity and display settings, selected cell, layer-panel state,
Dunes only, plotted quantity). The Earth default view encodes to `AQXirhW4wRLgAgIBDgMJVSACAWQAB1UA`
(as `DEFAULT_SHARE_CODE` in `defaultview.ts`).

## Gates used for each later step

- Comment-, documentation-, CI- and test-only changes: H1 and H2 must not change (comments are
  stripped from the bundle), except for comments inside registry YAML, which is bundled as text;
  for those, the snapshot's merged registry must be identical.
- Source refactors: the file lists (asset hashes masked), the built-string inventories and every
  snapshot section must be identical, and the share-link corpus tests must pass. Intended text
  changes are listed in the equivalence record.
