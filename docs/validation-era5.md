# Validation — ERA5 wind dataset (0.25°, 1950–2024)

Second wind dataset for the atlas: hourly ERA5 10 m winds (Hersbach et al. 2020) on the 0.25° grid, reduced to the
same per-cell (speed, direction) histograms and the same 23 qsat fields × 64 thresholds as ERA5-Land.
Built on NCI Gadi (project k10) from the NCI ERA5 replica; scripts in `pipeline/gadi/era5/`, field definitions in
`pipeline/src/dune_atlas_pipeline/qsat_compute.py`. Run and cost log: `staging/era5/runlog.md`.

## Stores (Gadi scratch, zarr v2)

| store | variable(s) | shape | dtype | chunks | codec | size |
|---|---|---|---|---|---|---|
| `/scratch/k10/ag5517/dune-atlas/era5/era5_1950_2024_uam10_hist.zarr` | `histogram_um_ua` (latitude, longitude, um_bin, ua_bin) | 721 × 1440 × 128 × 128 | uint32 | 13 × 64 × 128 × 128 | blosc lz4-5 shuffle | 12.31 GB (1,304 files) |
| `/scratch/k10/ag5517/dune-atlas/era5/era5_1950_2024_qsat_params.zarr` | 23 qsat variables (ut, latitude, longitude) | 64 × 721 × 1440 | float64 | 64 × 64 × 64 | blosc lz4-5 shuffle | 9.83 GB (6,405 files) |

Grid: cell centres latitude 90 − 0.25 i (i = 0…720, 90° N to 90° S), longitude −180 + 0.25 j (j = 0…1439); cell
edges ± 0.125°. The source files are already on this grid (asserted for every file read), so no re-indexing is
applied. Fields are computed for every cell, ocean included; a land selection is applied downstream.

## Method

**Input.** `/g/data/rt52/era5/single-levels/reanalysis/{10u,10v}/<year>/*.nc`, monthly files, 1950-01-01T00 to
2024-12-31T23: 657,456 hours (8,760 or 8,784 per year; every file's time axis checked for hourly continuity and
the 10u/10v axes for equality). Values are int16 packed with per-file `scale_factor`/`add_offset`, unpacked in
float64 as `raw * scale_factor + add_offset` (as netCDF4/xarray do); no fill values occur.

**Histograms.** um = (u10² + v10²)^½, 128 bins on linspace(0, 20, 129) m/s; ua = arctan2(v10, u10), 128 bins on
linspace(−π, π, 129); counts over all hours. Bins are closed on the left and the last bin on both sides
(numpy.histogram / xhistogram convention); hours with um > 20 m/s are not counted, as in the ERA5-Land store. The
kernel (numba) was checked against xhistogram and numpy.histogram2d on synthetic data including samples exactly on
bin edges (identical counts). The grid was processed in 8 latitude bands of 91 rows (the netCDF chunk height), each
band reading only its own chunks, checkpointing every 10 years and writing its rows when complete.

**Fields.** `qsat_compute.qsat_fields(hist)` evaluates every variable as a histogram-weighted mean over all
(speed, direction) bins, i.e. a time average over the hourly record:
- crest-mode directions α_E (`ae`) and α_H (`ab`) from periodic cubic splines of Σ n q_a sin(θ − φ) and
  Σ n q_a |sin(θ − φ)| on the 129-point orientation grid (crest speed-up β = 6, aspect 2/15), as in the
  dune-world analysis;
- crest fluxes at α_H / α_E (`qnlb`, `qncb`, `qalb`, `qacb`, `qnle`, `qale`, `qace`), `at`, `ao` and the ratios
  `sige_sigh`, `qhab_nl_nc`, `qhab_ac_nc`, `qhne_ac_nl`;
- DP, RDP, RDD and RDP/DP of the time-averaged flat-bed flux (`dpm`, `rdpm`, `rdpa`, `qha_rdp_dp`; RDP/DP undefined
  where DP = 0), as written by `scripts/drift/compute_drift.py` for ERA5-Land;
