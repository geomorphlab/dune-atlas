"""Writes docs/validation-mars-fields.md from the build records in staging/mars/export (v1) and staging/mars/export_v0.

Section 11 (v2, packed-sand fluxes) is maintained by hand from staging/mars/v2/verify_v2.json and is not written
by this script: re-running it drops section 11.

    python scripts/mars/data/make_validation_doc.py
"""
import json
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[3]
E1, E1b, E0 = REPO / "staging/mars/export", REPO / "staging/mars/export_v1-199", REPO / "staging/mars/export_v0"


def J(p):
    return json.load(open(p))


s = J(E1 / "stats.json"); bs = J(E1b / "build_summary.json"); val = J(E1b / "validate.json")
cmp_ = J(E1b / "compare_v0_v1.json"); sc = J(E1 / "sidecars_stats.json")
sp = J(E1 / "splice_summary.json"); vsp = J(E1 / "validate_splice.json"); val2 = J(E1 / "validate.json")
s1b = J(E1b / "stats.json"); x1b = np.load(E1b / "fields_export.npz"); sizes = J(E1 / "sizes.json")
s0 = J(E0 / "stats.json"); bs0 = J(E0 / "build_summary.json"); kbb = J(E0 / "keepbits_benchmark.json")
reg0 = J(E0 / "assessment_regression.json")
x1, x0 = np.load(E1 / "fields_export.npz"), np.load(E0 / "fields_export.npz")
rho_same = bool(np.array_equal(x1["rho_mean"], x0["rho_mean"]))
fv = list(x1["field_vars"])
nan1 = np.isnan(x1["fields"])


def f(x, n=3):
    return f"{x:.{n}g}"


def prow(d, keys=("p1", "p5", "p25", "p50", "p75", "p95", "p99")):
    return " | ".join(f(d[k]) for k in keys)


kb = bs["keepbits"]
L = []
A = L.append
A("# Validation: Mars wind fields (FV3 beta 1, cells.zarr, pyramids, sidecars)\n")
A("Wind track of the Mars build (docs/mars-spec.md). **Current build v1** (2026-10-14): u* from the smooth-wall mixing-length "
  "profile of Pähtz & Durán (2023) eq. 2.2 under constant stress at each hour's lowest-level height z (spec §2, physics change "
  "5b92eff); series (u, v, T, ρ, z). The first build **v0** used a neutral log law with z₀ = 1 mm at a fixed 2 m and a 4-variable "
  "series; it is kept on Gadi as `cells.zarr.v0` until integration and compared in §6. **Default grain size 200 µm** "
  "(PI, 2026-10-14; commit 7dad373): node 29 of the d axis moved from 199 to exactly 200 µm; that one node of every "
  "d-dependent product was recomputed (§3a) and the store before the change is kept as `cells.zarr.v1-199`. Code: "
  "`pipeline/src/dune_atlas_pipeline/mars/` (`fields.py` engine, `cells.py` store builder and validation, `stats.py`, "
  "`fixture.py`, `pyramids.py`, `sidecars.py`), `pipeline/gadi/mars/cells_job.sh`, `scripts/mars/data/`. Gadi code snapshot of "
  "the v1 store: `wind-39b1329`.\n")
A("## 1. Method\n")
A("* **Per hour and cell** (spec §2): u, v = `ucomp_bot`, `vcomp_bot`; T = `temp_bot`; ρ_f = p/(R T) with p the lowest-layer mid "
  "pressure (`physics.air_state`, interfaces ak/bk −1 bottom, −2 top); z = (R T/g) ln(p_lo/p) (`physics.layer_height`); "
  "ν = μ(T)/ρ_f; u* solves |U| = u* u⁺(z u*/ν) on the tabulated eq. 2.2 profile (`physics.friction_velocity`); ua = atan2(v, u).")
A("* **Law** (spec §3): u*,th(d, ρ_f, T) (`physics.threshold`, eq. 5.1 with the Knudsen-corrected D*) and q(u*) "
  "(`physics.transport_rate`, eq. 3.2), per hour, 64 grain sizes d = 50…1000 µm.")
