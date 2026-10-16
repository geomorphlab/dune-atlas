"""Mars `cells.zarr` of a wind dataset (mars/datasets.py; DUNE_ATLAS_MARS_DATASET, default the MCMC FV3 GCM beta
release 1, one Mars year, hourly, 2°): per-cell series and the 23 fields x 64 grain sizes (docs/reference/mars-spec.md
section 6, data contract of the Mars build). Other datasets are read from a contract source store (read_contract) on
their own grid; the description below is FV3's.

Grid (contract): rows lat 89 -> -89 (lat0 = 89, dlat = -2), columns lon -179 -> 179 (lon0 = -179, dlon = 2), cell
centres. The FV3 arrays (lat ascending -89..89, lon 1..359) are flipped in latitude and rolled by 90 columns:
contract[i, j] = fv3[89 - i, (j + 90) % 180] (`fv3_to_contract`).

Arrays (zarr v3; Earth cellstore sharding: shard 16 x 16 cells, inner chunk 1 cell, index at end, blosc zstd-5
bitshuffle):
  series (90, 180, 5, 16032) float32  u, v (lowest-level wind, m/s, toward east / north), T (K), rho (kg m^-3),
                                      z (lowest-level height, m); mantissas bit-rounded per variable (keepbits from
                                      the data maxima so that |error| <= 0.005 m/s, 0.02 K, 1 mm and <= 0.05 % in
                                      rho; `choose_keepbits`)
  fields (90, 180, 23, 64) float32    mars/fields.py from the UNROUNDED float32 series (QSAT_VARS order, d index)
  dunes (90, 180) float32 overlap fraction; dune (90, 180) uint8 (fraction > 0); ls (16032) deg; sol (16032)
Per-hour state (spec section 2): p = (ak[-2] + bk[-2] ps + ak[-1] + bk[-1] ps) / 2, rho = p / (R T) with
T = temp_bot (physics.air_state), z = (R T / g) ln(p_lo / p) (physics.layer_height), u* from the eq. 2.2 smooth-wall
profile at z with nu = mu(T) / rho (physics.friction_velocity, in mars/fields.mars_cell_fields).

    python -m dune_atlas_pipeline.mars.cells build --fv3 DIR --dunefrac NPZ --out cells.zarr --workdir W \
        --nproc 48 [--shards 0,0 0,1 ...] [--export DIR]
"""
from __future__ import annotations

import argparse
import json
import os
import time

import numpy as np

from . import constants as M
from . import datasets as D
from . import physics as P

SHARD = 16
# The active dataset (mars/datasets.py; DUNE_ATLAS_MARS_DATASET, default fv3-beta1) fixes the grid, the series
# length and every dataset text written below.
DS = D.active()
NY, NX = DS.ny, DS.nx
NT = DS.n_samples
GRID = dict(DS.grid)
LAT, LON = DS.axes()
if DS.id == "fv3-beta1":                      # the published FV3 axes are integer-valued (int64 attrs/arrays)
    LAT = GRID["lat0"] + GRID["dlat"] * np.arange(NY)
    LON = GRID["lon0"] + GRID["dlon"] * np.arange(NX)
SERIES_UNITS = {"u": "m/s", "v": "m/s", "T": "K", "rho": "kg m-3", "z": "m"}
# contract tolerances of the bit-rounded series: absolute for u, v, T; relative for rho
SERIES_TOL = {"u": ("abs", 0.005), "v": ("abs", 0.005), "T": ("abs", 0.02), "rho": ("rel", 5e-4), "z": ("abs", 1e-3)}
NV = len(M.SERIES_VARS)
assert tuple(SERIES_UNITS) == tuple(M.SERIES_VARS) == tuple(SERIES_TOL)
FV3_FILE = "03340.atmos_daily.nc"
FV3_VARS = {"u": "ucomp_bot", "v": "vcomp_bot", "T": "temp_bot", "ps": "ps"}
DATASET = DS.dataset_attrs()
SHARDS_Y = list(range(0, NY, SHARD))
SHARDS_X = list(range(0, NX, SHARD))


def fv3_to_contract(a: np.ndarray, lat_axis: int = -2, lon_axis: int = -1) -> np.ndarray:
    """FV3 (lat ascending -89..89, lon 1..359) -> contract (lat 89..-89, lon -179..179)."""
    return np.roll(np.flip(a, axis=lat_axis), -90, axis=lon_axis)


def constants_attrs() -> dict:
    return {k: float(getattr(M, k)) for k in ("G", "R_MARS", "R_AIR", "MU0", "T0_MU", "S_MU", "K_ADIABATIC",
                                               "RHO_P", "PACKING", "KAPPA", "MIX_DAMP", "DSTAR_MIN", "UPLUS_MIN", "C1", "C2",
                                               "KN_A", "KN_B", "KN_C", "GA_SQRT_S_MIN", "BETA", "DASPECT", "S2Y")}


# ---------------------------------------------------------------------------------------------- bit rounding
def bitround(a: np.ndarray, keepbits: int) -> np.ndarray:
    """float32 mantissa rounding (round-half-even), as fields.bitround (Earth display stores)."""
    from ..fields import bitround as _br
    return _br(np.ascontiguousarray(a, "f4"), keepbits)


def choose_keepbits(x: np.ndarray, kind: str, tol: float) -> int:
    """Smallest keepbits whose worst-case rounding error over the data range meets tol: half an ulp at the top
    binade 2^(e - k - 1) <= tol (abs, e = floor(log2 max|x|)) or 2^(-k - 1) <= tol (rel)."""
    if kind == "rel":
        return int(np.ceil(-np.log2(tol) - 1))
    e = int(np.floor(np.log2(float(np.nanmax(np.abs(x))))))
    return int(np.ceil(e - 1 - np.log2(tol)))