- `uft` (fraction of hours with u*,f > u*,th) and `ufm` (mean u*,f/u*,th over those hours);
- `qhbf`, `qhef` as flux fractions F = Σ_{u*,f>u*,th} n|Q(α)| / Σ n|Q(α)| in [0, 1]; F = 0 where `uft` = 0 and crest
  flux exists; undefined (NaN) where there is no crest flux.
These are the definitions `qsat_view.open_qsat` exposes for ERA5-Land. Constants from `constants.py` (z = 10 m,
z0 = 10⁻³ m, κ = 0.41, g = 9.8 m/s², ρs = 2650 kg/m³, ρf = 1.2 kg/m³, a_q = 25/3).

## 1. Field code reproduces the atlas's ERA5-Land fields

The same function, run on ERA5-Land histograms, compared with `qsat_view.open_qsat` (ERA5-Land source + drift store)
at 260 land cells × 64 thresholds = 16,640 values per variable: 160 random land cells, 40 coastal cells (land with an
ocean neighbour), 30 cells with `uft` = 0 at ut index 40 (F = 0 rule), 30 cells without crest flux at ut index 63
(F undefined rule). Run both locally and on Gadi (the interpreter used for the ERA5 run); the two runs agree to
≤ 5 × 10⁻⁹ relative for every variable.

| variable group | max difference |
|---|---|
| `dpm`, `rdpm`, `qha_rdp_dp` | ≤ 1.2 × 10⁻⁷ relative (the ERA5-Land drift store is float32) |
| `rdpa` | ≤ 1.2 × 10⁻⁷ rad |
| `ab`, `ae`, `at`, `ao` | ≤ 4 × 10⁻¹³ rad, except the cases below |
| `qacb`, `qncb`, `qnle`, `qale`, `qace`, `sige_sigh`, `qhab_ac_nc`, `qhne_ac_nl`, `ufm`, `qhbf`, `qhef` | ≤ 1 × 10⁻¹¹ relative |
| `uft` | identical |
| `qnlb`, `qalb`, `qhab_nl_nc` | ≤ 6 × 10⁻¹⁴ of the crest-flux magnitude (qalb + qacb) |

Undefined (NaN) and infinite values coincide exactly for all 23 variables (both edge rules exercised: 2,692 / 1,824
zero values and 1,462 / 2,330 undefined values of `qhbf` / `qhef`).

Cases outside 10⁻⁶:
- **Ties between two equal maxima (5 of 15,178 finite mode values):** 3 `ab` values (cells (306, 3072) ut 55;
  (213, 1502) ut 60 and 61) and 2 `ae` values ((915, 1205) ut 38; (1122, 1319) ut 62). All are at high thresholds
  in cells with crest flux below 10⁻¹¹ m²/s (or zero), where the orientation curve has two mirror-image extrema of
  equal height and rounding in the summation order decides between them. `at`, `ao` and the bed-mode fluxes follow
  the chosen α at those entries.
- **Near-zero along-crest components:** 165 `qnlb` values are below 10⁻¹² of the crest-flux magnitude (α_H nearly
  perpendicular to all flux); there the relative difference reaches 8 × 10⁻⁶ (and one `ao` value takes the
  opposite sign, since `ao` depends on the sign of `qnlb`, here 5 × 10⁻²⁸ vs −2 × 10⁻²⁹ m²/s). Relative to the
  crest-flux magnitude these differences are ≤ 6 × 10⁻¹⁴.

`pipeline/tests/test_qsat_compute.py` repeats a 12-cell version of this check. Data:
`staging/era5/validation_a_summary.json`, `staging/era5/validation_a_era5land_cells.csv`.

## 2. Histograms

- **Hour counts.** For every one of the 1,038,240 cells, Σ histogram + hours above 20 m/s = 657,456 (asserted
  in each band job before writing; band totals in `staging/era5/sums.json`). Read back from the store at 2,000
  random cells: 0 mismatches; per-cell sums 618,332–657,456. Hours above 20 m/s occur in 640,940 cells, at most
  112,644 h (17 %, Southern Ocean); on land they are rare.
