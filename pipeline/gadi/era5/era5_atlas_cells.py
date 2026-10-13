"""Build the ERA5 atlas cell store (cells.zarr) next to the data (PBS job on Gadi), validate it against the source
stores, write a reference sample for the public check after upload, and pack it into transfer tars.

    python era5_atlas_cells.py DATA_DIR OUT_DIR [--workers 8]

DATA_DIR holds the two ERA5 source stores (or links to them) and era5_cellmasks.nc (cellmasks.py). OUT_DIR gets
cells.zarr (+ manifest), validate.json, reference_sample.npz (300 random land cells: histogram + 23 x 64 fields
as float32; 100 random other cells), tars cells_meta.tar and cells_rows_<a>_<b>.tar (shard rows a..b of both
sharded arrays), and cells_summary.json (object counts, bytes, md5 per tar).
"""
import argparse
import json
import os
import subprocess
import sys
import time

import numpy as np


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("data"); p.add_argument("out"); p.add_argument("--workers", type=int, default=8)
    p.add_argument("--rows-per-tar", type=int, default=8)
    a = p.parse_args(argv)
    import xarray as xr
    import zarr
    from dune_atlas_pipeline import cellstore as CS
    from dune_atlas_pipeline.grid import DATASETS
    ds = DATASETS["era5"]
    out = os.path.join(a.out, "cells.zarr")
    lg = lambda m: print(time.strftime("%H:%M:%S"), m, flush=True)  # noqa: E731
    t0 = time.time()
    CS.write_region(out, a.data, 0, None, 0, None, workers=a.workers, log=lg, dataset=ds)
    summ = {"build_s": round(time.time() - t0, 1)}
    m = CS.load_manifest(out)
    summ["anomalies"] = m["anomalies"]
    lg("validate")
    v = CS.validate_store(out, a.data, n=500, seed=1, dataset=ds)
    json.dump(v, open(os.path.join(a.out, "validate.json"), "w"), indent=1)
    summ["validate"] = {k: v[k] for k in ("n_checked", "hist_exact", "fields_exact_float32", "ocean_checked",
                                          "ocean_fill", "shards", "hist_sum", "land_sum", "dunes_sum", "apple_junk")}
    lg(json.dumps(summ["validate"]))
    # reference sample from the source stores (not from the written store)
    land, dunes = CS.load_masks(a.data, ds)
    rng = np.random.default_rng(2026)
    L, O = np.argwhere(land), np.argwhere(~land)
    li = L[rng.choice(len(L), 300, replace=False)]
    oi = O[rng.choice(len(O), 100, replace=False)]
    dh = xr.open_zarr(f"{a.data}/{ds.hist_store}", consolidated=False)
    dq = xr.open_zarr(f"{a.data}/{ds.qsat_store}", consolidated=False)
    H = np.stack([dh.histogram_um_ua[i, j].values for i, j in li]).astype("u4")
    Fv = np.stack([np.stack([dq[v][:, i, j].values for v in CS.FIELD_VARS]) for i, j in li]).astype("f4")
    np.savez_compressed(os.path.join(a.out, "reference_sample.npz"), land_cells=li, other_cells=oi, hist=H,
                        fields=Fv, field_vars=np.array(CS.FIELD_VARS))
    # pack
    g = zarr.open_group(out, mode="r")
    ny = g["hist"].shape[0]
    nrow = -(-ny // CS.SHARD)
    tars = {}

    def tar(name, members):
        path = os.path.join(a.out, name)
        subprocess.run(["tar", "-cf", path, "-C", a.out] + members, check=True)
        md5 = subprocess.run(["md5sum", path], check=True, capture_output=True, text=True).stdout.split()[0]
        tars[name] = {"bytes": os.path.getsize(path), "md5": md5, "members": len(members)}

    meta = []
    for d, _, fns in os.walk(out):
        rel = os.path.relpath(d, a.out)
        if not rel.startswith(("cells.zarr/hist/c", "cells.zarr/fields/c")):
            meta += [os.path.join(rel, f) for f in fns]
    tar("cells_meta.tar", sorted(meta))
    for r0 in range(0, nrow, a.rows_per_tar):
        r1 = min(nrow, r0 + a.rows_per_tar) - 1
        mem = [f"cells.zarr/{arr}/c/{i}" for arr in ("hist", "fields") for i in range(r0, r1 + 1)
               if os.path.isdir(os.path.join(out, arr, "c", str(i)))]
        if mem:
            tar(f"cells_rows_{r0:02d}_{r1:02d}.tar", mem)
    st = CS.store_stats(out)
    summ.update({"store": st, "tars": tars})
    json.dump(summ, open(os.path.join(a.out, "cells_summary.json"), "w"), indent=1)
    lg(json.dumps({"tars": tars, "total": st["total"]}))
    ok = (v["hist_exact"] == v["n_checked"] == v["fields_exact_float32"] and v.get("ocean_fill") == v.get("ocean_checked")
          and not m["anomalies"])
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
