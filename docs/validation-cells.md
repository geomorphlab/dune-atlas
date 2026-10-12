# Cell store (`cells.zarr`) — conversion and validation

Status (2026-10-12): **full global conversion not yet run** — the external staging drive
(`/Volumes/MGL2TB/dune-atlas-staging`) was not accessible to the app. Everything below was
measured on a shard-aligned **regional store** (120,638 land cells, 5.5 % of land) written to
`staging/regional/cells.zarr`, plus a 24-block random timing sample. Full-run size and time are
**extrapolations (provisional)** until the full run is done.

## Run the full conversion

```bash
conda activate dune-atlas
STAGING=/Volumes/MGL2TB/dune-atlas-staging WORKERS=4 scripts/run_cells_full.sh
```

Writes `$STAGING/cells.zarr` + `cells.zarr.manifest.json`, logs to `$STAGING/logs/`, then runs
`cellstore stats` and `cellstore validate` (500 random land cells). Rerun the same command to resume.
Validation only: `CELLS_STORE=$STAGING/cells.zarr pytest pipeline/tests/test_cellstore_validation.py`.

## Writer design (`pipeline/src/dune_atlas_pipeline/cellstore.py`)

| concern | implementation |
|---|---|
| work unit | one 64×64 source chunk (block): each source chunk decompressed once; 913 of 1,653 blocks contain land |
| ocean | blocks/shards with no land (from `layers.nc:land`) are skipped **without reading source**; ocean cells inside land shards are absent from the shard index (verified) |
| land mask | `layers.nc:land` = finite-qsat mask (all 64 ut of `dpm`): 2,212,863 cells, identical |
| memory | peak RSS 1.54 GB per worker (one int64 chunk 512 MB + uint32 copy + fields) |
| parallelism | `--workers N` subprocesses fed over stdin/stdout pipes (no `multiprocessing` semaphores, which this sandbox lacks); workers write disjoint shards |
| resume | manifest beside the store, atomic rewrite (`tmp` + fsync + `os.replace`) after every block; a shard is recorded only after it is written; refuses to recreate arrays if the manifest lists finished shards |
| edge shards | 1801 = 112·16 + 9 → last shard row has 9 rows; zarr writes truncated chunk (tested on rows 1792–1800) |
| per-block checks | counts outside land mask, finite fields vs land, land-cell sum ≤ N_HOURS → manifest `anomalies` (none so far) |
| static arrays | `land`, `dunes` written whole at creation; `dunes` sums to 106,540 |
| macOS hygiene | manifest/logs outside the store; `COPYFILE_DISABLE=1`; `.metadata_never_index` at staging root; `apple_junk()` check in validation (fails if any `._*`/`.DS_Store`); optional `CLEAN_APPLE_METADATA=1` in the run script |

## Regional store

Regions (row/col indices, all 64-aligned): Sahara `576:768, 1664:2112` (32.4–13.3° N, 13.6° W–31.1° E);
Namib/Kalahari `1088:1216, 1856:2048` (incl. 2 ocean-only blocks); Taklamakan `448:576, 2560:2752`;
Antarctic edge `1792:1801, 3520:3600` (last row + last column shards).

| quantity | value |
|---|---|
| land cells / land shards written | 120,638 / 486 (+47 ocean-only shards correctly absent) |
| wall time (4 workers, internal SSD) | Sahara 82,899 cells 14 s; Namib 4 s; Taklamakan 6 s; edge 3 s; total 35 s incl. start-up |
| size | 1.32 GB: `hist` 779.7 MB (6.46 kB/cell), `fields` 543.1 MB (4.50 kB/cell); 1,127 objects |

Random sample (24 random land blocks, 55,374 cells, 4 workers): 12.5 s; `hist` 6.14 kB/cell,
`fields` 4.37 kB/cell (shard index included).

### Full-run estimate (provisional, extrapolated)

| quantity | estimate | basis |
|---|---|---|
| size | **≈ 23.3 GB** (`hist` 13.6 GB + `fields` 9.7 GB); 23–25 GB range | random-block bytes/cell × 2,212,863 land cells (regional, desert-biased rate gives 24.3 GB) |
| objects | **21,055** | 10,451 per sharded array (10,450 land shards + `zarr.json`), `land` 103, `dunes` 49, root 1 |
| wall time | **≈ 8 min** CPU-bound on internal SSD (913 blocks × 0.52 s/block effective with 4 workers = 24 blocks in 12.5 s wall); expect 10–20 min on the USB exFAT drive (≈ 23 GB to write) | random-block timing |

These replace the storage-layout estimate of 16.8 GB for `hist` (7.6 kB/cell); measured
sharded stores come out at ~6.1–6.5 kB/cell.

## Validation (regional store, 500 random land cells, seed 0)

`python -m dune_atlas_pipeline.cellstore validate --out staging/regional/cells.zarr` → all pass (110 s).

| check | result |
|---|---|
| histogram (uint32) == source int64, exact | **500 / 500** |
| 23×64 field vector == float32(source), exact incl. NaN | **500 / 500** |
| ocean cells (200 random, in written area) are fill (0 / NaN) | 200 / 200 |
| land shards present / ocean-only shards absent | 486 / 486; 0 / 47 |
| ocean inner chunks absent from every shard index | yes |
| `dunes` sum / `land` sum | 106,540 / 2,212,863 |
| `._*` / `.DS_Store` in store | 0 |

Recomputed DP / RDP / RDD with `flux.dp_rdp_rdd(stored hist, ut)` (time-averaged flat-bed flux) at
ut indices 0, 14, 30, 63 vs the `dpm` / `rdpm` / `rdpa` fields: cells with DP = 0 must match a field value
of 0, and the remaining cells must agree to float32 rounding (relative 1.2e-7 for DP and RDP, 1e-6 rad
for RDD; `test_cellstore_validation.py`). The store holds fields as **float32**; DP/RDP/RDD come from the
float32 drift store (`scripts/drift/compute_drift.py`), so both the float32 and float64 comparisons are
float32 rounding.

### Histogram sums
Hours with |U10| > 20 m/s are outside the bins, so a land cell sums to **≤** 657,455. Regional
sample: 490/500 cells exactly 657,455, max deficit 18 h; regional store: 3,164 short cells, max
deficit 1,308 h. Random blocks: 25,911 of 55,374 cells short, **max deficit 26,119 h (4 %)**.
Consumers must normalise by `hist.sum()` (as `flux.py` does), not by `N_HOURS`.

### Dune cell outside the land mask
One canonical dune cell, row 753 col 1627 (14.7° N, 17.3° W, Cap-Vert, Senegal), is ocean in
ERA5-Land: no histogram or fields. Recorded in store attrs `dune_cells_without_wind`.

## JS parity fixture

`staging/fixture/flux_parity.json` (24 cells of the Namib fixture: 1 decode-reference cell, 12 dune,
11 non-dune; ut indices 0, 5, 14, 30, 63): DP, RDP, RDD (rad + bearing) and the ut-14 flux-rose
petals, computed by
`cellstore.write_parity_fixture` from the **stored** histograms in `staging/fixture/cells.zarr`.

## Tests

`pipeline/tests/test_cellstore.py` (edge shard exactness + resume after a lost shard, ocean block
skipped without source read, static arrays, clobber guard, 2-worker == serial, batch flux ==
scalar flux, AppleDouble detection, atomic manifest) and `test_cellstore_validation.py` (the table
above, on `$CELLS_STORE` or the regional store).
