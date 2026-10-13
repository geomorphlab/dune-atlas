"""Inputs for the atlas build of the ERA5 dataset (run in PBS on Gadi; numpy, netCDF4, zarr only).

1. ERA5 land-sea mask `lsm` (invariant field, NCI replica .../single-levels/reanalysis/lsm): unpacked in float64
   as raw * scale_factor + add_offset, checked identical over every time step of one monthly file and against
   the first step of files from other years; written as `era5_lsm.npy` (float32, 721 x 1440) + summary.
2. Land cells = lsm > 0.5. Land-only copies of the two ERA5 source stores, same array names, shapes, attrs and
   coordinates as the sources (zarr v2), every other cell set to the fill value (histogram 0, fields no data)
   and chunks without land not written:
     subset/era5_1950_2024_uam10_hist.zarr   histogram_um_ua uint32, chunks 64 x 64 x 128 x 128, blosc zstd-5 bitshuffle
     subset/era5_1950_2024_qsat_params.zarr  23 x (ut 64, lat, lon) float64, chunks 64^3, blosc zstd-5 shuffle
   Read-back check of random land / other cells against the sources, then one tar per store for transfer.

  python era5_atlas_prep.py SRC_DIR OUT_DIR [--lsm-root ROOT]
"""
import argparse
import glob
import json
import os
import subprocess
import sys
import time

import numpy as np

HIST = "era5_1950_2024_uam10_hist.zarr"
QSAT = "era5_1950_2024_qsat_params.zarr"
LSM_ROOT = "/g/data/rt52/era5/single-levels/reanalysis/lsm"
HBLOCK = 64


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def read_lsm(path, steps="all"):
    import netCDF4
    with netCDF4.Dataset(path) as d:
        v = d.variables["lsm"]
        v.set_auto_maskandscale(False)
        lat, lon = d["latitude"][:], d["longitude"][:]
        raw = v[:] if steps == "all" else v[0:1]
        return (np.asarray(raw), float(v.scale_factor), float(v.add_offset), int(v._FillValue),
                np.asarray(lat), np.asarray(lon))


def lsm_field(root, ny, nx):
    files = sorted(glob.glob(f"{root}/*/lsm_era5_oper_sfc_*.nc"))
    ref = [f for f in files if "/2000/lsm_era5_oper_sfc_200001" in f][0]
    raw, sf, ao, fill, lat, lon = read_lsm(ref)
    assert np.array_equal(lat, 90 - 0.25 * np.arange(ny)) and np.array_equal(lon, -180 + 0.25 * np.arange(nx)), "grid"
    assert (raw != fill).all(), "fill values in lsm"
    same_steps = bool((raw == raw[0]).all())
    others = {}
    for tag in ("/1950/lsm_era5_oper_sfc_195001", "/1979/lsm_era5_oper_sfc_197901", "/2024/lsm_era5_oper_sfc_202412"):
        f = [x for x in files if tag in x]
        if f:
            r2, sf2, ao2, *_ = read_lsm(f[0], steps="first")
            u2 = r2[0] * sf2 + ao2
            others[os.path.basename(f[0])] = float(np.abs(u2 - (raw[0] * sf + ao)).max())
    lsm = raw[0].astype("f8") * sf + ao
    return lsm, {"file": ref, "n_files": len(files), "time_steps": int(raw.shape[0]),
                 "identical_over_time_steps": same_steps, "max_abs_diff_vs_other_years": others,
                 "scale_factor": sf, "add_offset": ao, "min": float(lsm.min()), "max": float(lsm.max()),
                 "n_gt_0p5": int((lsm > 0.5).sum()), "n_eq_0p5": int((lsm == 0.5).sum()),
                 "n_gt_0": int((lsm > 1e-6).sum())}


def _blosc(cname, shuffle):
    import numcodecs
    return numcodecs.Blosc(cname=cname, clevel=5, shuffle=shuffle)


def copy_coords(src, dst, names):
    for n in names:
        a = src[n]
        b = dst.create_array(n, shape=a.shape, chunks=a.shape, dtype=a.dtype, fill_value=a.fill_value,
                             attributes=dict(a.attrs))
        b[...] = a[...]


def subset_hist(src_dir, out_dir, land):
    import numcodecs
    import zarr
    s = zarr.open_group(f"{src_dir}/{HIST}", mode="r")
    g = zarr.open_group(f"{out_dir}/{HIST}", mode="w", zarr_format=2)
    g.attrs.update({**dict(s.attrs), "subset": "cells with ERA5 land-sea mask lsm > 0.5; all other cells 0"})
    copy_coords(s, g, ["latitude", "longitude", "um_bin", "ua_bin"])
    h = s["histogram_um_ua"]
    ny, nx, nm, na = h.shape
    o = g.create_array("histogram_um_ua", shape=h.shape, chunks=(HBLOCK, HBLOCK, nm, na), dtype=h.dtype,
                       compressors=_blosc("zstd", numcodecs.Blosc.BITSHUFFLE), fill_value=None,
                       attributes=dict(h.attrs), config={"write_empty_chunks": False})
    n = 0
    for y0 in range(0, ny, HBLOCK):
        t0 = time.time()
        y1 = min(ny, y0 + HBLOCK)
        lb = land[y0:y1]
        if not lb.any():
            continue
        for x0 in range(0, nx, HBLOCK):
            x1 = min(nx, x0 + HBLOCK)
            m = lb[:, x0:x1]
            if not m.any():
                continue
            blk = h[y0:y1, x0:x1]
            blk[~m] = 0
            o[y0:y1, x0:x1] = blk
            n += 1
        log(f"hist rows {y0}-{y1}: {time.time() - t0:.0f}s")
    return n


