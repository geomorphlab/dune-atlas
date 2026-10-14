# Mars dune atlas: specification (v1)

Single source of truth for the Mars build. Approved by the PI on 2026-10-14 (constants, law variant, grain-size
slider, repo strategy, Gadi venv, Esri basemaps: CTX1, HiRISE, MDIM and MColorDEM ship live per the PI, 2026-10-14; licence and attributions in mars-app.md §3). Anything not stated here follows the Earth atlas unchanged.
Ask before changing any value in sections 2–4.

## 1. Inputs

| input | location | notes |
|---|---|---|
| Winds | MCMC FV3-based Mars GCM, Beta Output Release 1, c48 reference run, 6th simulated year: `03340.atmos_daily.nc` (5.19 GB), `03340.fixed.nc`, `README_BETARELEASE.txt` from `https://data.nas.nasa.gov/legacygcm/fv3betaout1/fv3betaout1/` (the folder has no checksum file; byte sizes were checked and md5s recorded locally after download) | 2°×2° (lat −89…89, lon 1…359 °E), hourly instantaneous, 16,032 steps; variables `ucomp_bot`, `vcomp_bot`, `temp_bot`, `ps`, `ts`, `areo`; hybrid coordinate `ak`, `bk`. The server ignores HTTP range requests, so download whole files. |
| Dunes | PI shapefile `dunes.{shp,shx,dbf,prj,cpg}` (artifact c594ddf0…): the USGS Mars Global Digital Dune Database (MGD3; Hayward et al. 2007, 2010, 2012, 2014) plus the small dune fields of Fenton (2020), merged. Fenton, L. K. (2020). Updating the global inventory of dune fields on Mars and identification of many small dune fields. Icarus, 352, 114018. https://doi.org/10.1016/j.icarus.2020.114018 | 3,514 polygons, Mars 2000 sphere R = 3,396,190 m, lon −180…180; no attributes. 553 polygons < 1 km² (MGD3 mapped only fields > 1 km²); equatorward of 65° (area centroid) 2,634 polygons, 120,072 km² (MGD3 equatorial ≈ 70,000 km² plus Fenton's 52,032 km², merged) |
| Topography | `/g/data/k10/ag5517/omega-claude/data/raw_mola/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif` (11.38 GB, read in place, never modified) | USGS Astrogeology MGS MOLA–MEX HRSC blended DEM, global, 200 m/px. Citation and licence to be copied from https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m |

## 2. Per-hour atmospheric state (from the GCM, every cell and hour)

* Lowest-layer mid pressure p = ½[(ak[−2] + bk[−2]·ps) + ps] (Pa).
* ρ_f = p / (R T), with T = `temp_bot`.
* Wind vector (u, v) = (`ucomp_bot`, `vcomp_bot`) at that hour's lowest-level height z = (R T/g) ln(p_lo/p), with p_lo = ak[−1] + bk[−1]·ps (the surface) and p the layer-mid pressure above (≈ 1.6–3 m; per PI 2026-10-14).
* Direction ua = atan2(v, u) (toward, CCW from east, as on Earth).
* u* from the smooth-wall mixing-length profile of Pähtz & Durán (2023) eq. 2.2, dl_m/dz = κ[1 − exp(−√(u l_m/(7ν)))], under constant total stress ρ(ν + l_m²|du/dz|)du/dz = ρu*² (no transport feedback, no roughness length; per PI 2026-10-14, replacing the earlier neutral log law with z₀ = 1 mm at a fixed 2 m).
  * In "+" units this gives one universal profile u⁺ = u/u* as a function of X = z u*/ν. It is integrated once from the non-trivial wall branch (u⁺ = X, l⁺ = κ²X³/63 for X ≪ 1; l⁺ ≡ 0 is a spurious solution).
  * The result is tabulated in `pipeline/src/dune_atlas_pipeline/mars/profile_table.json` (1,201 points, ln X from ln 10⁻² to ln 10⁸). That table is the single source for the pipeline and the browser.
  * Below the table u⁺ = X; above it the log layer continues as u⁺ = ln(cX)/κ with c = 7.85 (the paper quotes ≈ 9 as approximate).
  * Each hour: solve |U| = u*·u⁺(z u*/ν) for u* by fixed-step bisection in ln u* (60 steps, bracket 10⁻⁶–30 m/s; identical in TS).
  * Compared with the old law, u* is 1–20 % lower for typical hours (effective roughness ν/(c u*) ≈ 0.1–0.9 mm).
