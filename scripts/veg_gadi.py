"""NCI Gadi job (PBS): 2001-2025 mean total vegetation cover on the 0.1 deg atlas grid from the yearly monthly
0.1 deg aggregates of the MODIS Fractional Cover v3.1 tiles (read-only), plus diagnostics and an independent
per-cell recomputation from the tc43 500 m tiles (docs/records/validation-veg.md).

Reads   $VEG_MONTHLY_DIR/monthly-tcov-geoglamrapp-YYYY.nc   (read-only; tot_cov(year, month, latitude, longitude) %)
        /g/data/tc43/modis-fc/v310/tiles/monthly/cover/*.nc            (read-only; NCI collection tc43)
Writes  ./out/  (or the directory given as the first argument)
"""
import datetime as dt
import glob
import json
import os
import sys
import time

import netCDF4 as nc
import numpy as np

AUTH = os.environ["VEG_MONTHLY_DIR"] + "/monthly-tcov-geoglamrapp-%d.nc"
SRC = "/g/data/tc43/modis-fc/v310/tiles/monthly/cover/"
YEARS = list(range(2001, 2026))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "out")
os.makedirs(OUT, exist_ok=True)
R = 6371007.181                # constants.R_EARTH_AUTHALIC (sphere of the MODIS sinusoidal grid); standalone job
T = 1111950.5197665233          # MODIS tile size (m)
XMIN, YMAX = -20015109.355798, 10007554.677899
PX = T / 2400
T0 = time.time()


def log(*a):
    print(f"[{time.time() - T0:7.1f}s]", *a, flush=True)


