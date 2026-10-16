# MERRA-2 and JRA-3Q 10 m wind stores, 1980–2025: checks and first comparison with ERA5 (16 October 2026)

Stores (Gadi project storage; names as the ERA5 stores):
- `merra2_1980_2025_uam10_hist.zarr` and `merra2_1980_2025_qsat_params.zarr`: 361 × 576 cells, 0.5° × 0.625°;
- `jra3q_1980_2025_uam10_hist.zarr` and `jra3q_1980_2025_qsat_params.zarr`: 480 × 960 cells on the N240 Gaussian
  grid, longitudes from −180°.

Each histogram store holds the 128 × 128 speed–direction histogram (0–20 m/s, 128 sectors) of the 403,248 hours of
1980-01-01T00 to 2025-12-31T23 in every cell. Hours above 20 m/s are counted separately (`n_out`). The qsat store
holds the 23 sand-flux fields at the 64 thresholds of the ERA5 stores.

## Completeness of the downloads (`check_complete.py`)

| | Files | Missing | Size mismatch | Hours |
|---|---|---|---|---|
| MERRA-2 (M2I1NXASM, daily) | 16,802 | 0 | 0 | 403,248 |
| JRA-3Q (NCAR d640000, monthly u and v) | 1,104 | 0 | 0 | 403,248 |

MERRA-2 files are spread over the GMAO streams 100–400. Stream 401 covers 152 days, the months GMAO reprocessed. Four
partial files left by stopped download jobs were removed.

## Store checks (`check_stores.py`, PBS `check.pbs`)

Results are the same for both datasets:
- **Layout:** the arrays, dimensions, data types, chunking, compressors and attributes match the ERA5 stores.
- **Hours:** in every cell (MERRA-2 207,936, JRA-3Q 460,800), the histogram total plus the hours above 20 m/s
  equals 403,248.
- **Hours above 20 m/s:** 0.20 % (MERRA-2) and 0.33 % (JRA-3Q) of all cell-hours. The most in one cell is 131,427 h
  (MERRA-2) and 98,850 h (JRA-3Q).
- **Independent re-count:** the histograms of 50 random cells in 1995 and 2022 were recomputed from the raw files
  with `numpy.histogram2d`. They equal the per-year stores exactly, and the 46-year store equals the sum of the
  46 per-year stores at these cells.
- **Sand-flux fields:** the 23 fields, recomputed from the histograms of 40 random cells, equal the qsat store
  within 2 × 10⁻¹⁰ (relative to values of order 10⁻⁵ m² s⁻¹).

## First comparison with ERA5 (`firstlook_compare.py`)

Method:
- Every dataset is averaged to 1° boxes: the mean of the cell centres in each box. RDD is taken from the vector mean
  of the RDP vectors.
- The fields are compared at the default threshold, u*,th = 0.15 m/s (index 14).
- Land: boxes with an ERA5 land–sea mask mean of at least 0.5, 60° S to 75° N (14,609 boxes).
- Dune boxes: land boxes that contain at least one ERA5 dune cell (2,790 boxes).
- RDD is compared only where RDP/DP ≥ 0.3 in both datasets and DP > 1 m²/yr.
- Periods differ: 1980–2025 against ERA5's 1950–2024.

| Statistic | MERRA-2, land | JRA-3Q, land | MERRA-2, dune boxes | JRA-3Q, dune boxes |
|---|---|---|---|---|
| Mean speed, median ratio to ERA5 | 1.15 | 1.00 | 1.09 | 1.11 |
| Mean speed, Pearson r | 0.82 | 0.66 | 0.77 | 0.54 |
| DP, median ratio to ERA5 | 1.52 | 1.01 | 1.30 | 1.40 |
| DP, 10th–90th percentile of the ratio | 0.41–5.4 | 0.15–4.2 | 0.97–3.2 | 0.59–3.2 |
| DP, Spearman ρ | 0.77 | 0.66 | 0.71 | 0.57 |
| RDP/DP, median difference | 0.01 | 0.02 | 0.00 | 0.01 |
| RDD, median absolute difference | 5.9° | 8.7° | 5.1° | 5.9° |
| RDD within 30° | 96 % | 93 % | 97 % | 97 % |

Spatial pattern:
- Over the deserts both reanalyses have higher 10 m speeds than ERA5. In the dune boxes the median is about 10 %
  higher, and DP 30–40 % higher.
- JRA-3Q has much lower speeds than ERA5 over the tropical and boreal forests (Amazon, Congo, Siberia).
- Both have higher speeds over the high mountains (Andes, Tibet).
- RDP/DP and RDD agree closely with ERA5 in most boxes.
- No grid offset: shifting either dataset by up to 3 boxes in latitude or longitude does not raise the correlation
  with ERA5.

## Atlas stores (16 October 2026)