def subset_qsat(src_dir, out_dir, land):
    import numcodecs
    import zarr
    s = zarr.open_group(f"{src_dir}/{QSAT}", mode="r")
    g = zarr.open_group(f"{out_dir}/{QSAT}", mode="w", zarr_format=2)
    g.attrs.update({**dict(s.attrs), "subset": "cells with ERA5 land-sea mask lsm > 0.5; no data elsewhere"})
    names = sorted(s.array_keys())
    copy_coords(s, g, ["ut", "latitude", "longitude"])
    vars_ = [v for v in names if v not in ("ut", "latitude", "longitude")]
    for v in vars_:
        t0 = time.time()
        a = s[v]
        x = a[...]
        x[:, ~land] = np.nan
        o = g.create_array(v, shape=a.shape, chunks=a.chunks, dtype=a.dtype,
                           compressors=_blosc("zstd", numcodecs.Blosc.SHUFFLE), fill_value=np.nan,
                           attributes=dict(a.attrs), config={"write_empty_chunks": False})
        o[...] = x
        log(f"qsat {v}: {time.time() - t0:.0f}s")
    return vars_


def check(src_dir, out_dir, land, n=300, seed=0):
    import zarr
    rng = np.random.default_rng(seed)
    hs, ho = zarr.open_array(f"{src_dir}/{HIST}/histogram_um_ua", mode="r"), zarr.open_array(f"{out_dir}/{HIST}/histogram_um_ua", mode="r")
    qs, qo = zarr.open_group(f"{src_dir}/{QSAT}", mode="r"), zarr.open_group(f"{out_dir}/{QSAT}", mode="r")
    L, O = np.argwhere(land), np.argwhere(~land)
    li, oi = L[rng.choice(len(L), n, replace=False)], O[rng.choice(len(O), n // 3, replace=False)]
    vars_ = [v for v in qo.array_keys() if v not in ("ut", "latitude", "longitude")]
    h_ok = sum(int(np.array_equal(hs[i, j], ho[i, j])) for i, j in li)
    q_ok = sum(int(all(np.array_equal(qs[v][:, i, j], qo[v][:, i, j], equal_nan=True) for v in vars_)) for i, j in li)
    o_ok = sum(int((ho[i, j] == 0).all() and all(np.isnan(qo[v][:, i, j]).all() for v in vars_)) for i, j in oi)
    return {"land_checked": int(n), "hist_identical": h_ok, "qsat_identical": q_ok,
            "other_checked": int(len(oi)), "other_empty": o_ok}


def tree(path):
    nf = nb = 0
    for d, _, fs in os.walk(path):
        for f in fs:
            nf += 1; nb += os.path.getsize(os.path.join(d, f))
    return {"files": nf, "bytes": nb}


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("src"); p.add_argument("out"); p.add_argument("--lsm-root", default=LSM_ROOT)
    a = p.parse_args(argv)
    os.makedirs(f"{a.out}/subset", exist_ok=True)
    summ = {}
    t0 = time.time()
    lsm, summ["lsm"] = lsm_field(a.lsm_root, 721, 1440)
    np.save(f"{a.out}/era5_lsm.npy", lsm.astype("f4"))
    np.save(f"{a.out}/era5_lsm_f8.npy", lsm)
    land = lsm > 0.5
    summ["land_cells"] = int(land.sum())
    log("lsm", json.dumps(summ["lsm"]))
    sub = f"{a.out}/subset"
    summ["hist_chunks_written"] = subset_hist(a.src, sub, land)
    summ["qsat_vars"] = subset_qsat(a.src, sub, land)
    summ["check"] = check(a.src, sub, land)
    log("check", json.dumps(summ["check"]))
    for z in (HIST, QSAT):
        summ[z] = tree(f"{sub}/{z}")
        tar = f"{a.out}/{z}.tar"
        subprocess.run(["tar", "-cf", tar, "-C", sub, z], check=True)
        summ[z]["tar_bytes"] = os.path.getsize(tar)
        summ[z]["tar_md5"] = subprocess.run(["md5sum", tar], check=True, capture_output=True, text=True).stdout.split()[0]
    summ["wall_s"] = round(time.time() - t0, 1)
    with open(f"{a.out}/prep_summary.json", "w") as f:
        json.dump(summ, f, indent=1)
    log("done", json.dumps(summ))
    ok = summ["check"]["hist_identical"] == summ["check"]["land_checked"] == summ["check"]["qsat_identical"] \
        and summ["check"]["other_empty"] == summ["check"]["other_checked"] and summ["lsm"]["identical_over_time_steps"]
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
