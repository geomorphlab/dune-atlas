# Validation: Mars wind fields, Mars Climate Database 6.1 climatology (`mcd-v61-clim`)

Third wind dataset of the Mars atlas next to FV3 beta 1 and MACDA v2.0 MY30 (EMARS v1.0 MY30 is built the same way), built with the same code on the native MCD grid (2026-10-21). Permission: the MCD team (E. Millour, LMD) agreed on 21 October 2026 to MCD-derived map layers, the cell panel and per-cell downloads including the wind series, provided the atlas cites Forget et al. (1999) and Millour et al. (2018), points to the MCD website and states the MCD version used. Code: `pipeline/gadi/mcd/` (Fortran driver and PBS scripts, run on NCI Gadi), `pipeline/src/dune_atlas_pipeline/mars/sources/mcd.py` (assembly into the contract source store), `mars/dataset_specs/mcd-v61-clim.json` (texts); `cells.py` (one check, §4), `sidecars.py`, `pyramids.py`, `native_grid.py` unchanged. Stores were built locally under `staging/mars-winds/`.

## 1. Source

* **MCD 6.1** full distribution on Gadi (project storage; installed and checked for earlier work: all ten vendor reference cases reproduce byte-identically). `call_mcd` 6.1.2 (`MCD.F90` version history), compiled with gfortran 12.2.0 at `-O0` (the object `MCD_silent.o`, i.e. without the per-call messages). Version 6.1 rather than the current 6.2: the PI's choice (21 October), because 6.1 was installed and verified; every text names 6.1.
* **Scenario 1**, "Climatology ave solar" (`data/clim_aveEUV`: `clim_MM_me.nc`, 12 periods of 30° Ls, each the mean diurnal cycle at 12 prime-meridian times 2, 4, …, 24 h, on 64 × 49 nodes (5.625° × 3.75°, poles included) and 53 hybrid levels). **Mean state**: `perturkey = 1` (no perturbations), so day-to-day variability is not in the series; the dataset's texts say that the fluxes are therefore lower bounds.
* **Licence**: MCD copyright notice (COPYRIGHT.html): no warranty, free scientific use with correct citation, no commercial use without specific authorisation. The atlas states this as the licence of the MCD-derived fields and series, and the no-warranty notice is written into every download (`data_notice`).

## 2. Grid, level and time (the extraction)

