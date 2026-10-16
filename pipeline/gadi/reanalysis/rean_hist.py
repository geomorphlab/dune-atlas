"""Hourly 10 m wind histograms of MERRA-2 and JRA-3Q, in the layout of the ERA5 / ERA5-Land histogram stores.

Per cell, counts of hours per (speed, direction) bin with the ERA5 kernel (pipeline/gadi/era5/era5_hist.py):
  um = (u10**2 + v10**2)**0.5, 128 bins on linspace(0, 20, 129) m/s
  ua = arctan2(v10, u10), 128 bins on linspace(-pi, pi, 129) (direction the wind blows toward, CCW from east)
bins closed on the left, the last bin also closed on the right; hours with um > 20 m/s are not counted.

Each dataset stays on its native grid (no regridding), reordered to the ERA5 orientation: latitude from north to
south, longitude from -180. MERRA-2: 361 x 576 (0.5 x 0.625 deg; latitude flipped). JRA-3Q: 480 x 960 (NCAR's
regular N240 Gaussian grid, 0.375 deg in longitude; longitude rolled from 0..359.625 to -180..179.625).

  python rean_hist.py year DATASET RAW YEAR OUTDIR        one year -> OUTDIR/<ds>_<year>_uam10_hist.zarr (+ n_out; marker <store>.done.json)
  python rean_hist.py sum  DATASET YEARDIR Y0 Y1 OUT.zarr  sum of the years -> the final store (ERA5 layout)
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

CHUNK = 64          # latitude / longitude chunk edge, as the ERA5-Land histogram and all qsat_params stores

DATASETS = {
    "merra2": dict(
        name="MERRA-2", shape=(361, 576),
        title="MERRA-2 hourly 10 m wind speed and direction histograms",
        source=("MERRA-2 inst1_2d_asm_Nx (M2I1NXASM v5.12.4; GMAO 2015, Gelaro et al. 2017): hourly instantaneous "
                "U10M and V10M, 0.5 x 0.625 deg grid, from NASA GES DISC (OPeNDAP subset of the two variables)"),
        grid=("native MERRA-2 grid, 361 x 576 cells; cell centres latitude 90 - 0.5 i, longitude -180 + 0.625 j "
              "(source latitude order -90..90 reversed to north-to-south, as the ERA5 stores)"),
        citation=("Global Modeling and Assimilation Office (GMAO) (2015), MERRA-2 inst1_2d_asm_Nx: 2d,1-Hourly,"
                  "Instantaneous,Single-Level,Assimilation,Single-Level Diagnostics V5.12.4, Greenbelt, MD, USA, "
                  "Goddard Earth Sciences Data and Information Services Center (GES DISC), doi:10.5067/3Z173KIE2TPD; "
                  "Gelaro, R. et al. (2017). The Modern-Era Retrospective Analysis for Research and Applications, "
                  "Version 2 (MERRA-2). Journal of Climate 30, 5419-5454, doi:10.1175/JCLI-D-16-0758.1"),
        licence="NASA data: no restrictions on use (U.S. Government work); cite the dataset and Gelaro et al. (2017)",
    ),
    "jra3q": dict(
        name="JRA-3Q", shape=(480, 960),
        title="JRA-3Q hourly 10 m wind speed and direction histograms",
        source=("JRA-3Q (Japan Meteorological Agency; Kosaka et al. 2024) fcst_surf ugrd10m / vgrd10m: 1-hour "
                "instantaneous forecast fields, from NSF NCAR GDEX dataset d640000 (doi:10.5065/AVTZ-1H78)"),
        grid=("NCAR GDEX regular N240 Gaussian grid (interpolated by NCAR from JMA's reduced N240 Gaussian grid), "
              "480 x 960 cells: Gaussian latitudes 89.71 N to 89.71 S, longitude -180 + 0.375 j (source longitude "
              "0..359.625 rolled to start at -180, as the ERA5 stores)"),
        citation=("Kosaka, Y. et al. (2024). The JRA-3Q Reanalysis. Journal of the Meteorological Society of Japan "
                  "102, 49-109, doi:10.2151/jmsj.2024-004; Japan Meteorological Agency, Japan (2022): Japanese "
                  "Reanalysis for Three Quarters of a Century (JRA-3Q). NSF NCAR GDEX, doi:10.5065/AVTZ-1H78"),
        licence=("JRA-3Q via NCAR GDEX: non-commercial use, per JMA's conditions for collaborative organisations; "
                 "products derived from it are treated as CC BY-NC-SA 4.0 (the licence stated by JMA's DIAS copy)"),
    ),
}


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def n_hours(y0, y1):
    return int((np.datetime64(f"{y1 + 1}-01-01T00") - np.datetime64(f"{y0}-01-01T00")) / np.timedelta64(1, "h"))


# ----------------------------------------------------------------------------------------------- readers
def merra2_files(raw, year):
    fs = sorted(glob.glob(f"{raw}/{year:04d}/MERRA2_*.inst1_2d_asm_Nx.{year:04d}????.nc4"))
    assert len(fs) == (366 if year % 4 == 0 else 365), (year, len(fs))
    return fs


def merra2_read(path):
    """(u, v) float32 (24, 361, 576) north-to-south, longitude from -180; plus coordinates."""
    with netCDF4.Dataset(path) as d:
        u, v = d["U10M"][:], d["V10M"][:]
        lat, lon = np.asarray(d["lat"][:]), np.asarray(d["lon"][:])
    assert np.allclose(lat, -90 + 0.5 * np.arange(361)) and np.allclose(lon, -180 + 0.625 * np.arange(576))
    u, v = (np.ascontiguousarray(np.ma.filled(x, np.nan)[:, ::-1, :], dtype=np.float32) for x in (u, v))
    return u, v, lat[::-1].copy(), lon


def jra3q_files(raw, year):
    out = []
    for m in range(1, 13):
        fu = glob.glob(f"{raw}/{year:04d}/jra3q.fcst_surf.0_2_2.ugrd10m-hgt-fc-gauss.{year:04d}{m:02d}0100_*.nc")
        fv = glob.glob(f"{raw}/{year:04d}/jra3q.fcst_surf.0_2_3.vgrd10m-hgt-fc-gauss.{year:04d}{m:02d}0100_*.nc")
        assert len(fu) == 1 and len(fv) == 1, (year, m, fu, fv)
        out.append((fu[0], fv[0]))
    return out


def jra3q_read(pair):
    """(u, v) float32 (hours, 480, 960) north-to-south, longitude from -180; plus coordinates."""
    xs = []
    for path, tag in zip(pair, ("ugrd10m", "vgrd10m")):
        with netCDF4.Dataset(path) as d:
            name = [k for k in d.variables if k.startswith(tag)][0]
            x = np.ma.filled(d[name][:], np.nan).astype(np.float32)
            lat, lon = np.asarray(d["lat"][:]), np.asarray(d["lon"][:])
        assert np.allclose(lon, 0.375 * np.arange(960)) and (np.diff(lat) < 0).all()
        xs.append(np.ascontiguousarray(np.concatenate([x[..., 480:], x[..., :480]], axis=-1)))
    lon2 = np.concatenate([lon[480:] - 360.0, lon[:480]])
    return xs[0], xs[1], lat, lon2


READERS = {"merra2": (merra2_files, merra2_read), "jra3q": (jra3q_files, jra3q_read)}


# ----------------------------------------------------------------------------------------------- stores
def create_store(path, ds, lat, lon, title, period, nh, description, extra_attrs=None):
    import zarr
    from numcodecs import Blosc
    meta = DATASETS[ds]
    ny, nx = meta["shape"]
    comp = Blosc(cname="lz4", clevel=5, shuffle=Blosc.SHUFFLE)
    root = zarr.open_group(path, mode="w", zarr_format=2)
    h = root.create_array("histogram_um_ua", shape=(ny, nx, NB, NB), chunks=(CHUNK, CHUNK, NB, NB), dtype="uint32",
                          fill_value=None, compressors=comp)
    h.attrs.update({"_ARRAY_DIMENSIONS": ["latitude", "longitude", "um_bin", "ua_bin"],
                    "long_name": "Number of hours per 10 m wind speed and direction bin", "description": description})
    for name, vals, attrs in (
            ("latitude", lat.astype(np.float32), dict(long_name="latitude", units="degrees_north")),
            ("longitude", lon.astype(np.float32), dict(long_name="longitude", units="degrees_east")),
            ("um_bin", 0.5 * (UM_EDGES[1:] + UM_EDGES[:-1]),
             dict(long_name="10 m wind speed bin centre", units="m s**-1", bin_edges=UM_EDGES.tolist())),
            ("ua_bin", 0.5 * (UA_EDGES[1:] + UA_EDGES[:-1]),
             dict(long_name="10 m wind direction bin centre (arctan2(v10, u10), toward, CCW from east)", units="rad",
                  bin_edges=UA_EDGES.tolist()))):
        a = root.create_array(name, shape=vals.shape, chunks=vals.shape, dtype=vals.dtype, compressors=comp,
                              fill_value=np.nan)
        a[:] = vals
        a.attrs.update({"_ARRAY_DIMENSIONS": [name], **attrs})
    root.attrs.update({
        "title": f"{title}, {period[:4]}-{period[17:21]}",
        "source": meta["source"],
        "grid": meta["grid"],
        "period": f"{period} ({nh} hours)",
        "n_hours": nh,
        "method": ("um = (u10^2 + v10^2)^0.5, ua = arctan2(v10, u10); counts per bin over all hours; bins closed on "
                   "the left, last bin closed on both sides; hours with um > 20 m/s not counted. Same bins and kernel "
                   "as the ERA5 and ERA5-Land histogram stores; native grid, no regridding."),
        "citation": meta["citation"],
        "licence": meta["licence"],
        "code": "dune-atlas pipeline/gadi/reanalysis/rean_hist.py",
        "date_created": time.strftime("%Y-%m-%d"),
        **(extra_attrs or {})})
    return root


def year(ds, raw, y, outdir):
    import zarr
    files, read = READERS[ds]
    ny, nx = DATASETS[ds]["shape"]
    out = f"{outdir}/{ds}_{y}_uam10_hist.zarr"
    if os.path.exists(f"{out}.done.json"):
        log("exists", out)
        return
    hist = np.zeros((ny, nx, NB, NB), np.uint32)
    nout = np.zeros((ny, nx), np.uint32)
    nh = 0
    t_read = t_acc = 0.0
    last = None
    for f in files(raw, y):
        t0 = time.time()
        u, v, lat, lon = read(f)
        t1 = time.time()
        assert u.shape[1:] == (ny, nx) and np.isfinite(u).all() and np.isfinite(v).all(), f
        accumulate(hist, nout, u, v, 1.0, 0.0, 1.0, 0.0, UM_EDGES, UA_EDGES)
        t_read += t1 - t0
        t_acc += time.time() - t1
        nh += u.shape[0]
        if last is not None:
            assert np.array_equal(last[0], lat) and np.array_equal(last[1], lon), "grid changed"
        last = (lat, lon)
    assert nh == n_hours(y, y), (nh, n_hours(y, y))
    assert int(hist.sum(dtype=np.uint64)) + int(nout.sum(dtype=np.uint64)) == nh * ny * nx
    period = f"{y}-01-01T00 to {y}-12-31T23"
    root = create_store(out, ds, *last, DATASETS[ds]["title"], period, nh,
                        f"Number of hourly samples {period} in each (um_bin, ua_bin); hours with wind speed above "
                        "20 m/s are not counted (their number per cell is in n_out).")
    root["histogram_um_ua"][:] = hist
    from numcodecs import Blosc
    a = root.create_array("n_out", shape=(ny, nx), chunks=(ny, nx), dtype="uint32", fill_value=None,
                          compressors=Blosc(cname="lz4", clevel=5, shuffle=Blosc.SHUFFLE))
    a[:] = nout
    a.attrs.update({"_ARRAY_DIMENSIONS": ["latitude", "longitude"], "long_name": "hours with wind speed above 20 m/s"})
    open(f"{out}.done.json", "w").write(json.dumps(dict(hours=nh, t_read_s=round(t_read), t_acc_s=round(t_acc))))
    log("year", ds, y, "hours", nh, "read_s", round(t_read), "acc_s", round(t_acc))


def total(ds, yeardir, y0, y1, out):
    import zarr
    ys = list(range(y0, y1 + 1))
    stores = [f"{yeardir}/{ds}_{y}_uam10_hist.zarr" for y in ys]
    for s in stores:
        assert os.path.exists(f"{s}.done.json"), s
    first = zarr.open_group(stores[0], mode="r")
    lat, lon = first["latitude"][:], first["longitude"][:]
    for s in stores[1:]:
        g = zarr.open_group(s, mode="r")
        assert np.array_equal(g["latitude"][:], lat) and np.array_equal(g["longitude"][:], lon), s
    nh = n_hours(y0, y1)
    period = f"{y0}-01-01T00 to {y1}-12-31T23"
    root = create_store(out, ds, lat, lon, DATASETS[ds]["title"], period, nh,
                        f"Number of hourly samples {period} in each (um_bin, ua_bin); hours with wind speed above "
                        "20 m/s are not counted.", extra_attrs={"source_years": f"sum of per-year stores {y0}-{y1}"})
    H = root["histogram_um_ua"]
    ny, nx = lat.size, lon.size
    arrs = [zarr.open_array(f"{s}/histogram_um_ua", mode="r") for s in stores]
    nouts = sum(zarr.open_array(f"{s}/n_out", mode="r")[:].astype(np.uint64) for s in stores)
    tot = 0
    for i in range(0, ny, CHUNK):
        for j in range(0, nx, CHUNK):
            acc = np.zeros((min(CHUNK, ny - i), min(CHUNK, nx - j), NB, NB), np.uint64)
            for a in arrs:
                acc += a[i:i + CHUNK, j:j + CHUNK]
            assert acc.max() < 2**32
            H[i:i + CHUNK, j:j + CHUNK] = acc.astype(np.uint32)
            tot += int(acc.sum())
        log("rows", i, "done")
    assert tot + int(nouts.sum()) == nh * ny * nx, (tot, int(nouts.sum()), nh * ny * nx)
    open(f"{out}.done.json", "w").write(json.dumps(dict(hours=nh, counted=tot, outside=int(nouts.sum()))))
    log("total", ds, y0, y1, out)


if __name__ == "__main__":
    cmd, a = sys.argv[1], sys.argv[2:]
    if cmd == "year":
        year(a[0], a[1], int(a[2]), a[3])
    elif cmd == "sum":
        total(a[0], a[1], int(a[2]), int(a[3]), a[4])
    else:
        raise SystemExit(__doc__)