- **Independent recomputation from the hourly files** (xarray decoding + xhistogram, as in the ERA5-Land
  workflow) for 6 cells: identical histograms in all 6.

| cell | lat, lon | counted | hours > 20 m/s |
|---|---|---|---|
| Sahara | 25.00, 10.00 | 657,456 | 0 |
| Namib | −24.50, 15.25 | 657,456 | 0 |
| Taklamakan | 39.00, 83.00 | 657,455 | 1 |
| Drake Passage | −57.00, −65.00 | 656,033 | 1,423 |
| pole row, first column | 90.00, −180.00 | 657,452 | 4 |
| equator, last column | 0.00, 179.75 | 657,456 | 0 |

Data: `staging/era5/raw_cells.json`.

## 3. ERA5 vs ERA5-Land at dune cells (u*,th = 0.15 m/s)

Each of the 106,540 ERA5-Land dune cells (`layers.nc` `dunes`) is paired with the ERA5 cell containing its centre
(106,539 pairs with ERA5-Land wind; 23,493 distinct ERA5 cells). Script:
`pipeline/gadi/era5/compare_era5_era5land.py`; numbers in `staging/era5/era5_vs_era5land_dunes_ut14.json`.

| quantity | ERA5-Land median (5–95 %) | ERA5 median (5–95 %) | comparison |
|---|---|---|---|
| DP (m²/yr) | 37.0 (10.6–65.1) | 36.6 (12.2–64.4) | ERA5/ERA5-Land ratio median 0.985 (5–95 %: 0.88–1.38); r(log DP) = 0.95 |
| RDP/DP | 0.452 (0.141–0.833) | 0.454 (0.145–0.834) | difference median +0.003 (5–95 %: −0.037 to +0.039); r = 0.99 |
| RDD | | | absolute difference median 1.5° (95 %: 7.4°) where RDP/DP > 0.2 in both (94,409 pairs); 99.9 % within 30° |

DP = 0 at 20 (ERA5-Land) and 12 (ERA5) dune cells. Globally, 1,000 ERA5 cells have DP = 0 at this threshold and
10 have no crest flux (`ab`, `ae` undefined). Figures: `staging/era5/era5_dp_ut015_global.png`,
`staging/era5/era5_vs_era5land_dunes_ut015.png`.

## Decisions taken for the atlas build

- **Land cells** = ERA5 land–sea mask fraction **lsm > 0** (strictly). `lsm` is the invariant ERA5 field
  (`/g/data/rt52/era5/single-levels/reanalysis/lsm`, int16 packed, unpacked in float64): identical over all 744
  steps of the 2000-01 file and, at the first step, in the 1950-01, 1979-01 and 2024-12 files (max |Δ| = 0). The packed
  minimum unpacks to exactly 0.0 (643,341 cells), the smallest positive value is 1.5 × 10⁻⁵. Land cells: **394,899**
  (38.0 % of 1,038,240). `lsm` itself is kept per land cell in `cells-aux.zarr`. The ERA5-Land land mask is not used.
  The first build of these stores used lsm > 0.5 (351,848 cells) and is kept under `dune-atlas/v1/datasets/era5/`
  until the app has switched; the current stores are under `dune-atlas/v2/datasets/era5/`.
- **Dune presence** (`cells.zarr` `dunes`) = the 0.25° footprint overlaps at least one 0.1° dune cell of the dune
  map (`layers.nc` `dunes` = dune-mask-rev1). No fractional dune cover is stored.
- **Overlap weights** (dune overlap, vegetation regrid): exact spherical areas of the intersecting lat/lon rectangles,
  R² Δλ (sin φ_N − sin φ_S), rows clipped to ±90° (`cellmasks.py`). The 0.1° edges (odd multiples of 0.05°) and the
  0.25° edges (odd multiples of 0.125°) never coincide, so every overlap is zero or at least 0.025° wide.
- **Hour count** per dataset: `cells.zarr` `n_hours` = 657,456 (ERA5-Land store: 657,455); `grid.DATASETS`.
- **Fields** = the qsat store as computed (`qsat_compute.py` already gives the time-averaged definitions), float32
  in `cells.zarr`, display units in the pyramids; only land cells carry values. The global source stores are
  unchanged; only the derived atlas stores depend on the land definition.
