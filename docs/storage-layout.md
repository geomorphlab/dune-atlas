# Web storage layout (Phase 1 benchmarks)

Measured on real source chunks (3 most dune-dense + 7 random land 64×64 chunks; 2,471 cells
for histograms). Land cells: 2,212,852 (34.13 % of 1801×3600).

## 1. Cell store — `cells.zarr` (zarr v3) — one click = one small fetch per array
| array | shape | inner chunk | shard | dtype | codec |
|---|---|---|---|---|---|
| `hist` | (1801, 3600, 128 speed, 128 dir) | (1,1,128,128) | (16,16,128,128) | uint32 | blosc zstd-5 bitshuffle |
| `fields` | (1801, 3600, 23 var, 64 ut) | (1,1,23,64) | (16,16,23,64) | float32 | blosc zstd-5 bitshuffle |

- Ocean/no-data cells are never written (fill value 0 / NaN) → 10,450 shard objects per array.
- Shard index 4 kB (16×16×16 B + crc32c) at the shard **end**: zarrita 0.5.x only reads the index
  via a suffix range (`Range: bytes=-N`), so the host must support suffix ranges (verify on R2).

Histogram codec comparison (per land cell, uint32 128×128 = 64 kB raw):

| codec | mean | p95 | projected total |
|---|---|---|---|
| zstd-3 | 9.6 kB | 14.0 kB | 21.2 GB |
| zstd-19 | 8.0 kB | 11.8 kB | 17.8 GB |
| **blosc zstd-5 bitshuffle** | **7.6 kB** | **10.7 kB** | **16.8 GB** |
| gzip-6 | 9.6 kB | 13.8 kB | 21.3 GB |

`fields` vector: 4.8 kB/cell → 10.6 GB. Kept float32 because float16 under/overflows several
fields (see below). **Per click ≈ 12 kB** (+4 kB index per new shard).

## 2. Map fields — `fields.zarr` (GeoZarr multiscales via topozarr, EPSG:4326)
- 23 variables, one store per variable (`fields/<var>.zarr`), dims (ut=64, y, x). topozarr default
  layout: inner chunks (1 ut, ~512², ≈0.5 MB raw) inside shards spanning ut, so a slider step
  is one small range read. Angles coarsened with `nearest`, others `mean`.
- dtype **float32 in display units**, blosc zstd-5 shuffle with values rounded to 12 mantissa bits
  (Phase 2; `--keepbits 23 --codec zstd` restores lossless) (fluxes m²/yr; angles rad; ratios clipped to ±6×10⁴ where
  denominators → 0). float16 was benchmarked (≤0.056° angle error, 0.045 % p99 relative flux
  error) but topozarr's coarsening kernel does not accept float16 and browser float16 decoding
  needs `Float16Array`, so float32 is used.
- Projected size ≤ 24 GB incl. pyramid (land-only-region upper bound); with ~66 % ocean (NaN)
  expect ≈ 10 GB.

## 3. Totals and cost (updated after Phase 2 measurements)
| store | size | basis |
|---|---|---|
| `cells.zarr` | ≈ 23.3 GB (hist 13.6 + fields 9.7), 21,055 objects | measured bytes/cell on 24 random land blocks × 2,212,863 land cells (docs/validation-cells.md) |
| `fields/<var>.zarr` × 23 | ≈ 6.3 GB | 5 of 23 built globally; blosc-shuffle + 12-bit mantissa rounding (≤1.2e-4 rel, ≤0.03°) (docs/validation-fields.md) |
| `dunes/*.pmtiles` | 6.5 MB | built (docs/validation-dunes.md) |
| **total** | **≈ 30 GB** | ≈ US$0.30/month after the 10 GB free tier; egress free |

Click cost measured on the fixture: first click in a shard 5 range reads ≈ 20 kB; later clicks in the
same shard 2 reads ≈ 11 kB (`npm run check-cell-query`).

## 4. Browser decoding
zarrita (+ numcodecs.js) decodes blosc and sharding_indexed; confirm in the fixture step.

## 5. Stores added 2026-10-13 (new keys under `v1/`; nothing existing rewritten)
| store | layout | objects | size |
|---|---|---|---|
| `fields/aridity.zarr` | GeoZarr multiscales at the source's **native 30″** grid (43200 × 18000, 180° W–180° E, 90° N–60° S), independent of any wind grid; arrays **2-D (y, x)**, float32, no `ut` dim; 9 levels, factors 1, 2, 4, 8, 16, 30, 60, 120, 240 (exact edges at every level); inner chunk 512², shard 4096², blosc zstd-5 shuffle, 12-bit mantissa; `nativepyramid.py` | 154 | 365.0 MB |
| `fields/qsdiv.zarr` | as the 23 qsat field stores (topozarr layout, (ut=64, y, x), 5 levels, inner 1×361×360 in 1×1444×1440 shards); float32 **m/yr** | 576 | 326.2 MB |
| `cells-aux.zarr` | sidecar to `cells.zarr`, same grid/attrs `grid`; `qsdiv` (lat, lon, ut=64) shard 16×16×64, inner 1×1×64, index at end (= `cells.zarr/fields`); scalars `ai_mean`, `ai_valid_frac`, `ai_sat_frac` (lat, lon) plain 64×64 chunks (= `land`/`dunes` style); land cells only, ocean chunks/shards absent; one array per variable, extensible (`cellsaux.write_variable` refuses to overwrite) | 12,320 | 583.7 MB |

