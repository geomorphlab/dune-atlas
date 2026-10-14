"""Verify the published Mars dataset v2 against v1 through both endpoints (S3 API and the public delivery URL).

  1. bytes: every v2 object is fetched from the S3 endpoint and from https://data.geomorphlab.org/; md5s must agree
     with each other and with (a) the local v2 build for new/changed objects, (b) the v1 object (single-part ETag
     = md5) for unchanged objects, incl. the 72 server-side-copied series shards;
  2. values: the v1 and v2 trees (non-series objects, from the public URL) are decoded with zarr:
     cells.zarr/fields flux rows v2/v1 = 1/0.6 to float32 rounding (|r phi - 1| <= 1.2e-7), all other rows
     bit-identical; cells-aux qsdiv ratio; every flux pyramid ratio; every non-flux pyramid bit-identical; a sample
     of series shards decoded identical.

    python scripts/mars/data/verify_v2.py --devroot staging/mars/v2/devroot --work staging/mars/v2/verify \
        --out staging/mars/v2/verify_v2.json
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "pipeline" / "src"))
from dune_atlas_pipeline import stream_upload as SU  # noqa: E402
from dune_atlas_pipeline.mars import cells as CE  # noqa: E402

BUCKET = "dune-atlas-data"
PUBLIC = "https://data.geomorphlab.org/"
V1 = "dune-atlas/mars/v1/datasets/fv3-beta1"
V2 = "dune-atlas/mars/v2/datasets/fv3-beta1"
FLUX_PYR = set(CE.FLUX_FIELDS) | {"qsdiv"}


def group(rel: str) -> str:
    p = rel.split("/")
    if p[0] == "fields":
        v = p[1][:-5]
        return "fields pyramids, flux" if v in FLUX_PYR else "fields pyramids, non-flux"
    if p[0] == "cells.zarr":
        return "cells.zarr/" + (p[1] if len(p) > 1 and p[1] != "zarr.json" else "zarr.json")
    return "cells-aux.zarr/" + (p[1] if len(p) > 1 and p[1] != "zarr.json" else "zarr.json")


def get_https(key: str) -> bytes:
    import requests                  # library default User-Agent (the CDN rejects Python-urllib's)
    r = requests.get(PUBLIC + key, timeout=120)
    r.raise_for_status()
    return r.content


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--devroot", required=True); ap.add_argument("--work", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args(argv)
    import zarr
    T = SU.R2Target(BUCKET, os.environ.get("R2_ACCOUNT_ID", "107c452850a690ed588d9b00c4283aa8"))
    s3 = T.s3
    v1 = T.list_keys(V1 + "/"); v2 = T.list_keys(V2 + "/")
    rel1 = {k[len(V1) + 1:]: k for k in v1}; rel2 = {k[len(V2) + 1:]: k for k in v2}
    assert set(rel1) == set(rel2), (len(rel1), len(rel2))
    work = Path(a.work)
    loc = Path(a.devroot) / V2

    def one(rel):
        k1, k2 = rel1[rel], rel2[rel]
        e1 = s3.head_object(Bucket=BUCKET, Key=k1)["ETag"].strip('"')
        b_s3 = s3.get_object(Bucket=BUCKET, Key=k2)["Body"].read()
        b_pub = get_https(k2)
        m_s3, m_pub = hashlib.md5(b_s3).hexdigest(), hashlib.md5(b_pub).hexdigest()
        lp = loc / rel
        m_loc = hashlib.md5(lp.read_bytes()).hexdigest() if lp.exists() else None
        series = rel.startswith("cells.zarr/series/") and not rel.endswith("zarr.json")
        if not series:                                       # keep the public bytes of v2 and v1 for decoding
            for tree, key, b in (("v2", k2, b_pub), ("v1", k1, None)):
                p = work / tree / rel
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_bytes(b if b is not None else get_https(key))
        unchanged = (m_s3 == e1)
        ok = (m_s3 == m_pub) and (unchanged or m_s3 == m_loc) and len(b_s3) == v2[k2]
        return rel, dict(bytes=len(b_s3), unchanged=unchanged, s3_eq_public=m_s3 == m_pub,
                         eq_local=(m_s3 == m_loc) if m_loc else None, series=series, ok=ok)
    with ThreadPoolExecutor(12) as ex:
        R = dict(ex.map(one, sorted(rel2)))
    by = collections.defaultdict(lambda: collections.Counter())
    for rel, r in R.items():
        g = group(rel)
        by[g]["objects"] += 1; by[g]["bytes"] += r["bytes"]; by[g]["identical_to_v1"] += r["unchanged"]
        by[g]["changed"] += not r["unchanged"]; by[g]["s3_eq_public"] += r["s3_eq_public"]; by[g]["ok"] += r["ok"]
    out = {"objects": len(R), "bytes": sum(r["bytes"] for r in R.values()), "all_ok": all(r["ok"] for r in R.values()),
           "groups": {g: dict(c) for g, c in sorted(by.items())}}

    # ---- values
    w1, w2 = work / "v1", work / "v2"
    vals = {}
    g1, g2 = zarr.open_group(str(w1 / "cells.zarr"), mode="r"), zarr.open_group(str(w2 / "cells.zarr"), mode="r")
    fv = list(g1.attrs["field_vars"])
    F1, F2 = g1["fields"][...], g2["fields"][...]

    def ratio_stats(x1, x2):
        x1 = x1.astype("f8"); x2 = x2.astype("f8")
        nz = np.isfinite(x1) & (x1 != 0)
        r = x2[nz] / x1[nz]
        zero_ok = bool(np.array_equal(x1[~nz], x2[~nz], equal_nan=True))
        return {"n": int(nz.sum()), "max_abs_r_phi_minus_1": float(np.abs(r * 0.6 - 1).max()) if nz.any() else 0.0,
                "zeros_nans_identical": zero_ok}
    for v in fv:
        k = fv.index(v)
        if v in CE.FLUX_FIELDS:
            vals[f"cells.zarr/fields:{v}"] = ratio_stats(F1[:, :, k], F2[:, :, k])
        else:
            vals[f"cells.zarr/fields:{v}"] = {"bit_identical": bool(np.array_equal(F1[:, :, k], F2[:, :, k],
                                                                                   equal_nan=True))}
    a1, a2 = zarr.open_group(str(w1 / "cells-aux.zarr"), mode="r"), zarr.open_group(str(w2 / "cells-aux.zarr"), mode="r")
    vals["cells-aux:qsdiv"] = ratio_stats(a1["qsdiv"][...], a2["qsdiv"][...])
    for v in ("rho_mean", "elev_mean"):
        vals[f"cells-aux:{v}"] = {"bit_identical": bool(np.array_equal(a1[v][...], a2[v][...], equal_nan=True))}
    for v in ("dunes", "dune", "ls", "sol"):
        vals[f"cells.zarr/{v}"] = {"bit_identical": bool(np.array_equal(g1[v][...], g2[v][...], equal_nan=True))}
    for p in sorted((w2 / "fields").glob("*.zarr")):
        v = p.name[:-5]
        q1 = zarr.open_group(str(w1 / "fields" / p.name), mode="r"); q2 = zarr.open_group(str(p), mode="r")
        for lev in sorted(k for k in q2.group_keys()):
            x1, x2 = q1[lev][v][...], q2[lev][v][...]
            key = f"fields/{v}.zarr/{lev}"
            if v in FLUX_PYR:
                st = ratio_stats(x1, x2)
                st["clim_v1"] = q1[lev][v].attrs.get("clim"); st["clim_v2"] = q2[lev][v].attrs.get("clim")
                vals[key] = st
            else:
                vals[key] = {"bit_identical": bool(np.array_equal(x1, x2, equal_nan=True))}
    out["values"] = vals
    flux_max = max(s["max_abs_r_phi_minus_1"] for s in vals.values() if "max_abs_r_phi_minus_1" in s)
    out["flux_max_abs_r_phi_minus_1"] = flux_max
    out["nonflux_all_bit_identical"] = all(s["bit_identical"] for s in vals.values() if "bit_identical" in s)
    out["flux_zeros_nans_identical"] = all(s["zeros_nans_identical"] for s in vals.values()
                                           if "zeros_nans_identical" in s)
    Path(a.out).write_text(json.dumps(out, indent=1))
    print(json.dumps({k: out[k] for k in ("objects", "bytes", "all_ok", "flux_max_abs_r_phi_minus_1",
                                          "nonflux_all_bit_identical", "flux_zeros_nans_identical")}))


if __name__ == "__main__":
    main()