* μ(T) = μ₀ (T/T₀)^{3/2} (T₀ + S)/(T + S) (Sutherland, CO₂), and ν = μ/ρ_f.

## 3. Transport law: Pähtz & Durán (2023), J. Fluid Mech. 963:A20

All quantities per hour; d is the slider value (§5).

* s = ρ_p/ρ_f, g̃ = (1 − 1/s) g
* d⁺ = g̃ d / (g̃ ν)^{2/3}   (eq. 2.7)
* Knudsen correction (eq. 3.20):
  * c = √(k R T), Kn = √(πk/2) · ν / (c d)
  * f_Kn = 1 + Kn [2.49 + 0.84 exp(−1.74/Kn)]
  * D* = √f_Kn · √s · d⁺
  * **Typo correction 2:** the paper prints Kn = √(πk/2)·s/(c⁺d⁺). The extra factor s contradicts kinetic theory (λ = ν√(πk/2)/c) and the paper's own statement that f_Kn ≈ 1 for s ≲ 10⁶, so it is omitted. Kn = √(πk/2)/(c⁺d⁺) with c⁺d⁺ = c d/ν.
* Cessation threshold (eq. 5.1, the experimental fit): u*,th = 2.3 (g̃ν)^{1/3} max[(D*/18)^{−1/2}, (D*/18)^{1/2}]
* Shields numbers: Θ = u*²/(s g̃ d), Θ_t = u*,th²/(s g̃ d)
* Transport (eq. 3.2), for Θ > Θ_t (else 0): Q⁺ / d⁺^{3/2} = 1.7 s^{1/3}(Θ − Θ_t) + 12 s^{1/3}(Θ − Θ_t)², with Q⁺ = Q/(ρ_p ν).
  * Dimensional form: Q = 1.7 s^{1/3} ρ_f (d/g̃)^{1/2} (u*² − u*,th²) + 12 s^{−2/3} ρ_f (g̃³ d)^{−1/2} (u*² − u*,th²)², in kg m⁻¹ s⁻¹.
  * **Typo correction 1:** the paper's eq. 5.2 prints both terms with ρ_p (1.7 s^{1/3} ρ_p …, 12 s^{−2/3} ρ_p …). Eq. 3.2 gives exactly these coefficients with ρ_f in place of ρ_p. The Earth check (u* = 0.4, u*,th = 0.2 m/s, d = 200 µm, ν = 1.5×10⁻⁵) gives 0.017 kg m⁻¹ s⁻¹ with ρ_f, against ~38 with ρ_p. Code from eq. 3.2 in "+" units; `transport_rate_dimensional` pins the equivalence in tests.