A("* **Fields** (`mars/fields.py`): sample-weighted generalisation of `qsat_compute.qsat_fields` — every histogram reduction "
  "Σ n x / Σ n becomes Σ wᵢ xᵢ / Σ wᵢ over hours (wᵢ = 1); the flux law is injected per hour and d as q = a x + b x², "
  "x = u² − u*,th² (eq. 3.2 is exactly quadratic in the excess Shields number; a, b are read off `physics.transport_rate` at "
  "Θ − Θ_t = 1, 2 and checked at a third point to 1e-11 on every call). Crest modes α_E/α_H with the Earth periodic-spline mode "
  "finders on the same 129 orientations, u_c = u*(1 + βA|sin(ua − α)|) with the same hour's threshold; DP/RDP/RDD/RDP-DP of "
  "q(u*); uft/ufm from u*/u*,th per hour; qhbf/qhef with the `qsat_view` rules; derived ratios as Earth. Fields come from the "
  "unrounded float32 GCM values; fluxes m²/s in cells.zarr, m²/yr (365.25 d) in the pyramids.")
A("* numba loops (Gadi) and a vectorised numpy reference agree to ≤ 1e-11.\n")
A("## 2. Equivalence with the Earth histogram code\n")
A("Earth histogram bins as samples (speed-bin centres u*_f, direction centres, weights = counts) with the Earth law "
  "(a = u*,th FLUXK, b = 0; mode kernel (u_c² − u*,th²)u*,th) against `qsat_compute.qsat_fields` (`test_mars_fields.py`):\n")
A("| input | cells | max |Δ| / max|ref| over 23 × 64 values | NaN pattern |")
A("|---|---|---|---|")
A("| synthetic histograms (incl. one empty cell) | 5 | 8.6e-12 (numpy and numba) | identical |")
A("| ERA5-Land fixture cells (`dune-atlas/staging/fixture/cells.zarr`, read-only; 657,455 h each) | 8 | 4.2e-12 (numpy and numba) | identical |\n")
A("Test tolerance 1e-10. Excluded from the mode comparison: a single-bin histogram whose splines vanish on whole intervals "
  "(α_E is then an arbitrary tie-break in both codes); its crest fluxes at given modes agree. The engine is unchanged by the "
  "u* change (only the u* input differs). Other tests: the injected law equals `physics.transport_rate`; DP, RDP, uft, ufm equal "
  "first-principles means of `physics.flux`; the u* used satisfies |U| = u* u⁺(z u*/ν) to 1e-9; weights equal repeated samples.\n")
A(f"**Timing, one real-size cell** (16,032 h × 64 d): 0.24 s on the laptop (numba, incl. 0.045 s for the eq. 2.2 u* "
  f"bisection); Gadi {bs['s_per_cell_core']} s per cell-core with 48 workers on one node (v0: {bs0['s_per_cell_core']}).\n")
A("## 3. Gadi jobs\n")
A("| job | PBS id | resources | walltime | SU | result |")
A("|---|---|---|---|---|---|")
A("| v0 pilot: 3 shards (768 cells) + keepbits benchmark | 181179492 | normal, 8 cpu, 32 GB (used 21.8 GB) | 5 min 05 s | 1.36 | 112 s per 256-cell shard |")
A(f"| v0 full: 72 shards, export, statistics, fixture | 181180240 | normal, 48 cpu, 190 GB (used 32.5 GB) | 9 min 50 s | 15.73 | superseded |")
A(f"| **v1 full**: 72 shards into cells.zarr.new, validate, statistics, fixture, swap | 181184011 | normal, 48 cpu, 190 GB (used 32.5 GB) | 11 min 36 s | 18.56 | read {bs['read_s']} s, pool {bs['pool_wall_s']} s, stats {s1b['elapsed_s']} s; validated, swapped |")
A(f"| **d node 29 → 200 µm**: copy, recompute node 29 from the GCM file, validate, export, statistics, fixture, swap | {sp.get('pbs_id', '')} | normal, 16 cpu, 64 GB | {sp.get('walltime', '')} | {sp.get('su', '')} | §3a |")
A(f"| **total** | | | | **{35.65 + float(sp.get('su', 0)):.2f}** | |\n")
A("Staging, harvests and mirror copies ran as login-node wrapper commands (no SU). The v1 job validated the new store "
  f"(`cells.validate`: layout/attrs, 72 + 72 shard objects, finite series in range at 6 random cells, fields recomputed from the stored "
  f"series at 2 cells: median relative difference {max(val['recompute_median_rel_diff']):.1e}) before moving the v0 store to "
  "`cells.zarr.v0` and the new one into place.\n")
