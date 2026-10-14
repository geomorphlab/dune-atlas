# Validation: Mars wind fields (FV3 beta 1, cells.zarr, pyramids, sidecars)

Wind track of the Mars build (docs/mars-spec.md). **Current build v2** (2026-10-14): v1 with fluxes of packed sand, q = Q/(ρ_p φ), φ = 0.6 (§11). **v1** (2026-10-14): u* from the smooth-wall mixing-length profile of Pähtz & Durán (2023) eq. 2.2 under constant stress at each hour's lowest-level height z (spec §2, physics change 5b92eff); series (u, v, T, ρ, z). The first build **v0** used a neutral log law with z₀ = 1 mm at a fixed 2 m and a 4-variable series; it is kept on Gadi as `cells.zarr.v0` until integration and compared in §6. **Default grain size 200 µm** (PI, 2026-10-14; commit 7dad373): node 29 of the d axis moved from 199 to exactly 200 µm; that one node of every d-dependent product was recomputed (§3a) and the store before the change is kept as `cells.zarr.v1-199`. Code: `pipeline/src/dune_atlas_pipeline/mars/` (`fields.py` engine, `cells.py` store builder and validation, `stats.py`, `fixture.py`, `pyramids.py`, `sidecars.py`), `pipeline/gadi/mars/cells_job.sh`, `scripts/mars/data/`. Gadi code snapshot of the v1 store: `wind-39b1329`.

## 1. Method

* **Per hour and cell** (spec §2): u, v = `ucomp_bot`, `vcomp_bot`; T = `temp_bot`; ρ_f = p/(R T) with p the lowest-layer mid pressure (`physics.air_state`, interfaces ak/bk −1 bottom, −2 top); z = (R T/g) ln(p_lo/p) (`physics.layer_height`); ν = μ(T)/ρ_f; u* solves |U| = u* u⁺(z u*/ν) on the tabulated eq. 2.2 profile (`physics.friction_velocity`); ua = atan2(v, u).
* **Law** (spec §3): u*,th(d, ρ_f, T) (`physics.threshold`, eq. 5.1 with the Knudsen-corrected D*) and q(u*) (`physics.transport_rate`, eq. 3.2), per hour, 64 grain sizes d = 50…1000 µm.
* **Fields** (`mars/fields.py`): sample-weighted generalisation of `qsat_compute.qsat_fields` — every histogram reduction Σ n x / Σ n becomes Σ wᵢ xᵢ / Σ wᵢ over hours (wᵢ = 1); the flux law is injected per hour and d as q = a x + b x², x = u² − u*,th² (eq. 3.2 is exactly quadratic in the excess Shields number; a, b are read off `physics.transport_rate` at Θ − Θ_t = 1, 2 and checked at a third point to 1e-11 on every call). Crest modes α_E/α_H with the Earth periodic-spline mode finders on the same 129 orientations, u_c = u*(1 + βA|sin(ua − α)|) with the same hour's threshold; DP/RDP/RDD/RDP-DP of q(u*); uft/ufm from u*/u*,th per hour; qhbf/qhef with the `qsat_view` rules; derived ratios as Earth. Fields come from the unrounded float32 GCM values; fluxes m²/s in cells.zarr, m²/yr (365.25 d) in the pyramids.
* numba loops (Gadi) and a vectorised numpy reference agree to ≤ 1e-11.

## 2. Equivalence with the Earth histogram code

Earth histogram bins as samples (speed-bin centres u*_f, direction centres, weights = counts) with the Earth law (a = u*,th FLUXK, b = 0; mode kernel (u_c² − u*,th²)u*,th) against `qsat_compute.qsat_fields` (`test_mars_fields.py`):

| input | cells | max |Δ| / max|ref| over 23 × 64 values | NaN pattern |
|---|---|---|---|
| synthetic histograms (incl. one empty cell) | 5 | 8.6e-12 (numpy and numba) | identical |
| ERA5-Land fixture cells (`dune-atlas/staging/fixture/cells.zarr`, read-only; 657,455 h each) | 8 | 4.2e-12 (numpy and numba) | identical |