def rounding_error(x: np.ndarray, r: np.ndarray, kind: str) -> float:
    d = np.abs(r.astype("f8") - x.astype("f8"))
    if kind == "rel":
        d = d / np.abs(x.astype("f8"))
    return float(np.nanmax(d))


# ---------------------------------------------------------------------------------------------- FV3 input
def read_fv3(fv3_dir: str, log=print) -> dict:
    """Contract-oriented (lat, lon, time) float32 arrays u, v, T, rho, plus ls, sol, ak/bk used."""
    import netCDF4
    out = {}
    t0 = time.time()
    with netCDF4.Dataset(os.path.join(fv3_dir, FV3_FILE)) as d:
        d.set_auto_mask(False)
        lat, lon = d["lat"][:], d["lon"][:]
        assert np.allclose(lat, np.arange(-89, 90, 2)) and np.allclose(lon, np.arange(1, 360, 2)), "FV3 grid"
        ak, bk = d["ak"][:].astype("f8"), d["bk"][:].astype("f8")
        sol = d["time"][:].astype("f8")
        areo = d["areo"][:].astype("f8").reshape(-1)
        nt = sol.size
        assert areo.size == nt
        for k, name in FV3_VARS.items():
            a = d[name][:]                                            # (time, lat, lon) float32, 1 GB
            assert a.shape == (nt, NY, NX) and a.dtype == np.float32, (name, a.shape, a.dtype)
            out[k] = np.ascontiguousarray(fv3_to_contract(a).transpose(1, 2, 0))   # (lat, lon, time)
            del a
            log(f"read {name} {time.time() - t0:.0f}s")
    p, rho = P.air_state(out["ps"].astype("f8"), out["T"].astype("f8"), ak[-1], bk[-1], ak[-2], bk[-2])
    out["rho"] = rho.astype("f4")
    out["p"] = p.astype("f4")
    out["z"] = P.layer_height(out["ps"].astype("f8"), out["T"].astype("f8"), ak[-1], bk[-1], ak[-2],
                              bk[-2]).astype("f4")
    out["ls"] = (areo % 360.0).astype("f4")
    out["sol"] = sol.astype("f4")
    out["ak_bk"] = {"ak_bottom": float(ak[-1]), "bk_bottom": float(bk[-1]), "ak_top": float(ak[-2]),
                    "bk_top": float(bk[-2])}
    out["areo_raw"] = areo
    return out


def series_stack(src: dict) -> np.ndarray:
    """(lat, lon, 5, time) float32 in SERIES_VARS order (a 5.2 GB array for the full grid)."""
    s = np.empty((NY, NX, NV, src["T"].shape[-1]), "f4")
    for i, k in enumerate(M.SERIES_VARS):
        s[:, :, i, :] = src[k]
    return s


def read_contract(path: str, log=print) -> dict:
    """Series of a dataset whose extraction script wrote a contract source store (zarr v3): arrays u, v, T, ps
    (lat, lon, time) float32 already on the dataset grid in contract orientation (rows north to south, columns
    from lon0), 1-D ls (deg) and sol; attrs `dataset` (= DS.id), `grid` (= GRID) and `interfaces` {ak_bottom,
    bk_bottom, ak_top, bk_top} of the lowest layer (Pa, 1). Returns the read_fv3 dict."""
    import zarr
    t0 = time.time()
    g = zarr.open_group(path, mode="r")
    assert g.attrs["dataset"] == DS.id, (g.attrs["dataset"], DS.id)
    assert {k: g.attrs["grid"][k] for k in GRID} == GRID, (g.attrs["grid"], GRID)
    out = {}
    for k in ("u", "v", "T", "ps"):
        a = np.ascontiguousarray(g[k][...], "f4")
        assert a.ndim == 3 and a.shape[:2] == (NY, NX) and np.isfinite(a).all(), (k, a.shape)
        out[k] = a
        log(f"read {k} {time.time() - t0:.0f}s")
    nt = out["T"].shape[-1]
    assert NT is None or nt == NT, (nt, NT)
    ab = {k: float(g.attrs["interfaces"][k]) for k in ("ak_bottom", "bk_bottom", "ak_top", "bk_top")}
    ps, T = out["ps"].astype("f8"), out["T"].astype("f8")
    p, rho = P.air_state(ps, T, ab["ak_bottom"], ab["bk_bottom"], ab["ak_top"], ab["bk_top"])
    out["rho"] = rho.astype("f4")
    out["p"] = p.astype("f4")
    out["z"] = P.layer_height(ps, T, ab["ak_bottom"], ab["bk_bottom"], ab["ak_top"], ab["bk_top"]).astype("f4")
    out["ls"] = np.asarray(g["ls"][...], "f4")
    out["sol"] = np.asarray(g["sol"][...], "f4")
    assert out["ls"].shape == out["sol"].shape == (nt,)
    out["ak_bk"] = ab
    return out


def read_source(path: str, log=print) -> dict:
    """The active dataset's series: the FV3 NetCDF folder or a contract source store."""
    return read_fv3(path, log) if DS.reader == "fv3" else read_contract(path, log)


def load_dunefrac(npz: str) -> np.ndarray:
    """Dune-cover fraction on the active grid: FV3 from the FV3-orientation npz (frac, lat -89..89, lon 1..359);
    other datasets from native_grid.py's npz (frac, lat, lon in contract orientation)."""
    z = np.load(npz)
    if DS.reader == "fv3":
        assert np.allclose(z["lat"], np.arange(-89, 90, 2)) and np.allclose(z["lon"], np.arange(1, 360, 2))
        return fv3_to_contract(np.asarray(z["frac"], "f8")).astype("f4")
    np.testing.assert_allclose(z["lat"], LAT, atol=1e-9); np.testing.assert_allclose(z["lon"], LON, atol=1e-9)
    f = np.asarray(z["frac"], "f4")
    assert f.shape == (NY, NX)
    return f