A("### 3a. Default node 199 → 200 µm\n")
A(f"Only node 29 of the d axis changed (constants 7dad373; the other 63 nodes are unchanged), and the field engine treats "
  f"every node independently, so `cells.py splice` recomputed `fields[..., 29]` at d = 200 µm for all 16,200 cells from the "
  f"**unrounded** GCM series (as the v1 build), on a copy of the store whose unchanged series chunks are hard links. Checks: "
  f"the series rebuilt from the GCM file and bit-rounded equal the stored series ({sp['series_identical_cells']} sample cells); "
  f"neighbouring nodes recomputed on their own reproduce the stored values (control: {sp['control_mismatches']} differing "
  f"values in {sp['control_cells']} cells, max relative difference {sp['control_max_rel']:.1e}); `validate-splice`: all other "
  f"63 nodes bit-identical to the previous store, series identical; `validate` passed again (recompute from the stored series: "
  f"median relative difference {max(val2['recompute_median_rel_diff']):.1e}). Smoothness of node 29 against its neighbours "
  f"(189 and 208 µm), new 200 µm node vs the replaced 199 µm node:\n")
A("| field | cells | inside [f(189), f(208)] new / old | \\|f − quadratic fit\\| / local range, p50 new / old | p99 new / old | median change 200 vs 199 µm |")
A("|---|---|---|---|---|---|")
for v, r in vsp["vars"].items():
    n, o = r["new"], r["old"]
    A(f"| {v} | {n['cells']} | {n['frac_inside_neighbours']:.3f} / {o['frac_inside_neighbours']:.3f} | {n['quad_dev_p50']:.4f} / "
      f"{o['quad_dev_p50']:.4f} | {n['quad_dev_p99']:.3f} / {o['quad_dev_p99']:.3f} | {100 * r['median_rel_change_vs_old_node']:+.2f} % |")
A("\nThe quadratic fit uses the four neighbours (172, 189, 208, 218 µm) in ln d. The threshold u*,th(d) of eq. 5.1 has a kink "
  "(maximum of two branches at D* = 18) that falls in 150–300 µm for Mars air, so node 29 departs from a smooth fit more than "
  "nodes far from the kink, equally for the old and the new node. Undefined values at node 29: "
  f"{vsp['nan_new_node']} (199 µm: {vsp['nan_old_node']}).\n")
A("## 4. Series bit rounding (keepbits)\n")
A("keepbits per variable from the whole-grid data maxima so that half an ulp at the top binade meets the contract "
  "(≤ 0.005 m/s, ≤ 0.02 K, ≤ 0.05 % ρ, ≤ 1 mm z); realised maximum errors over all 16,200 × 16,032 values (v1):\n")
A("| var | range | keepbits | max error | tolerance |")
A("|---|---|---|---|---|")
for v, u in (("u", "m/s"), ("v", "m/s"), ("T", "K"), ("rho", "kg m⁻³"), ("z", "m")):
    k = kb[v]
    err = f"{100 * k['max_err']:.4f} %" if v == "rho" else f"{k['max_err']:.3g} {u}"
    tol = "0.05 %" if v == "rho" else f"{k['tol'][1]} {u}"
    A(f"| {v} | {f(k['min'], 4)} … {f(k['max'], 4)} {u} | {k['keepbits']} | {err} | {tol} |")
A("\nv0 benchmark on the Nili Patera shard (256 cells; blosc zstd-5 bitshuffle per cell and variable, kB per cell; z was not part of "
  "v0):\n")
ks = [8, 10, 12, 13, 14, 16, 23]
A("| var | " + " | ".join(("lossless" if k == 23 else f"k={k}") for k in ks) + " |")
A("|---|" + "---|" * len(ks))
for v in ("u", "v", "T", "rho"):
    rows = {r["keepbits"]: r for r in kbb["rows"][v]}
    A(f"| {v} | " + " | ".join(f"{rows[k]['bytes_per_cell'] / 1000:.1f}" for k in ks) + " |")
sb = bs["store_bytes"]
c1 = s["consistency_rounded_series"]
A(f"\nv1 series {sb['series']['bytes'] / 1e9:.3f} GB ({sb['series']['bytes'] / 16200 / 1e3:.0f} kB per cell, 5 variables; v0 "
  f"{bs0['store_bytes']['series']['bytes'] / 1e9:.3f} GB for 4). Effect on the fields: recomputing 12 cells from the stored rounded "
  f"series gives a median relative difference of {c1['median_rel_diff']:.1e}, maximum {c1['max_rel_diff']:.2g} (in near-zero "
  f"values; NaN pattern mismatches {c1['nan_pattern_mismatches']}).\n")