Test tolerance 1e-10. Excluded from the mode comparison: a single-bin histogram whose splines vanish on whole intervals (α_E is then an arbitrary tie-break in both codes); its crest fluxes at given modes agree. The engine is unchanged by the u* change (only the u* input differs). Other tests: the injected law equals `physics.transport_rate`; DP, RDP, uft, ufm equal first-principles means of `physics.flux`; the u* used satisfies |U| = u* u⁺(z u*/ν) to 1e-9; weights equal repeated samples.

**Timing, one real-size cell** (16,032 h × 64 d): 0.24 s on the laptop (numba, incl. 0.045 s for the eq. 2.2 u* bisection); Gadi 0.9596 s per cell-core with 48 workers on one node (v0: 0.7316).

## 3. Gadi jobs

| job | PBS id | resources | walltime | SU | result |
|---|---|---|---|---|---|
| v0 pilot: 3 shards (768 cells) + keepbits benchmark | 181179492 | normal, 8 cpu, 32 GB (used 21.8 GB) | 5 min 05 s | 1.36 | 112 s per 256-cell shard |
| v0 full: 72 shards, export, statistics, fixture | 181180240 | normal, 48 cpu, 190 GB (used 32.5 GB) | 9 min 50 s | 15.73 | superseded |
| **v1 full**: 72 shards into cells.zarr.new, validate, statistics, fixture, swap | 181184011 | normal, 48 cpu, 190 GB (used 32.5 GB) | 11 min 36 s | 18.56 | read 149.9 s, pool 389.9 s, stats 90.6 s; validated, swapped |
| **d node 29 → 200 µm**: copy, recompute node 29 from the GCM file, validate, export, statistics, fixture, swap | 181212881 | normal, 16 cpu, 64 GB | 8 min 38 s | 4.6 | §3a |
| **total** | | | | **40.25** | |

Staging, harvests and mirror copies ran as login-node wrapper commands (no SU). The v1 job validated the new store (`cells.validate`: layout/attrs, 72 + 72 shard objects, finite series in range at 6 random cells, fields recomputed from the stored series at 2 cells: median relative difference 8.3e-07) before moving the v0 store to `cells.zarr.v0` and the new one into place.

### 3a. Default node 199 → 200 µm

Only node 29 of the d axis changed (constants 7dad373; the other 63 nodes are unchanged), and the field engine treats every node independently, so `cells.py splice` recomputed `fields[..., 29]` at d = 200 µm for all 16,200 cells from the **unrounded** GCM series (as the v1 build), on a copy of the store whose unchanged series chunks are hard links. Checks: the series rebuilt from the GCM file and bit-rounded equal the stored series (8 sample cells); neighbouring nodes recomputed on their own reproduce the stored values (control: 0 differing values in 144 cells, max relative difference 0.0e+00); `validate-splice`: all other 63 nodes bit-identical to the previous store, series identical; `validate` passed again (recompute from the stored series: median relative difference 8.3e-07). Smoothness of node 29 against its neighbours (189 and 208 µm), new 200 µm node vs the replaced 199 µm node:

| field | cells | inside [f(189), f(208)] new / old | \|f − quadratic fit\| / local range, p50 new / old | p99 new / old | median change 200 vs 199 µm |
|---|---|---|---|---|---|
| dpm | 16200 | 0.920 / 0.919 | 0.0034 / 0.0035 | 0.054 / 0.057 | +0.19 % |
| rdpm | 16200 | 0.915 / 0.914 | 0.0033 / 0.0037 | 0.086 / 0.087 | +0.10 % |
| uft | 16200 | 0.892 / 0.896 | 0.0223 / 0.0225 | 0.257 / 0.253 | -0.06 % |
| ufm | 16200 | 0.893 / 0.894 | 0.0200 / 0.0200 | 0.357 / 0.362 | -0.02 % |
| qacb | 16200 | 0.992 / 0.993 | 0.0012 / 0.0012 | 0.031 / 0.029 | +0.21 % |
| qalb | 16200 | 0.977 / 0.978 | 0.0022 / 0.0022 | 0.068 / 0.064 | +0.23 % |
| qace | 16200 | 0.950 / 0.953 | 0.0023 / 0.0024 | 0.111 / 0.099 | +0.26 % |
| qale | 16200 | 0.942 / 0.943 | 0.0024 / 0.0025 | 0.087 / 0.084 | +0.21 % |
| qha_rdp_dp | 16200 | 0.888 / 0.892 | 0.0077 / 0.0079 | 0.146 / 0.156 | -0.03 % |

