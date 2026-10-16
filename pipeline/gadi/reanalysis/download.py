"""Download hourly 10 m winds of MERRA-2 and JRA-3Q to Gadi scratch (run in copyq: the only queue with internet).

MERRA-2  inst1_2d_asm_Nx (M2I1NXASM v5.12.4): hourly instantaneous U10M, V10M on the 0.5 x 0.625 deg grid, one
         file per day from NASA GES DISC, subset to U10M, V10M (+ coordinates) through Earthdata Cloud OPeNDAP
         (DAP4), so ~40 MB per day instead of the 198 MB full file; the day list comes from the GES DISC directory. Needs the user's Earthdata login in ~/.netrc (and ~/.urs_cookies).
JRA-3Q   fcst_surf ugrd10m-hgt-fc-gauss / vgrd10m-hgt-fc-gauss ("1-hour instantaneous" forecast fields), one file
         per month and component on NCAR GDEX's regular N240 Gaussian grid (960 x 480); public download.

Every file is downloaded to <name>.<pid>.<thread>.part, checked (variables, grid, hourly time axis), then renamed;
a line per file goes to <out>/manifest.jsonl (size, sha256, time range, MERRA-2 stream). A file name appears only
after its checks pass, so re-running skips every file that exists: a job that stops (walltime, network) is simply
submitted again, and two jobs never write the same temporary file. MERRA-2 is limited per request (the server
subsets each day), so --workers N days are fetched in parallel; JRA-3Q is limited by bandwidth and runs serially.

  python download.py merra2 OUT YEAR0 YEAR1 [--months 1-12] [--workers 3]
  python download.py jra3q  OUT YEAR0 YEAR1 [--months 1-12]
"""
import argparse
import calendar
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import netCDF4

MERRA2_ROOT = "https://goldsmr4.gesdisc.eosdis.nasa.gov"
MERRA2_DIR = "MERRA2/M2I1NXASM.5.12.4"
# Earthdata Cloud OPeNDAP (DAP4) of collection C1276812820-GES_DISC; the old goldsmr4 /opendap/ answers 410 Gone
MERRA2_DAP = "https://opendap.earthdata.nasa.gov/collections/C1276812820-GES_DISC/granules/M2I1NXASM.5.12.4%3A"
JRA3Q_ROOT = "https://tds.gdex.ucar.edu/thredds/fileServer/files/g/d640000/fcst_surf"
JRA3Q_CATALOG = "https://tds.gdex.ucar.edu/thredds/catalog/files/g/d640000/fcst_surf"
JRA3Q_VARS = {"u": "0_2_2.ugrd10m-hgt-fc-gauss", "v": "0_2_3.vgrd10m-hgt-fc-gauss"}
HOME = os.path.expanduser("~")
# Earthdata session cookies: one private file per process and thread. A shared ~/.urs_cookies written by
# concurrent curl processes gets corrupted, and the server then answers 401 or returns its login page.
COOKIE_DIR = tempfile.mkdtemp(prefix="urs_", dir=os.environ.get("PBS_JOBFS") or None)   # mode 0700


def log(*a):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), *a, flush=True)


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""):
            h.update(b)
    return h.hexdigest()


def curl(url, dst, auth=False, tries=5):
    """Download url to dst with curl; returns (bytes, seconds). auth: Earthdata login from ~/.netrc."""
    cmd = ["curl", "-sS", "-f", "-L", "--retry", "3", "--retry-delay", "20", "--connect-timeout", "60",
           "--max-time", "3600", "-o", dst, "-w", "%{http_code} %{size_download} %{time_total}"]
    if auth:
        jar = f"{COOKIE_DIR}/{threading.get_ident()}.txt"
        cmd += ["-n", "-c", jar, "-b", jar]
    for k in range(tries):
        p = subprocess.run(cmd + [url], capture_output=True, text=True)
        if p.returncode == 0:
            _, size, secs = p.stdout.split()
            return int(size), float(secs)
        log("retry", k + 1, url.split("/")[-1][:90], p.returncode, p.stderr.strip()[:200])
        time.sleep(30 * (k + 1))
    raise RuntimeError(f"download failed: {url}")