# ---------------------------------------------------------------------------------------------- store
def _sharding(inner, typesize=4):
    from zarr.codecs import BloscCodec, BytesCodec, ShardingCodec
    return ShardingCodec(chunk_shape=inner, codecs=[BytesCodec(), BloscCodec(cname="zstd", clevel=5,
                                                                              shuffle="bitshuffle",
                                                                              typesize=typesize)],
                         index_location="end")


def root_attrs(keepbits: dict, extra: dict | None = None) -> dict:
    from .fields import QSAT_VARS
    a = {
        "title": DS.store_title,
        "body": "mars", "grid": GRID, "dataset": DATASET, "license": DS.license_spdx,
        "field_vars": list(QSAT_VARS), "fields_index": "d (grain size), d_values_um",
        "d_values_um": [int(x) for x in M.D_VALUES_UM], "d_default_index": int(M.D_DEFAULT_INDEX),
        "series_vars": list(M.SERIES_VARS), "series_units": SERIES_UNITS,
        "series_keepbits": keepbits,
        "series_note": DS.series_note,
        "ustar_method": ("u* per hour from |U| at height z through the smooth-wall mixing-length profile of Pähtz & "
                         "Durán (2023) eq. 2.2 under constant stress (no roughness length), tabulated in "
                         "mars/profile_table.json; nu = mu(T)/rho (Sutherland, CO2); bisection in ln u* (60 steps)"),
        "profile": {k: P._TABLE[k] for k in ("kappa", "damping", "log_layer_c")} | {"n_points": len(P.LN_X)},
        "ls_definition": DS.ls_definition,
        "sol_definition": DS.sol_definition,
        "ua_convention": "arctan2(v, u): direction the wind blows toward, radians CCW from east",
        "dunes_definition": ("fraction of the cell area covered by dune polygons (PI shapefile aggregated from the "
                             "USGS Mars Dune Digital Database; spherical geodesic areas on the Mars 2000 sphere)"),
        "constants": constants_attrs(),
        "flux_units": ("fields fluxes in m^2/s (volume flux of packed sand q = Q/(rho_p phi), phi = 0.6); "
                       "display units m^2/yr with 1 yr = 365.25 d"),
    }
    a.update(extra or {})
    return a


def create_store(out: str, attrs: dict, ls: np.ndarray, sol: np.ndarray, dunefrac: np.ndarray):
    import zarr
    from zarr.codecs import BloscCodec
    from .fields import QSAT_VARS
    nt = len(ls)
    root = zarr.open_group(out, mode="w", zarr_format=3)
    root.attrs.update(attrs)
    root.create_array("series", shape=(NY, NX, NV, nt), dtype="float32", chunks=(SHARD, SHARD, NV, nt),
                      serializer=_sharding((1, 1, NV, nt)), compressors=None, fill_value=np.nan,
                      dimension_names=["latitude", "longitude", "var", "time"],
                      attributes={"vars": list(M.SERIES_VARS), "units": SERIES_UNITS})
    nf, nd = len(QSAT_VARS), len(M.D_VALUES)
    root.create_array("fields", shape=(NY, NX, nf, nd), dtype="float32", chunks=(SHARD, SHARD, nf, nd),
                      serializer=_sharding((1, 1, nf, nd)), compressors=None, fill_value=np.nan,
                      dimension_names=["latitude", "longitude", "field", "d"])
    b4 = BloscCodec(cname="zstd", clevel=5, shuffle="bitshuffle", typesize=4)
    b1 = BloscCodec(cname="zstd", clevel=5, shuffle="bitshuffle", typesize=1)
    a = root.create_array("dunes", shape=(NY, NX), dtype="float32", chunks=(NY, NX), compressors=b4,
                          fill_value=np.nan, dimension_names=["latitude", "longitude"],
                          attributes={"units": "1", "long_name": "dune cover fraction"})
    a[:] = dunefrac
    a = root.create_array("dune", shape=(NY, NX), dtype="uint8", chunks=(NY, NX), compressors=b1, fill_value=0,
                          dimension_names=["latitude", "longitude"],
                          attributes={"long_name": "dune cell (dunes > 0)"})
    a[:] = (dunefrac > 0).astype("u1")
    for name, v, at in (("ls", ls, {"units": "deg", "long_name": "solar longitude Ls"}),
                        ("sol", sol, {"units": "sol", "long_name": "simulation time (sols)"})):
        a = root.create_array(name, shape=(nt,), dtype="float32", chunks=(nt,), compressors=b4,
                              fill_value=np.nan, dimension_names=["time"], attributes=at)
        a[:] = v
    return root


# ---------------------------------------------------------------------------------------------- workers
_G = {}


