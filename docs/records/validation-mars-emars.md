# Validation: EMARS v1.0 Mars Year 30 (emars-v1-my30)

Wind dataset `emars-v1-my30` of the Mars build (mars/datasets.py, `mars/dataset_specs/emars-v1-my30.json`): the EMARS v1.0 reanalysis (Greybush et al. 2018, doi:10.18113/D3W375; Greybush et al. 2019, Geosci. Data J. 6, 137–150, doi:10.1002/gdj3.77), hourly analysis ensemble mean of the lowest model level, Mars Year 30, on the EMARS mass grid (6° × 5.14°, 34 × 60 cells). Read from ARCO-EMARS (Bhattacharya 2026, Hugging Face `datasets/ananyo01/ARCO-EMARS`, store `emars_combined.zarr`, doi:10.57967/hf/8859). Licence: CC BY 4.0 as labelled by ARCO-EMARS; the licence of the original Penn State Data Commons record is not yet confirmed. Built 2026-10-16 on a laptop (4 processes). Code: `pipeline/src/dune_atlas_pipeline/mars/sources/emars.py` (extraction, `extract` and `check`), `cells.py`, `sidecars.py`; test `pipeline/tests/test_mars_source_emars.py`.

## 1. Source and selection

* **Store.** zarr v3, consolidated metadata; 127,920 time steps (MY24–33), chunks of 100 steps × all 28 levels × the whole globe. Data and time-label arrays are encoded bytes + **blosc** (zstd inside, bitshuffle, typesize 4); only the coordinate arrays (lat, latu, lon, lonv, pfull, phalf) are bytes + bare zstd. A blosc chunk is not a zstd frame (header `02 01 …`; `numcodecs.Zstd` fails with "invalid input data"), which is why reading `anal_mean_MY` as zstd fails: no chunk is missing or corrupt. With blosc all 1,280 `anal_mean_MY` chunks decode, every value is finite and the labels sum to 127,920 (MY24 10,701; MY25 16,046; MY26 16,045; MY27 5,256; MY28 10,278; MY29–32 16,046 each; MY33 5,410). Hugging Face redirects the larger chunks to its CDN and limits requests to 3000 per 300 s; the reader paces itself and honours Retry-After.
* **Time axis is not chronological.** Around source-file boundaries the store interleaves two files step by step: consecutive store indices alternate between two streams half a sol apart (e.g. store index 74364 is MY30 sol 4864 h0, 74365 MY29 sol 4863 h12). The `time` coordinate is "Martian hours since file start", restarting in each file. The selection therefore takes **every step labelled `anal_mean_MY` = 30** and orders it by the continuous key `anal_mean_emars_sol + anal_mean_mars_hour / 24` (`select_year`).
* **MY30.** 16,046 steps, store indices 74364–90419 (162 chunks; 669 places where store order runs backwards). After ordering: all keys unique, every step one Mars hour after the previous (no gap, no duplicate), Ls strictly increasing, hours integer 0–23. First step EMARS sol 4863 hour 20, **Ls 0.0114°**; last step sol 5532 hour 9, **Ls 359.990°**. 670 sols touched: 668 complete (24 steps each), the first with 4 steps (h20–23) and the last with 10 (h0–9). The year boundary falls inside a sol (Ls passes 0° between hour 19 and 20 of sol 4863), as for MY29/MY30 and MY30/MY31.
* **Stored time.** `ls` = `anal_mean_Ls` (deg); `sol` = `anal_mean_mars_soy + anal_mean_mars_hour / 24` (mars_soy = EMARS sol − 4863 throughout MY30, checked), 0.833 … 669.375.
* **Variables.** `anal_mean_U`, `anal_mean_V`, `anal_mean_T`, `anal_mean_ps`, lowest level only (`pfull` ascends; last index, reference 7.674 hPa). Each chunk was read once (about 52 MB per time chunk for the four arrays) and its lowest level cached. Every value read is finite. Extraction: 1,019 s.
* **Vertical coordinate.** `anal_mean_ak` is in Pa: ak + bk × 770 Pa reproduces `phalf` × 100 at all 29 interfaces to 3e-5 Pa. Lowest layer: bottom (ak, bk) = (0, 1), top (0.0020 Pa, 0.993269). p = mid pressure of the layer, ρ = p/(R T), z = (R T/g) ln(p_lo/p) (`physics.air_state`, `physics.layer_height`), as FV3.