def jdump(name, obj):
    tmp = os.path.join(OUT, name + ".tmp")
    with open(tmp, "w") as f:
        json.dump(obj, f, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
    os.replace(tmp, os.path.join(OUT, name))


def tmonths(var):
    return [(dt.datetime(1970, 1, 1) + dt.timedelta(seconds=float(s))).month for s in var[:]]


# ------------------------------------------------------------------ A. source time axes (all tiles, all years)
def phase_a():
    fs = sorted(glob.glob(SRC + "FC_Monthly_Medoid.v310.MCD43A4.h??v??.????.???.nc"))
    log("A: source files", len(fs))
    per = {}
    for f in fs:
        p = os.path.basename(f).split(".")
        tile, yr, col = p[3], int(p[4]), p[5]
        g = nc.Dataset(f)
        m = tmonths(g["time"])
        g.close()
        per.setdefault(yr, {}).setdefault(tile, {})[col] = m
    summ = {}
    for yr, tiles in sorted(per.items()):
        pat = {}
        for tile, cols in tiles.items():
            k = " | ".join(f"{c}:{','.join(map(str, m))}" for c, m in sorted(cols.items()))
            pat[k] = pat.get(k, 0) + 1
        summ[yr] = {"tiles": len(tiles), "patterns": pat}
    jdump("source_time_axes.json", summ)
    log("A: done", {y: s["tiles"] for y, s in summ.items()})
    return per


# ------------------------------------------------------------------ B. aggregate the yearly 0.1 deg files
def phase_b():
    ny, nx = 1801, 3600
    s = np.zeros((ny, nx), "f8"); s2 = np.zeros((ny, nx), "f8"); n = np.zeros((ny, nx), "i2")
    cs = np.zeros((12, ny, nx), "f8"); cn = np.zeros((12, ny, nx), "i2")
    ym = {}
    stats = {"gt100": 0, "max": -1.0, "min": 999.0, "col_lon_m180_finite": 0, "values_finite": 0}
    for yr in YEARS:
        t = time.time()
        g = nc.Dataset(AUTH % yr)
        assert int(g["year"][0]) == yr
        if yr == YEARS[0]:
            lat = np.asarray(g["latitude"][:], "f8"); lon = np.asarray(g["longitude"][:], "f8")
            assert np.allclose(lat, 90 - 0.1 * np.arange(ny), atol=1e-4) and np.allclose(lon, -180 + 0.1 * np.arange(nx), atol=1e-4)
        v = g["tot_cov"]
        v.set_auto_mask(False)
        a = np.asarray(v[0], "f4")                # (12, ny, nx)
        g.close()
        fin = np.isfinite(a)
        ym[yr] = [int(fin[m].sum()) for m in range(12)]
        stats["values_finite"] += int(fin.sum())
        if fin.any():
            stats["max"] = max(stats["max"], float(np.nanmax(a))); stats["min"] = min(stats["min"], float(np.nanmin(a)))
        stats["gt100"] += int((a > 100).sum())
        stats["col_lon_m180_finite"] += int(fin[:, :, 0].sum())
        a0 = np.where(fin, a, 0).astype("f8")
        s += a0.sum(0); s2 += (a0 * a0).sum(0); n += fin.sum(0).astype("i2")
        cs += a0; cn += fin.astype("i2")
        log(f"B: {yr} read+acc {time.time() - t:.1f}s finite/month", ym[yr])
    with np.errstate(invalid="ignore", divide="ignore"):
        mean = np.where(n > 0, s / np.maximum(n, 1), np.nan)
        var = np.where(n > 1, (s2 - n * mean ** 2) / np.maximum(n - 1, 1), np.nan)
        std = np.sqrt(np.maximum(var, 0))
        cm = np.where(cn > 0, cs / np.maximum(cn, 1), np.nan)            # monthly climatology (12, ny, nx)
    ncal = (cn > 0).sum(0).astype("i1")                                   # calendar months with >= 1 valid year
    with np.errstate(invalid="ignore"):
        clim12 = np.where(ncal == 12, cm.mean(0), np.nan)                 # NaN wherever any month is NaN
    # per-cell share of missing months that fall in Nov-Mar vs May-Sep (seasonal sampling diagnostic)
    miss = (len(YEARS) - cn).astype("i2")                                 # missing years per calendar month
    # write NetCDF
    fn = os.path.join(OUT, "tot_cov_mean_2001_2025.nc")
    d = nc.Dataset(fn + ".tmp", "w", format="NETCDF4")
    d.createDimension("latitude", ny); d.createDimension("longitude", nx); d.createDimension("month", 12)
    la = d.createVariable("latitude", "f8", ("latitude",)); la[:] = np.round(90 - 0.1 * np.arange(ny), 6)
    la.units = "degrees_north"; la.standard_name = "latitude"
    lo = d.createVariable("longitude", "f8", ("longitude",)); lo[:] = np.round(-180 + 0.1 * np.arange(nx), 6)
    lo.units = "degrees_east"; lo.standard_name = "longitude"
    mo = d.createVariable("month", "i1", ("month",)); mo[:] = np.arange(1, 13)
    kw = dict(zlib=True, complevel=4, chunksizes=(601, 1200))
    def put(name, data, dtype, attrs, dims=("latitude", "longitude"), fill=None, **k):
        x = d.createVariable(name, dtype, dims, fill_value=fill, **(k or kw)); x[:] = data
        for a_, b_ in attrs.items():
            setattr(x, a_, b_)
    put("tot_cov_mean", mean.astype("f4"), "f4", {"units": "%", "long_name": "Total vegetation cover (PV+NPV), mean of monthly values 2001-2025"}, fill=np.float32(np.nan))
    put("n_months", n, "i2", {"units": "1", "long_name": "Number of valid monthly values (of 300)"}, fill=np.int16(-1))
    put("tot_cov_std", std.astype("f4"), "f4", {"units": "%", "long_name": "Standard deviation of valid monthly values"}, fill=np.float32(np.nan))
    put("tot_cov_clim12", clim12.astype("f4"), "f4", {"units": "%", "long_name": "Mean of the 12 calendar-month climatologies (only where all 12 have >= 1 valid year)"}, fill=np.float32(np.nan))
    put("n_calendar_months", ncal, "i1", {"units": "1", "long_name": "Calendar months with >= 1 valid year"}, fill=np.int8(-1))
    put("missing_years_by_month", miss, "i2", {"units": "1", "long_name": "Years without a valid value, per calendar month"},
        dims=("month", "latitude", "longitude"), fill=np.int16(-1), zlib=True, complevel=4, chunksizes=(12, 601, 1200))
    d.source_files = "monthly-tcov-geoglamrapp-2001..2025.nc (monthly 0.1 deg aggregation of MODIS FC v3.1 tot_cov)"
    d.method = "tot_cov_mean = sum of finite monthly values / count over all 300 (year, month) values (NaN-skipping mean, float64 accumulation)"
    d.close(); os.replace(fn + ".tmp", fn)
    stats.update(year_month_finite=ym, cells_mean_finite=int(np.isfinite(mean).sum()),
                 mean_max=float(np.nanmax(mean)), mean_min=float(np.nanmin(mean)),
                 n_months_hist={int(k): int(v) for k, v in zip(*np.unique(n[n > 0], return_counts=True))},
                 cells_all12_calmonths=int((ncal == 12).sum()),
                 clim12_minus_mean_abs_p50_p99=[float(np.nanpercentile(np.abs(clim12 - mean), q)) for q in (50, 90, 99)])
    jdump("aggregate_stats.json", stats)
    log("B: wrote", fn)
    return mean.astype("f4"), n


# ------------------------------------------------------------------ C. independent per-cell recomputation
CELLS = [  # (name, lat centre, lon centre)
    ("Namib", -24.5, 15.2), ("Grand Erg Oriental", 30.5, 7.5), ("Rub al Khali", 20.0, 50.0),
    ("Taklamakan", 39.0, 83.0), ("Badain Jaran", 40.0, 102.0), ("Simpson", -25.0, 137.0),
    ("Nebraska Sandhills", 42.0, -101.0), ("Kalahari", -26.0, 21.0), ("Amazon", -3.0, -60.0),
    ("Yakutia", 65.0, 120.0), ("Thar", 27.5, 71.0), ("Patagonia", -45.0, -69.0), ("Mongolia", 45.0, 110.0),
    ("Chukotka 179.9E", 66.0, 179.9), ("Chukotka 180", 66.0, -180.0), ("Chukotka 179.9W", 66.0, -179.9),
    ("Sahel", 15.0, 0.0), ("Alaska Kobuk", 67.0, -159.0),
]
VAL_YEARS = [2003, 2021, 2023, 2025]


def tiles_for(lat, lon):
    out = set()
    for la in np.linspace(lat - 0.05, lat + 0.05, 5):
        for lo in np.linspace(lon - 0.05, lon + 0.05, 9):
            lo = ((lo + 180) % 360) - 180
            x = R * np.radians(lo) * np.cos(np.radians(la)); y = R * np.radians(la)
            h = int(np.floor((x - XMIN) / T)); v = int(np.floor((YMAX - y) / T))
            out.add((h, v))
    return sorted(out)


def read_pixels(tile, yr, lat, lon):
    """All pixels of tile files for (tile, yr) inside a padded window -> dict month -> list of (col, arrays)."""
    h, v = tile
    fs = sorted(glob.glob(SRC + f"FC_Monthly_Medoid.v310.MCD43A4.h{h:02d}v{v:02d}.{yr}.*.nc"))
    res = []
    for f in fs:
        g = nc.Dataset(f)
        x = g["x"][:]; y = g["y"][:]
        yl, yh = R * np.radians(lat - 0.07), R * np.radians(lat + 0.07)
        iy = np.where((y >= yl) & (y <= yh))[0]
        if not len(iy):
            g.close(); continue
        cand = np.zeros(len(x), bool)
        for lo in (lon, lon + 360, lon - 360):          # wrap: x beyond +-180 deg simply matches nothing
            xc = [R * np.radians(lo + dl) * np.cos(np.radians(lat + dy))
                  for dl in (-0.08, 0.08) for dy in (-0.07, 0.07)]
            cand |= (x >= min(xc) - 2 * PX) & (x <= max(xc) + 2 * PX)
        ix = np.where(cand)[0]
        if not len(ix):
            g.close(); continue
        var = g["tot_cov"]; var.set_auto_mask(False)
        a = np.asarray(var[:, iy[0]:iy[-1] + 1, ix[0]:ix[-1] + 1]).astype("i2")
        months = tmonths(g["time"])
        g.close()
        res.append({"file": os.path.basename(f), "col": f.split(".")[-2], "months": months,
                    "x": x[ix[0]:ix[-1] + 1], "y": y[iy[0]:iy[-1] + 1], "a": a})
    return res


def cell_values(chunks, lat, lon, month):
    """(exact footprint, aggregation replica, pixel mean in the aggregation bins) for one month from pixel chunks."""
    rows = {}
    xs_all, ys_all, vs_all = [], [], []
    cols = []
    # pick per tile chunk the file containing the month; if several, prefer the LAST (061) - recorded
    by_tile = {}
    for ch in chunks:
        if month in ch["months"]:
            by_tile.setdefault(ch["tile"], []).append(ch)
    for tile, chs in by_tile.items():
        ch = chs[-1]
        cols.append(f"{tile}:{'+'.join(c['col'] for c in chs)}->{ch['col']}")
        a = ch["a"][ch["months"].index(month)].astype("f8")
        a[(a > 103) | (a < 0)] = np.nan
        X, Y = np.meshgrid(ch["x"], ch["y"])
        xs_all.append(X.ravel()); ys_all.append(Y.ravel()); vs_all.append(a.ravel())
    if not xs_all:
        return np.nan, np.nan, np.nan, cols, 0
    X = np.concatenate(xs_all); Y = np.concatenate(ys_all); V = np.concatenate(vs_all)
    plat = np.degrees(Y / R)
    plon = np.degrees(X / (R * np.cos(np.radians(plat))))
    dlon = ((plon - lon + 180) % 360) - 180
    inexact = (plat >= lat - 0.05) & (plat < lat + 0.05) & (dlon >= -0.05) & (dlon < 0.05) & np.isfinite(V)
    exact = float(V[inexact].mean()) if inexact.any() else np.nan
    # replica of the 0.1 deg aggregation: rounded latitude bin, longitude from the rounded latitude, mean over rows then x
    rlat = np.round(Y / R / np.pi * 180 * 10, 0) / 10
    sel = np.isclose(rlat, lat, atol=1e-6)
    alon = X / R / np.cos(rlat * np.pi / 180) / np.pi * 180
    dl = alon - lon
    inb = sel & (dl > -0.05 - 1e-9) & (dl <= 0.05 + 1e-9)
    if lon <= -179.95 + 1e-9:
        inb[:] = False                        # aggregation grid: the lon -180 column holds no data
    rep = np.nan
    if inb.any():
        xu = np.unique(X[inb])
        rm = []
        for xv in xu:
            m = inb & (X == xv)
            vv = V[m]
            if np.isfinite(vv).any():
                rm.append(np.nanmean(vv))
        rep = float(np.mean(rm)) if rm else np.nan
    # pixel-weighted mean in the aggregation bins (isolates the row-mean step)
    pix_auth = float(np.nanmean(V[inb])) if inb.any() and np.isfinite(V[inb]).any() else np.nan
    return exact, rep, pix_auth, cols, int(inexact.sum())


def phase_c(mean, n):
    out = []
    auth = {}
    for yr in VAL_YEARS:
        g = nc.Dataset(AUTH % yr); v = g["tot_cov"]; v.set_auto_mask(False)
        for name, lat, lon in CELLS:
            i = int(round((90 - lat) / 0.1)); j = int(round((lon + 180) / 0.1))
            auth[(name, yr)] = np.asarray(v[0, :, i, j], "f8")
        g.close()
    for name, lat, lon in CELLS:
        i = int(round((90 - lat) / 0.1)); j = int(round((lon + 180) / 0.1))
        tl = tiles_for(lat, lon)
        rec = {"cell": name, "lat": lat, "lon": lon, "i": i, "j": j, "tiles": [f"h{h:02d}v{v:02d}" for h, v in tl],
               "tot_cov_mean": float(mean[i, j]), "n_months": int(n[i, j]), "years": {}}
        for yr in VAL_YEARS:
            chunks = []
            for t in tl:
                for ch in read_pixels(t, yr, lat, lon):
                    ch["tile"] = f"h{t[0]:02d}v{t[1]:02d}"; chunks.append(ch)
            ys = []
            for m in range(1, 13):
                ex, rep, pa, cols, npx = cell_values(chunks, lat, lon, m)
                ys.append({"m": m, "aggregate": None if not np.isfinite(auth[(name, yr)][m - 1]) else round(float(auth[(name, yr)][m - 1]), 4),
                           "replica": None if not np.isfinite(rep) else round(rep, 4),
                           "pixmean_aggbins": None if not np.isfinite(pa) else round(pa, 4),
                           "exact": None if not np.isfinite(ex) else round(ex, 4), "npx_exact": npx, "cols": cols})
            rec["years"][yr] = ys
        out.append(rec)
        log("C:", name, "done")
        jdump("validation_cells.json", out)
    return out


if __name__ == "__main__":
    which = os.environ.get("PHASES", "ABC")
    if "A" in which:
        phase_a()
    if "B" in which:
        mean, n = phase_b()
    else:
        d = nc.Dataset(os.path.join(OUT, "tot_cov_mean_2001_2025.nc")); mean = d["tot_cov_mean"][:].filled(np.nan); n = d["n_months"][:]; d.close()
    if "C" in which:
        phase_c(mean, n)
    log("all done")