A("## 5. Stores (v1)\n")
A("| store | where | size | objects |")
A("|---|---|---|---|")
A(f"| cells.zarr (series (90, 180, 5, 16032) 72 shards, fields 72 shards, dunes, dune, ls, sol) | Gadi `/scratch/k10/ag5517/dune-atlas/mars/stores/datasets/fv3-beta1/cells.zarr` | {sizes['cells_bytes'] / 1e9:.3f} GB (series {sb['series']['bytes'] / 1e9:.3f} GB, fields {sizes['fields_bytes'] / 1e6:.1f} MB) | {sizes['cells_objects']} |")
A(f"| cells.zarr fixture subset (fields 21 shards = 3 × 3 around each site; series the 3 site shards (0,9), (2,7), (4,6)) | devroot `…/fv3-beta1/cells.zarr` | {sizes['fixture_mb']:.0f} MB | {sizes['fixture_objects']} |")
A(f"| fields/<var>.zarr × 23 + qsdiv (d, y, x), rho_mean (y, x); one level at 2° | devroot `…/fv3-beta1/fields/` and Gadi mirror | {sizes['pyramids_mb']:.0f} MB | {sizes['pyramids_objects']} |")
A(f"| cells-aux.zarr: qsdiv (lat, lon, d) m/yr, rho_mean, elev_mean (lat, lon) | devroot `…/fv3-beta1/cells-aux.zarr` and Gadi mirror | 4.6 MB | {sum(sc['cells_aux']['objects'].values())} |")
A("| fields_export.npz (fields (23, 64, 90, 180) float32, rho_mean, dunes) | Gadi `…/fv3-beta1/export/`, `staging/mars/export/` | 84 MB | 1 |\n")
dmv = x1["fields"][fv.index("dpm")]
nq = {v: np.isnan(x1["fields"][fv.index(v)]) for v in ("qha_rdp_dp", "ufm", "qhef", "qhne_ac_nl")}
A(f"Undefined field values: {int(nan1.sum())} (v1 at 199 µm {int(np.isnan(x1b['fields']).sum())}, v0 {bs0['fields_nan']}), Earth conventions: qha_rdp_dp and ufm "
  f"({int(nq['ufm'].sum())} each, {int(nq['ufm'].any(0).sum())} cells) where no hour exceeds the threshold (DP = uft = 0; "
  f"{int((dmv[0] == 0).sum())} cells at 50 µm, {int((dmv[63] == 0).sum())} at 1000 µm; at 102 / 200 / 405 µm: "
  f"{int((dmv[15] == 0).sum())} / {int((dmv[29] == 0).sum())} / {int((dmv[44] == 0).sum())}), and qhef / "
  f"qhne_ac_nl ({int(nq['qhef'].sum())} each, {int(nq['qhef'].any(0).sum())} cells, d ≥ 752 µm) where there is no "
  f"elongation-mode crest flux. No Ga√s violations (minimum Ga√s = {bs['ga_sqrt_s_min']:.1f}). "
  "elev_mean is the Terrain track's spherical-area-weighted cell mean of the MOLA–HRSC DEM (`elev_mean.npz`), added with "
  "`cellsaux.write_variable`.\n")
A("## 6. Old (v0) vs new (v1)\n")
A("This comparison was made when the default node was 199 µm (both v0 and v1 at node 29 = 199 µm); the default node has "
  "since moved to 200 µm (§3a), which changes node-29 values by the small amounts in the §3a table. Same hours and winds; v0 u* = 0.4 |U| / ln(2 m / 1 mm), v1 u* from eq. 2.2 at the hour's z. Dune cells = 1,208 cells with "
  "> 1 % cover; percentiles over cells (DP, RDP, uft) or over all dune-cell hours (u*).\n")
cu = cmp_["ustar_dune"]
A("| quantity | v0 | v1 | v1 / v0 |")
A("|---|---|---|---|")
for k in ("p50", "p95", "p99"):
    A(f"| u* {k} (m/s), dune hours | {cu['old_v0_loglaw'][k]:.3f} | {cu['new'][k]:.3f} | {cu['new'][k] / cu['old_v0_loglaw'][k]:.3f} |")
ca = cmp_["ustar_all"]
for k in ("p50", "p99"):
    A(f"| u* {k} (m/s), all hours | {ca['old'][k]:.3f} | {ca['new'][k]:.3f} | {ca['new'][k] / ca['old'][k]:.3f} |")