The quadratic fit uses the four neighbours (172, 189, 208, 218 µm) in ln d. The threshold u*,th(d) of eq. 5.1 has a kink (maximum of two branches at D* = 18) that falls in 150–300 µm for Mars air, so node 29 departs from a smooth fit more than nodes far from the kink, equally for the old and the new node. Undefined values at node 29: 0 (199 µm: 0).

## 4. Series bit rounding (keepbits)

keepbits per variable from the whole-grid data maxima so that half an ulp at the top binade meets the contract (≤ 0.005 m/s, ≤ 0.02 K, ≤ 0.05 % ρ, ≤ 1 mm z); realised maximum errors over all 16,200 × 16,032 values (v1):

| var | range | keepbits | max error | tolerance |
|---|---|---|---|---|
| u | -47.53 … 40.67 m/s | 12 | 0.0039 m/s | 0.005 m/s |
| v | -46.06 … 41.38 m/s | 12 | 0.0039 m/s | 0.005 m/s |
| T | 137.5 … 291.2 K | 13 | 0.0156 K | 0.02 K |
| rho | 0.002373 … 0.045 kg m⁻³ | 10 | 0.0488 % | 0.05 % |
| z | 1.487 … 3.226 m | 10 | 0.000977 m | 0.001 m |

v0 benchmark on the Nili Patera shard (256 cells; blosc zstd-5 bitshuffle per cell and variable, kB per cell; z was not part of v0):

| var | k=8 | k=10 | k=12 | k=13 | k=14 | k=16 | lossless |
|---|---|---|---|---|---|---|---|
| u | 25.5 | 30.2 | 34.8 | 36.6 | 38.6 | 43.9 | 59.0 |
| v | 25.5 | 30.3 | 34.8 | 36.7 | 38.8 | 44.3 | 59.5 |
| T | 11.8 | 16.2 | 20.6 | 22.8 | 24.9 | 29.4 | 44.2 |
| rho | 12.9 | 17.4 | 21.8 | 24.1 | 26.4 | 30.4 | 45.4 |

v1 series 1.878 GB (116 kB per cell, 5 variables; v0 1.639 GB for 4). Effect on the fields: recomputing 12 cells from the stored rounded series gives a median relative difference of 8.1e-07, maximum 0.031 (in near-zero values; NaN pattern mismatches 0).

## 5. Stores (v1)

| store | where | size | objects |
|---|---|---|---|
| cells.zarr (series (90, 180, 5, 16032) 72 shards, fields 72 shards, dunes, dune, ls, sol) | Gadi `/scratch/k10/ag5517/dune-atlas/mars/stores/datasets/fv3-beta1/cells.zarr` | 1.951 GB (series 1.878 GB, fields 72.0 MB) | 155 |
| cells.zarr fixture subset (fields 21 shards = 3 × 3 around each site; series the 3 site shards (0,9), (2,7), (4,6)) | devroot `…/fv3-beta1/cells.zarr` | 111 MB | 35 |
| fields/<var>.zarr × 23 + qsdiv (d, y, x), rho_mean (y, x); one level at 2° | devroot `…/fv3-beta1/fields/` and Gadi mirror | 49 MB | 273 |
| cells-aux.zarr: qsdiv (lat, lon, d) m/yr, rho_mean, elev_mean (lat, lon) | devroot `…/fv3-beta1/cells-aux.zarr` and Gadi mirror | 4.6 MB | 88 |
| fields_export.npz (fields (23, 64, 90, 180) float32, rho_mean, dunes) | Gadi `…/fv3-beta1/export/`, `staging/mars/export/` | 84 MB | 1 |

