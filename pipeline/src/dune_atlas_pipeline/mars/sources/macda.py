"""MACDA v2.0 reanalysis, one Mars year of lowest-level series as the contract source store of
`macda-v2-my30` (cells.read_contract), read chunk by chunk from ARCO-MACDA on Hugging Face.

Source: ARCO-MACDA (Bhattacharya 2026, doi:10.57967/hf/8771), store macda_combined.zarr: the 268 CEDA files of
MACDA v2.0 (Valeanu et al. 2026, doi:10.5285/cd037a9ea387438fabf4d674dbe53088; 30 sols each, 12 times per sol)
concatenated along `time` (sols since the start of MY24, model start at midnight at the prime meridian). Arrays
uwind, vwind, temp (time, lev, lat, lon) and psurf (time, lat, lon) are float32 chunks of 120 times (all 35 levels,
whole globe), codecs bytes + blosc(zstd); each time chunk is read once and only the lowest level is kept.

  selection  every step whose `MY_Ls` (Martian year counted on Ls, Clancy et al. 2000) equals the year, ordered
             by `time`: the store is not in time order (the files were concatenated by start year and then by
             run-type name, so ODY/THEMIS 30-sol blocks follow the MRO/MCS blocks of the same year); after sorting
             the steps must be unique and evenly spaced at 1/12 sol.
  grid       native 5° grid, all variables co-located: rows 87.5 -> -87.5, columns -180 -> 175 (cell centres),
             already the contract orientation (to_contract checks and would flip or roll; no interpolation).
  level      lowest sigma level s = max(lev) = 0.9995 (lev[0]); p = s ps (the `lev` convention of MACDA), so the
             contract interfaces are ak = 0, bk_bottom = 1, bk_top = 2 s - 1 (mid pressure s ps) and
             z = (R T / g) ln(1 / s).
  ls, sol    MACDA `Ls` (model solar longitude, 0 at time 0 of MY24) and `time` (sols since the start of MY24;
             its fractional part is the time of day at the prime meridian, checked here against the subsolar
             longitude of `swflux`).

    python -m dune_atlas_pipeline.mars.sources.macda --out source/macda-v2-my30.zarr --report macda_extract.json
"""
from __future__ import annotations

import argparse
import json
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np

from .. import datasets as D

DATASET_ID = "macda-v2-my30"
URL = "https://huggingface.co/datasets/ananyo01/ARCO-MACDA/resolve/main/macda_combined.zarr"
YEAR = 30
VARS = {"u": "uwind", "v": "vwind", "T": "temp", "ps": "psurf"}     # contract name -> MACDA name
SPACING_TOL = 1e-6                                                  # sol, on the float64 `time`


# ---------------------------------------------------------------------------------------------- pure transforms
def lowest_level(lev: np.ndarray) -> tuple[int, float]:
    """Index and value of the lowest sigma level (the largest sigma, < 1)."""
    lev = np.asarray(lev, "f8")
    k = int(np.argmax(lev))
    s = float(lev[k])
    assert 0.9 < s < 1.0 and np.all(np.diff(lev) < 0), (k, s)
    return k, s


def interfaces(s: float) -> dict:
    """Contract interfaces of the lowest sigma level s: bottom at the surface (p = ps), top where the mid pressure
    of the layer is s ps, so physics.air_state gives p = s ps and physics.layer_height z = (R T/g) ln(1/s)."""
    return {"ak_bottom": 0.0, "bk_bottom": 1.0, "ak_top": 0.0, "bk_top": 2.0 * float(s) - 1.0}


def select_year(t: np.ndarray, my: np.ndarray, year: int, samples_per_sol: int) -> tuple[np.ndarray, dict]:
    """Store indices of every step labelled `year`, in time order, with the checks of the selection: unique,
    strictly increasing and evenly spaced at 1/samples_per_sol after sorting. Returns (indices, report)."""
    t, my = np.asarray(t, "f8"), np.asarray(my)
    sel = np.flatnonzero(my == year)
    assert sel.size, year
    idx = sel[np.argsort(t[sel], kind="stable")]
    ts = t[idx]
    dt = np.diff(ts)
    step = 1.0 / samples_per_sol
    rep = {"n": int(idx.size), "sols": idx.size / samples_per_sol,
           "time_first": float(ts[0]), "time_last": float(ts[-1]),
           "duplicates": int(np.sum(dt == 0)), "gaps": int(np.sum(dt > step + SPACING_TOL)),
           "uneven": int(np.sum(np.abs(dt - step) > SPACING_TOL)),
           "in_store_order": bool(np.all(np.diff(sel) == 1) and np.all(np.diff(t[sel]) > 0)),
           "store_index_min": int(sel.min()), "store_index_max": int(sel.max())}
    assert rep["duplicates"] == rep["gaps"] == rep["uneven"] == 0, rep
    return idx, rep


