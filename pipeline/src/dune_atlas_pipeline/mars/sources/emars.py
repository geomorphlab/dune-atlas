"""EMARS v1.0 reanalysis, one Mars year of the lowest model level, as a contract source store (cells.read_contract)
for the dataset `emars-v1-my30` (mars/dataset_specs/emars-v1-my30.json).

Source: ARCO-EMARS (Bhattacharya 2026, Hugging Face datasets/ananyo01/ARCO-EMARS, doi:10.57967/hf/8859), store
`emars_combined.zarr`, the analysis ensemble mean of EMARS v1.0 (Greybush et al. 2018, doi:10.18113/D3W375): zarr v3,
127,920 hourly steps of MY24-33, chunks of 100 steps x all 28 levels x the whole globe. The data and time-label
arrays are encoded bytes + blosc (zstd, bitshuffle), the coordinate arrays bytes + zstd; a blosc chunk does not
decode as a bare zstd frame. Each chunk is read once over HTTPS and only the lowest level (`pfull` ascending, last
index) of anal_mean_U, anal_mean_V, anal_mean_T and anal_mean_ps is kept.

Time: the store's time axis is not chronological. Around every source-file boundary two files are interleaved step
by step (the `time` coordinate restarts in each source file), so the steps of the year are selected by their Mars-year
label (anal_mean_MY == year) and ordered by the continuous key emars_sol + mars_hour / 24; the selection must then
be unique, evenly spaced by one Mars hour and increasing in Ls (`select_year`).

Grid (EMARS, a Lin-Rood D-grid; `check_geometry` verifies it from the coordinate arrays): 36 mass rows `lat`
(-88.71 .. 88.71, south to north; the two polar rows are half-width caps) and 60 mass columns `lon` (3 .. 357);
U on (latu, lon), the 35 row interfaces latu[1:] (-87.43 .. 87.43) plus a padding row latu[0] (U identically 0
there); V on (lat, lonv), the column interfaces lonv (0 .. 354). The contract grid keeps the 34 evenly spaced mass
rows 1..34 (84.86 .. -84.86, north first) and rolls the columns to -177 .. 177:

    u[k, c] = (U[latu 34-k] + U[latu 35-k]) / 2           (the two interfaces bounding mass row 34-k)
    v[k, c] = (V[lonv i] + V[lonv (i+1) % 60]) / 2 at row 34-k, i = (c + 30) % 60
    T, ps  = source[34-k, (c + 30) % 60]

The pairing was checked against mass continuity: hourly d(ps)/dt against the column-integrated mass divergence of
the destaggered winds (docs/records/validation-mars-emars.md).
Air state: the lowest layer between the hybrid interfaces (ak[-1], bk[-1]) (bottom, the surface) and (ak[-2], bk[-2])
(ak in Pa), as FV3.

    python -m dune_atlas_pipeline.mars.sources.emars extract --out emars-v1-my30.zarr --cache DIR [--year 30]
    python -m dune_atlas_pipeline.mars.sources.emars check --store emars-v1-my30.zarr [--n-chunks 4] [--out JSON]
"""
from __future__ import annotations

import argparse
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

REPO_URL = "https://huggingface.co/datasets/ananyo01/ARCO-EMARS/resolve/main"
STORE = "emars_combined.zarr"
DATASET_ID = "emars-v1-my30"
VARS = {"u": "anal_mean_U", "v": "anal_mean_V", "T": "anal_mean_T", "ps": "anal_mean_ps"}
LABELS = ("anal_mean_Ls", "anal_mean_emars_sol", "anal_mean_mars_hour", "anal_mean_mars_soy")
N_SRC_LAT, N_SRC_LON = 36, 60
P_REF = 770.0                                   # Pa: phalf (hPa) = (ak + bk P_REF) / 100
ROWS = np.arange(34, 0, -1)                     # source mass rows of contract rows 0..33 (north to south)
COLS = (np.arange(N_SRC_LON) + 30) % N_SRC_LON  # source columns of contract columns 0..59 (-177 .. 177)
HOUR = 1.0 / 24