_LOCK = threading.Lock()
_NC = threading.Lock()          # netCDF4/HDF5 is not thread-safe: one file check at a time


def part_name(final):
    return f"{final}.{os.getpid()}.{threading.get_ident()}.part"


def record(out, entry):
    with _LOCK, open(f"{out}/manifest.jsonl", "a") as f:
        f.write(json.dumps(entry) + "\n")
        f.flush()
        os.fsync(f.fileno())


def hours_of(tv):
    t = netCDF4.num2date(tv[:], tv.units, only_use_cftime_datetimes=False, only_use_python_datetimes=True)
    return [x.replace(tzinfo=None) for x in t]


def merra2_month_names(y, m):
    """Exact file names of one month from the GES DISC directory listing (stream 100/200/300/400, or 401 where a
    month was reprocessed)."""
    tmp = f"/tmp/m2list_{os.getpid()}.html"
    curl(f"{MERRA2_ROOT}/data/{MERRA2_DIR}/{y:04d}/{m:02d}/", tmp)
    names = sorted(set(re.findall(r"MERRA2_\d{3}\.inst1_2d_asm_Nx\.\d{8}\.nc4(?=\")", open(tmp).read())))
    os.remove(tmp)
    return names


def check_merra2(path, day):
    with netCDF4.Dataset(path) as d:
        u, v = d["U10M"], d["V10M"]
        assert u.shape == (24, 361, 576) and v.shape == u.shape, u.shape
        lat, lon = d["lat"][:], d["lon"][:]
        assert np.allclose(lat, -90 + 0.5 * np.arange(361)) and np.allclose(lon, -180 + 0.625 * np.arange(576))
        want = [dt.datetime(day.year, day.month, day.day, h) for h in range(24)]
        t = hours_of(d["time"])
        assert t == want, (t[0], t[-1])
        uu, vv = u[:], v[:]
        for x in (uu, vv):
            assert not (np.ma.is_masked(x) and x.mask.any()), "masked values"
        return dict(t0=str(want[0]), t1=str(want[-1]), n=24, umax=float(np.abs(uu).max()), vmax=float(np.abs(vv).max()))


def merra2_day(out, d, name):
    if os.path.exists(f"{d}/{name}"):
        return 0, 0.0
    stamp = name.split(".")[2]
    day = dt.date(int(stamp[:4]), int(stamp[4:6]), int(stamp[6:]))
    url = f"{MERRA2_DAP}{name}.dap.nc4?dap4.ce=/U10M;/V10M;/time;/lat;/lon"
    part = part_name(f"{d}/{name}")
    for k in range(5):                       # a failed check (e.g. an HTML login page saved as data) is retried
        size, secs = curl(url, part, auth=True)
        try:
            with _NC:
                info = check_merra2(part, day)
            break
        except Exception as e:                # noqa: BLE001
            log("check failed", name, k + 1, type(e).__name__, str(e)[:160])
            os.remove(part)
            time.sleep(60 * (k + 1))
    else:
        raise RuntimeError(f"check failed 5 times: {name}")
    os.replace(part, f"{d}/{name}")
    record(out, dict(file=name, path=f"{d}/{name}", bytes=size, secs=round(secs, 1),
                     sha256=sha256(f"{d}/{name}"), stream=int(name[7:10]), **info))
    return size, secs