def to_contract(a: np.ndarray, lat: np.ndarray, lon: np.ndarray, grid: dict) -> np.ndarray:
    """(time, lat, lon) source array -> (lat, lon, time) float32 in contract orientation of `grid`: rows north to
    south, columns from lon0. Flips rows and rolls columns only if needed (no interpolation) and checks that the
    source centres are the grid centres (atol 1e-3 deg)."""
    glat, glon = D.grid_axes(grid)
    lat, lon = np.asarray(lat, "f8"), np.asarray(lon, "f8")
    assert a.shape[1:] == (lat.size, lon.size) == (glat.size, glon.size), (a.shape, lat.size, lon.size)
    if lat[0] < lat[-1]:
        a, lat = a[:, ::-1], lat[::-1]
    k = int(np.argmin(np.abs((lon - glon[0] + 180.0) % 360.0 - 180.0)))
    a, lon = np.roll(a, -k, axis=2), np.roll(lon, -k)
    np.testing.assert_allclose(lat, glat, atol=1e-3)
    np.testing.assert_allclose((lon - glon + 180.0) % 360.0 - 180.0, 0.0, atol=1e-3)
    return np.ascontiguousarray(np.moveaxis(a, 0, -1), "f4")


def subsolar_offset(sw: np.ndarray, t: np.ndarray, lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    """Subsolar longitude of downward shortwave flux (time, lat, lon) along the two rows next to the equator
    (flux-weighted circular mean) minus the longitude where the mean solar time is noon if the fractional part
    of `t` is the time of day at the prime meridian (deg, wrapped to +-180)."""
    rows = np.argsort(np.abs(np.asarray(lat, "f8")))[:2]
    eq = sw[:, rows].mean(axis=1).astype("f8")
    obs = np.degrees(np.angle((eq * np.exp(1j * np.radians(np.asarray(lon, "f8")))[None]).sum(axis=1)))
    pred = 15.0 * (12.0 - 24.0 * (np.asarray(t, "f8") % 1.0))
    return (obs - pred + 180.0) % 360.0 - 180.0


# ---------------------------------------------------------------------------------------------- remote store
class Remote:
    """Chunk reader of the ARCO-MACDA zarr v3 store over plain HTTPS (default chunk keys c/i/j/..., codecs
    bytes + zstd or bytes + blosc), with back-off on HTTP 429 from the Hugging Face resolver."""

    def __init__(self, url: str = URL, log=print):
        import requests
        self.url, self.log, self.s = url, log, requests.Session()
        root = self.get_json("zarr.json")
        self.meta, self.attrs = root["consolidated_metadata"]["metadata"], root["attributes"]

    def get(self, key: str) -> bytes:
        import requests
        for i in range(12):
            try:
                r = self.s.get(f"{self.url}/{key}", timeout=600)
                if r.status_code == 429:
                    time.sleep(min(float(r.headers.get("Retry-After", 30)), 120) + 1)
                    continue
                r.raise_for_status()
                return r.content
            except requests.HTTPError:
                raise
            except requests.RequestException as e:
                self.log(f"retry {key}: {type(e).__name__}")
                time.sleep(5 * (i + 1))
        raise RuntimeError(f"failed to read {key}")

    def get_json(self, key: str) -> dict:
        return json.loads(self.get(key))

    def chunk_shape(self, name: str) -> list[int]:
        return self.meta[name]["chunk_grid"]["configuration"]["chunk_shape"]

    def decode(self, name: str, raw: bytes) -> np.ndarray:
        import numcodecs
        m = self.meta[name]
        assert [c["name"] for c in m["codecs"]][0] == "bytes" and m["codecs"][0]["configuration"]["endian"] == "little"
        last = m["codecs"][-1]["name"]
        buf = numcodecs.Zstd().decode(raw) if last == "zstd" else numcodecs.Blosc().decode(raw)
        dt = {"float32": "<f4", "float64": "<f8"}[m["data_type"]]
        return np.frombuffer(buf, dt).reshape(self.chunk_shape(name))

    def chunk(self, name: str, i: int) -> np.ndarray:
        """Time chunk i of `name` (one chunk along every other dimension)."""
        m = self.meta[name]
        assert all(c == s for c, s in zip(self.chunk_shape(name)[1:], m["shape"][1:])), name
        return self.decode(name, self.get(f"{name}/c/{i}" + "/0" * (len(m["shape"]) - 1)))

    def array_1d(self, name: str, threads: int = 4) -> np.ndarray:
        n, c = self.meta[name]["shape"][0], self.chunk_shape(name)[0]
        with ThreadPoolExecutor(threads) as ex:
            parts = list(ex.map(lambda i: self.decode(name, self.get(f"{name}/c/{i}")), range(-(-n // c))))
        return np.concatenate(parts)[:n]


# ---------------------------------------------------------------------------------------------- extraction
def extract(out: str, year: int = YEAR, threads: int = 3, log=print) -> dict:
    """Write the contract source store of `year` to `out` and return the extraction report."""
    import zarr
    ds = D.get(DATASET_ID)
    t0 = time.time()
    R = Remote(log=log)
    lat, lon, lev = (R.array_1d(k) for k in ("lat", "lon", "lev"))
    t, ls, my = (R.array_1d(k) for k in ("time", "Ls", "MY_Ls"))
    log(f"coordinates {time.time() - t0:.0f}s: {t.size} steps")
    klev, s = lowest_level(lev)
    idx, rep = select_year(t, my, year, ds.samples_per_sol)
    if ds.n_samples is not None:
        assert rep["n"] == ds.n_samples, (rep["n"], ds.n_samples)
    ct = R.chunk_shape("uwind")[0]
    assert all(R.chunk_shape(v)[0] == ct for v in (*VARS.values(), "swflux"))
    pos = np.full(t.size, -1, "i8")                 # output position of each store step (-1: not selected)
    pos[idx] = np.arange(idx.size)
    chunks = np.unique(idx // ct)
    arrs = {k: np.empty((ds.ny, ds.nx, idx.size), "f4") for k in VARS}
    sun = np.full(idx.size, np.nan)

    def work(c):
        rows = np.arange(c * ct, min((c + 1) * ct, t.size))
        keep = pos[rows] >= 0
        dest, loc = pos[rows][keep], np.flatnonzero(keep)
        for k, name in VARS.items():
            a = R.chunk(name, int(c))
            a = a[loc, klev] if a.ndim == 4 else a[loc]
            assert np.isfinite(a).all(), (name, c)
            arrs[k][:, :, dest] = to_contract(a, lat, lon, ds.grid)
        sun[dest] = subsolar_offset(R.chunk("swflux", int(c))[loc], t[rows][loc], lat, lon)
        return int(c)

    done = 0
    with ThreadPoolExecutor(threads) as ex:
        for _ in ex.map(work, chunks):
            done += 1
            if done % 10 == 0 or done == chunks.size:
                log(f"chunks {done}/{chunks.size} {time.time() - t0:.0f}s")
    assert np.isfinite(sun).all()

    g = zarr.open_group(out, mode="w", zarr_format=3)
    g.attrs.update({
        "dataset": ds.id, "grid": ds.grid, "interfaces": interfaces(s),
        "source": (f"{URL} (ARCO-MACDA, doi:10.57967/hf/8771) of MACDA v2.0, "
                   "doi:10.5285/cd037a9ea387438fabf4d674dbe53088"),
        "variables": {k: f"{v}[lev={s:.6g}]" if v != "psurf" else v for k, v in VARS.items()},
        "selection": f"MY_Ls == {year}, ordered by time", "sigma": s, "sigma_index": klev,
        "time_of_day": "fraction of sol = time of day at the prime meridian (MACDA time)",
    })
    order = np.argsort(t, kind="stable")
    ls_sorted, my_sorted = ls[order], my[order]
    first = int(np.searchsorted(t[order], t[idx[0]]))
    tc = min(idx.size, 2048)
    for k, a in arrs.items():
        g.create_array(k, data=a, chunks=(ds.ny, ds.nx, tc))
    g.create_array("ls", data=ls[idx].astype("f4"))
    g.create_array("sol", data=t[idx].astype("f4"))
    rep.update({
        "dataset": ds.id, "year": year, "sigma": s, "sigma_index": klev, "chunks_read": int(chunks.size),
        "ls_first": float(ls[idx[0]]), "ls_last": float(ls[idx[-1]]),
        "ls_before": float(ls_sorted[max(first - 1, 0)]), "my_before": float(my_sorted[max(first - 1, 0)]),
        "ls_after": float(ls_sorted[min(first + idx.size, t.size - 1)]),
        "my_after": float(my_sorted[min(first + idx.size, t.size - 1)]),
        "sols_touched": int(np.unique(np.floor(t[idx] + 1e-6)).size),
        "subsolar_offset_deg": {"mean": float(sun.mean()), "sd": float(sun.std()),
                                "max_abs": float(np.abs(sun).max())},
        "ranges": {k: [float(a.min()), float(a.max())] for k, a in arrs.items()},
        "seconds": round(time.time() - t0),
    })
    return rep


def main(argv=None):
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.mars.sources.macda")
    p.add_argument("--out", required=True, help="contract source store to write (zarr v3)")
    p.add_argument("--year", type=int, default=YEAR, help="Mars year (MY_Ls label)")
    p.add_argument("--threads", type=int, default=3)
    p.add_argument("--report", default="", help="write the extraction report (JSON) here")
    args = p.parse_args(argv)
    rep = extract(args.out, args.year, args.threads)
    if args.report:
        with open(args.report, "w") as f:
            json.dump(rep, f, indent=1)
    print(json.dumps(rep))


if __name__ == "__main__":
    main()