Undefined field values: 11918 (v1 at 199 µm 11918, v0 1468), Earth conventions: qha_rdp_dp and ufm (5917 each, 1070 cells) where no hour exceeds the threshold (DP = uft = 0; 208 cells at 50 µm, 1046 at 1000 µm; at 102 / 200 / 405 µm: 0 / 0 / 2), and qhef / qhne_ac_nl (42 each, 13 cells, d ≥ 752 µm) where there is no elongation-mode crest flux. No Ga√s violations (minimum Ga√s = 140.3). elev_mean is the Terrain track's spherical-area-weighted cell mean of the MOLA–HRSC DEM (`elev_mean.npz`), added with `cellsaux.write_variable`.

## 6. Old (v0) vs new (v1)

This comparison was made when the default node was 199 µm (both v0 and v1 at node 29 = 199 µm); the default node has since moved to 200 µm (§3a), which changes node-29 values by the small amounts in the §3a table. Same hours and winds; v0 u* = 0.4 |U| / ln(2 m / 1 mm), v1 u* from eq. 2.2 at the hour's z. Dune cells = 1,208 cells with > 1 % cover; percentiles over cells (DP, RDP, uft) or over all dune-cell hours (u*).

| quantity | v0 | v1 | v1 / v0 |
|---|---|---|---|
| u* p50 (m/s), dune hours | 0.227 | 0.196 | 0.862 |
| u* p95 (m/s), dune hours | 0.627 | 0.496 | 0.790 |
| u* p99 (m/s), dune hours | 0.898 | 0.693 | 0.771 |
| u* p50 (m/s), all hours | 0.222 | 0.196 | 0.882 |
| u* p99 (m/s), all hours | 1.039 | 0.814 | 0.783 |

Per-hour ratio u*(v1)/u*(v0) at dune cells: p5/p25/p50/p75/p95 = 0.775 / 0.818 / 0.866 / 0.931 / 1.077 (effective roughness below 1 mm for most hours; above 1 for the calmest, most viscous hours). The v0 log law recomputed in the v1 statistics from the v1 series reproduces the v0 numbers exactly (same winds).

| d | quantity (dune cells) | v0 p5 / p50 / p95 | v1 p5 / p50 / p95 | v0 mean | v1 mean | per-cell v1/v0 p5 / p50 / p95 |
|---|---|---|---|---|---|---|
| 102 µm | DP (m² yr⁻¹) | 1.48 / 4.37 / 10.8 | 0.428 / 1.64 / 4.72 | 5.05 | 1.96 | 0.278 / 0.371 / 0.449 |
| 102 µm | RDP (m² yr⁻¹) | 0.359 / 2.78 / 8.06 | 0.143 / 1.1 / 3.45 | 3.53 | 1.42 | 0.274 / 0.391 / 0.522 |
| 102 µm | fraction of hours above threshold | 0.124 / 0.305 / 0.515 | 0.0653 / 0.185 / 0.409 | 0.31 | 0.206 | 0.481 / 0.631 / 0.806 |
| 199 µm | DP (m² yr⁻¹) | 2.84 / 6.83 / 16.6 | 1.02 / 2.78 / 7.85 | 7.86 | 3.37 | 0.327 / 0.414 / 0.492 |
| 199 µm | RDP (m² yr⁻¹) | 0.632 / 4.2 / 11.6 | 0.301 / 1.85 / 5.48 | 5.15 | 2.23 | 0.296 / 0.438 / 0.595 |
| 199 µm | fraction of hours above threshold | 0.184 / 0.356 / 0.571 | 0.113 / 0.236 / 0.481 | 0.362 | 0.258 | 0.555 / 0.68 / 0.85 |
| 405 µm | DP (m² yr⁻¹) | 1.7 / 5.34 / 16 | 0.326 / 1.52 / 5.85 | 6.6 | 2.13 | 0.173 / 0.296 / 0.413 |
| 405 µm | RDP (m² yr⁻¹) | 0.558 / 3.57 / 10.7 | 0.121 / 1.07 / 3.83 | 4.45 | 1.44 | 0.148 / 0.31 / 0.553 |
| 405 µm | fraction of hours above threshold | 0.0735 / 0.159 / 0.384 | 0.0243 / 0.0732 / 0.24 | 0.187 | 0.0926 | 0.276 / 0.475 / 0.683 |