* **Grid.** The native nodes are used as cell centres: rows 86.25° … −86.25° (47; the two pole rows are dropped, as a node at a pole cannot be a cell centre), columns −180° … 174.375° (64). Cells span ±88.125°; the caps beyond are not represented (MACDA ±90°, EMARS ±87.43°). `hireskey = 0` (GCM-resolution fields): at a node the bilinear weights are 0/1, so the values are those of the native grid, with no MOLA high-resolution pressure reconstruction and no slope winds, as for the other datasets' native grids.
* **Level.** The lowest model level: hybrid coefficients aps₁ = 0.0045553 Pa, bps₁ = 0.99954456 (`clim_01_me.nc`), p₁ = aps₁ + bps₁ ps, about 4.5 m above the surface. `call_mcd` takes heights or pressures, not levels, and below level 1 it switches to its own surface-layer (Monin–Obukhov) profile with the model roughness z₀. The driver therefore asks for `zkey = 4` at p₁ (1 − 10⁻⁶): σ = p/ps falls just above level 1 and MCD interpolates between levels 1 and 2 with a weight of order 10⁻³ (measured effect ≤ 0.006 m/s, §3), never entering the surface-layer branch. Contract interfaces: bottom (0, 1), top (2 aps₁, 2 bps₁ − 1), so `physics.air_state` gives p = aps₁ + bps₁ ps and ρ = p/(R T), and `physics.layer_height` z = (R T/g) ln(ps/p), with the atlas constants R = 191.8 J kg⁻¹ K⁻¹ and g = 3.71 m s⁻², as for every Mars dataset.
* **Time.** Sample k = 0 … 8,022 at s = (k + 1)/12 sols after Ls 0 of the MCD year (MCD's `sol2ls`, 668.6-sol year; 8,023 = whole two-hour samples in one year, as MACDA); its prime-meridian true solar time 24 frac(s) h is one of the stored times of day. `datekey = 1`: Ls from `sol2ls`, and `localtime` = (UT + lon/15) mod 24 per point (`call_mcd` takes the true solar time at the requested longitude). Between month centres (Ls 15° + 30° m) MCD interpolates linearly in Ls, which shows as kinks in the seasonal curves (check figure, panel d).
* **Driver.** `pipeline/gadi/mcd/mcd_series.F90`: time outermost, then latitude and longitude; per point one call 10 m above the surface (GCM surface pressure, surface temperature, MCD's own Ls and UT) and one at p₁ (u, v, T, p, ρ, height). Points with `ier ≠ 0` would be written as NaN, never MCD's −999. `full.pbs`: 12 chunks, one process each (2.8 GB per process), skip-if-complete by size and `.meta`.
* **Run** (Gadi `normal`, job 181880536): 1 min 42 s wall, 18.5 CPU-minutes, 0.68 SU; 48,258,784 calls, **all `ier = 0`**.

## 3. Checks of the extraction

* **Driver against the files** (`test.pbs`, `mcd_tools.py check`): at the 12 month centres × 12 stored times (144 global samples), the driver's u, v, T and ps equal level 1 of `clim_MM_me.nc` at the same node and time within 0.0059 m/s (u), 0.0073 m/s (v), 0.012 K and 0.0004 Pa. This confirms in one test the month centres, that the files' `Time` is prime-meridian time, that the 47 × 64 requested points are native nodes, and the size of the level-2 weight.
* **Time axis**: MCD's returned Ls (extvar 9) equals `sol2ls(s)` within 6 × 10⁻⁵°, its UT (extvar 12) equals the requested time exactly.
* **Diurnal phase** (the constant-local-time trap): the surface-temperature maximum along the equatorial rows lies 16.8° ± 7.3° (1.7° … 29.6°) east of the noon meridian (12 − UT) × 15° at every sample, i.e. in the early afternoon, as thermal inertia requires; with a constant local time it would not move with UT at all.
* **Topography** (check figure, panel b): annual-mean ps is lowest over Olympus Mons and the Tharsis volcanoes and highest in Hellas and Argyre, at their positions.
* **Air state**: the atlas p equals MCD's own pressure within 1.3 × 10⁻⁶. The atlas ρ (constant R) differs from MCD's ρ (composition-dependent R, 177–217 J kg⁻¹ K⁻¹ at the 0.1/99.9 percentiles) by a median of 0.4 %; 22 % of samples differ by more than 1 %, 3.6 % by more than 5 %, up to 15 % at the polar rows in winter (non-condensable enrichment). The atlas keeps the constant R of the other datasets so that the datasets differ by their winds and temperatures, not by the method. z differs from MCD's height by a median of 0.7 % for the same reason.

Check figure: surface temperature at Ls 90° with the noon meridian, annual-mean surface pressure, the diurnal cycle of wind speed at the three regions of §7, and the daily mean and diurnal range through the year.

## 4. Build and `cells validate`

`DUNE_ATLAS_MARS_DATASET=mcd-v61-clim python -m dune_atlas_pipeline.mars.cells build` (8 processes, laptop): 12 shards (47 × 64 = 3,008 cells), pool 54 s, total 60 s (0.115 s per cell-core). Series keepbits: u 12, v 11, T 13, ρ 10, z 11; realised maximum rounding errors 0.0039 m/s, 0.0039 m/s, 0.0156 K, 0.0488 % ρ, 0.00098 m. **Validity Ga√s > 81: 0 violating (sample, d) pairs** (minimum Ga√s = 146.8).

**Undefined fields: 224,796 of 4,427,776 (5.1 %; MACDA 0.26 %)**, all where no sample exceeds the threshold at that grain size (DP = 0, the Earth convention): 1,607 cells at 50 µm, 563 at 100 µm, 221 at 200 µm, 672 at 400 µm, 2,170 at 1000 µm. At 200 µm 105 of the 1,142 dune cells (5.2 % of their weighted area) have no transport at all. That is the expected consequence of mean-state winds (no gusts, no day-to-day variability). `cells validate` asserted that fewer than 5 % of a cell's fields are undefined, which failed at cell (12, 52); the check now counts only the grain sizes with DP > 0 and also asserts that DP itself is never undefined (`cells.py`, the only shared-module change; FV3 and MACDA pass it unchanged). It then passed: 6 random cells, fields recomputed from the stored series at 2 cells, median relative difference 7.9e-07 and 5.5e-07.

`python -m dune_atlas_pipeline.mars.sidecars all`: 23 field pyramids + qsdiv + rho_mean (one level, 47 × 64), cells-aux.zarr (qsdiv, rho_mean, elev_mean from `native_grid.py elev-mean` on level 2 (1/16°) of the published elevation pyramid), `registry/mars/datasets/mcd-v61-clim/` fragments. qsdiv colour limits ±0.012 m/kyr (MACDA ±0.093), rho_mean 0.0098–0.028 kg m⁻³. Dune fraction on this grid: `native_grid.py dunefrac`, 1,142 cells with dunes, maximum 0.879.

## 5. Physical sanity (all 3,008 cells × 8,023 samples, unrounded)

| quantity | min | p1 | median | p99 | max |
|---|---|---|---|---|---|
| T (K) | 140.3 | 142.3 | 192.1 | 262.6 | 277.6 |
| ps (Pa) | 130.6 | 325.1 | 583.9 | 996.9 | 1394.1 |
| ρ (kg m⁻³) | 0.00347 | 0.00826 | 0.01644 | 0.03291 | 0.04554 |
| z (m) | 3.188 | 3.265 | 4.447 | 6.066 | 6.413 |
| \|U\| (m/s) | 0.0 | 0.464 | 4.374 | 18.57 | 49.21 |

u −30.2 … 48.7 m/s, v −24.5 … 30.9 m/s. Wind speeds are lower than MACDA's (median 5.72, p99 35.7 m/s) because they are monthly means of each time of day. Area-weighted annual-mean ρ 0.0167 kg m⁻³ (MACDA 0.0158, FV3 0.0164).

## 6. Stores (local)

| store | objects | bytes |
|---|---|---|
| source/mcd-v61-clim.zarr (contract source, staging only) | 25 | 337,123,692 |
| …/mcd-v61-clim/cells.zarr (series (47, 64, 5, 8023), fields (47, 64, 23, 64), dunes, dune, ls, sol) | 35 | 260,429,255 (series 247,752,406, fields 12,604,435) |
| …/mcd-v61-clim/cells-aux.zarr | 18 | 826,945 |
| …/mcd-v61-clim/fields/ (25 pyramids) | 273 | 9,496,244 |

Prefix `dune-atlas/mars/v2/datasets/mcd-v61-clim`.

## 7. Comparison with MACDA and FV3 at three dune regions (d = 200 µm)

Same regions and conventions as validation-mars-macda.md §7 (MACDA and FV3 values from there): the MCD cell containing the representative point; mean |U| and z annual means of the lowest-level series; DP and RDP in m²/yr (packed sand, 1 yr = 365.25 d); RDD the bearing the resultant drift points to.

| region | MCD cell (dune fraction) | mean \|U\| (m/s) MCD / MACDA / FV3 | mean z (m) | DP | RDP | RDD (°) |
|---|---|---|---|---|---|---|
| Olympia Undae (81N, 179W) | 82.5, −180 (0.699) | 2.18 / 5.15 / 3.48 | 3.92 / 4.33 / 1.91 | 0.14 / 7.24 / 1.77 | 0.14 / 3.83 / 0.53 | 64 / 251 / 236 |
| Nili Patera (9N, 67E) | 7.5, 67.5 (0.023) | 5.60 / 6.33 / 5.04 | 5.00 / 5.44 / 2.43 | 2.46 / 3.82 / 2.44 | 0.90 / 1.52 / 1.35 | 325 / 281 / 304 |
| Bagnold dunes, Gale (4.7S, 137.4E) | −3.75, 135 (0.007) | 6.41 / 6.32 / 6.95 | 5.00 / 5.49 / 2.42 | 3.82 / 2.76 / 11.27 | 2.89 / 0.52 / 7.36 | 21 / 36 / 6 |

Over all dune cells (dune-fraction × cos φ weighted): DP 2.19 m²/yr (MACDA 18.2, FV3 4.5); ratio of weighted means RDP/DP 0.89 (MACDA 0.49, FV3 0.65). The mean state removes the variability that drives most transport where the mean wind is near or below the threshold, and what remains is more unidirectional. The largest difference is at Olympia Undae: the MCD mean wind there is weak for most of the year (daily means about 1–2 m/s except around Ls 150–200°), so DP is 0.14 m²/yr and the resultant points to the northeast instead of the southwest. Nili Patera and Gale agree with the other datasets within their spread: northwest at Nili (325° against 281° and 304°) and north-northeast at Gale (21° against 36° and 6°).

## 8. Tests

`pipeline/tests/test_mars_source_mcd.py` (no MCD install): lowest-level interfaces (p, ρ, z against the closed forms), MCD `sol2ls` (perihelion at sol 485.35 = Ls 250.99°, monotonic year), time axis, chunk layout (Fortran (64, 47) per field = C (47, 64), row 0 = 86.25°N), grid = native nodes without the poles, and the noon check on a synthetic lobe. `pytest pipeline/tests/test_mars_*.py`: 67 passed, 5 skipped.

## 9. Notes

* Mean state only: no `perturkey` variability was added. The MCD offers day-to-day RMS (`perturkey = 5`) and random large-scale perturbations, but the manual sanctions those for envelopes, not for building realistic series; the atlas says plainly that the MCD fluxes are lower bounds.
* The MCD year is the climatology scenario (climatological dust, average solar EUV), not a particular Mars year; `sol` counts sols from Ls 0 of that year.
* Wind height: the MCD team had no recommendation (21 October); the atlas uses the lowest model level, as for FV3, EMARS and MACDA, with u* from the Pähtz & Durán (2023) smooth-wall profile at each sample's own z.