def _init_worker():
    for k in ("OMP_NUM_THREADS", "NUMBA_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
        os.environ[k] = "1"
    from numcodecs import blosc
    blosc.set_nthreads(1)


def compute_shard(series_blk: np.ndarray) -> tuple[np.ndarray, dict]:
    """(by, bx, 5, nt) float32 -> fields (by, bx, 23, 64) float32 and per-cell checks."""
    from .fields import mars_cell_fields
    by, bx = series_blk.shape[:2]
    F = np.empty((by, bx, 23, len(M.D_VALUES)), "f4")
    ga_min = np.empty((by, bx)); viol_pairs = np.zeros((by, bx), int); viol_hours = np.zeros((by, bx), int)
    for i in range(by):
        for j in range(bx):
            u, v, T, rho, z = (series_blk[i, j, k].astype("f8") for k in range(NV))
            f, th, _ = mars_cell_fields(u, v, T, rho, z, return_threshold=True)
            F[i, j] = f.astype("f4")
            g = th["ga_sqrt_s"]
            ga_min[i, j] = g.min()
            bad = g <= M.GA_SQRT_S_MIN
            viol_pairs[i, j] = int(bad.sum()); viol_hours[i, j] = int(bad.any(1).sum())
    return F, {"ga_sqrt_s_min": ga_min, "viol_pairs": viol_pairs, "viol_hours": viol_hours}


def _do_shard(task):
    import zarr
    sy, sx = task
    t0 = time.time()
    S = _G["series"]
    ys, xs = slice(sy, min(sy + SHARD, NY)), slice(sx, min(sx + SHARD, NX))
    blk = S[ys, xs]
    F, chk = compute_shard(blk)
    t1 = time.time()
    kb = _G["keepbits"]
    rb = np.empty_like(blk)
    for k, name in enumerate(M.SERIES_VARS):
        rb[:, :, k] = bitround(blk[:, :, k], kb[name])
    root = zarr.open_group(_G["out"], mode="r+", zarr_format=3)
    root["series"][ys, xs] = rb
    root["fields"][ys, xs] = F
    t2 = time.time()
    return {"shard": [sy, sx], "cells": int(blk.shape[0] * blk.shape[1]), "compute_s": round(t1 - t0, 2),
            "write_s": round(t2 - t1, 2), "ga_sqrt_s_min": float(chk["ga_sqrt_s_min"].min()),
            "viol_pairs": int(chk["viol_pairs"].sum()), "viol_hours": int(chk["viol_hours"].sum()),
            "fields_nan": int(np.isnan(F).sum()), "_F": F}


def _write_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, indent=1)
    os.replace(tmp, path)


def shard_bytes(out: str) -> dict:
    """Bytes per shard object of series/fields."""
    res = {}
    for arr in ("series", "fields"):
        tot, n = 0, 0
        base = os.path.join(out, arr, "c")
        for d, _, fs in os.walk(base):
            for f in fs:
                tot += os.path.getsize(os.path.join(d, f)); n += 1
        res[arr] = {"objects": n, "bytes": tot}
    return res


def build(fv3_dir, dunefrac_npz, out, workdir, nproc=48, shards=None, export=None, keepbits=None, log=print,
          bench_shard=None):
    import multiprocessing as mp
    os.makedirs(workdir, exist_ok=True)
    status = os.path.join(workdir, "status.json")
    prog = open(os.path.join(workdir, "progress.jsonl"), "a")
    T0 = time.time()
    _write_json(status, {"phase": "read", "t": 0})
    src = read_source(fv3_dir, log)
    t_read = time.time() - T0
    series = series_stack(src)
    # keepbits from the data maxima (whole grid), then the realised errors on the whole grid
    if keepbits is None:
        keepbits = {k: choose_keepbits(series[:, :, i], *SERIES_TOL[k]) for i, k in enumerate(M.SERIES_VARS)}
    kb_report = {}
    for i, k in enumerate(M.SERIES_VARS):
        x = series[:, :, i]
        kb_report[k] = {"keepbits": keepbits[k], "tol": SERIES_TOL[k], "min": float(x.min()), "max": float(x.max()),
                        "max_err": rounding_error(x, bitround(x, keepbits[k]), SERIES_TOL[k][0])}
        assert kb_report[k]["max_err"] <= SERIES_TOL[k][1], kb_report[k]
    log(json.dumps({"keepbits": kb_report}))
    dunefrac = load_dunefrac(dunefrac_npz)
    attrs = root_attrs(keepbits, {"series_rounding": kb_report, "air_state_interfaces": src["ak_bk"],
                                  "date_created": time.strftime("%Y-%m-%d")})
    create_store(out, attrs, src["ls"], src["sol"], dunefrac)
    rho_mean = src["rho"].astype("f8").mean(-1).astype("f4")
    if bench_shard is not None:
        sy, sx = bench_shard
        bk = keepbits_benchmark(series[sy:sy + SHARD, sx:sx + SHARD])
        _write_json(os.path.join(workdir, "keepbits_benchmark.json"), {"shard": [sy, sx], "rows": bk})
        log("keepbits benchmark written")
    tasks = [tuple(s) for s in shards] if shards else [(sy, sx) for sy in SHARDS_Y for sx in SHARDS_X]
    # largest shards first (edge shards are smaller)
    tasks.sort(key=lambda t: -(min(SHARD, NY - t[0]) * min(SHARD, NX - t[1])))
    _G.update(series=series, keepbits=keepbits, out=out)
    del src
    fields_all = np.full((NY, NX, 23, len(M.D_VALUES)), np.nan, "f4")
    summary = {"read_s": round(t_read, 1), "shards_done": 0, "shards_total": len(tasks), "viol_pairs": 0,
               "viol_hours": 0, "ga_sqrt_s_min": np.inf, "fields_nan": 0, "compute_s": 0.0, "write_s": 0.0}
    t1 = time.time()
    ctx = mp.get_context("fork")
    with ctx.Pool(nproc, initializer=_init_worker) as pool:
        for r in pool.imap_unordered(_do_shard, tasks):
            F = r.pop("_F")
            sy, sx = r["shard"]
            fields_all[sy:sy + F.shape[0], sx:sx + F.shape[1]] = F
            prog.write(json.dumps(r) + "\n"); prog.flush()
            summary["shards_done"] += 1
            for k in ("viol_pairs", "viol_hours", "fields_nan"):
                summary[k] += r[k]
            summary["compute_s"] += r["compute_s"]; summary["write_s"] += r["write_s"]
            summary["ga_sqrt_s_min"] = min(summary["ga_sqrt_s_min"], r["ga_sqrt_s_min"])
            _write_json(status, {"phase": "shards", "elapsed_s": round(time.time() - T0, 1), **summary})
    summary["pool_wall_s"] = round(time.time() - t1, 1)
    summary["total_s"] = round(time.time() - T0, 1)
    summary["keepbits"] = kb_report
    summary["store_bytes"] = shard_bytes(out)
    ncells = sum(min(SHARD, NY - t[0]) * min(SHARD, NX - t[1]) for t in tasks)
    summary["cells"] = ncells
    summary["s_per_cell_core"] = round(summary["compute_s"] / ncells, 4)
    if export:
        os.makedirs(export, exist_ok=True)
        from .fields import QSAT_VARS
        np.savez_compressed(os.path.join(export, "fields_export.npz"),
                            fields=np.ascontiguousarray(fields_all.transpose(2, 3, 0, 1)),   # (23, 64, lat, lon)
                            rho_mean=rho_mean, dunes=dunefrac, lat=LAT, lon=LON,
                            d_values_um=M.D_VALUES_UM, field_vars=np.array(QSAT_VARS))
        summary["export"] = os.path.join(export, "fields_export.npz")
    _write_json(status, {"phase": "done", **summary})
    _write_json(os.path.join(workdir, "build_summary.json"), summary)
    log(json.dumps({k: v for k, v in summary.items() if k != "keepbits"}))
    return summary