All cells (16,200), DP p50 and uft mean, v0 → v1: 102 µm: DP 4.27 → 1.54, uft 0.262 → 0.176; 199 µm: DP 8.05 → 3.61, uft 0.355 → 0.276; 405 µm: DP 7.1 → 2.24, uft 0.222 → 0.135.
DP falls by more than u* (a factor ≈ 2.4–3.4 at the median) because most transport occurs close to threshold, where q ∝ (u*² − u*,th²) amplifies a 10–15 % drop in u*. Registry colour limits were recomputed from v1 (§8).

## 7. FV3 statistics (v1)

Dune cells: 1208 with > 1 % cover (2749 with any). Dune-cell percentiles are exact over all hours of those cells; all-cell percentiles from log-histograms (bin width 0.2 %) with exact p0/p100.

| quantity | set | p1 | p5 | p25 | p50 | p75 | p95 | p99 | min … max |
|---|---|---|---|---|---|---|---|---|---|
| ρ_f (kg m⁻³) | dune | 0.00999 | 0.0113 | 0.0153 | 0.0188 | 0.0273 | 0.0312 | 0.0327 | 0.00784 … 0.0414 |
| ρ_f (kg m⁻³) | all | 0.00809 | 0.0099 | 0.013 | 0.0162 | 0.0203 | 0.0293 | 0.0323 | 0.00237 … 0.045 |
| z (m) | dune | 1.6 | 1.61 | 1.66 | 1.69 | 2.32 | 2.71 | 2.98 | 1.58 … 3.2 |
| z (m) | all | 1.59 | 1.61 | 1.74 | 2.14 | 2.46 | 2.8 | 3 | 1.49 … 3.23 |
| u* (m/s) | dune | 0.0228 | 0.0401 | 0.109 | 0.196 | 0.299 | 0.496 | 0.693 | 0.000284 … 1.61 |
| u* (m/s) | all | 0.023 | 0.0367 | 0.0944 | 0.196 | 0.338 | 0.591 | 0.814 | 0.000284 … 1.8 |
| u*,th at 200 µm (m/s) | dune | 0.258 | 0.261 | 0.27 | 0.3 | 0.316 | 0.389 | 0.435 | 0.243 … 0.482 |
| u*,th at 200 µm (m/s) | all | 0.259 | 0.266 | 0.293 | 0.314 | 0.34 | 0.416 | 0.456 | 0.238 … 0.693 |

Fraction of hours with u* > u*,th (200 µm): dune cells 0.256, all cells 0.275 (stored uft; from the rounded series 0.256 / 0.2754).

DP (stored dpm, m² yr⁻¹, per Earth year):

| d | set | p5 | p25 | p50 | p75 | p95 | p99 | cells with DP = 0 |
|---|---|---|---|---|---|---|---|---|
| 102 µm | dune | 0.428 | 1.02 | 1.64 | 2.61 | 4.72 | 6.03 | 0.0000 |
| 102 µm | all | 0.123 | 0.695 | 1.54 | 2.75 | 5.57 | 8.26 | 0.0000 |
| 200 µm | dune | 1.01 | 1.83 | 2.78 | 4.32 | 7.85 | 10 | 0.0000 |
| 200 µm | all | 0.515 | 2.04 | 3.61 | 5.78 | 10.9 | 15.5 | 0.0000 |
| 405 µm | dune | 0.326 | 0.824 | 1.52 | 2.88 | 5.85 | 7.91 | 0.0001 |
| 405 µm | all | 0.155 | 1.05 | 2.24 | 4.26 | 10.4 | 15.8 | 0.0001 |

Validity Ga√s > 81: 0 of 16,621,977,600 (hour, d) pairs violate it; 0 hours with any violation (expected 0).

Seasonality at d = 200 µm: share of the annual flat-bed flux (and of the hours) per 30° Ls bin, %:

