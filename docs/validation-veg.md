# Validation: total vegetation cover layer (MODIS Fractional Cover v3.1, 2001–2025 mean)

Layer `vegetation` (group "Land surface"), stores `dune-atlas/v1/fields/vegetation.zarr` (GeoZarr pyramid) and
`dune-atlas/v1/cells-aux-veg.zarr` (per-cell values). Source and licence: `docs/sources.md`. Code:
`pipeline/src/dune_atlas_pipeline/vegetation.py`, `scripts/veg_gadi.py` (NCI Gadi PBS job), tests
`pipeline/tests/test_vegetation.py`.

## Processing
1. **Source tiles.** CSIRO MODIS Fractional Cover v3.1 monthly medoid tiles (NCI project tc43,
   `modis-fc/v310/tiles/monthly/cover/FC_Monthly_Medoid.v310.MCD43A4.hHHvVV.YYYY.CCC.nc`, 272 land tiles,
   500 m sinusoidal grid, latitudes 60° S – 70° N), variable `tot_cov` (PV + NPV, uint8 %, fill 255). Values
   ≤ 103 % are valid (the three fractions sum to 100 % ± 3 %).
2. **Monthly 0.1° aggregates** (one NetCDF per year, `tot_cov(year, month, latitude, longitude)`, float32 %,
   on the atlas grid): for each year, all tiles are combined; pixel rows are assigned to the 0.1° latitude bin of
   their rounded latitude; the mean over the rows of each bin is taken at every sinusoidal x; x is converted to
   longitude with the cosine of the bin-centre latitude and averaged into 0.1° longitude bins
   (c − 0.05°, c + 0.05°]. Where a tile has both MODIS collection 6 and 6.1 files for the same months
   (19 tiles in 2020–2022), the per-cell checks below agree with the collection 6.1 values.
3. **2001–2025 mean** (`scripts/veg_gadi.py`, phase B): `tot_cov_mean` = sum of the valid monthly values /
   number of valid values over the 300 months, accumulated in float64; `n_months` = that number. Undefined (no
   data) where no month is valid.
4. **Web stores** (`vegetation.py`): pyramid levels 0–4 (0.1°, 0.2°, 0.4°, 0.8°, 1.6°; 1801 × 3600 … 112 × 225,
   trailing partial windows trimmed as in the other 0.1° fields), each coarse pixel the count-weighted mean of
   the valid 0.1° cells in its window, float32 mantissa rounded to 12 bits after coarsening; exact cell-edge
   `spatial:transform` per level `[0.1 f, 0, −180.05, 0, −0.1 f, 90.05]`. Sidecar `cells-aux-veg.zarr`:
   `tot_cov_mean` (%) and `tot_cov_n_months` on land cells, unrounded.

