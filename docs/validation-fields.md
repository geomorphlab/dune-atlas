# Map-field pyramids (GeoZarr) and COG fallback: validation & benchmarks

Code: `pipeline/src/dune_atlas_pipeline/{fields,cogs}.py`; tests `pipeline/tests/test_fields.py`;
registry fragment `registry/generated/qsat_fields.yaml`; full build `scripts/run_fields_full.sh`.
Measured 2026-10-12 on the author's Mac (12 cores, 24 GB RAM, internal SSD), topozarr 0.1.11,
zarr-python 3.4.1, GDAL 3.13.3, zarrita 0.5.4 / geotiff.js (node 26).

**Scope of measurements (provisional where noted):** global pyramids were built for 5 of the 23
variables (dpm, at, qhef, qncb, uft — one per kind: flux, angle, ratio, signed flux, wind
fraction) on the internal disk (`staging/global-test/`, 1.4 GB). The full 23-variable set was
**not** built: the external staging drive `/Volumes/MGL2TB/dune-atlas-staging` was not accessible
from the sandbox. 23-variable totals below are extrapolations from those 5.

## 1. Store layout (`fields/<var>.zarr`, one store per variable)

| | value |
|---|---|
| conventions | GeoZarr `multiscales` v0.1 + `proj` (EPSG:4326) + `spatial` (pixel registration) — written by topozarr |
| dims | `(ut=64, y, x)`; `ut` coordinate = u\*,th in m/s; `ut_default_index` = 14 in root attrs |
| levels | 5 (`0`–`4`), widths 3600 / 1800 / 900 / 450 / 225 px (coarsest ≤ 256 px rule, `choose_levels`) |
| level 0 | shape (64, 1801, 3600), inner chunk (1, 361, 360), shard (1, 1444, 1440) → 2×3 shards per threshold |
| levels 1–4 | inner chunks (1, 300, 360), (1, 225, 300), (1, 225, 225), (1, 112, 225); shards span 1, 5, 20, 64 thresholds |
| dtype / fill | float32 display units; NaN = ocean / undefined (all-NaN chunks are not written) |
| codec | sharding_indexed (index at end, crc32c) → bytes → **blosc zstd-5 byte-shuffle** (same codec family as cells.zarr) |
| precision | float32 mantissa rounded to **12 bits** before encoding (relative error ≤ 2⁻¹³ ≈ 1.2×10⁻⁴; angles ≤ 0.03°). Exact values for clicked cells come from `cells.zarr`. `--keepbits 23 --codec zstd` restores lossless topozarr defaults. |
| array attrs | `long_name` (plain Unicode), `long_name_tex`, `description` (plain) / `description_tex`, `units` (display), `source_units_tex`, `colormap`, `clim` (stored units: rad for angles), `cyclic`, `display_transform`, `log_scale`, `resampling`, `angle_convention`, `clipped_to` / `display_scale_from_source` |
| root attrs | `zarr-layer: {<var>: {clim, colormap}}` hint, `title`, `source` (citation), `license`, `dune_atlas:resampling` |

Units: fluxes m²/s × 31 557 600 → **m²/yr**; angles stay radians (math convention, toward, CCW
from east; `ab` axial 0..π); ratios clipped to ±6×10⁴. The registry converts angles for display
(`rad-to-bearing`, `rad-to-axis`), so registry `clim` is in degrees while the store's `clim`
attribute is in radians.

topozarr quirk found and worked around: the multiscales `transform.scale/translation` vectors are
written in *Dataset* dim order, not array dim order. Building the Dataset via
`to_dataset()` after `assign_coords(ut=…)` ordered dims (y, x, ut) and produced
`scale: [2, 2, 1]` for (ut, y, x) arrays. `build_field_pyramid` now builds the Dataset with `ut`
first and asserts the order; the test checks `scale == [1, 2, 2]`.

## 2. Coastal NaN behaviour under coarsening

topozarr's kernel is skip-NaN (`mean` of a window = mean of its finite cells; all-NaN windows stay
NaN), so there is no NaN poisoning and no value is fabricated over all-ocean windows. Two
problems remain, both at coasts and other land/no-data edges, and the pipeline fixes both by
**recomputing levels ≥ 1 from native cells** after topozarr writes the store:

**(a) `mean` is chained level→level (mean of means).** A coastal cell that is alone in its 2×2
block carries the same weight as a full-land block at the next level. Measured on DP, ut index
14, against a count-weighted mean of the native cells:

| level (factor) | windows with land | partial-land windows | rel. error p50 | p99 | max |
|---|---|---|---|---|---|
| 1 (2×) | 559 544 | 21 124 | 0 | 0 | 0 |
| 2 (4×) | 144 778 | 13 839 | 1.1 % | 54 % | 200 % |
| 3 (8×) | 38 158 | 6 883 | 4.8 % | 153 % | 498 % |
| 4 (16×) | 10 225 | 3 086 | 11.5 % | 301 % | 1 092 % |

(windows with DP > 0; full-land windows agree to 1.6×10⁻¹⁶.) → magnitudes and ratios use a
**count-weighted nan-mean** over all finite native cells in the window (`coarsen_mean_weighted`,
running sum + count). Cells are not area-weighted (a 16× window spans ≤ 1.6° of latitude).

**(b) `nearest` takes the window's top-left cell.** Where that cell is ocean, the coarse pixel
becomes NaN even though the window contains land. For αT (ut 14) the fraction of land-bearing
windows erased: 2.0 % (2×), 5.2 % (4×), 10.2 % (8×), **17.9 % (16×: 10 225 → 8 394 px)** — coasts,
islands and narrow land disappear when zoomed out. → angles (ab, ae, at, ao, rdpa) use
**nearest-finite** (`coarsen_nearest_finite`): the first finite native cell of the window in
row-major order, chained. The result is always an actual native angle (no averaging across the
±π wrap).

**Result.** Both rules give the same footprint: a coarse pixel is finite iff its window contains
at least one finite native cell (dpm level 1–4 finite pixels = 563 055 / 145 228 / 38 187 / 10 225,
exactly the any-land window counts; at = 562 992 / 145 227 / 38 187 / 10 225, the small deficit
being land cells where αT itself is undefined). Coastal land is never erased; all-ocean windows
stay NaN; a coarse coastal pixel shows its land cells' mean (or one land cell's angle) painted over
the whole window, so coastlines look slightly dilated at low zoom — inherent to any coarsening.
Edge trimming follows topozarr/xarray `boundary="trim"`: row 1800 (−90°) is dropped from level 1
on, and level 4 (112 rows) ends at −89.15°; no columns are trimmed (3600 = 225 × 16).
Unit tests cover all of this on synthetic arrays plus an end-to-end Namib-coast build.

## 3. Size, time, memory (global, one process per variable)

| var | kind | total s | read s | topozarr write s | recompute + rewrite s | store size | peak RSS |
|---|---|---|---|---|---|---|---|
| dpm | flux | 17.8 | 4.0 | 2.8 | 11.0 | 277 MB | 4.55 GB |
| at | angle | 15.1 | 2.1 | 3.3 | 9.7 | 283 MB | 4.68 GB |
| qhef | ratio | 14.3 | 2.3 | 2.7 | 9.4 | 240 MB | 5.9 GB* |
| qncb | signed flux | 16.7 | 3.3 | 2.8 | 10.6 | 323 MB | 6.6 GB* |
| uft | fraction | 16.7 | 3.1 | 2.8 | 10.7 | 248 MB | 6.6 GB* |

\*high-water mark of one process that built qhef → qncb → uft in sequence; single-variable runs
peak at ~4.6 GB (one 1.66 GB float32 cube + coarse levels + float64 accumulators).
`run_fields_full.sh` therefore runs one process per variable.

Codec / precision comparison, DP at one threshold (ut 14), all levels:

| encoding | level 0 | L1 | L2 | L3 | L4 | whole store (64 ut) |
|---|---|---|---|---|---|---|
| topozarr default: zstd-0, lossless | 7.97 MB | 2.06 | 0.54 | 0.14 | 0.04 | 582 MB (dpm), 662 MB (at) |
| zstd-0 + 12-bit mantissa | 5.24 | | | | | |
| blosc zstd-5 shuffle, lossless | 6.57 | | | | | |
| **blosc zstd-5 shuffle + 12-bit (adopted)** | **3.54** | 1.03 | 0.28 | 0.09 | 0.02 | **277 MB (dpm), 283 MB (at)** |

A full-land Sahara chunk (361×360, 520 kB raw) drops from 382 kB to 187 kB per threshold.

**Extrapolation to 23 variables (provisional, from the 5 above):** mean 274 MB/var → **≈ 6.3 GB**
on R2 (≈ 14 GB with the lossless topozarr default); **≈ 6–7 min** sequential build; ≥ 12 GB free
disk recommended. This replaces the ≈ 10 GB (≤ 24 GB) estimate in `docs/storage-layout.md`.

