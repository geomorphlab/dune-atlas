"""FV3 statistics recomputed from the built Mars cells.zarr (docs/records/validation-mars-fields.md).

Reads the stored (bit-rounded) hourly series and the stored fields, never the GCM file:
  * air density rho: range and percentiles over all hours of the dune cells (cover > 1 %) and of all cells
  * lowest-level height z (per hour from the GCM): percentiles over dune cells and all cells
  * u* from the eq. 2.2 smooth-wall profile at z (physics.friction_velocity): p50 / p99 over dune cells and all
    cells, and for comparison the superseded neutral log law u*_log = 0.4 |U| / ln(2 m / 1 mm) on the same hours
    (dune cells; per-hour ratio u* / u*_log)
  * u*,th at the default d (index D_DEFAULT_INDEX, 200 um; per hour, Pahtz & Duran 2023): distribution over dune-cell
    hours (keys *_ddef*)
  * fraction of hours with u* > u*,th (default d), dune cells and all cells (= mean of the stored uft)
  * DP at d = 102 / 200 / 405 um (stored dpm, m^2/yr): percentiles over dune cells and all cells
  * seasonality: share of the annual flat-bed flux (default d) and of the hours in each 30° Ls bin at three cells
  * validity: fraction of (hour, d) pairs and of hours with Ga sqrt(s) <= 81 (expected 0)
  * consistency: fields recomputed from the stored (rounded) series vs the stored fields, a sample of cells
All-cell percentiles come from fine log-spaced histograms (bin width 0.2 %; p0 / p100 are the exact extremes),
dune-cell percentiles are exact.

    python -m dune_atlas_pipeline.mars.stats --store cells.zarr --out stats.json --nproc 48
"""
from __future__ import annotations

import argparse
import json
import time

import numpy as np

from . import constants as M
from . import physics as P

SHARD = 16
DUNE_MIN = 0.01
D_IDX = {int(M.D_VALUES_UM[k]): int(k) for k in (15, 29, 44)}            # 102, 200, 405 um
assert sorted(D_IDX) == [102, 200, 405]
KDEF = M.D_DEFAULT_INDEX
D_DEFAULT_UM = int(M.D_VALUES_UM[KDEF])
SITES = {"Nili Patera": (9.0, 67.0), "Proctor crater": (-47.0, 30.0), "north polar erg": (81.0, 121.0)}  # cell centre (index 150); 120.0 gave the same cell only via round-half-even
PCTS = [0, 1, 5, 25, 50, 75, 95, 99, 100]
HBINS = {"ustar": np.geomspace(1e-4, 10.0, 5800), "rho": np.geomspace(1e-4, 0.1, 3500),
         "ut_ddef": np.geomspace(1e-3, 10.0, 4700), "z": np.geomspace(0.1, 10.0, 2400)}
OLD_Z, OLD_Z0 = 2.0, 1e-3          # the superseded log law (comparison only; not used by the atlas)


def ustar_loglaw(u, v):
    return M.KAPPA * np.hypot(u, v) / np.log(OLD_Z / OLD_Z0)


def site_cell(dunes, lat, lon):
    """Contract (i, j) of the cell with the largest dune cover within +-1 cell of (lat, lon)."""
    i0 = int(round((89 - lat) / 2)); j0 = int(round((lon + 179) / 2))
    best = None
    for i in range(max(0, i0 - 1), min(90, i0 + 2)):
        for j in range(j0 - 1, j0 + 2):
            jj = j % 180
            if best is None or dunes[i, jj] > dunes[best]:
                best = (i, jj)
    return best


_G = {}


def _init(store):
    import zarr
    from numcodecs import blosc
    blosc.set_nthreads(1)
    g = zarr.open_group(store, mode="r")
    _G.update(series=g["series"], fields=g["fields"], dunes=g["dunes"][:], ls=g["ls"][:])


