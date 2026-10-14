"""Build `cells.zarr`: per-cell wind histograms + 23x64 field vectors for click queries.

Layout (docs/reference/storage-layout.md): zarr v3, full grid of the wind dataset (ERA5-Land 1801x3600, ERA5 721x1440;
grid.DATASETS), sharded 16x16 cells,
inner chunk = one cell, blosc zstd-5 bitshuffle, shard index at end (zarrita requirement).
Only shards containing land are written; the rest stay absent (fill value), and ocean cells
inside a land shard are absent from the shard index (empty inner chunk).

Full-grid run (see scripts/run_cells_full.sh):

    python -m dune_atlas_pipeline.cellstore write --out $STAGING/cells.zarr --workers 4

* Work unit = one 64x64 source chunk ("block"), so each source chunk is decompressed once;
  peak memory per worker ~1.3 GB (512 MB int64 chunk + uint32 copy + fields).
* Ocean-only blocks are skipped from the land mask (`layers.nc:land`, identical to the
  finite-qsat mask: 2,212,863 cells) without reading any source data.
* Resumable: `<out>.manifest.json` beside the store (never inside it) records finished shards
  and per-block statistics; it is rewritten atomically after every block. A shard is only
  recorded after it has been written, so an interrupted block is simply redone.
* Edge shards (1801 = 112*16 + 9 rows; 721 = 45*16 + 1) are written as truncated chunks by zarr.
* Every block also checks that no histogram counts lie outside the land mask and that each
  land cell sums to N_HOURS; violations are recorded in the manifest `anomalies` list.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import numpy as np
import xarray as xr
import zarr
from zarr.codecs import BloscCodec, BytesCodec, ShardingCodec

from . import constants as C
from .grid import get_dataset, grid_of

SHARD = 16
BLOCK = 64  # source chunk edge (uam10_hist and qsat_params are both chunked 64 in lat/lon)
# Atlas qsat fields: all of C.QSAT_VARS except C.WITHHELD_VARS (order fixed: index = position
# in the cell store `fields` array; the store records it in root attrs `field_vars`).
FIELD_VARS = [v for v in C.QSAT_VARS if v not in C.WITHHELD_VARS]
ARRAYS = ("hist", "fields", "land", "dunes")
APPLE_JUNK = (".DS_Store",)  # plus any name starting with "._" (AppleDouble on exFAT)
MANIFEST_VERSION = 2


def _sharding(inner, typesize):
    return ShardingCodec(
        chunk_shape=inner,
        codecs=[BytesCodec(), BloscCodec(cname="zstd", clevel=5, shuffle="bitshuffle", typesize=typesize)],
        index_location="end",  # zarrita reads the index via a suffix range (end only)
    )


def open_sources(data_dir, dataset=None):
    ds = get_dataset(dataset)
    dh = xr.open_zarr(f"{data_dir}/{ds.hist_store}", consolidated=False)
    from .qsat_view import open_qsat
    dq = open_qsat(data_dir, chunks={}, dataset=ds)  # qsat_view.py
    g = grid_of(dh)
    assert g == ds.grid and grid_of(dq) == ds.grid, (g, ds.grid)
    return dh, dq


def load_masks(data_dir, dataset=None):
    """(land, dunes) boolean grid arrays from the dataset's mask file. ERA5-Land: layers.nc, where `land` equals
    the finite-qsat mask (verified for all 64 ut of dpm) and `dunes` is the canonical 106,540-cell mask.
    ERA5: era5_cellmasks.nc (cellmasks.py): land = ERA5 lsm > 0, dunes = footprint overlaps a 0.1° dune cell."""
    ds = get_dataset(dataset)
    with xr.open_dataset(f"{data_dir}/{ds.masks_file}") as L:
        return L["land"].values.astype(bool), L["dunes"].values.astype(bool)


def _root_attrs(ds, dq, land, dunes):
    if ds.id == "era5-land":   # attrs of the published ERA5-Land store (unchanged)
        title = "dune-atlas cell store: ERA5-Land 1950-2024 10 m wind histograms and qsat parameters"
        source = "Gunn (2026) Nat Commun doi:10.1038/s41467-026-75466-y; data doi:10.5281/zenodo.20046812"
        dtype_note = "float32 cast of float64 source qsat_params"
    else:
        title = (f"dune-atlas cell store: {ds.name} {ds.period.replace('–', '-')} 10 m wind histograms and "
                 "sand-flux fields")
        source = f"{ds.info['citation']}; {ds.info['data_citation']}"
        dtype_note = "float32 cast of the float64 source fields"
    a = {
        "title": title, "source": source, "license": "CC-BY-4.0", "grid": ds.grid.attrs(),
        "um_edges": C.UM_EDGES.tolist(), "ua_edges": C.UA_EDGES.tolist(),
        "ua_convention": "arctan2(v10,u10): direction wind blows toward, radians CCW from east",
        "ut_values": C.UT_VALUES.tolist(), "ut_default_index": C.UT_DEFAULT_INDEX,
        "field_vars": FIELD_VARS,
        "field_units": {v: dq[v].attrs.get("units") for v in FIELD_VARS},
        "field_long_names": {v: dq[v].attrs.get("long_name") for v in FIELD_VARS},
        "fields_dtype_note": dtype_note,
        "n_hours": ds.n_hours,
        "land_cells": int(land.sum()), "dune_cells": int(dunes.sum()),
        "dune_cells_without_wind": [[int(i), int(j)] for i, j in zip(*np.where(dunes & ~land))],
    }
    if ds.info:
        a["dataset"] = ds.info
        a["dunes_definition"] = ("cells whose footprint overlaps at least one 0.1° dune cell of the dune map "
                                 "(Gunn 2026, dune-mask-rev1)")
        a["license_notice"] = ds.info["copernicus_notice"]
    return a


def create_store(out, data_dir, dh=None, dq=None, overwrite=False, dataset=None):
    """Create (or reopen) the store. Static arrays `land` and `dunes` are written whole here."""
    ds = get_dataset(dataset)
    if dh is None:
        dh, dq = open_sources(data_dir, ds)
    if overwrite and os.path.exists(manifest_path(out)):
        os.remove(manifest_path(out))
    root = zarr.open_group(out, mode="w" if overwrite else "a", zarr_format=3)
    if all(a in root for a in ARRAYS) and root.attrs.get("complete_metadata"):
        return root
    if load_manifest(out)["done"] and not overwrite:
        raise RuntimeError(f"{out}: manifest lists finished shards but store metadata is incomplete; "
                           "refusing to recreate arrays (delete store + manifest to start over)")
    ny, nx = dh.sizes["latitude"], dh.sizes["longitude"]
    nm, na = dh.sizes["um_bin"], dh.sizes["ua_bin"]
    land, dunes = load_masks(data_dir, ds)
    assert land.shape == dunes.shape == (ny, nx)
    root.attrs.update(_root_attrs(ds, dq, land, dunes))
    kw = dict(overwrite=True)
    root.create_array("hist", shape=(ny, nx, nm, na), dtype="uint32",
                      chunks=(SHARD, SHARD, nm, na), serializer=_sharding((1, 1, nm, na), 4),
                      compressors=None, fill_value=0,
                      dimension_names=["latitude", "longitude", "um_bin", "ua_bin"], **kw)
    root.create_array("fields", shape=(ny, nx, len(FIELD_VARS), C.UT_VALUES.size), dtype="float32",
                      chunks=(SHARD, SHARD, len(FIELD_VARS), C.UT_VALUES.size),
                      serializer=_sharding((1, 1, len(FIELD_VARS), C.UT_VALUES.size), 4),
                      compressors=None, fill_value=np.nan,
                      dimension_names=["latitude", "longitude", "field", "ut"], **kw)
    blosc1 = BloscCodec(cname="zstd", clevel=5, shuffle="bitshuffle", typesize=1)
    for name, m in (("land", land), ("dunes", dunes)):
        a = root.create_array(name, shape=(ny, nx), dtype="uint8", chunks=(256, 256), compressors=blosc1,
                              fill_value=0, dimension_names=["latitude", "longitude"], **kw)
        a[:] = m.astype(np.uint8)
    root.attrs["complete_metadata"] = True
    return root


# ----------------------------------------------------------------------------- manifest

def manifest_path(out):
    return out.rstrip("/") + ".manifest.json"  # beside the store, not inside it


def load_manifest(out):
    p = manifest_path(out)
    if not os.path.exists(p):
        return {"version": MANIFEST_VERSION, "done": [], "blocks": {}, "anomalies": []}
    m = json.load(open(p))
    m.setdefault("version", 1); m.setdefault("blocks", {}); m.setdefault("anomalies", [])
    return m


def save_manifest(out, m):
    p = manifest_path(out)
    tmp = p + ".tmp"
    with open(tmp, "w") as f:
        json.dump(m, f)
        f.flush(); os.fsync(f.fileno())
    os.replace(tmp, p)


# ----------------------------------------------------------------------------- block worker

def _plan(land, y0, y1, x0, x1, done, block=BLOCK):
    """List of (by, bx, ys, xs, todo_shards, land_shards) for blocks overlapping the region."""
    ny, nx = land.shape
    y1, x1 = min(y1, ny), min(x1, nx)
    plan = []
    for by in range(y0 - y0 % block, y1, block):
        for bx in range(x0 - x0 % block, x1, block):
            ys = (max(by, y0), min(by + block, y1))
            xs = (max(bx, x0), min(bx + block, x1))
            todo = [(sy, sx) for sy in range(ys[0], ys[1], SHARD) for sx in range(xs[0], xs[1], SHARD)
                    if (sy, sx) not in done]
            if not todo:
                continue
            landsh = [(sy, sx) for sy, sx in todo if land[sy:sy + SHARD, sx:sx + SHARD].any()]
            plan.append((by, bx, ys, xs, todo, landsh))
    return plan


_W = {}  # per-process cache of opened sources / store


def _worker_init(out, data_dir, blosc_threads, dataset=None):
    if blosc_threads:
        from numcodecs import blosc
        blosc.set_nthreads(blosc_threads)
    ds = get_dataset(dataset)
    dh, dq = open_sources(data_dir, ds)
    root = zarr.open_group(out, mode="r+", zarr_format=3)
    _W.update(dh=dh, dq=dq, hist=root["hist"], fields=root["fields"],
              land=np.asarray(root["land"][:], dtype=bool), ds=ds)


def _do_block(task):
    by, bx, (ya, yb), (xa, xb), todo, landsh = task
    t0 = time.time()
    dh, dq, hist, fields, landm = _W["dh"], _W["dq"], _W["hist"], _W["fields"], _W["land"]
    ys, xs = slice(ya, yb), slice(xa, xb)
    land = landm[ys, xs]
    fv = np.stack([dq[v].isel(latitude=ys, longitude=xs).values for v in FIELD_VARS], 0)  # (nvar,64,y,x)
    h = dh.histogram_um_ua.isel(latitude=ys, longitude=xs).values  # int64 (y,x,128,128)
    t_read = time.time() - t0
    anomalies = []
    ds = _W["ds"]
    fin = np.isfinite(fv).any((0, 1))
    # land-only sources (ERA5-Land): values exactly on land; global sources (ERA5): every land cell has values
    bad = (fin != land) if ds.land_only_source else (land & ~fin)
    if bad.any():
        anomalies.append({"block": [by, bx], "kind": "finite_fields_vs_land", "n": int(bad.sum())})
    tot = h.sum((2, 3))
    if ds.land_only_source and (tot[~land] != 0).any():
        anomalies.append({"block": [by, bx], "kind": "counts_outside_land", "n": int((tot[~land] != 0).sum())})
    # Hours with |U10| > 20 m/s fall outside the bins, so a land cell may sum to slightly < n_hours.
    nh = ds.n_hours
    deficit = nh - tot[land]
    if (deficit < 0).any() or (deficit >= nh).any():
        anomalies.append({"block": [by, bx], "kind": "land_sum_out_of_range",
                          "n": int(((deficit < 0) | (deficit >= nh)).sum())})
    assert h.max(initial=0) < 2**32 and h.min(initial=0) >= 0
    h32 = h.astype(np.uint32); del h
    h32[~land] = 0
    fvt = np.ascontiguousarray(np.moveaxis(fv, (0, 1), (2, 3)), dtype=np.float32); del fv  # (y,x,23,64)
    fvt[~land] = np.nan
    ny, nx = landm.shape
    ncell = 0
    for sy, sx in landsh:
        ly, lx = sy - ya, sx - xa
        sl = (slice(ly, ly + SHARD), slice(lx, lx + SHARD))
        gy, gx = slice(sy, min(sy + SHARD, ny)), slice(sx, min(sx + SHARD, nx))
        hist[gy, gx] = h32[sl]
        fields[gy, gx] = fvt[sl]
        ncell += int(land[sl].sum())
    return {"block": [by, bx], "todo": todo, "shards": len(landsh), "cells": ncell,
            "n_short": int((deficit > 0).sum()), "max_short": int(deficit.max(initial=0)),
            "t_read": round(t_read, 2), "t": round(time.time() - t0, 2), "anomalies": anomalies}


def write_region(out, data_dir, y0=0, y1=None, x0=0, x1=None, block=BLOCK, workers=1,
                 blosc_threads=None, log=print, max_blocks=None, dataset=None):
    """Write all shards covering [y0:y1, x0:x1] (indices; y0, x0 aligned to SHARD; y1/x1 None = grid end).
    Returns number of shards written in this call."""
    assert y0 % SHARD == 0 and x0 % SHARD == 0 and block % SHARD == 0
    ds = get_dataset(dataset)
    dh, dq = open_sources(data_dir, ds)
    ny, nx = dh.sizes["latitude"], dh.sizes["longitude"]
    y1 = ny if y1 is None else min(y1, ny)
    x1 = nx if x1 is None else min(x1, nx)
    root = create_store(out, data_dir, dh, dq, dataset=ds)
    land = np.asarray(root["land"][:], dtype=bool)
    m = load_manifest(out)
    done = set(map(tuple, m["done"]))
    plan = _plan(land, y0, y1, x0, x1, done, block)
    # ocean-only blocks: record without any source read
    ocean = [p for p in plan if not p[5]]
    for p in ocean:
        done.update(p[4])
        m["blocks"][f"{p[0]},{p[1]}"] = {"shards": 0, "cells": 0, "t": 0.0}
    work = [p for p in plan if p[5]]
    if max_blocks is not None:
        work = work[:max_blocks]
    m["done"] = sorted(done); save_manifest(out, m)
    log(f"region y[{y0}:{y1}] x[{x0}:{x1}]: {len(plan)} blocks to do "
        f"({len(ocean)} ocean-only skipped, {len(work)} with land, "
        f"{sum(len(p[5]) for p in work)} land shards); already done shards {len(done) - sum(len(p[4]) for p in ocean)}")
    t0 = time.time(); nw = ncells = 0
    bt = blosc_threads if blosc_threads is not None else (None if workers == 1 else 1)

    def _record(r, i):
        nonlocal nw, ncells
        done.update(map(tuple, r["todo"]))
        m["blocks"][f"{r['block'][0]},{r['block'][1]}"] = {k: r[k] for k in ("shards", "cells", "n_short", "max_short", "t_read", "t")}
        m["anomalies"].extend(r["anomalies"])
        m["done"] = sorted(done)
        save_manifest(out, m)
        nw += r["shards"]; ncells += r["cells"]
        el = time.time() - t0
        eta = el / (i + 1) * (len(work) - i - 1)
        log(f"[{i + 1}/{len(work)}] block {tuple(r['block'])} shards {r['shards']} cells {r['cells']} "
            f"read {r['t_read']:.1f}s total {r['t']:.1f}s | cum shards {nw} cells {ncells} "
            f"elapsed {el:.0f}s eta {eta:.0f}s" + (f" ANOMALY {r['anomalies']}" if r["anomalies"] else ""))

    if workers <= 1:
        _worker_init(out, data_dir, bt, ds)
        for i, p in enumerate(work):
            _record(_do_block(p), i)
    else:
        for i, r in enumerate(_fanout("write", work, workers, out=out, data=data_dir, blosc_threads=bt,
                                      dataset=ds.id)):
            _record(r, i)
    m["last_run"] = {"region": [y0, y1, x0, x1], "workers": workers, "wall_s": round(time.time() - t0, 1),
                     "shards_written": nw, "cells_written": ncells}
    save_manifest(out, m)
    log(f"done: {nw} shards, {ncells} cells in {time.time() - t0:.0f}s")
    return nw


def _fanout(kind, tasks, workers, **kw):
    """Run tasks in `workers` subprocesses (`python -m dune_atlas_pipeline.cellstore _worker`),
    one JSON task per stdin line, one JSON result per stdout line; yields results as they
    complete. Plain pipes instead of multiprocessing: no POSIX semaphores needed (they are
    unavailable in some sandboxes) and a crashed worker surfaces as an exception."""
    import queue
    import subprocess
    import threading
    cmd = [sys.executable, "-m", "dune_atlas_pipeline.cellstore", "_worker", "--kind", kind,
           "--opts", json.dumps(kw)]
    env = dict(os.environ)
    src = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env["PYTHONPATH"] = src + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
    env.setdefault("OMP_NUM_THREADS", "1")
    tq = queue.Queue()
    for t in tasks:
        tq.put(t)
    rq = queue.Queue()

    def run():
        pr = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, env=env, text=True, bufsize=1)
        try:
            while True:
                try:
                    t = tq.get_nowait()
                except queue.Empty:
                    break
                pr.stdin.write(json.dumps(t) + "\n"); pr.stdin.flush()
                line = pr.stdout.readline()
                if not line:
                    rq.put(RuntimeError(f"{kind} worker died on task {t} (exit {pr.poll()})")); return
                rq.put(json.loads(line))
        except Exception as e:  # noqa: BLE001
            rq.put(e)
        finally:
            try:
                pr.stdin.close()
            except Exception:  # noqa: BLE001
                pass
            pr.wait()

    ths = [threading.Thread(target=run, daemon=True) for _ in range(min(workers, len(tasks)))]
    for th in ths:
        th.start()
    for _ in range(len(tasks)):
        r = rq.get()
        if isinstance(r, Exception):
            raise r
        yield r
    for th in ths:
        th.join()


def _worker_main(kind, opts):
    if kind == "write":
        _worker_init(opts["out"], opts["data"], opts.get("blosc_threads"), opts.get("dataset"))
        fn = _do_block
    else:
        raise ValueError(kind)
    for line in sys.stdin:
        if line.strip():
            print(json.dumps(fn(json.loads(line))), flush=True)


# ----------------------------------------------------------------------------- store hygiene

def apple_junk(path):
    """Paths of macOS metadata files (.DS_Store, AppleDouble ._*) inside a store."""
    bad = []
    for dp, dns, fns in os.walk(path):
        for n in fns + dns:
            if n in APPLE_JUNK or n.startswith("._"):
                bad.append(os.path.join(dp, n))
    return bad


def store_stats(path):
    """Object count and bytes per top-level array (walks the directory tree)."""
    st = {}
    for dp, dns, fns in os.walk(path):
        rel = os.path.relpath(dp, path).split(os.sep)[0]
        key = "." if rel == "." else rel
        s = st.setdefault(key, {"objects": 0, "bytes": 0})
        for fn in fns:
            s["objects"] += 1
            s["bytes"] += os.path.getsize(os.path.join(dp, fn))
    st["total"] = {"objects": sum(v["objects"] for v in st.values()),
                   "bytes": sum(v["bytes"] for v in st.values())}
    return st


# ----------------------------------------------------------------------------- validation

def _angdiff(a, b):
    return np.abs((a - b + np.pi) % (2 * np.pi) - np.pi)


def batch_dp_rdp_rdd(h, ut):
    """Vectorised flux.dp_rdp_rdd for h (n, 128 speed, 128 dir) -> (dp, rdp, rdd) arrays (n,)."""
    from . import flux
    q = flux.flat_flux(ut)[None, :, None]
    e = np.exp(1j * C.UA_CENTRES)[None, :]
    qd = (q * h).sum(1) / h.sum((1, 2))[:, None]  # (n, dir)
    r = (qd * e).sum(1)
    return qd.sum(1), np.abs(r), np.angle(r)


def validate_store(store, data_dir, n=500, seed=0, ut_idx=(0, 14, 30, 63), region=None, n_ocean=200, dataset=None):
    """Independent checks of a written store against source. Returns a JSON-able dict.
    `region` = (y0, y1, x0, x1) restricts sampling to the written region (default: whole grid,
    restricted to shards recorded as done in the manifest)."""
    from . import flux
    rng = np.random.default_rng(seed)
    g = zarr.open_group(store, mode="r")
    hist, fields = g["hist"], g["fields"]
    land = np.asarray(g["land"][:], dtype=bool)
    dunes = np.asarray(g["dunes"][:], dtype=bool)
    ny, nx = land.shape
    ds = get_dataset(dataset)
    dh, dq = open_sources(data_dir, ds)
    covered = np.zeros_like(land)
    if region is not None:
        y0, y1, x0, x1 = region
        covered[y0:y1, x0:x1] = True
    else:
        for sy, sx in load_manifest(store)["done"]:
            covered[sy:sy + SHARD, sx:sx + SHARD] = True
    cand = np.argwhere(land & covered)
    pick = cand[rng.choice(len(cand), size=min(n, len(cand)), replace=False)]
    out = {"store": store, "n_land_candidates": int(len(cand)), "n_checked": int(len(pick)),
           "ut_idx": list(ut_idx)}
    hist_ok = fld_ok = 0; sums = []
    REF = ("dpm", "rdpm", "rdpa")  # reproduction check against the SOURCE (these may be withheld from the store)
    fi = {v: i for i, v in enumerate(REF)}
    rel = {k: {"dp_vs_f32": [], "rdp_vs_f32": [], "rdd_vs_f32": [], "dp_vs_f64": [], "rdp_vs_f64": [],
               "rdd_vs_f64": []} for k in ut_idx}
    n_dp0 = {k: 0 for k in ut_idx}
    n_dp0_bad = {k: 0 for k in ut_idx}  # recomputed DP == 0 but stored dpm != 0
    t0 = time.time()
    for i, j in pick:
        hs = hist[i, j]  # stored (128,128) uint32
        src = dh.histogram_um_ua.isel(latitude=i, longitude=j).values
        hist_ok += int(np.array_equal(hs.astype(np.int64), src) and hs.dtype == np.uint32)
        sums.append(int(hs.sum()))
        fs = fields[i, j]  # (len(FIELD_VARS), 64) float32
        f64_store = np.stack([dq[v].isel(latitude=i, longitude=j).values for v in FIELD_VARS], 0)
        fld_ok += int(np.array_equal(fs, f64_store.astype(np.float32), equal_nan=True))
        f64 = np.stack([dq[v].isel(latitude=i, longitude=j).values for v in REF], 0)
        f32 = f64.astype(np.float32)
        hf = hs.astype(np.float64)
        for k in ut_idx:
            dp, rdp, rdd = flux.dp_rdp_rdd(hf, C.UT_VALUES[k])
            if not dp > 0:
                n_dp0[k] += 1
                n_dp0_bad[k] += int(not (f64[fi["dpm"], k] == 0))
                continue
            for tag, F in (("f32", f32.astype(np.float64)), ("f64", f64)):
                rel[k][f"dp_vs_{tag}"].append(abs(dp - F[fi["dpm"], k]) / abs(F[fi["dpm"], k]))
                rel[k][f"rdp_vs_{tag}"].append(abs(rdp - F[fi["rdpm"], k]) / abs(F[fi["rdpm"], k]))
                rel[k][f"rdd_vs_{tag}"].append(float(_angdiff(rdd, F[fi["rdpa"], k])))
    out["hist_exact"] = hist_ok
    out["fields_exact_float32"] = fld_ok
    sums = np.array(sums)
    nh = ds.n_hours
    out["hist_sum"] = {"n_eq_n_hours": int((sums == nh).sum()), "n_below": int((sums < nh).sum()),
                       "n_above": int((sums > nh).sum()), "max_deficit": int((nh - sums).max())}
    out["recompute"] = {str(k): {"n": len(rel[k]["dp_vs_f64"]), "n_dp_zero": n_dp0[k], "n_dp_zero_mismatch": n_dp0_bad[k],
                                 **{m_: float(np.max(v)) if v else None for m_, v in rel[k].items()}}
                        for k in ut_idx}
    # ocean cells inside covered area: must be fill (0 / NaN); ocean inner chunks absent
    ocand = np.argwhere(~land & covered)
    if len(ocand):
        op = ocand[rng.choice(len(ocand), size=min(n_ocean, len(ocand)), replace=False)]
        oc_ok = sum(int((hist[i, j] == 0).all() and np.isnan(fields[i, j]).all()) for i, j in op)
        out["ocean_checked"] = int(len(op)); out["ocean_fill"] = oc_ok
    # shard objects: present iff the shard contains land (within covered shards)
    sh_land = sh_land_present = sh_ocean = sh_ocean_present = 0
    empty_ok = True
    for sy in range(0, ny, SHARD):
        for sx in range(0, nx, SHARD):
            if not covered[sy:sy + SHARD, sx:sx + SHARD].any():
                continue
            hasland = land[sy:sy + SHARD, sx:sx + SHARD].any()
            p = os.path.join(store, "hist", "c", str(sy // SHARD), str(sx // SHARD), "0", "0")
            ex = os.path.exists(p)
            if hasland:
                sh_land += 1; sh_land_present += ex
                if ex:
                    with open(p, "rb") as fh:  # suffix read of the shard index only
                        fh.seek(-(16 * SHARD * SHARD + 4), os.SEEK_END)
                        b = fh.read()
                    idx = np.frombuffer(b[:-4], dtype="<u8").reshape(SHARD, SHARD, 2)
                    lm = np.zeros((SHARD, SHARD), bool)
                    sub = land[sy:sy + SHARD, sx:sx + SHARD]
                    lm[:sub.shape[0], :sub.shape[1]] = sub
                    empty_ok &= bool(((idx[..., 0] == 2**64 - 1) == ~lm).all())
            else:
                sh_ocean += 1; sh_ocean_present += ex
    out["shards"] = {"land": sh_land, "land_present": sh_land_present, "ocean": sh_ocean,
                     "ocean_present": sh_ocean_present, "ocean_inner_chunks_absent": empty_ok}
    out["dunes_sum"] = int(dunes.sum())
    out["land_sum"] = int(land.sum())
    out["apple_junk"] = len(apple_junk(store))
    out["t_s"] = round(time.time() - t0, 1)
    return out


def write_parity_fixture(store, out_json, cells, ut_idx=(0, 5, 14, 30, 63)):
    """Reference DP/RDP/RDD + ut14 flux-rose petals, computed in Python from the cell-store
    histograms, for JS parity tests against the same store."""
    from . import flux
    g = zarr.open_group(store, mode="r")
    gr = g.attrs.get("grid", {"lat0": 90.0, "dlat": -0.1, "lon0": -180.0, "dlon": 0.1})
    nd = 1 if gr["dlon"] == 0.1 else 2
    recs = []
    for i, j in cells:
        h = g["hist"][i, j].astype(np.float64)
        rec = {"cell": [int(i), int(j)], "lat": round(gr["lat0"] + gr["dlat"] * i, nd),
               "lon": round(gr["lon0"] + gr["dlon"] * j, nd),
               "hist_sum": int(h.sum()), "ut": {}}
        for k in ut_idx:
            dp, rdp, rdd = flux.dp_rdp_rdd(h, C.UT_VALUES[k])
            rec["ut"][str(k)] = {"dp": float(dp), "rdp": float(rdp), "rdd_rad": float(rdd),
                                 "rdd_bearing_deg": float(flux.math_to_bearing_deg(rdd))}
        rec["rose_ut14"] = flux.flux_rose(h, C.UT_VALUES[C.UT_DEFAULT_INDEX]).tolist()
        recs.append(rec)
    doc = {"description": "Python reference (dune_atlas_pipeline.flux) from cells.zarr histograms",
           "store": os.path.basename(store.rstrip("/")), "units": {"dp": "m^2/s", "rdp": "m^2/s",
                                                                   "rdd_rad": "math, toward, CCW from east"},
           "ut_values": {str(k): float(C.UT_VALUES[k]) for k in ut_idx}, "cells": recs}
    json.dump(doc, open(out_json, "w"), indent=1)
    return doc


# ----------------------------------------------------------------------------- CLI

def main(argv=None):
    from .cli import DEFAULT_DATA
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.cellstore")
    sub = p.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("write"); v = sub.add_parser("validate"); s = sub.add_parser("stats")
    for q in (w, v):
        q.add_argument("--data", default=DEFAULT_DATA)
        q.add_argument("--dataset", default="era5-land", choices=["era5-land", "era5"])
    for q in (w, v, s):
        q.add_argument("--out", required=True)
    w.add_argument("--region", nargs=4, type=int, default=None, help="y0 y1 x0 x1 (default: whole grid)")
    w.add_argument("--workers", type=int, default=4)
    w.add_argument("--max-blocks", type=int)
    v.add_argument("--n", type=int, default=500)
    v.add_argument("--seed", type=int, default=0)
    v.add_argument("--json")
    k = sub.add_parser("_worker")
    k.add_argument("--kind", required=True)
    k.add_argument("--opts", required=True)
    a = p.parse_args(argv)
    if a.cmd == "_worker":
        return _worker_main(a.kind, json.loads(a.opts))
    lg = lambda msg: print(time.strftime("%H:%M:%S"), msg, flush=True)  # noqa: E731
    if a.cmd == "write":
        write_region(a.out, a.data, *(a.region or [0, None, 0, None]), workers=a.workers, log=lg,
                     max_blocks=a.max_blocks, dataset=a.dataset)
        junk = apple_junk(a.out)
        lg(f"apple metadata files inside store: {len(junk)}")
    elif a.cmd == "validate":
        res = validate_store(a.out, a.data, n=a.n, seed=a.seed, dataset=a.dataset)
        print(json.dumps(res, indent=1))
        if a.json:
            json.dump(res, open(a.json, "w"), indent=1)
        ok = (res["hist_exact"] == res["n_checked"] and res["fields_exact_float32"] == res["n_checked"]
              and res.get("ocean_fill", 0) == res.get("ocean_checked", 0) and res["apple_junk"] == 0)
        sys.exit(0 if ok else 1)
    elif a.cmd == "stats":
        print(json.dumps(store_stats(a.out), indent=1))


if __name__ == "__main__":
    main()