- **Flux divergence** from ERA5 `rdpm`/`rdpa` (all 64 thresholds) with the ERA5-Land method (`qsdiv.py`: spherical
  divergence, central differences, periodic in longitude, ±90° rows no data); rdpm/rdpa are first limited to the
  land cells, so a land cell next to a non-land cell has no value, as at ERA5-Land coasts.
- **Aridity** means: `aridity.cell_means` on the 0.25° footprints (equal weight per 30″ pixel, 900 nominal pixels
  per cell). **Vegetation**: area-weighted regrid of the atlas 0.1° `tot_cov_mean` (+ `tot_cov_valid_frac`).

## 4. Atlas stores

Layout and object counts: `docs/storage-layout.md` §6. Code: `pipeline/src/dune_atlas_pipeline/grid.py` (grids and
dataset descriptions, `lsm_land_above`), `cellmasks.py`, the dataset-aware `cellstore`, `fields`, `qsat_view`,
`qsdiv`, `cellsaux`, `vegetation`, `cogs`, `dataset_registry.py`; Gadi steps `pipeline/gadi/era5/era5_atlas_prep.py`
(lsm) and `era5_atlas_cells.py` (cell store next to the data, land-cell qsat copy, transfer parts); local steps
`scripts/build_era5_fields_pervar.py` (pyramids and flux divergence one variable at a time) and the sidecar commands
in `scripts/build_era5_atlas.sh`.

**Pipeline generalisation (regression).** Building ERA5-Land pieces with the generalised code and with the previous
commit (`scripts/check_era5land_regression.py --full`: fixture-region cell store, three field pyramids, the global
qsdiv pyramid and staging copy, global `cells-aux.zarr` and `cells-aux-veg.zarr`, DP COG array and transform,
registry fragments) gives 14,807 / 14,807 byte-identical files (run again after the change of land definition).
`pipeline/tests/test_era5_grid.py` covers a synthetic 0.25° fixture (grid parsing and edges, cell store incl. the
1-row edge shard, pyramid levels and edges, divergence against an analytic field, exact-area regrid and dune overlap
against brute force, the strict lsm > 0 rule, sidecars).

**Cells added by lsm > 0** (43,051 with 0 < lsm ≤ 0.5; `staging/era5/atlas_v2/new_cells_classes.json`): 41,015
coastal (connected to the ocean through cells with lsm ≤ 0.5), 1,144 on the fringe of lakes / inland water (an lsm = 0
water body other than the ocean), 892 isolated partial-land cells (no lsm = 0 cell in their cluster; median lsm
0.34). Their lsm quartiles are 0.0099, 0.0842,
0.2586; 4,174 lie south of 60° S.

**Dune cells.** 27,034 cells of 0.25° overlap a 0.1° dune cell; 27,033 of them are land cells. **1**
dune-overlapping cell is not land (lsm = 0); it contains 7.0 km² of 0.1° dune area
(with lsm > 0.5: 703 cells, 72,937 km²). Every 0.1° dune cell overlaps at least one land cell (with lsm > 0.5: 290 did not,
30,563 km²). The 106,540 0.1° dune cells cover 11,614,510 km².

**Cell store** (PBS 181171085 on Gadi, 425 s with 8 workers): 2,203 land shards per sharded array, no anomalies.
Independent check of 500 random land cells against the global source stores: histograms identical, 23 × 64 field
vectors identical to the float32 cast of the source; DP/RDP/RDD recomputed from the stored histograms agree with the
source fields to ≤ 3.0 × 10⁻¹⁵ relative; 200 / 200 non-land cells empty; non-land shards and inner chunks absent.
Histogram sums: 344 of 500 cells equal 657,456, the rest are short by the hours above 20 m/s (max 28,255 h, 4.3 %).