* Atlas flux q = Q/ρ_p (m² s⁻¹; volume of grains), displayed in m² yr⁻¹ with 1 yr = 365.25 × 86,400 s (Earth year, as the Earth atlas).
* Validity: Ga√s > 81 with Ga = √(s g̃ d³)/ν. It holds for every hour on the axis; the worst case found is 137 at 50 µm, ρ_f = 0.0035, T = 300 K. Test it per hour and report the fraction of hours violating it (expected 0).
* Crest flux (as Earth, notebook cell 14): u_c = u* (1 + β A |sin(ua − α)|), q_c = q(u_c; same hour's u*,th).
* Flat-bed flux is q(u*).
* Excess-shear classes use u*/u*,th per hour (Earth edges 1, 1.25, 1.5, 2, 3, 5, ∞).

## 4. Constants (approved)

| symbol | value | notes |
|---|---|---|
| ρ_p | 3000 kg m⁻³ | basaltic sand |
| g | 3.71 m s⁻² | |
| R | 191.8 J kg⁻¹ K⁻¹ | Mars air, mean molar mass 43.34 g/mol |
| μ₀, T₀, S | 1.370×10⁻⁵ Pa s, 273 K, 222 K | Sutherland law for CO₂ |
| k | 1.33 | adiabatic exponent, Kn only |
| κ | 0.40 | eq. 2.2 mixing length (paper value) |
| z | lowest-level height, per hour from the GCM | per PI 2026-10-14 |
| mixing-length damping | 7 | eq. 2.2; smooth wall, no z₀ (per PI 2026-10-14) |
| (D*ᵐⁱⁿ, u⁺ᵐⁱⁿ) | (18, 2.3) | eq. 5.1 |
| transport coefficients | 1.7, 12 | eq. 3.2 |
| β, A | 6, 0.8/6 | crest speed-up, as Earth |
| R_Mars | 3,389,500 m | distances, scale bar, divergence |
| year | 365.25 d | flux units m² yr⁻¹ |

## 5. Slider: median grain diameter d (replaces u*,th on Mars)

* 64 values, log-spaced from 50 µm to 1000 µm (d_k = 50·20^{k/63}, rounded to integer µm).
* Default index 29 = 200 µm (exactly; the geometric value 198.5 µm would round to 199, PI 2026-10-14). Registry `threshold` block: `dim: d`, `units: µm`, `label: "Median grain diameter d"`, `defaultIndex: 29`.
* Values: 50, 52, 55, 58, 60, 63, 67, 70, 73, 77, 80, 84, 88, 93, 97, 102, 107, 112, 118, 123, 129, 136, 142, 149, 157, 164, 172, 181, 189, 200, 208, 218, 229, 240, 252, 264, 277, 290, 305, 319, 335, 351, 368, 386, 405, 425, 446, 467, 490, 514, 539, 565, 593, 622, 652, 684, 717, 752, 788, 827, 867, 909, 954, 1000.
* Everything indexed by `ut` on Earth is indexed by `d` on Mars, with identical array shapes:
  * fields (64, y, x)
  * cells `fields` (lat, lon, 23, 64)
  * qsdiv (lat, lon, 64)
  * the modes plot and divergence plot (d on the axis)

## 6. Stores and layout

Grid: FV3 2° (`grid` attrs {lat0: −89, dlat: 2, lon0: 1, dlon: 2, ny: 90, nx: 180, cell_registration: centre}). Every cell is valid on Mars; there is no land mask.

| store | content |
|---|---|
| `cells.zarr` | `series` (lat, lon, 5, 16032) float32 = u, v, T, ρ_f, z (lowest-level height, m), bit-rounded (keepbits benchmarked; ≤ 0.005 m/s, 0.02 K, 0.05 % ρ, 1 mm z); `fields` (lat, lon, 23, 64) float32; `dunes` (overlap fraction, float32) and `dune` (uint8, fraction > 0); 1-D `ls` (16032) and `sol`. Sharding 16×16 cells, inner chunk 1 cell, index at end, blosc zstd-5 bitshuffle (as Earth). |
| `fields/<var>.zarr` × 23 | (64, y, x) GeoZarr pyramids (topozarr layout, as Earth) |
| `cells-aux.zarr` | `qsdiv` (lat, lon, 64); scalars `rho_mean`, `elev_mean` |
| `fields/rho_mean.zarr` | 2-D near-surface air density |
| `fields/elevation.zarr` | 2-D native pyramid (~1/64°, m) from the DEM |
| `dunes/dunes.pmtiles` | vector, as Earth's dunes |
| `basemaps/hrsc-mola-terrarium.pmtiles` | 512-px Terrarium lossless WebP, Web-Mercator lon/lat tiling, maxzoom from the pilot |

## 7. Where things live

| place | path |
|---|---|
| R2 (later; create-only; separate ledger) | `dune-atlas/mars/v1/` → `datasets/fv3-beta1/{cells.zarr, cells-aux.zarr, fields/}`, `dunes/`, `fields/elevation.zarr`, `basemaps/` |
| Gadi scratch (work) | `/scratch/k10/ag5517/dune-atlas/mars/{raw,code,work,logs,stores}` |
| Gadi gdata (retention) | `/g/data/k10/ag5517/dune-atlas/mars/{raw,code}` (raw FV3 + code snapshots only; derived stores are regenerable) |
| Gadi interpreter | `/g/data/k10/ag5517/apps/dune_atlas_venv/bin/python` (system-site-packages; adds `pmtiles` only). PBS needs `-l storage=gdata/k10+gdata/xp65+scratch/k10`. |
| Code | branch `mars` in worktree `~/Developer/research/projects/dune-atlas-mars`; track branches `mars-data`, `mars-terrain`, `mars-app`. The Earth checkout is never touched. |
| Local staging | `<worktree>/staging/mars/` (gitignored). The local disk is ~98 % full: stream large stores in parts and keep only low-zoom DEM tiles locally. |

## 8. Excluded or deferred

* Excluded: aridity, vegetation, land mask, thermal inertia, dust cover, season selector.
* Open items:
  * geology map (USGS SIM 3292)
  * additional Mars wind datasets (MCD, OpenMARS, EMARS) as a dataset selector
  * deployment URL