| site (cell centre, cover) | 0–30 | 30–60 | 60–90 | 90–120 | 120–150 | 150–180 | 180–210 | 210–240 | 240–270 | 270–300 | 300–330 | 330–360 | DP m² yr⁻¹ (v0 at 199 µm) | uft (v0 at 199 µm) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Nili Patera (9°, 67°, 5 %) | 5.0 | 12.0 | 13.6 | 11.6 | 9.6 | 2.3 | 1.3 | 5.5 | 21.4 | 10.4 | 4.8 | 2.5 | 1.46 (3.42) | 0.186 (0.270) |
| Proctor crater (-47°, 31°, 18 %) | 10.1 | 10.2 | 5.4 | 4.1 | 9.8 | 14.9 | 13.3 | 10.3 | 4.9 | 3.2 | 1.1 | 12.6 | 3.21 (6.83) | 0.265 (0.347) |
| north polar erg (81°, 123°, 100 %) | 21.5 | 7.9 | 10.3 | 0.0 | 0.0 | 0.6 | 21.4 | 11.9 | 4.8 | 2.4 | 7.3 | 11.9 | 1.43 (4.32) | 0.189 (0.309) |
| hours (all sites) | 9.1 | 9.8 | 10.0 | 9.7 | 9.0 | 8.2 | 7.5 | 7.0 | 6.9 | 7.1 | 7.6 | 8.3 | | |

Site cells: the cell with the largest dune cover within ±1 cell of the nominal point (Nili Patera 9°N 67°E, Proctor 47°S 30°E, north polar erg 81°N 120°E). The polar erg has no flux for Ls 90–150° at this grain size.

Flux divergence (R = 3389.5 km) at 200 µm over dune cells: median -0.0060 m/kyr, 79 % negative (convergence), p98 |qsdiv| = 0.032 m/kyr → registry clim ±0.032 m/kyr (v1 at 199 µm ±0.032, v0 ±0.061).

### Regression against the assessment-stage statistics

Assessment artifact `fv3_stats.npz` (afbfe333…, same FV3 file): annual-mean ρ_f per cell identical to the assessment (ratio 1.0000 at p1/p50/p99 over all 16,200 cells; v1 ρ_mean bit-identical to v0). The v0 u* (log law) reproduced the assessment's per-cell u* p50/p99 within 2–4 % after the change of z₀ and z was factored out (768 cells: [0.9693, 0.9812, 1.0021] at p50); v1 u* relates to v0 as in §6.

## 8. Registry and metadata

`registry/mars/qsat_field_metadata.json` (Earth canonical names/units/descriptions, reworded for hourly samples and the per-hour Pähtz & Durán threshold; p2/p98 at d = 200 µm over all cells, recomputed from v1 after the node change), `registry/mars/generated/qsat_fields.yaml` (23 layers, '{dataset}/fields/<var>.zarr', clim from the v1 p2/p98) and `registry/mars/generated/x_extra_fields.yaml` (qsdiv ±0.032 m/kyr, rho_mean [0.0098, 0.026] kg/m³). `cd app && npm run validate-registry:mars`: OK.

## 9. Tests

`cd pipeline && PYTHONPATH=src python -m pytest -q -p no:cacheprovider`: `test_mars_fields.py` (9), `test_mars_cells.py` (4), `test_mars_sidecars.py` (2) pass with numba (the numba-vs-numpy test skips without it). Whole-suite results are in the Wind report; the 7 Earth tests that read `staging/drift/qsat_drift.zarr` need `DUNE_ATLAS_DRIFT` pointing at the Earth checkout (the Mars worktree has no Earth staging data).

## 10. Notes

* numba is not in the local `dune-atlas` env; the numpy backend is used automatically there (3–5× slower).
* The fixture has hourly series for the three site shards only (≈ 30 MB per shard); fields cover 3 × 3 shards per site.
* `stats.json` p0/p100 are exact extremes since v1 (the v0 file reported the lowest histogram bin edge for the all-cell p0).

## 11. v2: fluxes of packed sand (φ = 0.6)

PI decision 2026-10-14: atlas fluxes are volumes of packed sand, q = Q/(ρ_p φ) with φ = 0.6, as the Earth atlas (FLUXCONSTANT = 5/0.6); v1 stored q = Q/ρ_p. Code: `mars/constants.py` `PACKING = 0.6`, division in `physics.transport_rate` (and `transport_rate_dimensional`) and in the app's `marsphysics.ts` `transportRate`; every field, statistic and the qsdiv sidecar inherit it. All flux values in §§3a, 6 and 7 are v1 (Q/ρ_p); multiply by 1/0.6 for v2. Published under the new prefix `dune-atlas/mars/v2/datasets/fv3-beta1/` (registry `layers.yaml` prefix bumped); `mars/v1/` is unchanged and body-level objects (elevation, basemaps, dunes) stay under `mars/v1/`.

