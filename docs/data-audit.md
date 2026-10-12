# Source data audit (Phase 1)

Source: `~/Documents/research/projects/dune-world/data` (local copies of Zenodo 10.5281/zenodo.20046812).

## Grid
- ERA5-Land 0.1° grid, 1801 × 3600. Latitude 90 → −90 (descending), longitude −180 → 179.9.
  Values are cell **centres**; cell edges at ±0.05° (GeoTIFF transform origin −180.05, 90.05).
- `uam10_hist.zarr` and `qsat_params.zarr` share identical lat/lon coordinates.
- Land/valid fraction ≈ 34.1 % of cells (finite qsat values).

## `era5-land_1950_2024_uam10_hist.zarr` (20 GB on disk)
- `histogram_um_ua[latitude, longitude, um_bin, ua_bin]`, int64, chunks 64×64×128×128, blosc-lz4, zarr v2.
- `um_bin`: 128 centres, 0.078–19.92 m/s (edges 0–20; hours > 20 m/s are not counted).
- `ua_bin`: 128 centres, −π..π, from `arctan2(v10, u10)` → direction wind blows **toward**, CCW from east.
- 657,455 hourly samples (1950–2024) per cell; counts fit uint32. **Note (Phase 2):** hours with
  |U10| > 20 m/s are outside the bins, so a cell sums to ≤ 657,455 — in a random sample of 55,374 land
  cells, 47 % were short, max deficit 26,119 h (4 %). Normalise by `hist.sum()`. (The three cells checked
  in Phase 1 happened to be complete.) These hours are also excluded from all stored flux fields.

## `era5-land_1950_2024_qsat_params.zarr` (20 GB on disk)
- 23 variables, each `[ut=64, latitude, longitude]`, float64, chunks 64³:
  ab, ae, ao, at, rdpa (angles, rad); dpm, rdpm, qnlb, qncb, qalb, qacb, qnle, qale, qace (m²/s);
  qha_rdp_dp, sige_sigh, qhab_nl_nc, qhab_ac_nc, qhne_ac_nl, ufm, uft, qhbf, qhef (dimensionless).
- `ut` = linspace(0.01, 0.64, 64) m/s; the default threshold is index 14 (u*,th = 0.15 m/s).
- Per-variable 2nd/98th percentiles at index 14: `registry/qsat_field_metadata.json`.

## Formulas
- Constants and reductions copied into `pipeline/src/dune_atlas_pipeline/{constants,flux}.py`.
- Fields are time-averaged over the hourly record: sums of n·q over the speed and direction bins divided by
  the total hours (`flux.py`; DP/RDP/RDD via `qsat_view.py` and `scripts/drift/compute_drift.py`).

## Dune mask
- Canonical: GitHub `geomorphlab/dune-world/dune-mask-rev1.tif` = `layers.nc:dunes`
  = 106,540 cells (matches paper). One dune cell (14.7° N, 17.3° W, Cap-Vert) is ocean in ERA5-Land and has no wind data.
- Local `dune-mask-new.tif` and `dune-mask-new-rev1.tif` (identical) have 106,531 cells:
  missing 9 cells at ~39.1–39.3°N, 118.4–118.9°W (Carson Sink, NV). **Not used.**

## `layers.nc` (458 MB): dunes, land, aridity, dpm, qsdiv, aeosed, africamask, area, delat, rdpdp, dpmq (y, x).
The atlas uses `dunes`, `land` and `area`. Aridity is read from the native Global-AI v3.1 GeoTIFF instead
(`aridity.py`, `docs/validation-qsdiv.md` §2); flux divergence is computed by `qsdiv.py`.