def keepbits_benchmark(blk: np.ndarray, ks=range(8, 17)) -> dict:
    """Compressed bytes per variable of an unrounded series block (by, bx, 5, nt) for a range of keepbits, with
    the store's inner-chunk codec (blosc zstd-5 bitshuffle, typesize 4) applied per cell and variable, and the
    max rounding error (abs for u, v, T; rel for rho)."""
    from numcodecs import Blosc
    codec = Blosc(cname="zstd", clevel=5, shuffle=Blosc.BITSHUFFLE, typesize=4)
    res = {}
    for i, name in enumerate(M.SERIES_VARS):
        x = np.ascontiguousarray(blk[:, :, i])
        rows = []
        for k in list(ks) + [23]:
            r = bitround(x, k) if k < 23 else x
            nbytes = sum(len(codec.encode(np.ascontiguousarray(r[a, b]))) for a in range(r.shape[0])
                         for b in range(r.shape[1]))
            rows.append({"keepbits": k, "bytes": int(nbytes), "bytes_per_cell": round(nbytes / (r.shape[0] * r.shape[1])),
                         "max_err": rounding_error(x, r, SERIES_TOL[name][0])})
        res[name] = rows
    return res


def validate(out: str, n_cells: int = 6, n_recompute: int = 2, seed: int = 0, cells=None,
             require_all_shards: bool = True) -> dict:
    """Checks a built store before it replaces the published one: layout and attrs, one object per shard for series
    and fields, finite series with plausible ranges at random cells, few undefined fields, and fields recomputed from
    the stored (rounded) series close to the stored fields. Raises AssertionError on failure."""
    import zarr
    from .fields import QSAT_VARS, mars_cell_fields
    g = zarr.open_group(out, mode="r")
    a = g.attrs
    assert a["grid"] == GRID and a["body"] == "mars", "grid/body attrs"
    assert tuple(a["series_vars"]) == tuple(M.SERIES_VARS) and a["series_units"] == SERIES_UNITS, "series attrs"
    assert set(a["series_keepbits"]) == set(M.SERIES_VARS), "keepbits attrs"
    S, F = g["series"], g["fields"]
    nt = g["ls"].shape[0]
    assert S.shape == (NY, NX, NV, nt) and F.shape == (NY, NX, len(QSAT_VARS), len(M.D_VALUES)), (S.shape, F.shape)
    nsh = len(SHARDS_Y) * len(SHARDS_X)
    nb = shard_bytes(out)
    if require_all_shards:
        assert nb["series"]["objects"] == nsh and nb["fields"]["objects"] == nsh, nb
    rng = np.random.default_rng(seed)
    if cells is None:
        cells = list(zip(rng.integers(0, NY, n_cells).tolist(), rng.integers(0, NX, n_cells).tolist()))
    # z depends on the dataset's lowest level (FV3 1.5-3.2 m; sigma 0.9995: 0.026 m/K x T): spec notes z_range_m
    ranges = {"u": (-80, 80), "v": (-80, 80), "T": (100, 350), "rho": (1e-4, 0.1),
              "z": tuple(DS.notes.get("z_range_m", (0.5, 5.0)))}
    rec = []
    for i, j in cells:
        x = S[i, j]
        assert np.isfinite(x).all(), ("series not finite", i, j)
        for k, name in enumerate(M.SERIES_VARS):
            lo, hi = ranges[name]
            assert lo <= x[k].min() and x[k].max() <= hi, (name, i, j, float(x[k].min()), float(x[k].max()))
        f = F[i, j]
        assert np.isnan(f).mean() < 0.05, ("fields NaN", i, j)
        rec.append([i, j])
    diffs = []
    for i, j in cells[:n_recompute]:
        x = S[i, j].astype("f8")
        f = mars_cell_fields(*x).astype("f4")
        st = F[i, j]
        fin = np.isfinite(st)
        assert np.array_equal(np.isfinite(f), fin), ("NaN pattern", i, j)
        sc = np.abs(st[fin]).max()
        diffs.append(float(np.median(np.abs(f[fin] - st[fin]) / np.maximum(np.abs(st[fin]), 1e-6 * sc))))
    assert max(diffs) < 1e-3, diffs
    return {"ok": True, "cells_checked": rec, "recompute_median_rel_diff": diffs, "objects": nb}


