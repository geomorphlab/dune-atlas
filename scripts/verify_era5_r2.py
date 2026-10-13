"""Public checks of the ERA5 dataset stores after upload (https://data.geomorphlab.org/dune-atlas/v1/datasets/era5).

    R2_ACCOUNT_ID=... python scripts/verify_era5_r2.py --st staging/era5/atlas --out staging/era5/atlas/public_verification.json

* listing: object counts / bytes per store under the prefix equal the upload ledger (sizes key by key);
  nothing outside the prefix changed (listing before vs after);
* cells.zarr over HTTP (zarr + fsspec: shard index by suffix range, inner chunk by offset range): 300 random land
  cells (reference sample drawn on Gadi from the ERA5 source stores) bit-identical (hist uint32; fields = float32
  of the float64 source); 100 random other cells empty (hist 0, fields no data);
* cells-aux.zarr / cells-aux-veg.zarr at the same 300 cells vs the local stores; ocean cells empty;
* field pyramids: random windows (every store, levels 0 / middle / coarsest, random ut) vs the local stores;
* HTTP: suffix and offset ranges 206, absent (ocean) shard 404, CORS preflight for map.geomorphlab.org and
  localhost:5173, Content-Range exposed.
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[1]
PREFIX = "dune-atlas/v1/datasets/era5"
BASE = f"https://data.geomorphlab.org/{PREFIX}"
ORIGINS = ("https://map.geomorphlab.org", "http://localhost:5173")


def http_group(url):
    import zarr
    from zarr.storage import FsspecStore
    # trust_env: honour HTTP(S)_PROXY like requests/curl do
    store = FsspecStore.from_url(url, read_only=True, storage_options={"client_kwargs": {"trust_env": True}})
    return zarr.open_group(store, mode="r")


def main():
    import requests
    import zarr
    ap = argparse.ArgumentParser()
    ap.add_argument("--st", default=str(REPO / "staging" / "era5" / "atlas"))
    ap.add_argument("--out", required=True)
    ap.add_argument("--windows", type=int, default=3)
    a = ap.parse_args()
    st = Path(a.st)
    res = {"base": BASE, "date": time.strftime("%Y-%m-%d %H:%M")}
    sys.path.insert(0, str(REPO / "pipeline" / "src"))
    from dune_atlas_pipeline import stream_upload as su

    # ---------------------------------------------------------------- listing
    t = su.make_target("r2")
    after = t.list_keys("")
    before = json.load(open(st / "r2" / "listing_before_all.json"))
    led = json.load(open(st / "r2" / "uploaded-new-dune-atlas_v1_datasets_era5.json"))["objects"]
    mine = {k: v for k, v in after.items() if k.startswith(PREFIX + "/")}
    res["listing"] = {
        "before_objects": len(before), "after_objects": len(after),
        "unchanged_outside_prefix": all(after.get(k) == v for k, v in before.items()) and
        not [k for k in after if k not in before and not k.startswith(PREFIX + "/")],
        "prefix_objects": len(mine), "prefix_bytes": sum(mine.values()),
        "ledger_objects": len(led), "ledger_sizes_equal": mine == led,
        "per_store": {}}
    for k, v in mine.items():
        rel = k[len(PREFIX) + 1:].split("/")
        s = "/".join(rel[:2]) if rel[0] == "fields" else rel[0]
        d = res["listing"]["per_store"].setdefault(s, {"objects": 0, "bytes": 0})
        d["objects"] += 1; d["bytes"] += v
    print(json.dumps({k: v for k, v in res["listing"].items() if k != "per_store"}), flush=True)

    # ---------------------------------------------------------------- cells
    ref = np.load(st / "cells" / "reference_sample.npz")
    g = http_group(f"{BASE}/cells.zarr")
    res["cells_attrs"] = {k: g.attrs[k] for k in ("grid", "n_hours", "land_cells", "dune_cells")}
    hist_ok = fld_ok = 0
    for n, (i, j) in enumerate(ref["land_cells"]):
        hist_ok += int(np.array_equal(g["hist"][i, j], ref["hist"][n]))
        fld_ok += int(np.array_equal(g["fields"][i, j], ref["fields"][n], equal_nan=True))
    oc = sum(int((g["hist"][i, j] == 0).all() and np.isnan(g["fields"][i, j]).all()) for i, j in ref["other_cells"])
    res["cells"] = {"land_checked": int(len(ref["land_cells"])), "hist_identical": hist_ok, "fields_identical": fld_ok,
                    "other_checked": int(len(ref["other_cells"])), "other_empty": oc}
    print(json.dumps(res["cells"]), flush=True)

    # ---------------------------------------------------------------- sidecars
    res["aux"] = {}
    for store in ("cells-aux.zarr", "cells-aux-veg.zarr"):
        loc = zarr.open_group(str(st / "stores" / store), mode="r")
        rem = http_group(f"{BASE}/{store}")
        out = {}
        for v in loc.array_keys():
            ok = sum(int(np.array_equal(rem[v][i, j], loc[v][i, j], equal_nan=True)) for i, j in ref["land_cells"])
            emp = sum(int(np.isnan(rem[v][i, j]).all()) for i, j in ref["other_cells"])
            out[v] = {"identical": ok, "other_no_data": emp}
        out["root_attrs_identical"] = dict(rem.attrs) == dict(loc.attrs)
        res["aux"][store] = out
    print(json.dumps(res["aux"]), flush=True)

    # ---------------------------------------------------------------- pyramids
    rng = np.random.default_rng(7)
    win = {"checked": 0, "identical": 0, "attrs_identical": 0, "stores": 0}
    for p in sorted((st / "stores" / "fields").glob("*.zarr")):
        var = p.name[:-5]
        loc = zarr.open_group(str(p), mode="r")
        rem = http_group(f"{BASE}/fields/{p.name}")
        win["stores"] += 1
        win["attrs_identical"] += int(dict(rem.attrs) == dict(loc.attrs))
        levels = sorted(loc.group_keys(), key=int)
        for lv in {levels[0], levels[len(levels) // 2], levels[-1]}:
            A, B = loc[lv][var], rem[lv][var]
            for _ in range(a.windows):
                k = int(rng.integers(0, A.shape[0]))
                y0 = int(rng.integers(0, max(1, A.shape[1] - 128))); x0 = int(rng.integers(0, max(1, A.shape[2] - 128)))
                sl = (k, slice(y0, y0 + 128), slice(x0, x0 + 128))
                win["checked"] += 1
                win["identical"] += int(np.array_equal(A[sl], B[sl], equal_nan=True))
    res["pyramids"] = win
    print(json.dumps(win), flush=True)

    # ---------------------------------------------------------------- HTTP
    loc = zarr.open_group(str(st / "stores" / "cells.zarr"), mode="r") if (st / "stores" / "cells.zarr").exists() else None
    land_shard = next(k for k in mine if k.startswith(f"{PREFIX}/cells.zarr/hist/c/"))
    url = f"https://data.geomorphlab.org/{land_shard}"
    h = {}
    r = requests.get(url, headers={"Range": "bytes=-4100"}); h["suffix_range"] = r.status_code
    h["suffix_len"] = len(r.content)
    r = requests.get(url, headers={"Range": "bytes=0-99"}); h["offset_range"] = r.status_code
    h["content_range"] = r.headers.get("Content-Range")
    land = np.asarray(g["land"][:], bool)
    oc_shard = next((sy, sx) for sy in range(0, 721, 16) for sx in range(0, 1440, 16)
                    if not land[sy:sy + 16, sx:sx + 16].any())
    h["ocean_shard_status"] = requests.get(f"{BASE}/cells.zarr/hist/c/{oc_shard[0] // 16}/{oc_shard[1] // 16}/0/0").status_code
    h["cors"] = {}
    for o in ORIGINS:
        r = requests.options(f"{BASE}/cells.zarr/zarr.json", headers={"Origin": o, "Access-Control-Request-Method": "GET",
                                                                     "Access-Control-Request-Headers": "range"})
        r2 = requests.get(f"{BASE}/cells.zarr/zarr.json", headers={"Origin": o, "Range": "bytes=0-9"})
        h["cors"][o] = {"preflight": r.status_code, "allow_origin": r.headers.get("Access-Control-Allow-Origin"),
                        "expose": r2.headers.get("Access-Control-Expose-Headers"), "get": r2.status_code}
    r1 = requests.get(f"{BASE}/fields/dpm.zarr/zarr.json"); r2 = requests.get(f"{BASE}/fields/dpm.zarr/zarr.json")
    h["cf_cache_status_repeat"] = r2.headers.get("cf-cache-status")
    res["http"] = h
    print(json.dumps(h), flush=True)
    json.dump(res, open(a.out, "w"), indent=1)
    ok = (res["listing"]["unchanged_outside_prefix"] and res["listing"]["ledger_sizes_equal"]
          and res["cells"]["hist_identical"] == res["cells"]["fields_identical"] == res["cells"]["land_checked"]
          and res["cells"]["other_empty"] == res["cells"]["other_checked"]
          and win["identical"] == win["checked"] and win["attrs_identical"] == win["stores"]
          and h["suffix_range"] == 206 and h["offset_range"] == 206)
    print("OK" if ok else "FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