# ---------------------------------------------------------------------------------------------- transform
def check_geometry(lat, latu, lon, lonv, grid: dict) -> dict:
    """Assert the D-grid layout the transform assumes, from the source coordinate arrays, and that the kept mass
    points are the contract grid `grid`; returns the checked quantities."""
    lat, latu, lon, lonv = (np.asarray(a, "f8") for a in (lat, latu, lon, lonv))
    assert lat.shape == latu.shape == (N_SRC_LAT,) and lon.shape == lonv.shape == (N_SRC_LON,)
    dlat = 180.0 / 35
    assert np.all(np.diff(lat) > 0) and np.all(np.diff(latu[1:]) > 0), "latitudes must ascend"
    assert abs(latu[0] - latu[1]) < 1e-4, "latu[0] is the padding row (a repeat of latu[1])"
    np.testing.assert_allclose(latu[1:], -90 + dlat / 2 + dlat * np.arange(35), atol=1e-4)   # 35 interfaces
    np.testing.assert_allclose(lat[1:35], 0.5 * (latu[1:35] + latu[2:36]), atol=1e-4)       # rows between them
    assert lat[0] < latu[1] and lat[35] > latu[35]                                           # polar caps
    np.testing.assert_allclose(lon, 3 + 6 * np.arange(N_SRC_LON), atol=1e-9)
    np.testing.assert_allclose(lonv, 6 * np.arange(N_SRC_LON), atol=1e-9)
    np.testing.assert_allclose(lon, 0.5 * (lonv + np.r_[lonv[1:], 360.0]), atol=1e-9)       # columns between lonv
    g_lat = grid["lat0"] + grid["dlat"] * np.arange(grid["ny"])
    g_lon = grid["lon0"] + grid["dlon"] * np.arange(grid["nx"])
    np.testing.assert_allclose(lat[ROWS], g_lat, atol=1e-4)
    np.testing.assert_allclose(((lon[COLS] + 180) % 360) - 180, g_lon, atol=1e-9)
    return {"latu0_minus_latu1": float(latu[0] - latu[1]), "kept_lat": [float(lat[ROWS[0]]), float(lat[ROWS[-1]])],
            "dropped_lat": [float(lat[0]), float(lat[35])], "lat_interfaces": [float(latu[1]), float(latu[35])]}


def destagger(u: np.ndarray, v: np.ndarray, T: np.ndarray, ps: np.ndarray) -> dict:
    """Lowest-level source arrays (time, 36, 60) (u on latu, v on lonv, T and ps on the mass points) to contract
    arrays (34, 60, time) float32 (rows north to south, columns -177 .. 177), computed in float64."""
    u, v, T, ps = (np.asarray(a, "f8") for a in (u, v, T, ps))
    for a in (u, v, T, ps):
        assert a.ndim == 3 and a.shape[1:] == (N_SRC_LAT, N_SRC_LON), a.shape
    out = {"u": 0.5 * (u[:, ROWS] + u[:, ROWS + 1])[:, :, COLS],
           "v": 0.5 * (v + np.roll(v, -1, axis=2))[:, ROWS][:, :, COLS],
           "T": T[:, ROWS][:, :, COLS], "ps": ps[:, ROWS][:, :, COLS]}
    return {k: np.ascontiguousarray(np.moveaxis(a, 0, -1), "f4") for k, a in out.items()}


def select_year(my, ls, sol, hour, year: int) -> dict:
    """Store indices of every step labelled Mars year `year`, in chronological order (emars_sol + hour / 24), with
    the checks of the selection: unique and one Mars hour apart (no gap, no duplicate), Ls increasing."""
    my, ls, sol, hour = (np.asarray(a, "f8") for a in (my, ls, sol, hour))
    assert np.isfinite(my).all(), "Mars-year labels must all be read"
    idx = np.flatnonzero(my == year)
    assert idx.size, f"no step labelled MY{year}"
    t = sol[idx] + hour[idx] / 24
    o = np.argsort(t, kind="stable")
    idx, t = idx[o], t[o]
    dt = np.diff(t)
    assert np.all(np.isfinite(t)) and np.all(np.abs(dt - HOUR) < 1e-6), (dt.min(), dt.max())
    assert np.all(np.diff(ls[idx]) > 0), "Ls must increase within the year"
    hrs = hour[idx]
    assert np.all(hrs == np.round(hrs)) and hrs.min() >= 0 and hrs.max() <= 23
    per_sol = np.unique(sol[idx], return_counts=True)[1]
    return {"index": idx, "t": t, "n": int(idx.size), "chronological_in_store": bool(np.all(np.diff(idx) > 0)),
            "store_index_range": [int(idx.min()), int(idx.max())], "n_sols_touched": int(per_sol.size),
            "full_sols": int((per_sol == 24).sum()), "partial_sols": [int(c) for c in per_sol if c != 24]}


