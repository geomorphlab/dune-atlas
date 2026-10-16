"""Pilot checks on one downloaded month (January 2000) of MERRA-2 and JRA-3Q 10 m winds.

1. Download rate per dataset (from the manifests).
2. Histogram one month on the full grid with the ERA5 kernel (era5_hist.accumulate, same bins), timed, so the
   full run can be sized; the histogram sums plus hours outside the bins must equal hours x cells.
3. Monthly mean 10 m speed at named dune areas, MERRA-2 and JRA-3Q against ERA5 (NCI replica, nearest cell).

  python pilot.py RAW_ROOT OUT.json        (RAW_ROOT/{merra2,jra3q}/2000/...)
"""
import glob
import json
import os
import sys
import time

import numpy as np
import netCDF4

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "era5"))
from era5_hist import accumulate, UM_EDGES, UA_EDGES, NB  # noqa: E402

ERA5 = "/g/data/rt52/era5/single-levels/reanalysis"
POINTS = {  # (lat, lon): dune areas used only as spot checks
    "Rub al Khali": (20.5, 50.5), "Taklamakan": (39.0, 83.0), "Namib Sand Sea": (-24.5, 15.2),
    "Great Sandy Desert": (-20.0, 124.0), "Simpson Desert": (-25.0, 137.0), "Grand Erg Oriental": (30.5, 7.5),
    "Bodele": (17.0, 18.0), "Thar": (27.0, 71.0), "Badain Jaran": (40.0, 102.0), "Kalahari": (-26.0, 21.0),
    "Ica (Peru)": (-14.1, -75.8), "Nebraska Sand Hills": (42.0, -101.0),
}


def nearest(lat, lon, la, lo):
    lo = ((lo + 180) % 360) - 180 if lon.min() < 0 else lo % 360
    return int(np.abs(lat - la).argmin()), int(np.abs(lon - lo).argmin())


def load_merra2(root):
    fs = sorted(glob.glob(f"{root}/merra2/2000/MERRA2_*.inst1_2d_asm_Nx.200001??.nc4"))
    assert len(fs) == 31, len(fs)
    u, v = [], []
    for f in fs:
        with netCDF4.Dataset(f) as d:
            u.append(d["U10M"][:].filled(np.nan)); v.append(d["V10M"][:].filled(np.nan))
            lat, lon = d["lat"][:], d["lon"][:]
    return np.concatenate(u), np.concatenate(v), np.asarray(lat), np.asarray(lon)


def load_jra3q(root):
    out = []
    for tag in ("ugrd10m", "vgrd10m"):
        f = glob.glob(f"{root}/jra3q/2000/jra3q.fcst_surf.*.{tag}-hgt-fc-gauss.2000010100_2000013123.nc")
        assert len(f) == 1, f
        with netCDF4.Dataset(f[0]) as d:
            name = [k for k in d.variables if k.startswith(tag)][0]
            out.append(d[name][:].filled(np.nan)); lat, lon = d["lat"][:], d["lon"][:]
    return out[0], out[1], np.asarray(lat), np.asarray(lon)


def load_era5_points():
    res = {}
    fu = glob.glob(f"{ERA5}/10u/2000/10u_era5_oper_sfc_20000101-*.nc")[0]
    fv = glob.glob(f"{ERA5}/10v/2000/10v_era5_oper_sfc_20000101-*.nc")[0]
    with netCDF4.Dataset(fu) as du, netCDF4.Dataset(fv) as dv:
        lat, lon = du["latitude"][:], du["longitude"][:]
        for k, (la, lo) in POINTS.items():
            i, j = nearest(lat, lon, la, lo)
            u, v = du["u10"][:, i, j], dv["v10"][:, i, j]
            res[k] = float(np.sqrt(u * u + v * v).mean())
    return res


def month_hist(u, v):
    T, R, L = u.shape
    hist = np.zeros((R, L, NB, NB), np.uint32)
    nout = np.zeros((R, L), np.uint32)
    t0 = time.time()
    accumulate(hist, nout, u.astype(np.float32), v.astype(np.float32), 1.0, 0.0, 1.0, 0.0, UM_EDGES, UA_EDGES)
    secs = time.time() - t0
    assert int(hist.sum()) + int(nout.sum()) == T * R * L
    return secs, int(nout.sum())


def rate(root, ds):
    m = [json.loads(l) for l in open(f"{root}/{ds}/manifest.jsonl")]
    b, s = sum(x["bytes"] for x in m), sum(x["secs"] for x in m)
    return dict(files=len(m), gb=round(b / 1e9, 3), secs=round(s), mb_per_s=round(b / 1e6 / max(s, 1), 2))


def main(root, out):
    import numba
    res = dict(threads=numba.get_num_threads(), rates={ds: rate(root, ds) for ds in ("merra2", "jra3q")})
    era5 = load_era5_points()
    for ds, loader in (("merra2", load_merra2), ("jra3q", load_jra3q)):
        u, v, lat, lon = loader(root)
        assert np.isfinite(u).all() and np.isfinite(v).all(), ds
        sp = np.sqrt(u * u + v * v)
        pts = {}
        for k, (la, lo) in POINTS.items():
            i, j = nearest(lat, lon, la, lo)
            pts[k] = dict(mean_speed=round(float(sp[:, i, j].mean()), 3), era5=round(era5[k], 3))
        month_hist(u[:24], v[:24])                       # compile
        secs, nout = month_hist(u, v)
        res[ds] = dict(shape=list(u.shape), lat0=float(lat[0]), lat1=float(lat[-1]), lon0=float(lon[0]),
                       lon1=float(lon[-1]), speed_max=round(float(sp.max()), 2),
                       frac_hours_above_20=round(nout / u.size, 6), hist_secs_month=round(secs, 1), points=pts)
        print(ds, json.dumps(res[ds]), flush=True)
    json.dump(res, open(out, "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
