# Validation: Mars wind fields, MACDA v2.0 Mars Year 30 (`macda-v2-my30`)

Second reanalysis dataset of the Mars atlas next to FV3 beta 1 (validation-mars-fields.md), built with the same code on its native grid (2026-10-16). Code: `pipeline/src/dune_atlas_pipeline/mars/sources/macda.py` (extraction), `mars/dataset_specs/macda-v2-my30.json` (texts), `cells.py`, `sidecars.py`, `pyramids.py` (unchanged except §4). Stores were built locally under `staging/mars-winds/` and not uploaded.

## 1. Source and selection

* **Source.** ARCO-MACDA (Bhattacharya 2026, Hugging Face `datasets/ananyo01/ARCO-MACDA`, doi:10.57967/hf/8771), zarr v3 store `macda_combined.zarr`: the 268 CEDA files of MACDA v2.0 (Valeanu, Rajendran, Montabone & Read 2026, doi:10.5285/cd037a9ea387438fabf4d674dbe53088; 30 sols per file, "each sol contains variables at 12 times") along one `time` axis of 96,480 steps (= 268 × 30 × 12). Arrays `uwind`, `vwind`, `temp` (time, lev, lat, lon) and `psurf` (time, lat, lon) are float32 chunks of 120 times × all 35 levels × the whole globe (bytes + blosc/zstd, 35 MB per 4-D chunk); the 1-D coordinates are `time` (sols since the start of MY24), `Ls` and `MY_Ls`. Licence: UK Open Government Licence v3.0 (CEDA record and the files' `Copyright` attribute); ARCO-MACDA is labelled CC BY 4.0.
* **Mars-year label.** `MY_Ls` is the Martian year counted on solar longitude (Clancy et al. 2000; values 24 … 36, the 202 steps of MY36 being the tail of the last file). `Ls` is the model solar longitude, 0 at time 0 (MY24 start), not the astronomical Ls (attribute comment). The CEDA file names count Mars years in sols (`MY29SOY648_MY30SOY010` …), so file and `MY_Ls` year boundaries differ by about two sols.
* **Store order.** `time` in ARCO-MACDA is not monotonic: each 30-sol block is internally even (1/12 sol) and the 268 block start times are unique and contiguous at 30 sols, but the blocks are stored grouped by start year and then by run-type name, so the ODY/THEMIS blocks of a year follow its MRO/MCS blocks (permuted store blocks 90–111, 129–131, 134–155, 187–200; checked against the CEDA directory listing). MY30 lies in such a run: its first ODY/THEMIS file (`MY30SOY010_MY30SOY040`) is stored after the MRO/MCS files of the year. The extraction therefore selects by label and orders by `time`; §3 shows that the data follow their time labels across the moved blocks.
* **Selection: every step with `MY_Ls` = 30, ordered by `time`.** 8,023 samples = 668 7/12 sols (the year starts and ends between samples), touching 670 calendar sols; time 4011.6667 … 4680.1667 (sols since MY24 start); Ls 0.0342° … 359.9829° (the steps just outside: Ls 359.9914°, `MY_Ls` 29, and Ls 0.0257°, `MY_Ls` 31). After sorting: 0 duplicates, 0 gaps, all 8,022 steps 1/12 sol (|Δ − 1/12| < 1e-6 sol on the float64 `time`); Ls increases by 0.0372° … 0.0545° per step. Every MY_Ls year has 8,023 samples except MY29 and MY34 (8,024).
* **Files (CEDA v2.0).** The selection spans 24 files: `ody-themis-reanalysis_mars_MY29SOY648_MY30SOY010_v2-0.nc` (101 samples, from Ls 0.03°), `ody-themis-reanalysis_mars_MY30SOY010_MY30SOY040_v2-0.nc` (360, to Ls 19.12°), the 21 MRO/MCS files `mro-mcs-reanalysis_mars_MY30SOY040_MY30SOY070_v2-0.nc` … `MY30SOY640_MY31SOY001` (360 each) and 2 samples of `mro-mcs-reanalysis_mars_MY31SOY001_MY31SOY031_v2-0.nc`. So 461 samples (Ls 0–19°) assimilate ODY/THEMIS column dust only and 7,562 assimilate MRO/MCS profiles; the spec citation says so (it first read "MRO/MCS assimilation"). The ARCO root attribute `assimilation_run_type` (MRO/MCS) is that of one file only.
* **Time of day.** The fraction of a sol of `time` is the mean solar time of day at the prime meridian: the CEDA files carry `Mars_date` ("Mars date and time at prime meridian", not copied into ARCO-MACDA), the `Ls` comment states that the model starts at midnight of the first sol of MY24, and the subsolar longitude of the downward shortwave flux `swflux` (flux-weighted circular mean along the two rows next to the equator) equals 15° (12 − 24 frac(time)) at all 8,023 samples: offset −0.09° ± 0.70°, |max| 2.56° (no equation-of-time term, i.e. mean solar time). The fields are instantaneous at their time label; the 12 samples of a sol are at 02, 04, …, 24 h prime-meridian time.

## 2. Grid and level transform

* **Grid.** All four variables are on the same (lat, lon) dimensions: 36 rows 87.5 → −87.5 and 72 columns −180 → 175 (5°, cell centres; float32 values within 7.6e-6° and 1.5e-5° of the nominal centres). That is the spec grid in contract orientation (rows north → south, columns from lon0 = −180°), so `to_contract` only moves the time axis last; it checks the centres (1e-3°) and would flip rows or roll columns, never interpolate. Column 0 spans 177.5°E … 177.5°W across the antimeridian, as in the dune-fraction and elevation inputs of `native_grid.py`. The ±90° caps beyond ±87.5° are not represented (as in MACDA).
* **Level.** `lev` (35 sigma levels, descending) has lev[0] = 0.9995 (float32 0.99949998), the largest value, so the lowest level is index 0, s = 0.9995 (recorded in the source store attrs `sigma`, `sigma_index`). MACDA defines p = s ps (`lev` comment). Contract interfaces: ak_bottom = 0, bk_bottom = 1, ak_top = 0, bk_top = 2 s − 1 = 0.9990, so `physics.air_state` gives p = s ps and ρ = s ps/(R T), and `physics.layer_height` z = (R T/g) ln(1/s) = 0.025857 m/K × T. Checked on the full source: p/ps = s and z/T constant to 1e-17; the unit test checks both against the closed forms.
* **Source store** (`staging/mars-winds/source/macda-v2-my30.zarr`, contract of `cells.read_contract`): u, v, T, ps (36, 72, 8023) float32, ls and sol (8023) float32 (MACDA `Ls` and `time`; the float32 sol is within 1.7e-4 sol of the float64 value), attrs dataset, grid, interfaces, source, variables, selection, sigma, time_of_day. Extraction: 68 time chunks of each variable read once (about 7.2 GB streamed, only level 0 kept), 620 s.

## 3. Spot checks against the remote store

Values read independently with zarr's own reader of the remote store (`zarr.open_group` over HTTPS; the extraction decodes the chunks itself) at six output steps (first; 100 and 101, the two sides of the first re-ordered block boundary; 460, the last sample of the moved ODY/THEMIS block; middle; last) are bit-identical to the source store for the whole 36 × 72 field of u, v, T and ps at each step, and so at the cells below (store index = position in `macda_combined.zarr`; steps 101 … 460 come from the ODY/THEMIS block stored at 55,800 … 56,159, after the MRO/MCS blocks of the year). The cells.zarr series equal the source store within the series rounding at every cell and sample (|Δ| ≤ 0.0039 m/s for u and v, 0.0156 K, 0.049 % ρ, 0.00098 m z; §4), and its ls and sol equal the source's.

| step | time (sol) | store index | cell | u (m/s) | v (m/s) | T (K) | ps (Pa) |
|---|---|---|---|---|---|---|---|
| 0 | 4011.6667 | 48139 | Olympia | 4.7491 | 5.2866 | 150.0973 | 791.1202 |
| 0 | 4011.6667 | 48139 | Nili | -4.7109 | -3.8766 | 210.7461 | 487.0013 |
| 0 | 4011.6667 | 48139 | Gale | 3.4939 | 4.7562 | 200.9242 | 695.3674 |
| 0 | 4011.6667 | 48139 | 62.5S -130E | -0.7459 | -0.3527 | 169.5407 | 479.8209 |
| 100 | 4020.0000 | 48239 | 62.5S -130E | 4.3733 | -1.7164 | 194.3148 | 480.5340 |
| 101 | 4020.0833 | 55800 | Olympia | 6.2603 | 4.9642 | 153.2979 | 840.5948 |
| 101 | 4020.0833 | 55800 | Nili | -0.2751 | 1.8958 | 184.0886 | 483.9685 |
| 101 | 4020.0833 | 55800 | Gale | 0.8117 | 2.8412 | 225.4013 | 667.7310 |
| 101 | 4020.0833 | 55800 | 62.5S -130E | 2.4481 | -0.8665 | 191.9895 | 479.0630 |
| 460 | 4050.0000 | 56159 | Olympia | 0.1273 | 0.9968 | 150.5969 | 864.1747 |
| 460 | 4050.0000 | 56159 | Nili | -0.9444 | 3.0792 | 185.3369 | 494.4258 |
| 460 | 4050.0000 | 56159 | Gale | 1.6764 | 9.1332 | 213.9290 | 703.6251 |
| 460 | 4050.0000 | 56159 | 62.5S -130E | 3.4221 | 0.1038 | 185.2092 | 467.5713 |
| 4000 | 4345.0000 | 51779 | 62.5S -130E | 15.3754 | -12.9274 | 151.4704 | 342.2307 |
| 8022 | 4680.1667 | 56161 | Olympia | 7.0462 | -7.1981 | 153.1489 | 803.9113 |
| 8022 | 4680.1667 | 56161 | Nili | -1.5618 | 2.9079 | 202.5158 | 487.4880 |
| 8022 | 4680.1667 | 56161 | Gale | -1.0216 | -2.0066 | 234.0822 | 645.6572 |
| 8022 | 4680.1667 | 56161 | 62.5S -130E | -4.0658 | 0.1898 | 181.5442 | 498.2532 |

Cells: Olympia 77.5°N −180°, Nili 7.5°N 65°, Gale −2.5° 135°. Continuity across the moved blocks: the global RMS change of ps between consecutive two-hourly samples is 5.6, 4.8 and 7.7 Pa at the three time-order boundaries whose neighbours come from non-adjacent store blocks, against median 5.9 Pa (p99 9.1, max 10.9) over all 8,022 steps and median 29 Pa between samples 30 sols apart; for u 2.15, 1.93, 2.48 m/s against median 2.35 m/s. A mismatch between data and time labels would show as 30-sol jumps.

## 4. Build and `cells validate`

`DUNE_ATLAS_MARS_DATASET=macda-v2-my30 python -m dune_atlas_pipeline.mars.cells build` (4 processes, laptop): 15 shards of 16 × 16 cells (36 × 72 = 2,592 cells), read 0.9 s, pool 76 s, total 80 s (0.115 s per cell-core at 8,023 samples). Series keepbits from the data maxima: u 12, v 12, T 13, ρ 10, z 11 bits; realised maximum rounding errors 0.0039 m/s, 0.0039 m/s, 0.0156 K, 0.0488 % ρ, 0.00098 m (tolerances 0.005 m/s, 0.02 K, 0.05 %, 0.001 m). **Validity Ga√s > 81: 0 violating (sample, d) pairs, 0 samples with any violation (minimum Ga√s = 143.97; FV3 140.3).**

`cells validate` passed: layout and attributes, 15 + 15 shard objects, finite series within the plausible ranges at 6 random cells, fields recomputed from the stored (rounded) series at 2 cells: median relative difference 1.11e-06 and 1.18e-06. The plausible z range of `validate` was the FV3 range (0.5, 5) m; it is now read from the spec (`notes.z_range_m`, default (0.5, 5) for FV3, [2, 10] m for MACDA, T = 77 … 387 K at s = 0.9995), the only shared-module change (`cells.py`, one line; FV3 stores unaffected). `test_mars_datasets.py::test_contract_dataset_build` builds a 24-sample synthetic MACDA source; it now lifts the series-length check (`CE.NT = None`) since the spec has n_samples = 8023.

Undefined field values: 9,743 of 3,815,424 (0.26 %): qha_rdp_dp and ufm 4,632 each (456 cells) where no sample exceeds the threshold (DP = uft = 0; 271 cells at 50 µm, 446 at 1000 µm, 0 at 200 µm); qhef and qhne_ac_nl 232 each (47 cells) with no elongation-mode crest flux; and one cell (7.5°S, 45°W) at 1000 µm where even the crest-amplified u* (×(1 + β A) = 1.8) never exceeds the threshold, so the crest modes and crest fluxes (ab, ae, at, ao, qnlb … qace, sige_sigh, qhab_*, qhbf; 1 value each) are undefined, the Earth convention.

`python -m dune_atlas_pipeline.mars.sidecars all` ran unchanged on the 5° grid: 23 field pyramids + qsdiv + rho_mean (one level each, 36 × 72; keepbits 12, maximum relative error 1.2e-4), cells-aux.zarr (qsdiv, rho_mean, elev_mean from `native_grid.py elev-mean`), and `registry/mars/datasets/macda-v2-my30/` (`qsat_fields.yaml`, `x_extra_fields.yaml`, `qsat_field_metadata.json`; sources relative to the dataset prefix). Climates: qsdiv ±0.093 m/kyr (p98 of |qsdiv| over dune cells at 200 µm; median −0.008 m/kyr, 75 % negative), rho_mean p2/p98 0.0093 / 0.026 kg m⁻³.

## 5. Physical sanity (all 2,592 cells × 8,023 samples, unrounded)

| quantity | min | p1 | median | p99 | max |
|---|---|---|---|---|---|
| T (K) | 138.0 | 141.1 | 188.4 | 260.8 | 283.4 |
| ps (Pa) | 139.6 | 220.3 | 550.5 | 962.7 | 1416.5 |
| ρ (kg m⁻³) | 0.00349 | 0.00701 | 0.01555 | 0.03194 | 0.04765 |
| z (m) | 3.568 | 3.649 | 4.870 | 6.742 | 7.327 |
| \|U\| (m/s) | 1.1e-05 | 0.567 | 5.719 | 35.71 | 53.24 |

u −49.14 … 53.22 m/s, v −36.87 … 38.74 m/s. ps 140 Pa (87.5°S 5°E at Ls 143°, the southern winter cap near the annual pressure minimum) to 1417 Pa (Hellas, 37.5°S 55°E); T 138 K at that same sample (CO₂ frost point; T < 145 K only south of 52.5°S) to 283 K (42.5°S 105°W, Ls 256°). FV3 for reference: T 137.5 … 291.2 K, ρ 0.0024 … 0.045 kg m⁻³, z 1.49 … 3.23 m. The MACDA wind is that of its lowest sigma level, 3.6 … 7.3 m above the surface (FV3 lowest-layer mid height 1.5 … 3.2 m); u* is computed at each sample's own z, as for FV3. Area-weighted annual-mean ρ: 0.0158 kg m⁻³ (FV3 0.0164).

## 6. Stores (local, not uploaded)

| store | objects | bytes |
|---|---|---|
| source/macda-v2-my30.zarr (contract source, staging only) | 25 | 291,040,731 (291.0 MB) |
| …/macda-v2-my30/cells.zarr (series (36, 72, 5, 8023), fields (36, 72, 23, 64), dunes, dune, ls, sol) | 41 | 240,298,935 (240.3 MB; series 228,898,129, fields 11,330,661) |
| …/macda-v2-my30/cells-aux.zarr (qsdiv, rho_mean, elev_mean) | 23 | 750,455 |
| …/macda-v2-my30/fields/ (25 pyramids) | 273 | 8,695,366 (8.7 MB) |

Prefix `dune-atlas/mars/v2/datasets/macda-v2-my30` (spec `prefix`).

## 7. Comparison with FV3 at three dune regions (d = 200 µm)

The nominal points (80°N 180°E, 9°N 67°E, 5°S 137°E) lie on cell edges of one or both grids, so each dataset uses the cell containing a representative point inside the dune field (dune-cover fraction in brackets). Mean |U| and z are annual means of the lowest-level series (FV3 from the published v2 cells.zarr, whose fields equal its export at these cells); DP and RDP in m²/yr (packed sand, 1 yr = 365.25 d); RDD as the compass bearing the resultant drift points to. Values MACDA / FV3.

| region | MACDA cell | FV3 cell | mean \|U\| (m/s) | mean z (m) | DP | RDP | RDD (°) |
|---|---|---|---|---|---|---|---|
| Olympia Undae (81N, 179W) | 82.5, -180 (0.690) | 81, -179 (1.000) | 5.15 / 3.48 | 4.33 / 1.91 | 7.24 / 1.77 | 3.83 / 0.53 | 251 / 236 |
| Nili Patera (9N, 67E) | 7.5, 65 (0.009) | 9, 67 (0.050) | 6.33 / 5.04 | 5.44 / 2.43 | 3.82 / 2.44 | 1.52 / 1.35 | 281 / 304 |
| Bagnold dunes, Gale (4.7S, 137.4E) | -2.5, 135 (0.002) | -5, 137 (0.037) | 6.32 / 6.95 | 5.49 / 2.42 | 2.76 / 11.27 | 0.52 / 7.36 | 36 / 6 |

Over all dune cells (dune-fraction × cos φ weighted): DP 18.2 / 4.5 m²/yr, RDP/DP 0.49 / 0.65 (MACDA 1,033 dune cells, FV3 2,749). Sampling alone does not explain the differences: FV3 recomputed from every second hour (both phases) changes DP by −0.8/+0.9 % (Olympia), −6.5/+6.5 % (Nili), +2.7/−2.6 % (Gale) and RDD by ≤ 2°. The differences are those of the two atmospheres: MACDA's lowest-level winds sit about twice as high (4–5.5 m vs 2–2.4 m), it is a 5° reanalysis of Mars Year 30 against a 2° free-running GCM year, and at Gale the MACDA cell (300 km, centred 2.5°S 135°E) is larger than the crater (about 154 km) and centred northwest of the Bagnold dunes. Olympia Undae drifts to the southwest to west-southwest in both (251° / 236°), Nili Patera to the west to northwest (281° / 304°); at Gale the resultants point northeast (MACDA) and north (FV3).

## 8. Tests

`pipeline/tests/test_mars_source_macda.py` (no network): lowest level and interfaces (p = s ps, ρ, z against the closed forms), Mars-year selection of a block-permuted store (and rejection of a gap or duplicate), contract orientation on the native grid (identity) and from a flipped / 0–360° source, rejection of off-grid centres, and the subsolar-longitude time-of-day check on a synthetic shortwave field. `pytest pipeline/tests/test_mars_*.py` passes with the default dataset (FV3).

## 9. Notes

* Two-hourly sampling (12 per sol) is the MACDA output; FV3 is hourly. The per-sample threshold and flux are as for FV3; the fields are time means over the 8,023 samples.
* `ls` is the MACDA model Ls; `sol` is MACDA `time` (sols since MY24 start). Both are stored as given, so a sample can be traced to the source by its `time`.
* `elev_mean` and the dune fraction on this grid come from `native_grid.py` (inputs `elev_mean_macda-v2-my30.npz`, `dunefrac_macda-v2-my30.npz`).