Root attrs of `fields/aridity.zarr` follow the topozarr stores (`multiscales.layout[*].spatial:transform` /
`spatial:shape`, `spatial:bbox`, `proj:*`, `zarr-layer` hints), so `storeGeo` and the per-level-bounds patch work
unchanged; level selection in zarr-layer uses level widths only, so non-power-of-two factors are fine. A click on
the aridity layer can read `cells-aux.zarr/ai_mean` (0.1° cell mean) rather than the 30″ pixel.
Upload: `dune-atlas upload-new` (create-only `If-None-Match: *` puts after a live listing; aborts on any collision).

## 6. Second wind dataset: ERA5 0.25° (added 2026-10-13; new keys only)

Prefix convention: the ERA5-Land stores stay at `dune-atlas/v1/` (registry dataset `era5-land`, `prefix:
dune-atlas/v1`); every further wind dataset gets its own prefix **`dune-atlas/v1/datasets/<id>/`** with the same
relative layout, so registry sources written as `{dataset}/...` resolve for either dataset. ERA5 is at
`dune-atlas/v1/datasets/era5/` (registry entry `registry/datasets/era5/dataset.yaml`). Dataset-independent stores
(`dunes/*.pmtiles`, `fields/aridity.zarr`, `fields/vegetation.zarr`) are not duplicated.

Grid 721 × 1440 (`grid` attrs `{lat0: 90, dlat: -0.25, lon0: -180, dlon: 0.25, ny: 721, nx: 1440,
cell_registration: centre}`; edges ± 0.125°). Land cells: ERA5 land–sea mask lsm > 0.5 (351,848 cells, 33.9 %).

| store (under `dune-atlas/v1/datasets/era5/`) | layout | objects | size |
|---|---|---|---|
| `cells.zarr` | as §1: `hist` (721, 1440, 128, 128) uint32 and `fields` (721, 1440, 23, 64) float32, shard 16 × 16 cells, inner chunk 1 cell, index at end, blosc zstd-5 bitshuffle; `land`, `dunes` (uint8, 256² chunks). 1,960 land shards per array (721 = 45 × 16 + 1: the last shard row is 1 cell high) | 3,957 | 3.706 GB (hist 2.172, fields 1.534) |
| `fields/<var>.zarr` × 23 | as §2 (topozarr layout, (ut = 64, y, x) float32 display units, 12-bit mantissa, blosc zstd-5 shuffle); **4 levels** 1440 / 720 / 360 / 180 px (coarsest ≤ 256 px), per-level `spatial:transform` exact ([0.25·2ˡ, 0, −180.125, 0, −0.25·2ˡ, 90.125]); cells other than land cells have no data | 23 × 80 | 1.204 GB |
| `fields/qsdiv.zarr` | as the field stores, m/yr | 80 | 58.3 MB |
| `cells-aux.zarr` | as §5: `qsdiv` (lat, lon, ut) sharded; scalars `ai_mean`, `ai_valid_frac`, `ai_sat_frac`, **`lsm`** (64² chunks) | 2,462 | 94.8 MB |
| `cells-aux-veg.zarr` | as the ERA5-Land sidecar; scalars **`tot_cov_mean`** (area-weighted regrid of the 0.1° product) and **`tot_cov_valid_frac`** | 324 | 0.84 MB |
| **total** | | **8,663** | **5.064 GB** |

Root attrs of every ERA5 store carry the dataset (`dataset` block in `cells.zarr`; `dataset_*` keys in the field
stores; `dataset`, `dataset_name`, `dataset_resolution`, `land_cells_definition` in the sidecars), the ERA5
citation and the Copernicus notice. `cells.zarr` `n_hours` = 657,456 (ERA5-Land 657,455).
Upload: `scripts/upload_era5_parts.py` (cells.zarr, streamed from Gadi in tar parts) and `dune-atlas upload-new
--prefix dune-atlas/v1/datasets/era5` (the rest); create-only puts after a live listing of all of `dune-atlas/`
(48,903 objects before, 57,566 after, nothing outside the new prefix changed). Checks: `docs/validation-era5.md` §5.