def _shard(task):
    sy, sx = task
    S = _G["series"][sy:sy + SHARD, sx:sx + SHARD]                       # (by, bx, 5, nt)
    dn = _G["dunes"][sy:sy + SHARD, sx:sx + SHARD]
    by, bx, _, nt = S.shape
    hist = {k: np.zeros(len(v) - 1, np.int64) for k, v in HBINS.items()}
    dune = {"rho": [], "ustar": [], "ut_ddef": [], "z": [], "ustar_log": []}
    ext = {k: [np.inf, -np.inf] for k in HBINS}
    viol_pairs = 0; viol_hours = 0; above_all = 0; n_hours = 0
    for i in range(by):
        for j in range(bx):
            if not np.isfinite(S[i, j]).all():           # unwritten shard (fixture / partial store)
                continue
            u, v, T, rho, z = (S[i, j, k].astype("f8") for k in range(5))
            us, _ = P.friction_velocity(u, v, z, P.viscosity(T) / rho)
            th = P.threshold(M.D_VALUES[None, :], rho[:, None], T[:, None])
            bad = th["ga_sqrt_s"] <= M.GA_SQRT_S_MIN
            viol_pairs += int(bad.sum()); viol_hours += int(bad.any(1).sum())
            ut = th["ut"][:, KDEF]
            above_all += int((us > ut).sum()); n_hours += nt
            for k, x in (("ustar", us), ("rho", rho), ("ut_ddef", ut), ("z", z)):
                hist[k] += np.histogram(np.clip(x, HBINS[k][0], HBINS[k][-1] * 0.999999), HBINS[k])[0]
                ext[k] = [min(ext[k][0], float(x.min())), max(ext[k][1], float(x.max()))]
            if dn[i, j] > DUNE_MIN:
                dune["rho"].append(rho.astype("f4")); dune["ustar"].append(us.astype("f4"))
                dune["ut_ddef"].append(ut.astype("f4")); dune["z"].append(z.astype("f4"))
                dune["ustar_log"].append(ustar_loglaw(u, v).astype("f4"))
    dune = {k: (np.concatenate(v) if v else np.zeros(0, "f4")) for k, v in dune.items()}
    return {"hist": hist, "ext": ext, "dune": dune, "viol_pairs": viol_pairs, "viol_hours": viol_hours,
            "above_all": above_all, "n_hours": n_hours, "cells": by * bx}


def _hist_pct(h, edges, q, ext=None):
    c = np.cumsum(h) / h.sum()
    mids = np.sqrt(edges[1:] * edges[:-1])
    # first bin whose cumulative share reaches p (p = 0 -> first non-empty bin)
    out = [float(mids[min(np.searchsorted(c, max(p / 100.0, 1e-15)), len(mids) - 1)]) for p in q]
    if ext is not None:                                   # exact extremes replace the bin centres
        out = [ext[0] if p == 0 else ext[1] if p == 100 else v for p, v in zip(q, out)]
    return out


def _pct(x, q=PCTS):
    if np.size(x) == 0:
        return None
    return {f"p{p}": float(v) for p, v in zip(q, np.percentile(x, q))}