**Field pyramids** (23 + qsdiv; `staging/era5/atlas_v2/pyramid_checks.json`): 4 levels each (1440, 720, 360, 180 px),
per-level transforms exact; at three random thresholds per store, the native level at the 300 reference cells equals
the display values of the source within the 12-bit rounding (≤ 1.22 × 10⁻⁴ relative), no value outside the land
cells, and at every coarser level a pixel has a value exactly where its window contains a land value. In the qsdiv
staging copy a few subnormal values (|∇·q| < 10⁻⁴⁰ m/yr) round to 0.

**Flux divergence and coasts** (u*,th = 0.15 m/s; `qsdiv_v1_v2_ut14.json`): defined at 374,450 of 394,899
land cells (20,449 land cells without a value: next to a non-land cell or on a ±90° row), against 333,062
of 351,848 with lsm > 0.5. 17,214 cells that were coastal under lsm > 0.5 now have a value; values present in both
builds are identical (333,062 / 333,062); of the 43,051 added cells, 24,174 have a value. At dune cells:
26,858 with a value (was 25,359), median -0.018 m/kyr,
61.4 % negative, 2–98 % range -0.40 to +0.29 m/kyr.

**Sidecars** (`aux_checks.json`): every array equals its input on all land cells and has no data elsewhere
(`qsdiv` at all 64 thresholds); `ai_mean` defined at 264,129 land cells (the source ends at 60° S), `tot_cov_mean` at
244,104; `lsm` ≥ 1.5 × 10⁻⁵ on every land cell.

**Colour limits.** `registry/datasets/era5/qsat_field_metadata.json` holds p2/p98 at u*,th = 0.15 m/s over the ERA5
land cells.

**Metadata text.** The `zarr.json` attributes of the ERA5 v2 pyramid and sidecar stores and the registry files
contain no term of the public-text and repository denylists.

## 5. Upload and public checks (https://data.geomorphlab.org/dune-atlas/v2/datasets/era5)

Create-only (`If-None-Match: *`) puts after a live listing of all of `dune-atlas/` (57,566 objects, all under
`v1/`; none under `v2/`); 9,539 new objects (5.817 GB), zero collisions. `cells.zarr` arrived from Gadi as md5-checked
tars (one per 8 shard rows, 200 MB parts) and was uploaded part by part, its metadata last; the other stores with
`dune-atlas upload-new --prefix dune-atlas/v2/datasets/era5`. Ledger
`staging/era5/atlas_v2/r2/uploaded-new-dune-atlas_v2_datasets_era5.json`. Checks (`scripts/verify_era5_r2.py`,
default mode, 12 s; `staging/era5/atlas_v2/public_verification.json`):

| check | result |
|---|---|
| listing after upload | 67,105 objects; the 57,566 earlier objects unchanged (keys and sizes); the 9,539 new ones all under the prefix |
| integrity, every object | keys = upload ledger = local MD5 set; 0 size and 0 ETag mismatches (ETag = MD5, no multipart objects); cells.zarr MD5s per object on Gadi |
| delivery path (the app's `CellStore` + zarrita over HTTPS) | 20 / 20 land cells bit-identical to the source values (histograms, fields, sidecar arrays), 10 of them with 0 < lsm ≤ 0.5 and 3 dune cells; 5 / 5 non-land cells empty |
| pyramid windows (10 random 64² windows, random store, level and u*,th) | 10 / 10 identical to the local stores |
| HTTP | suffix range (`bytes=-4100`) 206; CORS preflight 204 for https://map.geomorphlab.org, origin echoed, `content-range` exposed |

`--full` repeats the exhaustive check used for the first build (300 cells, every sidecar array, 216 windows; §5 of the
first build: all identical).

## 6. Retention copy

The two source stores were copied from scratch to `/g/data/k10/ag5517/dune-atlas/era5/` in a `copyq` job (PBS
181092154, 0.66 SU): `era5_1950_2024_uam10_hist.zarr` 1,304 files, 12,313,456,213 bytes; `era5_1950_2024_qsat_params.zarr`
6,405 files, 9,834,740,885 bytes of file data; `diff -rq` identical for both. k10 gdata after the copy: 110.38 TiB of
111.00 TiB (7,540,307 of 8,250,000 inodes). The scratch copies are kept (scratch purges files unread for 100 days).