def merra2(out, y0, y1, months, workers=3):
    os.makedirs(out, exist_ok=True)
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for y in range(y0, y1 + 1):
            for m in months:
                names = merra2_month_names(y, m)
                assert len(names) == calendar.monthrange(y, m)[1], (y, m, len(names))
                d = f"{out}/{y:04d}"
                os.makedirs(d, exist_ok=True)
                t0 = time.time()
                res = list(ex.map(lambda n: merra2_day(out, d, n), names))
                mb = sum(r[0] for r in res) / 1e6
                log("merra2", y, m, "ok", f"{mb:.0f} MB in {time.time() - t0:.0f} s, workers {workers}")


def jra3q_month_files(y, m):
    """{component: (file name, catalogue size)} for the two 10 m wind files of one month."""
    tmp = f"/tmp/j3cat_{os.getpid()}.xml"
    curl(f"{JRA3Q_CATALOG}/{y:04d}{m:02d}/catalog.xml", tmp)
    t = open(tmp).read()
    os.remove(tmp)
    out = {}
    for comp, tag in JRA3Q_VARS.items():
        hits = re.findall(rf'<dataset name="(jra3q\.fcst_surf\.{re.escape(tag)}\.[0-9_]+\.nc)"[^>]*>(.*?)</dataset>', t, re.S)
        assert len(hits) == 1, (y, m, comp, len(hits))
        name, body = hits[0]
        s = re.search(r'<dataSize units="([^"]+)">([^<]+)<', body)
        out[comp] = (name, f"{s.group(2)} {s.group(1)}" if s else "")
    return out


def check_jra3q(path, comp, y, m):
    var = JRA3Q_VARS[comp].split(".", 1)[1]           # netCDF variable name, e.g. ugrd10m-hgt-fc-gauss
    with netCDF4.Dataset(path) as d:
        x = d[var]
        nh = calendar.monthrange(y, m)[1] * 24
        assert x.shape == (nh, 480, 960), x.shape
        assert x.getncattr("time_step") == "1-hour instantaneous"
        lat, lon = d["lat"][:], d["lon"][:]
        assert np.allclose(lon, 0.375 * np.arange(960)) and lat[0] > 89.7 and lat[-1] < -89.7 and (np.diff(lat) < 0).all()
        t = hours_of(d["time"])
        assert t[0] == dt.datetime(y, m, 1, 0) and all((b - a) == dt.timedelta(hours=1) for a, b in zip(t[:-1], t[1:]))
        return dict(t0=str(t[0]), t1=str(t[-1]), n=int(nh))


def jra3q(out, y0, y1, months, workers=1):
    os.makedirs(out, exist_ok=True)
    for y in range(y0, y1 + 1):
        d = f"{out}/{y:04d}"
        os.makedirs(d, exist_ok=True)
        for m in months:
            for comp, (name, catsize) in jra3q_month_files(y, m).items():
                if os.path.exists(f"{d}/{name}"):
                    continue
                part = part_name(f"{d}/{name}")
                size, secs = curl(f"{JRA3Q_ROOT}/{y:04d}{m:02d}/{name}", part)
                info = check_jra3q(part, comp, y, m)
                os.replace(part, f"{d}/{name}")
                record(out, dict(file=name, path=f"{d}/{name}", bytes=size, secs=round(secs, 1), catalog_size=catsize,
                                 sha256=sha256(f"{d}/{name}"), component=comp, **info))
            log("jra3q", y, m, "ok")


def main(argv):
    p = argparse.ArgumentParser()
    p.add_argument("dataset", choices=["merra2", "jra3q"])
    p.add_argument("out")
    p.add_argument("year0", type=int)
    p.add_argument("year1", type=int)
    p.add_argument("--months", default="1-12")
    p.add_argument("--workers", type=int, default=3)
    a = p.parse_args(argv)
    m0, m1 = (int(x) for x in a.months.split("-"))
    fn = {"merra2": merra2, "jra3q": jra3q}[a.dataset]
    fn(a.out, a.year0, a.year1, list(range(m0, m1 + 1)), workers=a.workers if a.dataset == "merra2" else 1)


if __name__ == "__main__":
    main(sys.argv[1:])