## 2. Grid and destaggering

**Geometry from the coordinate arrays** (`check_geometry`, asserted on every extraction):

* `lat`: 36 mass rows from −88.714 to 88.714, south to north. Rows 1–34 are evenly spaced (180°/35 = 5.1429°). The two polar rows are half-width caps (−90…−87.43, 87.43…90).
* `latu`: latu[1…35] = −87.43 … 87.43, the 35 interfaces between consecutive mass rows. latu[0] = −87.42858 repeats latu[1] (−87.42857) to 1e-5.
* `lon`: 3 … 357, the mass columns. `lonv`: 0 … 354, the column interfaces, with lon[i] = (lonv[i] + lonv[i+1]) / 2.

U on (latu, lon) and V on (lat, lonv) is therefore the Lin–Rood D-grid (u on the north/south faces of a mass cell, v on its east/west faces).

**Padding row.** U at latu[0] is identically 0 at all levels and times; this is asserted for each of the 162 chunks. It is not a copy of latu[1], where bottom-level U reaches ±7 m/s. latu[0] is the unused first row of the D-grid u array and is never used.

**Transform** (`destagger`, float64, stored float32). Contract row k (0 … 33, north first) is source mass row r = 34 − k. Contract column c (lon −177 + 6c) is source column i = (c + 30) % 60.

* u = (U[latu r] + U[latu r+1]) / 2: the two interfaces bounding the row.
* v = (V[lonv i] + V[lonv (i+1) % 60]) / 2: the two interfaces bounding the column, periodic.
* T, ps: the mass-point values.

The polar rows ±88.71 are dropped, so coverage is ±87.43°. This averaging is the only interpolation in the build.

**Pairing checked against mass continuity.** For every pair of consecutive hours within a chunk, the hourly surface-pressure tendency (Δps/g per Mars hour) was compared with −∇·Σₖ(V dpₖ)/g. Here dpₖ = Δak + Δbk ps over all 28 layers, the winds are destaggered under each hypothesis, and centred differences are taken on the sphere over mass rows 3–32. Table entries are the mean spatial correlation / RMS(misfit) ÷ SD(tendency):

| hypothesis | chunk 750 (Ls 13–15°, 97 pairs) | 800 (Ls 109–111°, 96) | 880 (Ls 304–306°, 97) |
|---|---|---|---|
| **as labelled: u from latu r, r+1; v from lonv i, i+1** | **0.967 / 0.25** | **0.816 / 0.59** | **0.900 / 0.44** |
| u from latu r−1, r | 0.576 / 1.34 | 0.402 / 1.76 | 0.569 / 1.11 |
| v from lonv i−1, i | 0.746 / 0.83 | 0.524 / 1.26 | 0.736 / 0.73 |
| v from lonv i+1, i+2 | 0.752 / 0.83 | 0.527 / 1.25 | 0.740 / 0.73 |
| U and V positions swapped (C-grid reading) | 0.496 / 1.59 | 0.319 / 2.21 | 0.531 / 1.17 |

The labelled pairing is the only one that closes the mass budget. The pairs were chosen from the time labels, so this test also confirms that data and labels share the store's (interleaved) order.

**Unit test** (`test_mars_source_emars.py`, synthetic arrays, no network):

* `check_geometry` accepts the EMARS coordinates and rejects V on the mass longitudes and interfaces without the padding row.
* A field linear in the staggered coordinate destaggers exactly. An impulse at one latu interface reaches exactly the two mass rows it bounds.
* The padding row and the polar rows never reach the contract grid, and the longitude roll is checked.
* An interleaved time axis is put in order; a missing or duplicated hour is rejected.

## 3. Source store and spot checks