Code: `pipeline/gadi/reanalysis/atlas_cells.pbs` (cell stores next to the data on Gadi, the ERA5 script
`pipeline/gadi/era5/era5_atlas_cells.py --dataset DS --qsat-subset --split-mb 200`), then locally
`scripts/build_reanalysis_atlas.sh DS` (parts checked against `parts.md5` and streamed into tar; aridity means; field
pyramids, colour limits and flux divergence with `scripts/build_era5_fields_pervar.py --dataset DS`; sidecars;
registry files). Dataset descriptions: `grid.py` `MERRA2_INFO`, `JRA3Q_INFO`, `DATASETS`.

**Land cells and dune cells** (`cellmasks.py build --dataset DS`; land = the dataset's own land fraction > 0):

| | MERRA-2 | JRA-3Q |
|---|---|---|
| land fraction | FRLAND + FRLANDICE (M2C0NXASM) | TL479 land field (steps of 1/60) |
| land cells | 83,945 of 207,936 | 158,338 of 460,800 |
| dune cells (footprint overlaps a 0.1° dune cell) | 6,984 | 13,871 |
| dune cells that are not land | 2 (153 km² of 0.1° dune area) | 455 (70,633 km²) |
| 0.1° dune cells touching no land cell | 1 (112 km²) | 337 (36,827 km²) |

The JRA-3Q land field is close to binary at coasts, so more coastal dune area falls in cells without wind data than
with ERA5 (1 cell, 7 km²) or MERRA-2. The 106,540 0.1° dune cells (11,614,510 km²) are counted exactly once in
each dataset (exact spherical overlap areas).

**JRA-3Q rows.** The 480 Gaussian latitudes (89.713° N … 89.713° S) are kept exactly in `cells.zarr` `grid.lat_values`
(`pipeline/src/dune_atlas_pipeline/data/jra3q_gaussian_latitudes.json`). For drawing, snapping and footprints the
atlas uses the regular rows fitted through the first and last row (`lat0` 89.71324385, `dlat` −0.374585569311);
every Gaussian row centre lies within 0.0051° of its fitted row. Flux divergence is computed on the exact latitudes
(`qsdiv.grid_coords`). Downloads give the Gaussian latitude as the cell latitude and the fitted footprint as its
bounds (checked: region export latitudes equal `lat_values` to 4 × 10⁻¹⁰°).

**Cell stores** (PBS 181416680 MERRA-2, 181416681 JRA-3Q; both exit 0, ~4 min, no anomalies):

| | MERRA-2 | JRA-3Q |
|---|---|---|
| land shards per array (all present; non-land shards and inner chunks absent) | 562 | 909 |
| random land cells vs the source stores: histograms identical / fields = float32 of the source | 500 / 500 | 500 / 500 |
| random non-land cells empty | 200 / 200 | 200 / 200 |
| histogram sum = 403,248 h (others short by the hours above 20 m/s) | 274 of 500 (max deficit 73,298 h) | 334 of 500 (max 22,841 h) |
| land-cell qsat copy vs source (300 land cells identical, 100 others empty) | yes | yes |

**Local build** (`build_reanalysis_atlas.sh`, 91 s and 113 s): 23 field pyramids and `fields/qsdiv.zarr`, 3 levels
each (MERRA-2 576 / 288 / 144 px, JRA-3Q 960 / 480 / 240 px). Flux divergence at u*,th = 0.15 m/s: finite in
76,370 (MERRA-2) and 147,350 (JRA-3Q) cells; dune-cell median −0.011 and −0.016 m/kyr, 59 % and 58 % negative.
12-bit rounding of qsdiv: maximum relative error 1.2 × 10⁻⁴ (MERRA-2); JRA-3Q has one subnormal value
(2.6 × 10⁻⁴¹ m/yr) with relative error 0.008, all others ≤ 1.2 × 10⁻⁴. Vegetation cover defined in 50,857 and
101,083 land cells; aridity in 56,488 and 121,562 cells (Global-AI covers no Antarctica).

**Corrections before upload.** The JRA-3Q data citation year is 2023 (GDEX record publication date), not 2022 as
first written: corrected in `grid.py`, `rean_hist.py` and the registry; `cells.zarr` (built on Gadi with 2022) was
corrected in its root `zarr.json` (2 occurrences; `history_note` added). The source stores on Gadi keep 2022.

**Upload** (`dune-atlas upload-new`, create-only after a live listing of `dune-atlas/`; data objects first, zarr
metadata last): `dune-atlas/v2/datasets/merra2/` 2,855 objects, 1.268 GB (listing before: 59,735 objects);
`dune-atlas/v2/datasets/jra3q/` 4,396 objects, 2.217 GB (listing before: 62,590 = 59,735 + 2,855, so nothing else
changed). **Public checks** (`scripts/verify_era5_r2.py --dataset DS`): every object's size and ETag equal the local
MD5 and the ledger; 20 land cells (incl. ≥ 10 with land fraction ≤ 0.5 and dune cells) read with the app's
`CellStore` over `data.geomorphlab.org` bit-identical to the Gadi reference sample, sidecars identical, 5 non-land
cells empty, 10 / 10 pyramid windows identical; suffix range 206, CORS for map.geomorphlab.org. Results:
`staging/reanalysis/DS/public_verification.json`.