* **Data (0 SU, local).** Every field is linear in q (dpm, rdpm, qnlb, qncb, qalb, qacb, qnle, qale, qace) or independent of it (directions, flux ratios, fractions, u*/u*,th statistics), so v2 is the published v1 store with the nine flux rows of `fields` divided by φ in float64 and rounded to float32 (`mars.cells rescale-packing`; same shape, sharding, codecs and fill value), followed by the unchanged pyramid/sidecar builder on the rescaled export. Recomputing 4 cells of shard (2, 7) (incl. Nili Patera) from the published series with φ = 0.6 and φ = 1: flux ratio 1/0.6 to ≤ 1.2e-10, non-flux fields equal to ≤ 1.2e-10 (float64).

* **Upload** (`scripts/mars/data/upload_v2.py`, create-only; ledger `staging/mars/r2/uploaded-v2-fv3-beta1.json`): 516 objects, 2,003,136,181 B = 443 create-only PUTs (124,960,074 B) + 72 cells.zarr/series shards copied server-side from v1 (1,878,175,296 B) + 1 test copy (`cells.zarr/sol/zarr.json`, 811 B, ETag = v1). R2 ignores If-None-Match on CopyObject, so the copies are one-part multipart uploads (UploadPartCopy with CopySource-If-Match = v1 ETag) completed with If-None-Match: * (412 on an existing key, checked).

* **Verification** (`scripts/mars/data/verify_v2.py`; every v2 object read through the S3 endpoint and https://data.geomorphlab.org/, md5 compared with the local build or with the v1 ETag; values decoded with zarr from the public bytes):

| objects | n | bytes | changed / identical to v1 (md5) | S3 = public | values v2 vs v1 |
|---|---|---|---|---|---|
| cells.zarr/fields | 73 | 71,409,178 | 72 / 1 | 73/73 | 9 flux rows: |r φ − 1| ≤ 5.96e-08 (float32 rounding); 14 other rows bit-identical: True |
| cells.zarr series, dunes, dune, ls, sol | 81 | 1,878,216,496 | 0 / 81 | 81/81 | bit-identical (md5 = v1 ETag, incl. the 72 copied series shards) |
| cells.zarr root zarr.json | 1 | 7,395 | 1 / 0 | 1/1 | attrs: flux_units, constants.PACKING, dataset.fields_method, flux_history |
| cells-aux qsdiv | 73 | 4,449,472 | 73 / 0 | 73/73 | = qsdiv(v2 fields) exactly; |v2 − v1/0.6| ≤ 1.0e-07 × max|qsdiv| |
| cells-aux root, rho_mean, elev_mean | 15 | 104,466 | 2 / 13 | 15/15 | chunks bit-identical; 2 zarr.json with current attribute text |
| flux pyramids (9 + qsdiv) | 110 | 21,150,538 | 39 / 71 | 110/110 | |r φ − 1| ≤ 2.03e-04 (12-bit display rounding of each version); clims × 1/0.6, e.g. dpm [0.21, 14] → [0.35, 23] m²/yr; coordinate chunks identical |
| non-flux pyramids (14 + rho_mean) | 163 | 27,798,636 | 30 / 133 | 163/163 | data bit-identical: True; changed objects are zarr.json (source text) |

* **Reference cells**, d = 200 µm (node 29), DP in m²/yr:

| site | cell (i, j) | lat, lon | DP v1 | DP v2 | RDP v1 | RDP v2 |
|---|---|---|---|---|---|---|
| Nili Patera | (40, 123) | 9°, 67° | 1.4645 | 2.4408 | 0.8086 | 1.3477 |
| Proctor crater | (68, 105) | -47°, 31° | 3.2115 | 5.3526 | 1.9544 | 3.2574 |
| north polar erg | (4, 151) | 81°, 123° | 1.4288 | 2.3813 | 0.8698 | 1.4496 |

* Not recomputed for v2: the FV3 statistics document (§7, `mars_fv3_stats.json`); its flux entries scale by 1/0.6, the others are unchanged.