Browser-stack check (node, zarrita 0.5.4 + numcodecs.js blosc, range reads on disk): values at
levels 0/2/4 for dpm and at match zarr-python exactly; a level-0 chunk read costs 2 requests on a
new threshold (shard index 260 B + chunk), 1 when the index is cached; decode 1.2–3.3 ms warm.

## 4. COG fallback prototype (DP, 5 preset thresholds)

`python -m dune_atlas_pipeline.cogs --out DIR` → `dp_ut{05,14,20,30,40}_{3857,4326}.tif`
(u\*,th = 0.06, 0.15, 0.21, 0.31, 0.41 m/s). Values m²/yr float32, NaN nodata, lossless,
AVERAGE overviews (GDAL skips nodata → same count-weighted mean as the zarr pyramid).

| flavour | layout | per-threshold size | 5 presets | build / file |
|---|---|---|---|---|
| EPSG:3857 | GoogleMapsCompatible, z4 = 4096² px, 256-px blocks, DEFLATE + predictor 3, overviews 2–16× | 10.7–12.7 MB | 60.4 MB | 0.25 s (+0.7 s read) |
| EPSG:4326 | native 3600×1801 grid, 512-px blocks, ZSTD + predictor 3, overviews 2–8× | 7.3–8.9 MB | 42.0 MB | 0.12 s |

The 3857 warp uses nearest resampling at z4 (0.088° px < 0.1° cell everywhere), so no source
cell is dropped. All 64 thresholds as 3857 COGs would be ≈ 0.77 GB per variable (lossless).

**Bytes per map view** (1024×768 view, DP ut 14; level chosen = coarsest with pixel ≤ screen
pixel; sums of compressed chunk/block sizes read from the shard index / TIFF tags):

| view | GeoZarr (adopted encoding) | COG 3857 (256 px) | COG 4326 (512 px) |
|---|---|---|---|
| global z1 | L1: 15 chunks, 1 026 kB | L2: 16 blocks, 1 334 kB | L1: 8 blocks, 1 792 kB |
| Sahara z3 | L0: 6 chunks, 708 kB | L0: 20 blocks, 1 443 kB | L0: 6 blocks, 2 125 kB |
| Taklamakan z4 | L0: 2 chunks, 415 kB | L0: 6 blocks, 732 kB | L0: 4 blocks, 1 853 kB |
| Namib z5 | L0: 2 chunks, 236 kB | L0: 4 blocks, 289 kB | L0: 2 blocks, 163 kB |
| Namib z7 | L0: 1 chunk, 50 kB | L0: 1 block, 29 kB | L0: 1 block, 72 kB |

(GeoZarr adds a 0.26–0.39 kB shard index per shard per threshold; COGs add a one-off header
read per file. The zarr store is 12-bit-rounded and the COGs are lossless, so this compares the
deliverable encodings, not codecs: lossless zarr was 1 455 kB for the Sahara view.) Decode in
node: geotiff.js 256-px tile 3.3–4.5 ms warm (11.8 ms cold), 512-px block 8–9 ms; zarrita
361×360 chunk 1.2–3.3 ms warm. **Browser render timing (GPU upload, colour-mapping, frame time)
could not be measured in the sandbox (no browser / no local HTTP server)** — the app track
should time both paths in a real browser against R2.

**How MapLibre would consume the COGs.** `@geomatico/maplibre-cog-protocol` (already in
`app/package.json`): `maplibregl.addProtocol('cog', cogProtocol)`, then a `raster` source with
`url: 'cog://https://data.geomorphlab.org/dune-atlas/v1/cogs/dp_ut14_3857.tif#color:<ramp>,<min>,<max>'`,
`tileSize: 256`. It reads only EPSG:3857 COGs (no reprojection), decodes and colours on the CPU
to 8-bit RGBA, renders NaN/nodata transparent, and offers `locationValues()` for hover values.
Consequences: changing colormap/clim or log scale (log needs a custom `colorFunction`) re-renders
tiles on the CPU, and changing threshold means swapping the source URL to another of the 5 files.
The 4326 COGs would need a GPU-reprojecting custom layer (e.g. maplibre-warp or deck.gl) instead.

**Assessment.** At equal view sizes the GeoZarr pyramid moves the same or fewer bytes than
the 3857 COGs, keeps all 64 thresholds behind one slider (one ~0.2–1 MB fetch per step),
colours on the GPU with float data (zarr-layer), and needs no Web-Mercator resampling of the
0.1° grid. The COG path is a cheap, working fallback for DP at preset thresholds (60 MB, < 2 s
to build all five) if zarr-layer fails on performance or projection in real browsers.