r = cu["per_hour_ratio_new_over_loglaw"]
A(f"\nPer-hour ratio u*(v1)/u*(v0) at dune cells: p5/p25/p50/p75/p95 = {r['p5']:.3f} / {r['p25']:.3f} / {r['p50']:.3f} / "
  f"{r['p75']:.3f} / {r['p95']:.3f} (effective roughness below 1 mm for most hours; above 1 for the calmest, most viscous hours). "
  "The v0 log law recomputed in the v1 statistics from the v1 series reproduces the v0 numbers exactly (same winds).\n")
A("| d | quantity (dune cells) | v0 p5 / p50 / p95 | v1 p5 / p50 / p95 | v0 mean | v1 mean | per-cell v1/v0 p5 / p50 / p95 |")
A("|---|---|---|---|---|---|---|")
names = {"dpm": "DP (m² yr⁻¹)", "rdpm": "RDP (m² yr⁻¹)", "uft": "fraction of hours above threshold"}
for um, v in cmp_["d"].items():
    for q in ("dpm", "rdpm", "uft"):
        d = v[f"{q}_dune"]
        rr = v[f"{q}_ratio_new_over_old_dune_p5_p50_p95"]
        A(f"| {um.replace('um', ' µm')} | {names[q]} | {' / '.join(f(x) for x in d['old_p5_p50_p95'])} | "
          f"{' / '.join(f(x) for x in d['new_p5_p50_p95'])} | {f(d['old_mean'])} | {f(d['new_mean'])} | {' / '.join(f(x) for x in rr)} |")
A("\nAll cells (16,200), DP p50 and uft mean, v0 → v1: " + "; ".join(
    f"{um.replace('um', ' µm')}: DP {f(v['dpm_all']['old_p5_p50_p95'][1])} → {f(v['dpm_all']['new_p5_p50_p95'][1])}, "
    f"uft {f(v['uft_all']['old_mean'])} → {f(v['uft_all']['new_mean'])}" for um, v in cmp_["d"].items()) + ".")
A("DP falls by more than u* (a factor ≈ 2.4–3.4 at the median) because most transport occurs close to threshold, where "
  "q ∝ (u*² − u*,th²) amplifies a 10–15 % drop in u*. Registry colour limits were recomputed from v1 (§8).\n")
A("## 7. FV3 statistics (v1)\n")
A(f"Dune cells: {s['dune_cells_gt_1pct']} with > 1 % cover ({s['dune_cells_gt_0']} with any). Dune-cell percentiles are exact over "
  "all hours of those cells; all-cell percentiles from log-histograms (bin width 0.2 %) with exact p0/p100.\n")
A("| quantity | set | p1 | p5 | p25 | p50 | p75 | p95 | p99 | min … max |")
A("|---|---|---|---|---|---|---|---|---|---|")
for key, lab in (("rho", "ρ_f (kg m⁻³)"), ("z", "z (m)"), ("ustar", "u* (m/s)"), ("ut_ddef", "u*,th at 200 µm (m/s)")):
    for st in ("dune", "all"):
        d = s[f"{key}_{st}"]
        A(f"| {lab} | {st} | {prow(d)} | {f(d['p0'])} … {f(d['p100'])} |")
fa = s["frac_hours_above_threshold_ddef"]
A(f"\nFraction of hours with u* > u*,th (200 µm): dune cells {fa['dune_cells']:.3f}, all cells {fa['all_cells']:.3f} (stored uft; "
  f"from the rounded series {fa['dune_cells_from_series']:.3f} / {fa['all_cells_from_series']:.4f}).\n")
A("DP (stored dpm, m² yr⁻¹, per Earth year):\n")
A("| d | set | p5 | p25 | p50 | p75 | p95 | p99 | cells with DP = 0 |")
A("|---|---|---|---|---|---|---|---|---|")
for um, v in s["dp_m2_per_yr"].items():
    for st in ("dune", "all"):
        A(f"| {um.replace('um', ' µm')} | {st} | {prow(v[st], ('p5', 'p25', 'p50', 'p75', 'p95', 'p99'))} | {v['frac_cells_dp_zero']:.4f} |")
vv = s["validity_ga_sqrt_s_le_81"]
A(f"\nValidity Ga√s > 81: {vv['pairs']} of {vv['pairs_total']:,} (hour, d) pairs violate it; {vv['hours_any_d']} hours with any "
  "violation (expected 0).\n")