# ---------------------------------------------------------------------------------------------- splice one d node
def _do_splice(task):
    """Recompute fields[..., index] of one shard from the unrounded series and write it into the shard; for two cells
    also recompute the neighbouring nodes as a control (must equal the stored values)."""
    import zarr
    from .fields import mars_cell_fields
    sy, sx = task
    t0 = time.time()
    k = _G["index"]
    blk = _G["series"][sy:sy + SHARD, sx:sx + SHARD]
    by, bx = blk.shape[:2]
    root = zarr.open_group(_G["out"], mode="r+", zarr_format=3)
    F = root["fields"][sy:sy + by, sx:sx + bx]
    old = F[..., k].copy()
    ctl = []
    for i in range(by):
        for j in range(bx):
            x = blk[i, j].astype("f8")
            F[i, j, :, k] = mars_cell_fields(*x, d=M.D_VALUES[[k]])[:, 0].astype("f4")
            if (i, j) in ((0, 0), (by - 1, bx - 1)):
                nb = [n for n in (k - 1, k + 1) if 0 <= n < len(M.D_VALUES)]
                g = mars_cell_fields(*x, d=M.D_VALUES[nb]).astype("f4")
                st = F[i, j][:, nb]
                same = (g == st) | (np.isnan(g) & np.isnan(st))
                with np.errstate(invalid="ignore", divide="ignore"):
                    rr = np.abs(g.astype("f8") - st) / np.abs(st.astype("f8"))
                ctl.append((int((~same).sum()), float(np.nanmax(np.where(same, 0.0, rr))) if (~same).any() else 0.0))
    root["fields"][sy:sy + by, sx:sx + bx] = F
    with np.errstate(invalid="ignore", divide="ignore"):
        rel = np.abs(F[..., k].astype("f8") - old) / np.abs(old)
    return {"shard": [sy, sx], "cells": by * bx, "s": round(time.time() - t0, 2),
            "control_mismatches": sum(c[0] for c in ctl), "control_max_rel": max(c[1] for c in ctl),
            "control_cells": len(ctl), "nan_new": int(np.isnan(F[..., k]).sum()), "nan_old": int(np.isnan(old).sum()),
            "median_rel_change_vs_old_node": float(np.nanmedian(rel)) if np.isfinite(rel).any() else None}


def splice(fv3_dir, store, index, workdir, nproc=16, log=print, shards=None):
    """Replace the grain-size node `index` of the `fields` array of `store` (a copy of the published store) by fields
    recomputed at M.D_VALUES[index] from the unrounded GCM series; also checks that the series rebuilt from the GCM
    file and bit-rounded with the store's keepbits equal the stored series (sample cells). Root attrs d_values_um /
    d_default_index are updated and the splice recorded in `d_node_history`."""
    import multiprocessing as mp
    import zarr
    os.makedirs(workdir, exist_ok=True)
    status = os.path.join(workdir, "status.json")
    prog = open(os.path.join(workdir, "progress.jsonl"), "a")
    T0 = time.time()
    _write_json(status, {"phase": "read"})
    src = read_source(fv3_dir, log)
    series = series_stack(src)
    del src
    g = zarr.open_group(store, mode="r+", zarr_format=3)
    kb = g.attrs["series_keepbits"]
    rng = np.random.default_rng(1)
    chk = []
    sh = [tuple(t) for t in shards] if shards else [(sy, sx) for sy in SHARDS_Y for sx in SHARDS_X]
    picks = [sh[q] for q in rng.choice(len(sh), min(8, len(sh)), replace=False)]
    for sy, sx in picks:
        i = int(sy + rng.integers(0, min(SHARD, NY - sy))); j = int(sx + rng.integers(0, min(SHARD, NX - sx)))
        st = g["series"][i, j]
        rb = np.stack([bitround(series[i, j, n], kb[v]) for n, v in enumerate(M.SERIES_VARS)])
        chk.append(bool(np.array_equal(rb, st)))
    assert all(chk), ("series rebuilt from the GCM differ from the store", chk)
    old_um = int(g.attrs["d_values_um"][index])
    _G.update(series=series, out=store, index=index)
    tasks = sh
    summ = {"index": index, "old_um": old_um, "new_um": int(M.D_VALUES_UM[index]), "series_identical_cells": len(chk),
            "read_s": round(time.time() - T0, 1), "shards_done": 0, "control_mismatches": 0, "control_cells": 0,
            "nan_new": 0, "nan_old": 0, "cells": 0, "control_max_rel": 0.0}
    t1 = time.time()
    with mp.get_context("fork").Pool(nproc, initializer=_init_worker) as pool:
        for r in pool.imap_unordered(_do_splice, tasks):
            prog.write(json.dumps(r) + "\n"); prog.flush()
            summ["shards_done"] += 1
            for k in ("control_mismatches", "control_cells", "nan_new", "nan_old", "cells"):
                summ[k] += r[k]
            summ["control_max_rel"] = max(summ["control_max_rel"], r["control_max_rel"])
            _write_json(status, {"phase": "splice", **summ})
    summ["pool_wall_s"] = round(time.time() - t1, 1)
    hist = list(g.attrs.get("d_node_history", []))
    hist.append({"index": index, "from_um": old_um, "to_um": int(M.D_VALUES_UM[index]),
                 "date": time.strftime("%Y-%m-%d"),
                 "method": "fields[..., index] recomputed from the unrounded GCM series (mars/cells.py splice); "
                           "all other nodes and the series unchanged"})
    g.attrs.update({"d_values_um": [int(x) for x in M.D_VALUES_UM], "d_default_index": int(M.D_DEFAULT_INDEX),
                    "d_node_history": hist})
    summ["total_s"] = round(time.time() - T0, 1)
    # control: neighbouring nodes recomputed on their own reproduce the stored (64-node) values; bit-identical on
    # the laptop, allow float32-rounding-level differences from other SIMD paths
    assert summ["control_max_rel"] < 1e-5, summ
    _write_json(status, {"phase": "done", **summ})
    _write_json(os.path.join(workdir, "splice_summary.json"), summ)
    log(json.dumps(summ))
    return summ


SMOOTH_VARS = ("dpm", "rdpm", "uft", "ufm", "qacb", "qalb", "qace", "qale", "qha_rdp_dp")