def seasonality(series_cell, ls, k=KDEF, width=30):
    u, v, T, rho, z = (series_cell[i].astype("f8") for i in range(5))
    us, _ = P.friction_velocity(u, v, z, P.viscosity(T) / rho)
    q, th = P.flux(us[:, None], M.D_VALUES[None, [k]], rho[:, None], T[:, None])
    q = q[:, 0]
    b = (np.asarray(ls, "f8") // width).astype(int)
    nb = 360 // width
    flux = np.bincount(b, q, nb); hours = np.bincount(b, None, nb)
    above = np.bincount(b, (us > th["ut"][:, 0]).astype(float), nb)
    return {"ls_bins_deg": [[width * i, width * (i + 1)] for i in range(nb)],
            "flux_share": (flux / flux.sum()).round(4).tolist() if flux.sum() > 0 else None,
            "hours_share": (hours / hours.sum()).round(4).tolist(),
            "frac_hours_above_threshold": (above / np.maximum(hours, 1)).round(4).tolist(),
            "dp_m2_per_yr": float(q.mean() * M.S2Y), "uft": float((us > th["ut"][:, 0]).mean()),
            "ustar_p50_p99": [float(x) for x in np.percentile(us, [50, 99])]}


def consistency(g, cells):
    from .fields import mars_cell_fields
    worst = 0.0; nan_mismatch = 0
    per = []
    for i, j in cells:
        s = g["series"][i, j].astype("f8")
        f = mars_cell_fields(*s).astype("f4")
        st = g["fields"][i, j]
        fin = np.isfinite(st)
        nan_mismatch += int((np.isfinite(f) != fin).sum())
        mags = np.abs(st[fin]).max() if fin.any() else 1.0
        d = np.abs(f[fin].astype("f8") - st[fin]) / np.maximum(np.abs(st[fin].astype("f8")), 1e-6 * mags)
        r = float(np.median(d)) if d.size else 0.0
        worst = max(worst, float(d.max()) if d.size else 0.0)
        per.append(r)
    return {"cells": [list(c) for c in cells], "median_rel_diff": float(np.median(per)), "max_rel_diff": worst,
            "nan_pattern_mismatches": nan_mismatch,
            "note": ("fields recomputed from the stored bit-rounded series vs the stored fields (computed from the "
                     "unrounded series); max over all 23 x 64 values with relative floor 1e-6 x max|field|")}


def compute(store, nproc=48, log=print, sample_cells=None):
    import multiprocessing as mp
    import zarr
    t0 = time.time()
    g = zarr.open_group(store, mode="r")
    dunes = g["dunes"][:]; ls = g["ls"][:]
    tasks = [(sy, sx) for sy in range(0, 90, SHARD) for sx in range(0, 180, SHARD)]
    hist = {k: np.zeros(len(v) - 1, np.int64) for k, v in HBINS.items()}
    dune = {"rho": [], "ustar": [], "ut_ddef": [], "z": [], "ustar_log": []}
    ext = {k: [np.inf, -np.inf] for k in HBINS}
    agg = {"viol_pairs": 0, "viol_hours": 0, "above_all": 0, "n_hours": 0, "cells": 0}
    with mp.get_context("fork").Pool(nproc, initializer=_init, initargs=(store,)) as pool:
        for r in pool.imap_unordered(_shard, tasks):
            for k in hist:
                hist[k] += r["hist"][k]
                ext[k] = [min(ext[k][0], r["ext"][k][0]), max(ext[k][1], r["ext"][k][1])]
            for k in dune:
                dune[k].append(r["dune"][k])
            for k in agg:
                agg[k] += r[k]
    dune = {k: np.concatenate(v) for k, v in dune.items()}
    nt = len(ls)
    F = g["fields"]
    fv = list(g.attrs["field_vars"])
    dpm = F[:, :, fv.index("dpm"), :] * M.S2Y                         # (90, 180, 64) m^2/yr
    uft = F[:, :, fv.index("uft"), KDEF]
    dmask = (dunes > DUNE_MIN) & np.isfinite(uft)
    fin = np.isfinite(uft)
    out = {
        "store": store, "d_default_um": D_DEFAULT_UM, "d_default_index": KDEF, "n_hours": nt, "cells_with_series": int(agg["n_hours"] // max(nt, 1)), "dune_cells_gt_1pct": int((dunes > DUNE_MIN).sum()), "dune_cells_gt_1pct_with_data": int(dmask.sum()),
        "dune_cells_gt_0": int((dunes > 0).sum()), "kappa": M.KAPPA, "mix_damp": M.MIX_DAMP,
        "ustar_method": "eq. 2.2 smooth-wall profile at the per-hour lowest-level height (physics.friction_velocity)",
        "rho_dune": _pct(dune["rho"]),
        "rho_all": dict(zip([f"p{p}" for p in PCTS], _hist_pct(hist["rho"], HBINS["rho"], PCTS, ext["rho"]))),
        "ustar_dune": _pct(dune["ustar"]),
        "ustar_all": dict(zip([f"p{p}" for p in PCTS], _hist_pct(hist["ustar"], HBINS["ustar"], PCTS, ext["ustar"]))),
        "ut_ddef_dune": _pct(dune["ut_ddef"]),
        "z_dune": _pct(dune["z"]),
        "z_all": dict(zip([f"p{p}" for p in PCTS], _hist_pct(hist["z"], HBINS["z"], PCTS, ext["z"]))),
        "ustar_loglaw_dune": _pct(dune["ustar_log"]),
        "ustar_over_loglaw_dune": _pct((dune["ustar"][dune["ustar_log"] > 0] /
                                        dune["ustar_log"][dune["ustar_log"] > 0]).astype("f8"), [1, 5, 25, 50, 75, 95, 99]),
        "frac_hours_above_threshold_ddef_loglaw_dune": float((dune["ustar_log"] > dune["ut_ddef"]).mean()),
        "ut_ddef_all": dict(zip([f"p{p}" for p in PCTS], _hist_pct(hist["ut_ddef"], HBINS["ut_ddef"], PCTS, ext["ut_ddef"]))),
        "frac_hours_above_threshold_ddef": {
            "dune_cells": float(uft[dmask].mean()), "all_cells": float(uft[fin].mean()),
            "all_cells_from_series": agg["above_all"] / agg["n_hours"],
            "dune_cells_from_series": float((dune["ustar"] > dune["ut_ddef"]).mean())},
        "dp_m2_per_yr": {f"{um}um": {"dune": _pct(dpm[dmask, k], [5, 25, 50, 75, 95, 99]),
                                     "all": _pct(dpm[fin, k], [5, 25, 50, 75, 95, 99]),
                                     "frac_cells_dp_zero": float((dpm[fin, k] == 0).mean())}
                         for um, k in D_IDX.items()},
        "validity_ga_sqrt_s_le_81": {"pairs": agg["viol_pairs"], "pairs_total": agg["n_hours"] * len(M.D_VALUES),
                                     "frac_pairs": agg["viol_pairs"] / (agg["n_hours"] * len(M.D_VALUES)),
                                     "hours_any_d": agg["viol_hours"],
                                     "frac_hours_any_d": agg["viol_hours"] / agg["n_hours"]},
        "sites": {},
    }
    for name, (la, lo) in SITES.items():
        i, j = site_cell(dunes, la, lo)
        s = g["series"][i, j]
        out["sites"][name] = {"cell": [int(i), int(j)], "lat": float(89 - 2 * i), "lon": float(-179 + 2 * j),
                              "dunes": float(dunes[i, j]), "rho_mean": float(s[3].astype("f8").mean()),
                              "dp_stored_ddef_m2_per_yr": float(dpm[i, j, KDEF]), **seasonality(s, ls)}
    rng = np.random.default_rng(0)
    sample = [tuple(int(x) for x in out["sites"][n]["cell"]) for n in SITES]
    sample += [(int(a), int(b)) for a, b in zip(rng.integers(0, 90, 9), rng.integers(0, 180, 9))]
    if sample_cells is not None:
        sample = sample_cells
    out["consistency_rounded_series"] = consistency(g, sample)
    out["elapsed_s"] = round(time.time() - t0, 1)
    return out


def main(argv=None):
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.mars.stats")
    p.add_argument("--store", required=True); p.add_argument("--out", required=True)
    p.add_argument("--nproc", type=int, default=48)
    a = p.parse_args(argv)
    res = compute(a.store, a.nproc)
    with open(a.out, "w") as f:
        json.dump(res, f, indent=1)
    print(json.dumps({k: res[k] for k in ("ustar_dune", "frac_hours_above_threshold_ddef", "validity_ga_sqrt_s_le_81")}),
          flush=True)


if __name__ == "__main__":
    main()