A("Seasonality at d = 200 µm: share of the annual flat-bed flux (and of the hours) per 30° Ls bin, %:\n")
bins = [f"{a}–{b}" for a, b in s["sites"]["Nili Patera"]["ls_bins_deg"]]
A("| site (cell centre, cover) | " + " | ".join(bins) + " | DP m² yr⁻¹ (v0 at 199 µm) | uft (v0 at 199 µm) |")
A("|---|" + "---|" * (len(bins) + 2))
for n, v in s["sites"].items():
    o = s0["sites"][n]
    A(f"| {n} ({v['lat']:g}°, {v['lon']:g}°, {100 * v['dunes']:.0f} %) | " + " | ".join(f"{100 * x:.1f}" for x in v["flux_share"])
      + f" | {v['dp_m2_per_yr']:.2f} ({o['dp_m2_per_yr']:.2f}) | {v['uft']:.3f} ({o['uft']:.3f}) |")
A("| hours (all sites) | " + " | ".join(f"{100 * x:.1f}" for x in s["sites"]["Nili Patera"]["hours_share"]) + " | | |\n")
A("Site cells: the cell with the largest dune cover within ±1 cell of the nominal point (Nili Patera 9°N 67°E, Proctor 47°S 30°E, "
  "north polar erg 81°N 120°E). The polar erg has no flux for Ls 90–150° at this grain size.\n")
q = sc["qsdiv_dune_ddef"]
A(f"Flux divergence (R = 3389.5 km) at 200 µm over dune cells: median {q['median_m_per_kyr']:.4f} m/kyr, "
  f"{100 * q['frac_negative']:.0f} % negative (convergence), p98 |qsdiv| = {q['p98_abs_m_per_kyr']:.3f} m/kyr → registry clim "
  f"±{sc['qsdiv_clim_m_per_kyr'][1]} m/kyr (v1 at 199 µm ±0.032, v0 ±0.061).\n")
A("### Regression against the assessment-stage statistics\n")
A(f"Assessment artifact `fv3_stats.npz` (afbfe333…, same FV3 file): annual-mean ρ_f per cell identical to the assessment (ratio "
  f"1.0000 at p1/p50/p99 over all 16,200 cells; v1 ρ_mean {'bit-identical to' if rho_same else 'differs from'} v0). The v0 u* "
  "(log law) reproduced the assessment's per-cell u* p50/p99 within 2–4 % after the change of z₀ and z was factored out "
  f"(768 cells: {reg0['ustar_fixture_cells']['ratio_after_log_law_rescaling_p50']} at p50); v1 u* relates to v0 as in §6.\n")
A("## 8. Registry and metadata\n")
A("`registry/mars/qsat_field_metadata.json` (Earth canonical names/units/descriptions, reworded for hourly samples and the per-hour "
  "Pähtz & Durán threshold; p2/p98 at d = 200 µm over all cells, recomputed from v1 after the node change), `registry/mars/generated/qsat_fields.yaml` "
  "(23 layers, '{dataset}/fields/<var>.zarr', clim from the v1 p2/p98) and `registry/mars/generated/x_extra_fields.yaml` (qsdiv "
  f"±{sc['qsdiv_clim_m_per_kyr'][1]} m/kyr, rho_mean {sc['rho_clim']} kg/m³). `cd app && npm run validate-registry:mars`: OK.\n")
A("## 9. Tests\n")
A("`cd pipeline && PYTHONPATH=src python -m pytest -q -p no:cacheprovider`: `test_mars_fields.py` (9), `test_mars_cells.py` (4), "
  "`test_mars_sidecars.py` (2) pass with numba (the numba-vs-numpy test skips without it). Whole-suite results are in the Wind "
  "report; the 7 Earth tests that read `staging/drift/qsat_drift.zarr` need `DUNE_ATLAS_DRIFT` pointing at the Earth checkout "
  "(the Mars worktree has no Earth staging data).\n")
A("## 10. Notes\n")
A("* numba is not in the local `dune-atlas` env; the numpy backend is used automatically there (3–5× slower).")
A("* The fixture has hourly series for the three site shards only (≈ 30 MB per shard); fields cover 3 × 3 shards per site.")
A("* `stats.json` p0/p100 are exact extremes since v1 (the v0 file reported the lowest histogram bin edge for the all-cell p0).")
(REPO / "docs" / "validation-mars-fields.md").write_text("\n".join(L) + "\n")
print(len(L))
