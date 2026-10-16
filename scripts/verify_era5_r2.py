"""Public checks of a dataset's stores after upload (ERA5; MERRA-2 and JRA-3Q with --dataset).

Default (light, ~1-2 min): (1) integrity of 100 % of the objects without downloading data - listing sizes and ETags
(MD5 of single-part puts) vs the local MD5s and the upload ledger; (2) the delivery path over the custom domain
with the app's own readers (scripts/check_era5_delivery.ts): ~20 land cells (incl. >= 5 with 0 < lsm <= 0.5 and
dune cells) and 5 non-land cells, ~10 pyramid windows, bit for bit; one suffix range read; CORS for
map.geomorphlab.org.  --full: the older exhaustive mode described below.

Full mode (https://data.geomorphlab.org/<prefix> (https://data.geomorphlab.org/<prefix>, default
dune-atlas/v2/datasets/era5; the first build, land = lsm > 0.5, is under dune-atlas/v1/datasets/era5).

    R2_ACCOUNT_ID=... python scripts/verify_era5_r2.py --st staging/era5/atlas_v2 --out staging/era5/atlas_v2/public_verification.json

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
PREFIX = "dune-atlas/v2/datasets/era5"
ORIGINS = ("https://map.geomorphlab.org", "http://localhost:5173")


def http_group(url):
    import zarr
    from zarr.storage import FsspecStore
    # trust_env: honour HTTP(S)_PROXY like requests/curl do
    store = FsspecStore.from_url(url, read_only=True, storage_options={"client_kwargs": {"trust_env": True}})
    return zarr.open_group(store, mode="r")


def main_full(argv=None):
    global PREFIX, BASE
    import requests
    import zarr
    ap = argparse.ArgumentParser()
    ap.add_argument("--st", default=str(REPO / "staging" / "era5" / "atlas"))
    ap.add_argument("--out", required=True)
    ap.add_argument("--windows", type=int, default=3)
    ap.add_argument("--prefix", default=PREFIX)
    a = ap.parse_args(argv)
    PREFIX = a.prefix.strip("/")
    BASE = f"https://data.geomorphlab.org/{PREFIX}"
    st = Path(a.st)
    res = {"base": BASE, "date": time.strftime("%Y-%m-%d %H:%M")}
    sys.path.insert(0, str(REPO / "pipeline" / "src"))
    from dune_atlas_pipeline import stream_upload as su

    # ---------------------------------------------------------------- listing
    t = su.make_target("r2")
    after = t.list_keys("")
    before = json.load(open(st / "r2" / "listing_before_all.json"))
    led = json.load(open(st / "r2" / f"uploaded-new-{PREFIX.replace('/', '_')}.json"))["objects"]
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
    lsm_ref = ref["lsm"] if "lsm" in ref.files else None
    res["cells"] = {"land_checked": int(len(ref["land_cells"])), "hist_identical": hist_ok, "fields_identical": fld_ok,
                    "land_checked_lsm_le_0p5": int((lsm_ref <= 0.5).sum()) if lsm_ref is not None else None,
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


# ---------------------------------------------------------------------------------------------- default: light
def md5_file(p):
    import hashlib
    h = hashlib.md5()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""):
            h.update(b)
    return h.hexdigest()


def integrity(st: Path, prefix: str, cells_md5: Path) -> dict:
    """Every object under the prefix: size and ETag (= MD5 of single-part puts) vs the local MD5s; key set vs the
    upload ledger. cells.zarr MD5s come from Gadi (the local copy is streamed and not kept)."""
    sys.path.insert(0, str(REPO / "pipeline" / "src"))
    from dune_atlas_pipeline import stream_upload as su
    from concurrent.futures import ThreadPoolExecutor
    t = su.make_target("r2")
    remote = {}
    for page in t.s3.get_paginator("list_objects_v2").paginate(Bucket=t.bucket, Prefix=prefix + "/"):
        for o in page.get("Contents", []):
            remote[o["Key"]] = (o["Size"], o["ETag"].strip('"'))
    led = json.load(open(st / "r2" / f"uploaded-new-{prefix.replace('/', '_')}.json"))["objects"]
    local = {}
    # ERA5: cells.zarr was streamed from Gadi in parts (MD5 list from Gadi); MERRA-2 / JRA-3Q: local copy in stores/
    for line in (cells_md5.read_text().splitlines() if cells_md5 and cells_md5.exists() else []):
        h, rel = line.split(maxsplit=1)
        local[f"{prefix}/cells.zarr/{rel}"] = h
    files = []
    for store in sorted((st / "stores").glob("*.zarr")) + sorted((st / "stores" / "fields").glob("*.zarr")):
        rel = store.relative_to(st / "stores").as_posix()
        files += [(f"{prefix}/{rel}/{p.relative_to(store).as_posix()}", p) for p in store.rglob("*")
                  if p.is_file() and not p.name.startswith("._") and p.name != ".DS_Store"]
    with ThreadPoolExecutor(max_workers=4) as ex:
        for k, h in zip([k for k, _ in files], ex.map(lambda kp: md5_file(kp[1]), files)):
            local[k] = h
    multipart = [k for k, (_, e) in remote.items() if "-" in e]
    size_bad = [k for k in remote if k in led and remote[k][0] != led[k]]
    etag_bad = [k for k, (_, e) in remote.items() if "-" not in e and local.get(k) != e]
    return {"remote_objects": len(remote), "remote_bytes": sum(v[0] for v in remote.values()),
            "ledger_objects": len(led), "local_md5": len(local),
            "keys_equal_ledger": set(remote) == set(led), "keys_equal_local": set(remote) == set(local),
            "size_mismatch": len(size_bad), "etag_mismatch": len(etag_bad), "multipart_objects": len(multipart),
            "examples_bad": (size_bad + etag_bad)[:5]}


def delivery(st: Path, base: str, n_land=20, n_low=6, n_other=5, n_windows=10, seed=11, masks="era5_cellmasks.nc") -> dict:
    """~20 land cells (>= n_low with 0 < lsm <= 0.5, >= 1 dune cell) and 5 non-land cells through the app's
    CellStore (scripts/check_era5_delivery.ts), ~10 pyramid windows through zarrita; compared bit for bit."""
    import subprocess
    import tempfile
    import requests
    import xarray as xr
    import zarr
    rng = np.random.default_rng(seed)
    ref = np.load(st / "cells" / "reference_sample.npz")
    M = xr.open_dataset(st / masks); dunes = M.dunes.values.astype(bool); lsm = M.lsm.values
    li, lr = ref["land_cells"], ref["lsm"]
    low = np.nonzero(lr <= 0.5)[0]; dn = np.nonzero(dunes[li[:, 0], li[:, 1]])[0]
    pick = list(rng.choice(low, n_low, replace=False)) + list(rng.choice(dn, 2, replace=False))
    rest = [i for i in range(len(li)) if i not in pick]
    pick += list(rng.choice(rest, n_land - len(pick), replace=False))
    other = ref["other_cells"][:n_other]
    stores = sorted((st / "stores" / "fields").glob("*.zarr"))
    wins = []
    for _ in range(n_windows):
        p = stores[int(rng.integers(len(stores)))]; g = zarr.open_group(str(p), mode="r")
        lvs = sorted(g.group_keys(), key=int); lv = lvs[int(rng.integers(0, len(lvs)))]
        a = g[lv][p.name[:-5]]
        y0 = int(rng.integers(0, max(1, a.shape[1] - 64))); x0 = int(rng.integers(0, max(1, a.shape[2] - 64)))
        wins.append({"store": f"fields/{p.name}", "level": lv, "var": p.name[:-5], "ut": int(rng.integers(64)),
                     "y0": y0, "y1": min(a.shape[1], y0 + 64), "x0": x0, "x1": min(a.shape[2], x0 + 64)})
    cells_req = [list(map(int, li[i])) for i in pick] + [list(map(int, c)) for c in other]
    with tempfile.TemporaryDirectory() as td:
        rq, out = Path(td) / "req.json", Path(td) / "out.json"
        rq.write_text(json.dumps({"cells": cells_req, "windows": wins, "aux": ["cells-aux.zarr", "cells-aux-veg.zarr"],
                                  "concurrency": 4}))
        env = dict(os.environ, NODE_USE_ENV_PROXY="1")
        subprocess.run(["npx", "vite-node", str(REPO / "scripts" / "check_era5_delivery.ts"), base, str(rq), str(out)],
                       cwd=REPO / "app", env=env, check=True, capture_output=True)
        got = json.loads(out.read_text())
    f32 = lambda xs: np.array([np.nan if x is None else x for x in xs], "f8").astype("f4")  # noqa: E731
    aux_loc = {s: zarr.open_group(str(st / "stores" / s), mode="r") for s in ("cells-aux.zarr", "cells-aux-veg.zarr")}
    res = {"land": 0, "land_identical": 0, "land_lsm_le_0p5": 0, "land_dune": 0, "aux_identical": 0,
           "other": 0, "other_empty": 0}
    for n, c in enumerate(got["cells"]):
        iy, ix = c["cell"]
        if n < len(pick):
            k = pick[n]
            ok = (np.array_equal(np.array(c["hist"], "u4"), ref["hist"][k].reshape(-1)) and
                  np.array_equal(f32(c["fields"]), ref["fields"][k].reshape(-1), equal_nan=True) and
                  c["dune"] == bool(dunes[iy, ix]))
            aok = True
            for s_, g in aux_loc.items():
                for v in g.array_keys():
                    loc = g[v][iy, ix]
                    rem = (c["aux"] or {}).get("series" if loc.ndim else "scalars", {}).get(v, "absent")
                    if isinstance(rem, str):          # the app keeps only the sidecar variables it knows (AUX_ORDER)
                        res.setdefault("aux_not_read_by_app", set()).add(v); continue
                    aok &= bool(np.array_equal(f32(rem if loc.ndim else [rem]), np.atleast_1d(loc).astype("f4"), equal_nan=True))
            res["land"] += 1; res["land_identical"] += int(ok); res["aux_identical"] += int(aok)
            res["land_lsm_le_0p5"] += int(lsm[iy, ix] <= 0.5); res["land_dune"] += int(dunes[iy, ix])
        else:
            res["other"] += 1
            res["other_empty"] += int(sum(c["hist"]) == 0 and all(x is None for x in c["fields"]))
    wok = 0
    for w in got["windows"]:
        loc = zarr.open_group(str(st / "stores" / w["store"]), mode="r")[w["level"]][w["var"]][w["ut"], w["y0"]:w["y1"], w["x0"]:w["x1"]]
        wok += int(np.array_equal(f32(w["data"]).reshape(loc.shape), loc, equal_nan=True))
    res["aux_not_read_by_app"] = sorted(res.get("aux_not_read_by_app", []))
    res.update({"windows": len(got["windows"]), "windows_identical": wok, "node_seconds": got["seconds"],
                "grid": got["grid"], "n_hours": got["n_hours"]})
    land_shard = next(f"{base}/cells.zarr/hist/c/{iy // 16}/{ix // 16}/0/0" for iy, ix in cells_req)
    r = requests.get(land_shard, headers={"Range": "bytes=-4100"})
    o = "https://map.geomorphlab.org"
    pre = requests.options(f"{base}/cells.zarr/zarr.json", headers={"Origin": o, "Access-Control-Request-Method": "GET",
                                                                  "Access-Control-Request-Headers": "range"})
    g2 = requests.get(f"{base}/cells.zarr/zarr.json", headers={"Origin": o, "Range": "bytes=0-9"})
    res["http"] = {"suffix_range": r.status_code, "suffix_len": len(r.content), "cors_preflight": pre.status_code,
                   "allow_origin": pre.headers.get("Access-Control-Allow-Origin"),
                   "expose": g2.headers.get("Access-Control-Expose-Headers"), "range_get": g2.status_code}
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--st", default=str(REPO / "staging" / "era5" / "atlas_v2"))
    ap.add_argument("--out", required=True)
    ap.add_argument("--prefix", default=PREFIX)
    ap.add_argument("--cells-md5", help="per-object MD5 list of cells.zarr (md5sum output, paths relative to the store)")
    ap.add_argument("--full", action="store_true", help="the 300-cell / all-sidecar / 216-window mode (slow)")
    ap.add_argument("--dataset", default="era5", help="era5 | merra2 | jra3q (masks file <dataset>_cellmasks.nc in --st)")
    a, rest = ap.parse_known_args()
    if a.full:
        return main_full(["--st", a.st, "--out", a.out, "--prefix", a.prefix] + rest)
    st, prefix = Path(a.st), a.prefix.strip("/")
    t0 = time.time()
    res = {"base": f"https://data.geomorphlab.org/{prefix}", "date": time.strftime("%Y-%m-%d %H:%M"),
           "integrity": integrity(st, prefix, Path(a.cells_md5 or st / "cells" / "cells_md5.txt"))}
    print(json.dumps(res["integrity"]), flush=True)
    res["delivery"] = delivery(st, res["base"], masks=f"{a.dataset}_cellmasks.nc")
    res["seconds"] = round(time.time() - t0, 1)
    print(json.dumps(res["delivery"]), flush=True)
    json.dump(res, open(a.out, "w"), indent=1)
    i, d = res["integrity"], res["delivery"]
    ok = (i["keys_equal_ledger"] and i["keys_equal_local"] and not i["size_mismatch"] and not i["etag_mismatch"]
          and d["land_identical"] == d["land"] == d["aux_identical"] and d["other_empty"] == d["other"]
          and d["windows_identical"] == d["windows"] and d["http"]["suffix_range"] == 206
          and d["http"]["allow_origin"] == "https://map.geomorphlab.org")
    print("OK" if ok else "FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
