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
