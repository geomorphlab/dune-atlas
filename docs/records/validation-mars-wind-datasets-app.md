# Mars app: EMARS v1.0 and MACDA v2.0 (Mars Year 30) next to MCMC FV3 — validation (2026-10-16)

Branch `track/app` from `features/mars-wind-datasets` (e3b60df). Nothing uploaded or deployed. The data stores of
EMARS and MACDA are not built yet: everything here runs on the registry entries and on synthetic fixture stores.

## What the app does with three datasets

| | MCMC FV3 beta 1 (default) | EMARS v1.0 MY30 | MACDA v2.0 MY30 |
|---|---|---|---|
| grid (cell centres) | 90 × 180, lat0 89, dlat −2, lon0 −179, dlon 2 | 34 × 60, lat0 84.857, dlat −5.143, lon0 −177, dlon 6 | 36 × 72, lat0 87.5, dlat −5, lon0 −180, dlon 5 |
| latitude coverage | ±90° | ±87.43° (no polar rows) | ±90° |
| first column | −180…−178 | −180…−174 | −182.5…−177.5 (across 180°) |
| samples per sol | 24 | 24 | 12 |
| selector label | MCMC FV3 2° | EMARS 6° × 5.14° | MACDA 5° |

* Registry: `info.grid` and `info.series` (samples per sol, long names of the `hour` / `sol` download columns)
  added to `registry/layers.schema.json` (`datasets.items.info`); the FV3 entry carries them too (its texts
  unchanged). The cell store's root attrs (`grid`, `dataset.samples_per_sol`, series length) win once it is open
  (`app/src/bodies/mars/datasets.ts`); the registry `nHours` of EMARS/MACDA is nominal.
* Snapping: `snapToCell` returns null poleward of rows that stop short of a pole (`gridLatRange`, `coversLat`);
  grids that reach the poles clamp as before (FV3, MACDA, every Earth grid). A click there, a search, or a dataset
  switch with a cell outside the new grid opens the panel with "No EMARS cell at this point" and the reason.
* MACDA column 0: cell outline split at 180° (`cellFeature`), region boxes unwrap it to 180°, the arrows reader
  joins columns 71 and 0; the flat-map colour layer draws the part beyond −180° in the neighbouring world copy, for
  which the zarr-layer patch now pads the world-copy range by 3° (was 1°; half a MACDA cell is 2.5°).
* Panel, captions, plot and map exports, NetCDF / CSV / README / metadata: the sampling words ("hourly samples",
  "two-hourly samples", "Samples above threshold", "per sample"), the grid resolution ("6° × 5.14°"), the dataset's
  citation sources, field citation and licence, the map attribution and the air-density credit follow the cell's
  dataset (the store's `dataset.id`; else the app's selection). FV3 wording is unchanged (tests below); new in
  every Mars cell NetCDF: the global attribute `samples_per_sol`, in metadata.json `dataset.samples_per_sol`.

## Fixture

`scripts/mars/app/make_fixture.py` writes all three datasets (≈ 10 min with 8 workers, ≈ 250 MB): FV3 as before
(compared with an existing FV3 fixture: series, fields, ls, sol, root attrs, rho_mean and elev_mean identical),
EMARS 16,044 and MACDA 8,028 samples on their native grids (`fixture_common.synth_series_at`), shards at Nili
Patera, the EMARS outer rows and the MACDA columns either side of 180°. The CI cache key now also hashes the
dataset specs (`scripts/ci/fixture_key.py`).

## Checks run (app/)

| command | result |
|---|---|
| `npm ci`, `npm run typecheck` (Earth, node, Mars) | pass |
| `VITE_BODY=mars npx vitest run` (with the fixture) | 169 of the 170 run pass (1 skipped); the failure is the pre-existing `body.test.ts` storage test (`localStorage` undefined under Node 26 without `--localstorage-file`), failing on e3b60df too |
| `npx vitest run` (Earth) | 759 of 760 run pass; the failure is `repotext.test.ts` on `pipeline/src/dune_atlas_pipeline/mars/dunes.py` lines 300–310 (`PI` variable), present on e3b60df |
| `npm run validate-registry:mars` (now merges `registry/mars/datasets/<id>/`), `npm run validate-registry` | OK |
| `npm run build:mars`, `npm run build` | built |
| new tests | `tests/mars/datasets.test.ts` (17, synthetic cells), `tests/mars/datasetstores.test.ts` (12, fixture stores) |

## Open

* The dataset fragments (`qsat_fields.yaml`, `x_extra_fields.yaml`, `qsat_field_metadata.json`) of EMARS and MACDA
  are not in the registry yet: until they are, their layers show the FV3 colour limits and the FV3 layer
  citations in the layer ⓘ (sources resolve to the dataset's prefix).
* Credits, licences (EMARS original record), About/help wording and the dataset ⓘ text are drafts.
* The `hour` column of MACDA downloads is the sample index (one sample every two Mars hours); its long name says so.
* The flat-map rendering of the MACDA column beyond −180° was not checked in a browser.
