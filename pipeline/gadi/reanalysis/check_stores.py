"""Checks of a finished MERRA-2 / JRA-3Q store pair against its raw files and the ERA5 stores.

1. Layout: array names, dims, dtypes, chunks, compressor and attribute keys against the ERA5 stores.
2. Hours: per cell, histogram total + hours above 20 m/s (sum of the per-year n_out) = n_hours.
3. Raw re-histogram: NCELL random cells x NYEAR random years recomputed straight from the raw files with
   numpy.histogram2d (an implementation independent of the numba kernel) must equal the per-year store exactly,
   and the final store must equal the sum of the 46 per-year stores at those cells.
4. Fields: qsat_fields recomputed for random cells from the final histogram equals the qsat_params store.
Also exports, for the ERA5 comparison, mean speed, DP, RDP and RDD at the default threshold (ut index 14) on the
native grid to an .npz.

  python check_stores.py DATASET RAW YEARDIR HIST.zarr QSAT.zarr ERA5_HIST.zarr ERA5_QSAT.zarr OUT.json OUT.npz
"""
import glob
import json
import os
import sys
import time

import numpy as np
import zarr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rean_hist import READERS, DATASETS, n_hours  # noqa: E402

UM = np.linspace(0, 20, 129)
UA = np.linspace(-np.pi, np.pi, 129)
NCELL, NYEAR, NFIELD, UT14 = 50, 2, 40, 14


def layout(store, ref):
    s, r = zarr.open_group(store, mode="r"), zarr.open_group(ref, mode="r")
    out = {}
    for k in r.array_keys():
        if k not in s:
            out[k] = "missing"
            continue
        a, b = s[k], r[k]
        diff = []
        if a.dtype != b.dtype:
            diff.append(f"dtype {a.dtype} vs {b.dtype}")
        if a.attrs.get("_ARRAY_DIMENSIONS") != b.attrs.get("_ARRAY_DIMENSIONS"):
            diff.append("dims")
        if a.ndim >= 3 and tuple(a.chunks[-2:]) != tuple(b.chunks[-2:]) and k != "histogram_um_ua":
            diff.append(f"chunks {a.chunks} vs {b.chunks}")
        if str(a.compressors) != str(b.compressors):
            diff.append("compressor")
        missing_attrs = sorted(set(b.attrs) - set(a.attrs))
        if missing_attrs:
            diff.append(f"attrs missing {missing_attrs}")
        out[k] = diff or "ok"
    out["_root_attrs_missing"] = sorted(set(r.attrs) - set(s.attrs))
    out["_extra_arrays"] = sorted(set(s.array_keys()) - set(r.array_keys()))
    return out


def main(ds, raw, yeardir, hist, qsat, e_hist, e_qsat, out_json, out_npz):
    rng = np.random.default_rng(20261016)
    res = dict(dataset=ds, layout_hist=layout(hist, e_hist), layout_qsat=layout(qsat, e_qsat))
    H = zarr.open_group(hist, mode="r")
    h = H["histogram_um_ua"]
    ny, nx = h.shape[:2]
    nh = int(H.attrs["n_hours"])
    years = list(range(1980, 2026))
    ystores = [zarr.open_group(f"{yeardir}/{ds}_{y}_uam10_hist.zarr", mode="r") for y in years]
    # 2. hours per cell
    t0 = time.time()
    nout = sum(g["n_out"][:].astype(np.int64) for g in ystores)
    bad = 0
    for i in range(0, ny, 64):
        tot = np.asarray(h[i:i + 64]).sum(axis=(2, 3), dtype=np.int64)
        bad += int((tot + nout[i:i + 64] != nh).sum())
    res["hours"] = dict(n_hours=nh, cells=ny * nx, cells_wrong=bad, max_hours_above_20=int(nout.max()),
                        frac_hours_above_20=float(nout.sum() / (nh * ny * nx)), secs=round(time.time() - t0))
    # 3. raw re-histogram at random cells and years
    files, read = READERS[ds]
    cells = [(int(rng.integers(ny)), int(rng.integers(nx))) for _ in range(NCELL)]
    yrs = sorted(rng.choice(years, NYEAR, replace=False).tolist())
    mism = 0
    for y in yrs:
        us, vs = [], []
        for f in files(raw, y):
            u, v, _, _ = read(f)
            us.append(np.stack([u[:, i, j] for i, j in cells], 1)); vs.append(np.stack([v[:, i, j] for i, j in cells], 1))
        U, V = np.concatenate(us), np.concatenate(vs)
        Y = ystores[years.index(y)]["histogram_um_ua"]
        for k, (i, j) in enumerate(cells):
            u64, v64 = U[:, k].astype(np.float64), V[:, k].astype(np.float64)
            ref, _, _ = np.histogram2d(np.sqrt(u64 * u64 + v64 * v64), np.arctan2(v64, u64), bins=[UM, UA])
            mism += int(not np.array_equal(np.asarray(Y[i, j]), ref.astype(np.uint32)))
    sum_mism = 0
    for i, j in cells:
        s = sum(np.asarray(g["histogram_um_ua"][i, j], dtype=np.int64) for g in ystores)
        sum_mism += int(not np.array_equal(np.asarray(h[i, j], dtype=np.int64), s))
    res["raw_rehistogram"] = dict(cells=NCELL, years=yrs, mismatches=mism, total_vs_sum_of_years_mismatches=sum_mism)
    # 4. fields at random cells
    from dune_atlas_pipeline import qsat_compute as Q, constants as C
    Qs = zarr.open_group(qsat, mode="r")
    fc = [(int(rng.integers(ny)), int(rng.integers(nx))) for _ in range(NFIELD)]
    f = Q.qsat_fields(np.stack([np.asarray(h[i, j]) for i, j in fc]))
    maxdiff = {}
    for v in C.QSAT_VARS:
        st = np.stack([Qs[v][:, i, j] for i, j in fc])
        a, b = np.asarray(f[v], dtype=np.float64), st
        both_nan = np.isnan(a) & np.isnan(b)
        maxdiff[v] = float(np.nanmax(np.where(both_nan, 0, np.abs(a - b)))) if not both_nan.all() else 0.0
        if (np.isnan(a) != np.isnan(b)).any():
            maxdiff[v] = "nan pattern differs"
    res["fields_recomputed_max_abs_diff"] = maxdiff
    # export for the ERA5 comparison
    centres = 0.5 * (UM[1:] + UM[:-1])
    ms = np.full((ny, nx), np.nan)
    for i in range(0, ny, 64):
        b = np.asarray(h[i:i + 64], dtype=np.float64)
        n = b.sum(axis=(2, 3))
        ms[i:i + 64] = (b.sum(axis=3) * centres).sum(axis=2) / np.where(n > 0, n, np.nan)
    np.savez_compressed(out_npz, lat=H["latitude"][:], lon=H["longitude"][:], mean_speed=ms,
                        dpm=Qs["dpm"][UT14], rdpm=Qs["rdpm"][UT14], rdpa=Qs["rdpa"][UT14], ut=Qs["ut"][UT14])
    json.dump(res, open(out_json, "w"), indent=1, default=str)
    print(json.dumps(res, default=str)[:3000])


if __name__ == "__main__":
    main(*sys.argv[1:10])
