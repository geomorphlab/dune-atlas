"""Old-vs-new comparison of two Mars wind builds (fields_export.npz + stats.json of each), at d = 102/199/405 um.

    python scripts/mars/data/compare_versions.py OLD_DIR NEW_DIR OUT.json

OLD = v0 (neutral log law, z0 = 1 mm at a fixed 2 m), NEW = v1 (eq. 2.2 smooth-wall profile at the per-hour
lowest-level height). Dune cells = cover > 1 %. DP and RDP in m^2/yr; uft = fraction of hours above threshold.
"""
import json
import sys

import numpy as np

S2Y = 365.25 * 86400
DS = {102: 15, 199: 29, 405: 44}


def load(d):
    z = np.load(f"{d}/fields_export.npz")
    return {k: z[k] for k in z.files}, json.load(open(f"{d}/stats.json"))


def main(old, new, out):
    (eo, so), (en, sn) = load(old), load(new)
    fv = list(en["field_vars"]); assert fv == list(eo["field_vars"])
    dm = en["dunes"] > 0.01
    assert np.array_equal(dm, eo["dunes"] > 0.01)
    res = {"dune_cells": int(dm.sum()), "d": {}}
    for um, k in DS.items():
        r = {}
        for v, scale in (("dpm", S2Y), ("rdpm", S2Y), ("uft", 1.0)):
            a, b = eo["fields"][fv.index(v), k] * scale, en["fields"][fv.index(v), k] * scale
            for name, m in (("dune", dm), ("all", np.ones_like(dm))):
                r[f"{v}_{name}"] = {"old_p5_p50_p95": np.percentile(a[m], [5, 50, 95]).round(5).tolist(),
                                    "new_p5_p50_p95": np.percentile(b[m], [5, 50, 95]).round(5).tolist(),
                                    "old_mean": float(a[m].mean()), "new_mean": float(b[m].mean())}
            with np.errstate(divide="ignore", invalid="ignore"):
                ratio = np.where(a > 0, b / a, np.nan)
            rd = ratio[dm & np.isfinite(ratio)]
            r[f"{v}_ratio_new_over_old_dune_p5_p50_p95"] = np.percentile(rd, [5, 50, 95]).round(4).tolist()
        res["d"][f"{um}um"] = r
    res["ustar_dune"] = {"old_v0_loglaw": {k: so["ustar_dune"][k] for k in ("p50", "p95", "p99")},
                         "new": {k: sn["ustar_dune"][k] for k in ("p50", "p95", "p99")},
                         "loglaw_recomputed_in_v1": {k: sn["ustar_loglaw_dune"][k] for k in ("p50", "p95", "p99")},
                         "per_hour_ratio_new_over_loglaw": sn["ustar_over_loglaw_dune"]}
    res["ustar_all"] = {"old": {k: so["ustar_all"][k] for k in ("p50", "p99")},
                        "new": {k: sn["ustar_all"][k] for k in ("p50", "p99")}}
    res["frac_hours_above_199_dune"] = {"old": so["frac_hours_above_threshold_199"]["dune_cells"],
                                        "new": sn["frac_hours_above_threshold_199"]["dune_cells"],
                                        "loglaw_recomputed_in_v1": sn["frac_hours_above_threshold_199_loglaw_dune"]}
    json.dump(res, open(out, "w"), indent=1)
    return res


if __name__ == "__main__":
    print(json.dumps(main(*sys.argv[1:4]), indent=1)[:4000])