# ---------------------------------------------------------------------------------------------- remote reads
class Remote:
    """Chunk reader of the ARCO-EMARS zarr v3 store over HTTPS (default chunk keys, codecs bytes + blosc or
    zstd), paced below the Hugging Face limit (3000 requests per 300 s) and honouring Retry-After on 429."""

    def __init__(self, url: str = f"{REPO_URL}/{STORE}", min_interval: float = 0.12, log=print):
        import requests
        self.url, self.min_interval, self.log = url, min_interval, log
        self.s = requests.Session()
        self._lock, self._last = threading.Lock(), 0.0
        self.meta = self._get(f"{url}/zarr.json").json()["consolidated_metadata"]["metadata"]

    def _get(self, url: str, tries: int = 12):
        import requests
        for k in range(tries):
            with self._lock:
                w = self._last + self.min_interval - time.time()
                if w > 0:
                    time.sleep(w)
                self._last = time.time()
            try:
                r = self.s.get(url, timeout=300)
            except requests.RequestException as e:
                self.log(f"retry {url.rsplit('/', 4)[-4:]}: {type(e).__name__}")
                time.sleep(5 * (k + 1))
                continue
            if r.status_code in (200, 404):
                return r
            wait = int(r.headers.get("Retry-After", 10 * (k + 1))) + 1 if r.status_code == 429 else 5 * (k + 1)
            self.log(f"HTTP {r.status_code}, waiting {wait}s")
            time.sleep(wait)
        raise RuntimeError(f"giving up on {url}")

    def chunk(self, array: str, idx: tuple) -> np.ndarray:
        """One decoded chunk; a missing chunk raises (the store's fill value is NaN and nothing here may be NaN)."""
        from numcodecs import Blosc, Zstd
        m = self.meta[array]
        assert m["chunk_key_encoding"]["name"] == "default" and len(m["codecs"]) == 2
        assert m["codecs"][0]["name"] == "bytes" and m["codecs"][0]["configuration"]["endian"] == "little"
        r = self._get(f"{self.url}/{array}/c/" + "/".join(str(int(i)) for i in idx))
        if r.status_code == 404:
            raise KeyError(f"missing chunk {array} {idx} (would read as the fill value)")
        raw = {"blosc": Blosc, "zstd": Zstd}[m["codecs"][1]["name"]]().decode(r.content)
        shape = m["chunk_grid"]["configuration"]["chunk_shape"]
        return np.frombuffer(raw, np.dtype(m["data_type"]).newbyteorder("<")).reshape(shape)

    def array1d(self, array: str, chunks=None, threads: int = 6) -> np.ndarray:
        """A 1-D array (float64); only `chunks` are read when given (NaN elsewhere)."""
        n = self.meta[array]["shape"][0]
        cs = self.meta[array]["chunk_grid"]["configuration"]["chunk_shape"][0]
        chunks = list(range(-(-n // cs))) if chunks is None else list(chunks)
        out = np.full(-(-n // cs) * cs, np.nan, "f8")
        with ThreadPoolExecutor(threads) as ex:
            for c, a in zip(chunks, ex.map(lambda c: self.chunk(array, (c,)), chunks)):
                out[c * cs:(c + 1) * cs] = a
        return out[:n]

    def lowest(self, c: int) -> dict:
        """Lowest level of U, V, T (all 36 x 60 points) and ps for time chunk c, float32 (time, 36, 60)."""
        out = {}
        for k, name in VARS.items():
            m = self.meta[name]
            assert m["chunk_grid"]["configuration"]["chunk_shape"][1:] == m["shape"][1:], name   # whole globe
            a = self.chunk(name, (c,) + (0,) * (len(m["shape"]) - 1))
            out[k] = np.array(a[:, -1] if a.ndim == 4 else a, "f4")
        return out


# ---------------------------------------------------------------------------------------------- extraction
def extract(out: str, cache: str, year: int = 30, threads: int = 4, log=print) -> dict:
    """Write the contract source store of Mars year `year` to `out`; per-chunk lowest-level arrays are cached in
    `cache` (resumable). Returns the selection and check summary (also written to the store attrs)."""
    import zarr

    from .. import datasets as D
    ds = D.get(DATASET_ID)
    t0 = time.time()
    R = Remote(log=log)
    co = {k: R.chunk(k, (0,)) for k in ("lat", "latu", "lon", "lonv", "pfull", "phalf")}
    geom = check_geometry(co["lat"], co["latu"], co["lon"], co["lonv"], ds.grid)
    assert np.all(np.diff(co["pfull"]) > 0) and np.all(np.diff(co["phalf"]) > 0), "pfull must ascend"
    ak = np.asarray(R.chunk("anal_mean_ak", (0,)), "f8")
    bk = np.asarray(R.chunk("anal_mean_bk", (0,)), "f8")
    np.testing.assert_allclose(ak + bk * P_REF, co["phalf"] * 100, atol=1e-3)            # ak in Pa
    assert ak[-1] == 0 and bk[-1] == 1
    interfaces = {"ak_bottom": float(ak[-1]), "bk_bottom": float(bk[-1]), "ak_top": float(ak[-2]),
                  "bk_top": float(bk[-2])}
    my = R.array1d("anal_mean_MY")
    labels_my = {int(y): int(n) for y, n in zip(*np.unique(my, return_counts=True))}
    log(f"MY labels read ({time.time() - t0:.0f}s): {labels_my}")
    cs = R.meta["anal_mean_U"]["chunk_grid"]["configuration"]["chunk_shape"][0]
    assert all(R.meta[k]["chunk_grid"]["configuration"]["chunk_shape"][0] == cs for k in (*LABELS, *VARS.values()))
    span = np.flatnonzero(my == year)
    chunks = list(range(span.min() // cs, span.max() // cs + 1))
    lab = {k: R.array1d(k, chunks) for k in LABELS}
    sel = select_year(my, lab["anal_mean_Ls"], lab["anal_mean_emars_sol"], lab["anal_mean_mars_hour"], year)
    idx = sel["index"]
    soy = lab["anal_mean_mars_soy"][idx]
    sol0 = lab["anal_mean_emars_sol"][idx] - soy
    assert np.all(sol0 == sol0[0]), "mars_soy must be the EMARS sol minus a constant within the year"
    sol = soy + lab["anal_mean_mars_hour"][idx] / 24
    ls = lab["anal_mean_Ls"][idx]
    log(f"MY{year}: {sel['n']} steps, store index {sel['store_index_range']}, {len(chunks)} chunks, Ls "
        f"{ls[0]:.4f} .. {ls[-1]:.4f}")

    cache_p = Path(cache)
    cache_p.mkdir(parents=True, exist_ok=True)

    def one(c):
        f = cache_p / f"c{c:05d}.npz"
        if not f.exists():
            a = R.lowest(c)
            assert all(np.isfinite(x).all() for x in a.values()), f"non-finite values in chunk {c}"
            assert np.all(a["u"][:, 0] == 0), f"U at the padding row latu[0] is not 0 in chunk {c}"
            tmp = cache_p / f"c{c:05d}.tmp.npz"
            np.savez(tmp, **a)
            tmp.replace(f)
        return c

    done = 0
    with ThreadPoolExecutor(threads) as ex:
        for _ in ex.map(one, chunks):
            done += 1
            if done % 10 == 0 or done == len(chunks):
                log(f"chunks {done}/{len(chunks)} ({time.time() - t0:.0f}s)")

    nt = sel["n"]
    pos = np.full(my.size, -1, "i8")
    pos[idx] = np.arange(nt)
    src = {k: np.empty((nt, N_SRC_LAT, N_SRC_LON), "f4") for k in VARS}
    for c in chunks:
        z = np.load(cache_p / f"c{c:05d}.npz")
        p = pos[c * cs:(c + 1) * cs]
        keep = p >= 0
        for k in VARS:
            src[k][p[keep]] = z[k][keep]
    con = destagger(src["u"], src["v"], src["T"], src["ps"])
    del src
    summary = {
        "year": year, "n_samples": nt, "store_index_range": sel["store_index_range"],
        "store_order_chronological": sel["chronological_in_store"], "n_chunks": len(chunks),
        "n_sols_touched": sel["n_sols_touched"], "full_sols": sel["full_sols"], "partial_sols": sel["partial_sols"],
        "first": {"ls": float(ls[0]), "emars_sol": int(lab["anal_mean_emars_sol"][idx[0]]),
                  "mars_hour": int(lab["anal_mean_mars_hour"][idx[0]])},
        "last": {"ls": float(ls[-1]), "emars_sol": int(lab["anal_mean_emars_sol"][idx[-1]]),
                 "mars_hour": int(lab["anal_mean_mars_hour"][idx[-1]])},
        "sol_offset": int(sol0[0]), "sol_range": [float(sol[0]), float(sol[-1])],
        "my_label_counts": labels_my, "geometry": geom, "lowest_level_hpa": float(co["pfull"][-1]),
        "interfaces": interfaces,
    }
    g = zarr.open_group(out, mode="w", zarr_format=3)
    g.attrs.update({
        "dataset": ds.id, "grid": ds.grid, "interfaces": interfaces,
        "source": f"{REPO_URL}/{STORE} (anal_mean_U, anal_mean_V, anal_mean_T, anal_mean_ps; lowest level)",
        "transform": ("mass rows 1..34 of 36 (polar half-width rows dropped), north first; u = mean of U on the two "
                      "latu rows bounding the row (latu[0] is padding); v = mean of V on the two lonv columns "
                      "bounding the column (periodic); columns rolled from 3..357 to -177..177"),
        "selection": summary,
    })
    for k in ("u", "v", "T", "ps"):
        g.create_array(k, data=con[k], chunks=(ds.ny, ds.nx, 2048))
    g.create_array("ls", data=ls.astype("f4"))
    g.create_array("sol", data=sol.astype("f4"))
    g.create_array("source_index", data=idx.astype("i4"))
    log(f"wrote {out} ({time.time() - t0:.0f}s)")
    return summary


def check(store: str, n_chunks: int = 4, seed: int = 0, log=print) -> dict:
    """Re-read the first, the last and `n_chunks` random source chunks of the selection and compare every stored
    value of the steps they hold with the transform of the remote values; three cells per chunk are also checked
    against explicit indexing of the remote arrays (independent of `destagger`)."""
    import zarr
    g = zarr.open_group(store, mode="r")
    si = np.asarray(g["source_index"][...], "i8")
    R = Remote(log=log)
    cs = R.meta["anal_mean_U"]["chunk_grid"]["configuration"]["chunk_shape"][0]
    allc = np.unique(si // cs)
    rng = np.random.default_rng(seed)
    pick = sorted({int(allc[0]), int(allc[-1]), *rng.choice(allc, n_chunks, replace=False).tolist()})
    worst = {k: 0.0 for k in VARS}
    points = []
    for c in pick:
        a = R.lowest(c)
        jt = np.flatnonzero(si // cs == c)
        loc = si[jt] - c * cs
        exp = destagger(a["u"][loc], a["v"][loc], a["T"][loc], a["ps"][loc])
        for k in VARS:
            got = np.asarray(g[k][:, :, jt.min():jt.max() + 1])[:, :, jt - jt.min()]
            worst[k] = max(worst[k], float(np.abs(got - exp[k]).max()))
        t = int(jt[len(jt) // 2])
        lt = int(si[t] - c * cs)
        for row, col in ((3, 0), (16, 40), (30, 59)):
            r, i = 34 - row, (col + 30) % 60
            ref = {"u": 0.5 * (float(a["u"][lt, r, i]) + float(a["u"][lt, r + 1, i])),
                   "v": 0.5 * (float(a["v"][lt, r, i]) + float(a["v"][lt, r, (i + 1) % 60])),
                   "T": float(a["T"][lt, r, i]), "ps": float(a["ps"][lt, r, i])}
            points.append({"chunk": c, "t": t, "source_index": int(si[t]), "row": row, "col": col,
                           **{k: [ref[k], float(g[k][row, col, t])] for k in ref}})
    res = {"chunks": pick, "max_abs_diff": worst, "points": points}
    log(json.dumps(worst))
    return res


def main(argv=None):
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.mars.sources.emars")
    sub = p.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("extract")
    e.add_argument("--out", required=True)
    e.add_argument("--cache", required=True, help="folder of the per-chunk lowest-level arrays (resumable)")
    e.add_argument("--year", type=int, default=30)
    e.add_argument("--threads", type=int, default=4)
    c = sub.add_parser("check")
    c.add_argument("--store", required=True)
    c.add_argument("--n-chunks", type=int, default=4)
    c.add_argument("--out")
    a = p.parse_args(argv)

    def log(s):
        print(s, flush=True)
    if a.cmd == "extract":
        print(json.dumps(extract(a.out, a.cache, a.year, a.threads, log=log)), flush=True)
        return
    res = check(a.store, a.n_chunks, log=log)
    if a.out:
        Path(a.out).write_text(json.dumps(res, indent=1) + "\n")
    print(json.dumps(res["max_abs_diff"]), flush=True)


if __name__ == "__main__":
    main()