def node_smoothness(F: np.ndarray, d_um, fv: list, index: int, v: str) -> dict:
    """How well node `index` of field `v` fits its neighbours, per cell: (a) inside [min, max] of nodes index -1 / +1
    (1e-6 relative margin); (b) |f - P| / (range over index -2 .. index +2), P = least-squares quadratic in ln d through
    the four neighbours index -2, -1, +1, +2. Note u*,th(d) has a kink (max of two branches of eq. 5.1, D* = 18) near
    150-300 um on Mars, so these numbers are larger around 200 um than elsewhere on the axis even for exact values."""
    ld = np.log(np.asarray(d_um, "f8"))
    a = F[:, :, fv.index(v), :].astype("f8")
    f0, f1, f2 = a[..., index - 1], a[..., index], a[..., index + 1]
    ok = np.isfinite(f0) & np.isfinite(f1) & np.isfinite(f2)
    lo, hi = np.minimum(f0, f2), np.maximum(f0, f2)
    tol = 1e-6 * np.maximum(np.abs(lo), np.abs(hi))
    inside = (f1 >= lo - tol) & (f1 <= hi + tol)
    nb = [index - 2, index - 1, index + 1, index + 2]
    A = np.vander(ld[nb] - ld[index], 3)
    Y = np.moveaxis(a[..., nb], -1, 0).reshape(4, -1)
    good = np.isfinite(Y).all(0)
    pred = np.full(Y.shape[1], np.nan)
    pred[good] = np.linalg.lstsq(A, Y[:, good], rcond=None)[0][2]
    pred = pred.reshape(f1.shape)
    win = a[..., index - 2:index + 3]
    with np.errstate(invalid="ignore"):
        rng_ = np.nanmax(win, -1) - np.nanmin(win, -1)
    m = ok & np.isfinite(pred) & (rng_ > 0)
    dev = np.abs(f1 - pred)[m] / rng_[m]
    return {"cells": int(ok.sum()), "frac_inside_neighbours": float(inside[ok].mean()),
            "quad_dev_p50": float(np.percentile(dev, 50)), "quad_dev_p99": float(np.percentile(dev, 99))}


def validate_splice(new: str, old: str, index: int) -> dict:
    """New store vs the published one: every fields node except `index` bit-identical (NaN-aware), series identical at
    sample cells, and the new node at least as smooth against its neighbours as the node it replaces (node_smoothness;
    for dpm, rdpm and uft the new p99 deviation must not exceed 1.5 x the old one + 0.005)."""
    import zarr
    gn, go = zarr.open_group(new, mode="r"), zarr.open_group(old, mode="r")
    fv = list(gn.attrs["field_vars"])
    Fn, Fo = gn["fields"][...], go["fields"][...]
    keep = [k for k in range(Fn.shape[-1]) if k != index]
    a, b = Fn[..., keep], Fo[..., keep]
    same = (a == b) | (np.isnan(a) & np.isnan(b))
    assert same.all(), ("non-spliced nodes differ", int((~same).sum()))
    rng = np.random.default_rng(2)
    for i, j in zip(rng.integers(0, NY, 6).tolist(), rng.integers(0, NX, 6).tolist()):
        assert np.array_equal(gn["series"][i, j], go["series"][i, j], equal_nan=True), ("series differ", i, j)
    dn, do = gn.attrs["d_values_um"], go.attrs["d_values_um"]
    assert [x for k, x in enumerate(dn) if k != index] == [x for k, x in enumerate(do) if k != index]
    out = {"index": index, "d_um_new": [dn[index - 1], dn[index], dn[index + 1]], "d_um_old": do[index],
           "other_nodes_bit_identical": True, "vars": {}}
    for v in SMOOTH_VARS:
        sn, so = node_smoothness(Fn, dn, fv, index, v), node_smoothness(Fo, do, fv, index, v)
        f1, fo = Fn[:, :, fv.index(v), index].astype("f8"), Fo[:, :, fv.index(v), index].astype("f8")
        with np.errstate(invalid="ignore", divide="ignore"):
            ch = f1 / fo - 1
        out["vars"][v] = {"new": sn, "old": so,
                          "median_rel_change_vs_old_node": float(np.nanmedian(ch[np.isfinite(ch)]))}
        if v in ("dpm", "rdpm", "uft"):
            assert sn["quad_dev_p99"] <= 1.5 * so["quad_dev_p99"] + 0.005, (v, sn, so)
    out["nan_new_node"] = int(np.isnan(Fn[..., index]).sum()); out["nan_old_node"] = int(np.isnan(Fo[..., index]).sum())
    out["ok"] = True
    return out


# the fields that are sand fluxes (m^2/s, linear in q): every other field is a direction, a ratio of fluxes, a
# fraction or a speed ratio and does not depend on the flux normalisation
FLUX_FIELDS = ("dpm", "rdpm", "qnlb", "qncb", "qalb", "qacb", "qnle", "qale", "qace")