The contract source store (`emars-v1-my30.zarr`: u, v, T, ps (34, 60, 16046) float32; ls, sol, source_index; attrs dataset, grid, interfaces, selection) was compared with fresh remote reads (`emars.py check`). The check covered the first and last chunks of the selection plus four random chunks: 743, 786, 825, 844, 878 and 904. Every stored value of the steps those chunks hold was compared with the transform of the remote values: max |Δ| = 0 for u, v, T and ps.

At three cells per chunk the remote values were also indexed explicitly, without `destagger`, and compared with the **bit-rounded series of cells.zarr**; ρ and z were recomputed from the remote ps and T. Over the 18 points the maximum differences are within the contract tolerances (0.005 m/s, 0.02 K, 0.05 %, 1 mm):

| | max \|Δ\| |
|---|---|
| u | 0.0017 m/s |
| v | 0.0009 m/s |
| T | 0.0075 K |
| ρ | 0.046 % (relative) |
| z | 0.82 mm |

Examples (series index t, cell centre):

| store index | t | cell | u remote / stored | v remote / stored | T remote / stored |
|---|---|---|---|---|---|
| 74384 | 14 | 69.43N 177W | 5.2428 / 5.2432 | 1.9675 / 1.9675 | 152.1265 / 152.1250 |
| 74384 | 14 | 2.57N 63E | −1.1490 / −1.1489 | −0.6414 / −0.6414 | 248.0396 / 248.0469 |
| 78639 | 4278 | 2.57N 63E | −3.7976 / −3.7974 | 15.3103 / 15.3105 | 190.4749 / 190.4688 |
| 78639 | 4278 | 69.43S 177E | −0.7482 / −0.7482 | −2.8897 / −2.8896 | 147.3167 / 147.3125 |

## 4. Build and `cells validate`

`DUNE_ATLAS_MARS_DATASET=emars-v1-my30 python -m dune_atlas_pipeline.mars.cells build --nproc 4`:

* Run: 12 shards (2,040 cells); read 2.5 s; pool 132.5 s wall (0.254 s per cell-core); total 138 s. A pilot of one shard (256 cells) took 67 s.
* **Ga√s:** 0 violating pairs, 0 hours; minimum Ga√s = 141.8.
* Undefined field values: 22, all `qha_rdp_dp` and `ufm` at d indices 61–63 (≈ 900–1000 µm). They occur in 9 low-wind equatorial cells where those grains never move, so the ratio is undefined.
* keepbits: u, v 12 (max error 0.0039 m/s); T 13 (0.0156 K); ρ 10 (0.0488 %); z 14 (0.00098 m).

`cells validate` passed: layout and attrs, one object per shard for series and fields (12 + 12), finite series in range at 6 random cells, and fields recomputed from the stored rounded series (2 cells) with median relative differences of 8.0e-07 and 9.3e-07.

Validation needed one change (shared module `cells.py`): the plausible range of z is no longer the FV3 literal (0.5, 5.0) m. `cells.z_range` now derives it from the store's `air_state_interfaces` with `physics.layer_height`, over T 100–350 K and ps 50–1500 Pa, widened by 10 %. The result is 15.6–67.1 m for EMARS. For FV3 it is 0.94–4.28 m, which still encloses the FV3 data range of 1.487–3.226 m. The FV3 build is unchanged.

## 5. Physical sanity (all 2,040 cells × 16,046 hours)

| | min | p1 | median | p99 | max |
|---|---|---|---|---|---|
| u (m/s) | −44.16 | −18.56 | −1.89 | 18.07 | 48.01 |
| v (m/s) | −41.53 | −19.47 | 0.07 | 18.97 | 48.37 |
| \|U\| (m/s) | 0.001 | 1.10 | 9.09 | 25.32 | 54.17 |
| T (K) | 126.2 | 146.4 | 200.4 | 267.0 | 288.0 |
| ρ (kg m⁻³) | 0.0051 | 0.0088 | 0.0172 | 0.0367 | 0.0440 |
| z (m) | 21.98 | 25.50 | 34.90 | 46.50 | 50.15 |