## Checks
| check | result |
|---|---|
| Phase B mean vs the xarray path (`open_mfdataset` → `stack(time=(year, month))` → `mean('time')`), 4 windows, 40,834 cells (Sahara, Simpson, Taklamakan, Yakutia) | identical no-data pattern; max abs difference 1.5 × 10⁻⁵ % (float32 accumulation) |
| Independent recomputation from the 500 m tiles of the monthly 0.1° values (18 cells × 4 years (2003, 2021, 2023, 2025) × 12 months; deserts, forest, high latitudes, 180° meridian) | binning as in step 2: all 864 cell-months identical within 1 × 10⁻⁴ %, identical no-data months |
| Same cells, exact footprint (pixel-centre latitude and longitude within the cell ± 0.05°) | mean absolute difference ≤ 0.53 % cover in the low- and mid-latitude desert and forest cells (Namib 0.03, Rub' al Khali 0.00, Grand Erg Oriental 0.00, Sahel 0.00, Kalahari 0.25, Taklamakan 0.27, Nebraska Sandhills 0.30, Simpson 0.40, Amazon 0.52, Badain Jaran 0.53); larger at high latitude / far from the central meridian (Mongolia 0.78, Thar 1.1, Patagonia 1.9, Chukotka 179.9° W 2.6, Yakutia 2.2, Alaska 3.8, Chukotka 179.9° E 10.8) — see "Footprint" |
| Pyramid level 0 vs 12-bit rounding of the NetCDF mean | bit-identical; max relative rounding error 1.22 × 10⁻⁴ (≤ 2⁻¹³), max absolute 0.0078 %; zeros preserved |
| Coarse levels vs brute-force window means (2,000 random pixels per level) | max relative difference ≤ 1.2 × 10⁻⁴ (rounding only) |
| Sidecar vs NetCDF on land cells | identical (float32) |
| Public domain `https://data.geomorphlab.org/dune-atlas/v1/…` | all 1,547 uploaded objects SHA-256 identical to the local build; 300 random land cells decoded from the sidecar bit-identical; 20 random 64 × 64 pyramid windows (4 per level) bit-identical; `Range: bytes=-1028` and `bytes=0-99` → 206 with matching bytes; CORS `Access-Control-Allow-Origin: https://map.geomorphlab.org`, preflight 204 allowing `range`; `Cache-Control: public, max-age=86400, s-maxage=2592000, immutable` |
| Upload | create-only (`If-None-Match: *`) after a fresh listing of 47,356 objects under `dune-atlas/v1/` with 0 collisions; listing after upload: 48,903 objects, 0 existing objects changed |

## Coverage and properties
- **Defined cells:** 1,448,985 (atlas land cells: 1,398,368 of 2,212,863 — the remainder is Antarctica,
  Greenland and land north of 70° N, outside the tiles); dune cells: 106,533 of 106,540.
- **Cells centred on 180°** (longitude −180.0) carry no value: the longitude bins of step 2 span −179.95°…179.95°
  (167 land cells, no dune cells).
- **Months used:** the mean skips months without a valid value (snow, persistent cloud, polar night), so at high
  latitudes it describes the snow-free season. `n_months` is 300 for 70,205 cells and 299 for 472,219 cells:
  February 2023 is absent from 254 of the 272 tiles (collection 6 ends in January 2023 and collection 6.1 starts in
  March 2023 for those tiles). Two tiles lack November 2022 and two lack December 2025; 2025 is otherwise complete.
  Over dune cells the 1st/5th/50th percentiles of `n_months` are 232/283/299. Diagnostic: the mean of the 12
  calendar-month climatologies differs from the plain mean by a median 0.001 % and a 99th percentile 1.3 % over
  dune cells (0.011 % / 2.1 % over all cells).
- **Values above 100 %:** 469,772 monthly 0.1° values exceed 100 (max 103); 36 cells have a mean above 100. The
  legend tops out at 100 % ("≥ 100").
- **Footprint:** step 2 converts sinusoidal x to longitude with the cosine of the bin-centre latitude, so a pixel at
  latitude φ ± 0.05° and longitude λ is placed up to |λ|·tan|φ|·0.05° (in degrees, × π/180) away from its true
  longitude, and the row means are taken before the longitude binning. Over dune cells this offset is 0.014°
  (median), 0.069° (90th percentile) and 0.099° (99th percentile); it reaches several cells near 180° at high
  latitude. The checks above quantify the effect on cell values.
- **Product scope:** the fractional cover model is calibrated and validated against field sites in Australia
  (RMSE 11.3 / 16.1 / 14.7 % for PV / NPV / BS in v3.1); total cover includes tree canopies and saturates under
  closed canopies.

## Reproduce
    # NCI Gadi (PBS, ~17 min on 3 cores / 12 GB): phases B (mean), C (tile recomputation), A (time axes)
    PHASES=BCA VEG_MONTHLY_DIR=<dir of monthly-tcov-geoglamrapp-YYYY.nc> python -u scripts/veg_gadi.py out
    # locally (dune-atlas env)
    python -m dune_atlas_pipeline.vegetation pyramid  --nc tot_cov_mean_2001_2025.nc --out staging/new-layers/veg/fields/vegetation.zarr
    python -m dune_atlas_pipeline.vegetation cellsaux --nc tot_cov_mean_2001_2025.nc --out staging/new-layers/veg/cells-aux-veg.zarr
    python -m dune_atlas_pipeline.vegetation registry
    dune-atlas upload-new --version v1 --work staging/new-layers/veg \
        --store staging/new-layers/veg/fields/vegetation.zarr=fields/vegetation.zarr staging/new-layers/veg/cells-aux-veg.zarr=cells-aux-veg.zarr