def rescale_packing(src: str, out: str, log=print) -> dict:
    """v2 store from a v1 store whose fluxes are q = Q/rho_p: a copy with the FLUX_FIELDS rows of `fields` divided by
    M.PACKING (float64 then rounded to float32; every field is linear in q, so this equals the recomputation to
    within 1 float32 ulp) and the root attrs flux_units / constants / dataset.fields_method / flux_history updated.
    Array metadata (shape, sharding, codecs, fill value) are unchanged; series, dunes, dune, ls, sol are copied
    bit-identically. Refuses a store that already carries PACKING in its constants."""
    import shutil

    import zarr
    if os.path.exists(out):
        raise FileExistsError(out)
    g0 = zarr.open_group(src, mode="r")
    if "PACKING" in g0.attrs["constants"]:
        raise ValueError(f"{src} already holds packed-sand fluxes (constants.PACKING present)")
    shutil.copytree(src, out)
    g = zarr.open_group(out, mode="r+")
    fv = list(g.attrs["field_vars"])
    rows = [fv.index(v) for v in FLUX_FIELDS]
    a, a0 = g["fields"], g0["fields"]
    t0 = time.time()
    n = 0
    for sy in range(0, a.shape[0], a.shards[0]):
        for sx in range(0, a.shape[1], a.shards[1]):
            blk = a0[sy:sy + a.shards[0], sx:sx + a.shards[1]]
            if np.isnan(blk).all():
                continue                                   # shard absent in the source: stays absent
            new = blk.copy()
            new[:, :, rows] = (blk[:, :, rows].astype("f8") / M.PACKING).astype("f4")
            a[sy:sy + a.shards[0], sx:sx + a.shards[1]] = new
            n += 1
    hist = list(g.attrs.get("flux_history", []))
    hist.append({"date": "2026-10-14", "factor": 1.0 / M.PACKING, "fields": list(FLUX_FIELDS),
                 "from": "q = Q/rho_p (v1)", "to": "q = Q/(rho_p phi), phi = 0.6 (volume of packed sand, as the "
                                                  "Earth atlas FLUXCONSTANT = 5/0.6)",
                 "method": ("fields flux rows divided by phi in float64 and rounded to float32 (mars/cells.py "
                            "rescale_packing); all other fields, the series and the other arrays unchanged")})
    ds = dict(g.attrs["dataset"])
    ds["fields_method"] = DATASET["fields_method"]
    g.attrs.update({"constants": constants_attrs(), "flux_units": root_attrs({})["flux_units"], "dataset": ds,
                    "flux_history": hist})
    log(f"rescaled {n} shards in {time.time() - t0:.1f} s")
    return {"src": src, "out": out, "shards": n, "rows": rows, "factor": 1.0 / M.PACKING}


def export_store(store: str, out_npz: str, rho_mean_from: str) -> dict:
    """fields_export.npz (fields (23, 64, lat, lon), rho_mean, dunes, ...) from a store; rho_mean is taken from a previous
    export (it does not depend on d)."""
    import zarr
    from .fields import QSAT_VARS
    g = zarr.open_group(store, mode="r")
    F = g["fields"][...]
    rho_mean = np.load(rho_mean_from)["rho_mean"]
    np.savez_compressed(out_npz, fields=np.ascontiguousarray(F.transpose(2, 3, 0, 1)), rho_mean=rho_mean,
                        dunes=g["dunes"][...], lat=LAT, lon=LON, d_values_um=np.asarray(g.attrs["d_values_um"]),
                        field_vars=np.array(QSAT_VARS))
    return {"export": out_npz, "nan": int(np.isnan(F).sum())}


def main(argv=None):
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.mars.cells")
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build")
    b.add_argument("--fv3", "--source", dest="fv3", required=True,
                   help="FV3 NetCDF folder (fv3-beta1) or contract source store (other datasets)"); b.add_argument("--dunefrac", required=True)
    b.add_argument("--out", required=True); b.add_argument("--workdir", required=True)
    b.add_argument("--nproc", type=int, default=48)
    b.add_argument("--shards", nargs="*", help="sy,sx shard origins (pilot)")
    b.add_argument("--export")
    b.add_argument("--bench-shard", help="sy,sx: write keepbits_benchmark.json for this shard")
    v = sub.add_parser("validate")
    v.add_argument("--store", required=True); v.add_argument("--out")
    sp = sub.add_parser("splice", help="recompute one grain-size node of `fields` in place (on a copy)")
    sp.add_argument("--fv3", "--source", dest="fv3", required=True,
                   help="FV3 NetCDF folder (fv3-beta1) or contract source store (other datasets)"); sp.add_argument("--store", required=True)
    sp.add_argument("--index", type=int, required=True); sp.add_argument("--workdir", required=True)
    sp.add_argument("--nproc", type=int, default=16)
    vs = sub.add_parser("validate-splice")
    vs.add_argument("--new", required=True); vs.add_argument("--old", required=True)
    vs.add_argument("--index", type=int, required=True); vs.add_argument("--out")
    ex = sub.add_parser("export")
    ex.add_argument("--store", required=True); ex.add_argument("--out", required=True)
    ex.add_argument("--rho-mean-from", required=True)
    rp = sub.add_parser("rescale-packing", help="v2 copy of a v1 store with fluxes of packed sand (q / PACKING)")
    rp.add_argument("--src", required=True); rp.add_argument("--out", required=True)
    a = p.parse_args(argv)
    if a.cmd == "rescale-packing":
        print(json.dumps(rescale_packing(a.src, a.out, log=lambda s: print(s, flush=True))), flush=True)
        return
    if a.cmd == "splice":
        splice(a.fv3, a.store, a.index, a.workdir, a.nproc, log=lambda s: print(s, flush=True))
        return
    if a.cmd == "validate-splice":
        res = validate_splice(a.new, a.old, a.index)
        if a.out:
            _write_json(a.out, res)
        print(json.dumps(res), flush=True)
        return
    if a.cmd == "export":
        print(json.dumps(export_store(a.store, a.out, a.rho_mean_from)), flush=True)
        return
    if a.cmd == "validate":
        res = validate(a.store)
        if a.out:
            _write_json(a.out, res)
        print(json.dumps(res), flush=True)
        return
    if a.cmd == "build":
        shards = [tuple(int(v) for v in s.split(",")) for s in a.shards] if a.shards else None
        bench = tuple(int(v) for v in a.bench_shard.split(",")) if a.bench_shard else None
        build(a.fv3, a.dunefrac, a.out, a.workdir, a.nproc, shards, a.export,
              log=lambda s: print(s, flush=True), bench_shard=bench)


if __name__ == "__main__":
    main()