The annual-mean |U| per cell ranges from 6.38 to 19.06 m/s. The lowest EMARS layer is thick (bk_top = 0.9933, about 0.67 % of ps), so z is 22–50 m, against 1.5–3.2 m for FV3: the EMARS wind is a wind at tens of metres. u* is obtained from it through the same eq. 2.2 smooth-wall constant-stress profile as for FV3. DP at 200 µm is 2.16–61.5 m²/yr (FV3 0.013–35.2); the global median is 9.7 m²/yr (FV3 6.3). cells-aux: ρ_mean colour range 0.010–0.029 kg m⁻³; qsdiv over dune cells has median 3.8e-4 m/kyr, 43 % negative, and p98 |qsdiv| 0.013 m/kyr.

## 6. Comparison with FV3 at three dune regions (d = 200 µm)

The EMARS cell is the one containing the point. 180E lies on a column edge, so Olympia uses the cell with the larger dune fraction: 177E, dune fraction 0.719 (0.648 at 177W). FV3 values are means over the FV3 2° cells whose centres lie in that EMARS cell (6, 6 and 9 cells).

* DP is the cos-lat-weighted mean.
* RDD and RDP come from the cos-lat-weighted mean flux vector RDP·e^{i RDD}.
* FV3 fields come from the v2 `fields_export.npz`; the FV3 series (|U|, u*, z) were read from the published FV3 cells.zarr.
* u* is recomputed per hour from the stored series with `physics.friction_velocity`, ν = μ(T)/ρ.
* Fluxes are packed-sand m²/yr. RDD is the direction of transport, CCW from east (deg).

| region | EMARS cell | z̄ EMARS / FV3 (m) | mean \|U\| EMARS / FV3 (m/s) | mean u* EMARS / FV3 (m/s) | DP EMARS / FV3 | RDP EMARS / FV3 | RDD EMARS / FV3 |
|---|---|---|---|---|---|---|---|
| Olympia Undae (~80N 180E) | 79.71N 177E | 30.9 / 1.92 | 8.09 / 3.53 | 0.262 / 0.156 | 11.44 / 1.87 | 9.31 / 0.28 | −150 / 21 |
| Nili Patera (~9N 67E) | 7.71N 69E | 38.3 / 2.43 | 12.79 / 5.80 | 0.426 / 0.264 | 19.25 / 4.50 | 15.21 / 2.95 | −173 / 179 |
| Gale/Bagnold (~5S 137E) | 2.57S 135E | 38.3 / 2.41 | 10.54 / 5.83 | 0.351 / 0.258 | 11.29 / 6.52 | 4.26 / 3.42 | 124 / 71 |

The wind speeds are at very different heights and are not comparable directly. The friction velocities are comparable: EMARS u* is 1.4–1.7 times FV3's at all three regions, and DP at 200 µm is 1.7–6 times larger, because the flux rises steeply above threshold. The directions:

* **Nili Patera:** westward in both datasets (RDD −173° and 179°, 7° apart).
* **Olympia Undae:** EMARS gives a strongly unimodal west-southwestward resultant (RDP/DP 0.81). FV3's resultant is small (RDP/DP 0.15), so its direction is weakly defined.
* **Gale/Bagnold:** the resultant directions differ by 53°.

These differences belong to the dataset (assimilated reanalysis on a 6° grid vs a free-running 2° GCM; wind at 30–40 m vs 2 m) and to the profile assumption over the thicker layer. They are not an extraction effect: sections 2–3 check the extraction.

## 7. Stores

| store | objects | bytes |
|---|---|---|
| source `emars-v1-my30.zarr` (contract source, not published) | 43 | 455,673,031 |
| `dune-atlas/mars/v2/datasets/emars-v1-my30/cells.zarr` (series 281,739,848 B, fields 8,875,599 B) | 35 | 290,737,200 |
| `…/emars-v1-my30/cells-aux.zarr` (qsdiv, rho_mean, elev_mean) | 18 | 596,832 |
| `…/emars-v1-my30/fields/` (23 field pyramids + qsdiv + rho_mean, one level each: 60 px wide) | 273 | 6,732,275 |

Registry fragments and field metadata: `registry/mars/datasets/emars-v1-my30/` (`qsat_fields.yaml`, `x_extra_fields.yaml`, `qsat_field_metadata.json`), written by `sidecars all`.
