"""Development fixture for the Mars app (App track): synthetic-but-schema-exact stores under
<repo>/staging/fixture-mars/dune-atlas/mars/v1/ (the R2 key layout of the data contract):

  datasets/fv3-beta1/cells.zarr       series (90,180,5,16032) = u, v, T, rho, z, fields (90,180,23,64), dunes, dune, ls, sol
                                      - every array full-size; only the shards listed in --shards are written
                                        (other cells read as fill values)
  datasets/fv3-beta1/cells-aux.zarr   qsdiv (90,180,64), rho_mean, elev_mean (90,180)
  datasets/fv3-beta1/fields/<v>.zarr  GeoZarr pyramids (topozarr layout, dims (d, y, x)) of a few fields,
                                      qsdiv and rho_mean (2-D); fields/elevation.zarr (2-D)

The series are synthetic (fixture_common.py). Physics is pipeline mars/physics.py (never re-implemented);
the 23 fields follow the Earth definitions (qsat_compute.py) with the per-hour Mars transport law:
  - in the fixture shards: every hour, except the crest-mode SEARCH (alpha_E, alpha_H) on every 25th hour;
  - elsewhere (map pyramids only): every 25th hour, flat-bed fields only.
This is a fixture for UI development, not the atlas computation (that is the Wind track's).
Dunes: the real overlap fraction (assessment artifact fv3_dunefrac.npz, FV3 grid) flipped/rolled to the
contract grid.

    cd <repo> && nice python scripts/mars/app/make_fixture.py --dunefrac <npz> [--out staging/fixture-mars]
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
sys.path.insert(0, str(REPO / "pipeline" / "src"))
sys.path.insert(0, str(HERE))

from dune_atlas_pipeline import constants as EC  # noqa: E402  (QSAT_VARS, field order)
from dune_atlas_pipeline.mars import constants as M  # noqa: E402
from dune_atlas_pipeline.mars import physics as P  # noqa: E402
from dune_atlas_pipeline.qsat_compute import DO, DO_BED0, _bedmode, _elongationmode  # noqa: E402
import fixture_common as FC  # noqa: E402

PREFIX = "dune-atlas/mars/v1"
DS = f"{PREFIX}/datasets/fv3-beta1"
FIELD_VARS = list(EC.QSAT_VARS)
D = M.D_VALUES                    # (64,) m
SHARD = 16
MODE_STRIDE = 25                  # hours of the crest-mode search (rotates through local times)
MAP_STRIDE = 25
KEEPBITS = {"u": 13, "v": 13, "T": 14, "rho": 11, "z": 11}   # fixture choice; errors < 0.004 m/s, 0.02 K, 0.05 %, 1 mm
DATASET = {"id": "fv3-beta1", "name": "MCMC FV3 Mars GCM, beta release 1 (2°, hourly, one Mars year)", "resolution_deg": 2,
           "n_hours": 16032, "source": "https://data.nas.nasa.gov/legacygcm/fv3betaout1/fv3betaout1/",
           "citation": "NASA Ames Mars Climate Modeling Center: FV3-based Mars GCM Beta Output Release 1 (fv3betaout1), c48 reference simulation, 6th simulated year"}
FIXTURE_NOTE = "SYNTHETIC development fixture (scripts/mars/app/make_fixture.py): not science data"


def bitround(a, keepbits):
    drop = 23 - keepbits
    b = np.asarray(a, "f4").view(np.uint32).copy()
    half = np.uint32((1 << (drop - 1)) - 1)
    mask = np.uint32((0xFFFFFFFF >> drop) << drop)
    b = (b + half + ((b >> np.uint32(drop)) & np.uint32(1))) & mask
    return b.view(np.float32)


def cell_series(iy, ix):
    s = FC.synth_series(iy, ix)
    out = {k: bitround(s[k], KEEPBITS[k]) for k in ("u", "v", "T", "rho", "z")}
    out["ls"], out["sol"] = s["ls"].astype("f4"), s["sol"].astype("f4")
    return out


def _thr(rho, T):
    th = P.threshold(D[:, None], rho[None, :], T[None, :])
    shp = (len(D), len(rho))
    return tuple(np.broadcast_to(th[k], shp) for k in ("ut", "s", "gt", "nu"))


def _ustar(u, v, T, rho, z):
    """u* (eq. 2.2 smooth wall at height z, nu = mu(T)/rho) and direction, pipeline mars/physics.py"""
    return P.friction_velocity(u, v, z, P.viscosity(T) / rho)


def flat_fields(u, v, T, rho, z):
    """Flat-bed fields (64,) each: dpm, rdpm, rdpa, qha_rdp_dp, uft, ufm (float64)."""
    u, v, T, rho, z = (np.asarray(x, "f8") for x in (u, v, T, rho, z))
    us, ua = _ustar(u, v, T, rho, z)
    ut, s, gt, nu = _thr(rho, T)
    q = P.transport_rate(us[None], ut, D[:, None], s, gt, nu)
    n = len(u)
    dp = q.sum(1) / n
    r = (q * np.exp(1j * ua)[None]).sum(1) / n
    above = us[None] > ut
    na = above.sum(1)
    with np.errstate(all="ignore"):
        ufm = np.where(na > 0, (np.where(above, us[None] / ut, 0)).sum(1) / np.maximum(na, 1), np.nan)
        return {"dpm": dp, "rdpm": np.abs(r), "rdpa": np.angle(r), "qha_rdp_dp": np.where(dp > 0, np.abs(r) / dp, np.nan),
                "uft": na / n, "ufm": ufm}


def all_fields(u, v, T, rho, z):
    """The 23 fields (64,) each, Earth definitions with the per-hour Mars law (see module doc)."""
    u, v, T, rho, z = (np.asarray(x, "f8") for x in (u, v, T, rho, z))
    f = flat_fields(u, v, T, rho, z)
    us, ua = _ustar(u, v, T, rho, z)
    ut, s, gt, nu = _thr(rho, T)
    k = M.BETA * M.DASPECT
    # crest-mode search on a subsample of hours: qa(do) = q(u* (1 + k |sin(ua - do)|))
    sl = slice(0, None, MODE_STRIDE)
    sn = np.sin(ua[sl][None, :] - DO[:, None])                        # (do, h)
    uc = us[sl][None, :] * (1 + k * np.abs(sn))                        # (do, h)
    ae = np.full(64, np.nan); ab = np.full(64, np.nan)
    with np.errstate(all="ignore"):
        for i in range(64):
            qa = P.transport_rate(uc, ut[i, sl][None], D[i], s[i, sl][None], gt[i, sl][None], nu[i, sl][None])
            qnc = (qa * sn).sum(1)
            qac = (qa * np.abs(sn)).sum(1)
            if qa.any():
                ae[i] = _elongationmode(DO, qnc)
                ab[i] = _bedmode(DO[DO_BED0:], qac[DO_BED0:])
    f["ae"], f["ab"] = ae, ab
    n = len(u)

    def reductions(alpha):
        out = np.full((6, 64), np.nan)
        for i in range(64):
            a = alpha[i]
            if not np.isfinite(a):
                continue
            dd = ua - a
            sd, cd = np.sin(dd), np.cos(dd)
            q = P.transport_rate(us * (1 + k * np.abs(sd)), ut[i], D[i], s[i], gt[i], nu[i])
            out[0, i], out[1, i] = (q * cd).sum() / n, (q * sd).sum() / n
            out[2, i], out[3, i] = (q * np.abs(cd)).sum() / n, (q * np.abs(sd)).sum() / n
            out[4, i], out[5, i] = q.sum(), q[us > ut[i]].sum()
        return out

    with np.errstate(all="ignore"):
        rb, re = reductions(ab), reductions(ae)
        f["qnlb"], f["qncb"], f["qalb"], f["qacb"] = rb[:4]
        f["qnle"], _, f["qale"], f["qace"] = re[:4]
        f["at"] = (np.where(f["qncb"] > 0, ab + np.pi / 2, ab - np.pi / 2) + np.pi) % (2 * np.pi) - np.pi
        f["ao"] = (np.where(f["qnlb"] > 0, ab, ab - np.pi) + np.pi) % (2 * np.pi) - np.pi
        f["sige_sigh"] = f["qace"] / f["qacb"]
        f["qhab_nl_nc"] = np.abs(f["qnlb"] / f["qncb"])
        f["qhab_ac_nc"] = np.abs(f["qacb"] / f["qncb"])
        f["qhne_ac_nl"] = f["qace"] / f["qnle"]
        for var, (crest, qall, qab) in (("qhbf", (f["qalb"] + f["qacb"] > 0, rb[4], rb[5])), ("qhef", (f["qale"] + f["qace"] > 0, re[4], re[5]))):
            F = np.where(qall > 0, qab / qall, np.nan)
            F = np.where(f["uft"] > 0, F, np.where(crest, 0.0, np.nan))
            f[var] = np.clip(F, 0.0, 1.0)
    return f


def _shard_job(args):
    sy, sx = args
    t0 = time.time()
    y0, x0 = sy * SHARD, sx * SHARD
    ys, xs = range(y0, min(FC.NY, y0 + SHARD)), range(x0, min(FC.NX, x0 + SHARD))
    ser = np.full((len(ys), len(xs), 5, FC.N_HOURS), np.nan, "f4")
    fld = np.full((len(ys), len(xs), len(FIELD_VARS), 64), np.nan, "f4")
    ls = sol = None
    for a, iy in enumerate(ys):
        for b, ix in enumerate(xs):
            c = cell_series(iy, ix)
            ls, sol = c["ls"], c["sol"]
            for k, name in enumerate(("u", "v", "T", "rho", "z")):
                ser[a, b, k] = c[name]
            f = all_fields(c["u"], c["v"], c["T"], c["rho"], c["z"])
            for k, var in enumerate(FIELD_VARS):
                fld[a, b, k] = f[var]
    return (sy, sx, ser, fld, ls, sol, time.time() - t0)


def _map_job(iy):
    row = {v: np.full((FC.NX, 64), np.nan) for v in ("dpm", "rdpm", "rdpa", "qha_rdp_dp", "uft", "ufm")}
    rho_mean = np.full(FC.NX, np.nan)
    for ix in range(FC.NX):
        s = FC.synth_series(iy, ix)
        u, v, T, zz = (bitround(s[k], KEEPBITS[k]).astype("f8") for k in ("u", "v", "T", "z"))
        rho = bitround(s["rho"], KEEPBITS["rho"]).astype("f8")
        rho_mean[ix] = rho.mean()
        f = flat_fields(u[::MAP_STRIDE], v[::MAP_STRIDE], T[::MAP_STRIDE], rho[::MAP_STRIDE], zz[::MAP_STRIDE])
        for k in row:
            row[k][ix] = f[k]
    return iy, row, rho_mean


class _Serial:
    """stand-in for ProcessPoolExecutor where process pools are not permitted (sandboxes)"""
    def __enter__(self): return self
    def __exit__(self, *a): return False
    def map(self, fn, it, chunksize=1): return map(fn, it)


def _pool(workers):
    if workers <= 1:
        return _Serial()
    try:
        return ProcessPoolExecutor(max_workers=workers)
    except (PermissionError, OSError):
        return _Serial()


def write_cells(root_dir: Path, shards, dunefrac, workers, log=print):
    import zarr
    from zarr.codecs import BloscCodec
    from dune_atlas_pipeline.cellstore import _sharding
    out = root_dir / DS / "cells.zarr"
    if out.exists():
        shutil.rmtree(out)
    g = zarr.open_group(str(out), mode="w", zarr_format=3)
    g.attrs.update({
        "title": "Mars dune atlas cell store (FIXTURE)", "note": FIXTURE_NOTE, "grid": FC.GRID_ATTRS, "body": "mars", "dataset": DATASET,
        "field_vars": FIELD_VARS, "d_values_um": [int(x) for x in M.D_VALUES_UM], "d_default_index": int(M.D_DEFAULT_INDEX),
        "series_vars": list(M.SERIES_VARS), "series_units": {"u": "m s-1", "v": "m s-1", "T": "K", "rho": "kg m-3", "z": "m"},
        "series_keepbits": KEEPBITS,
        "constants": {k: getattr(M, k) for k in ("G", "R_MARS", "R_AIR", "MU0", "T0_MU", "S_MU", "K_ADIABATIC", "RHO_P", "KAPPA", "MIX_DAMP",
                                                  "DSTAR_MIN", "UPLUS_MIN", "C1", "C2", "KN_A", "KN_B", "KN_C", "GA_SQRT_S_MIN", "BETA", "DASPECT", "S2Y")},
        "fixture_shards": [list(s) for s in shards],
    })
    series = g.create_array("series", shape=(FC.NY, FC.NX, 5, FC.N_HOURS), dtype="float32", chunks=(SHARD, SHARD, 5, FC.N_HOURS),
                            serializer=_sharding((1, 1, 5, FC.N_HOURS), 4), compressors=None, fill_value=np.nan,
                            dimension_names=["latitude", "longitude", "variable", "hour"])
    fields = g.create_array("fields", shape=(FC.NY, FC.NX, len(FIELD_VARS), 64), dtype="float32", chunks=(SHARD, SHARD, len(FIELD_VARS), 64),
                            serializer=_sharding((1, 1, len(FIELD_VARS), 64), 4), compressors=None, fill_value=np.nan,
                            dimension_names=["latitude", "longitude", "variable", "d"])
    blosc = [BloscCodec(cname="zstd", clevel=5, shuffle="bitshuffle", typesize=4)]
    g.create_array("dunes", shape=(FC.NY, FC.NX), dtype="float32", chunks=(FC.NY, FC.NX), compressors=blosc, fill_value=np.nan,
                   dimension_names=["latitude", "longitude"])[...] = dunefrac.astype("f4")
    g.create_array("dune", shape=(FC.NY, FC.NX), dtype="uint8", chunks=(FC.NY, FC.NX), compressors=blosc, fill_value=0,
                   dimension_names=["latitude", "longitude"])[...] = (dunefrac > 0).astype("u1")
    fld_all = np.full((FC.NY, FC.NX, len(FIELD_VARS), 64), np.nan, "f4")
    ls = sol = None
    with _pool(workers) as ex:
        for sy, sx, ser, fld, ls_, sol_, dt in ex.map(_shard_job, shards):
            y0, x0 = sy * SHARD, sx * SHARD
            series[y0:y0 + ser.shape[0], x0:x0 + ser.shape[1]] = ser
            fields[y0:y0 + fld.shape[0], x0:x0 + fld.shape[1]] = fld
            fld_all[y0:y0 + fld.shape[0], x0:x0 + fld.shape[1]] = fld
            ls, sol = ls_, sol_
            log(f"shard ({sy},{sx}) {ser.shape[0]}x{ser.shape[1]} cells {dt:.0f}s")
    g.create_array("ls", shape=(FC.N_HOURS,), dtype="float32", chunks=(FC.N_HOURS,), compressors=blosc, dimension_names=["hour"],
                   attributes={"units": "degree", "long_name": "areocentric solar longitude"})[...] = ls
    g.create_array("sol", shape=(FC.N_HOURS,), dtype="float32", chunks=(FC.N_HOURS,), compressors=blosc, dimension_names=["hour"],
                   attributes={"units": "1", "long_name": "sol"})[...] = sol
    return fld_all


def write_aux(root_dir: Path, qsdiv, rho_mean, elev_mean):
    import zarr
    from zarr.codecs import BloscCodec
    from dune_atlas_pipeline.cellsaux import _sharding as aux_sharding
    out = root_dir / DS / "cells-aux.zarr"
    if out.exists():
        shutil.rmtree(out)
    g = zarr.open_group(str(out), mode="w", zarr_format=3)
    g.attrs.update({"title": "Mars per-cell auxiliary variables (FIXTURE)", "note": FIXTURE_NOTE, "grid": FC.GRID_ATTRS,
                    "d_values_um": [int(x) for x in M.D_VALUES_UM], "d_default_index": int(M.D_DEFAULT_INDEX), "variables": []})
    a = g.create_array("qsdiv", shape=qsdiv.shape, dtype="float32", chunks=(SHARD, SHARD, 64), serializer=aux_sharding((1, 1, 64)), compressors=None,
                       fill_value=np.nan, dimension_names=["latitude", "longitude", "d"],
                       attributes={"units": "m yr-1", "long_name": "saturated flux divergence", "radius_m": M.R_MARS})
    a[...] = qsdiv.astype("f4")
    blosc = [BloscCodec(cname="zstd", clevel=5, shuffle="bitshuffle", typesize=4)]
    for name, arr, att in (("rho_mean", rho_mean, {"units": "kg m-3", "long_name": "near-surface air density, mean over the year"}),
                           ("elev_mean", elev_mean, {"units": "m", "long_name": "elevation, cell mean (SYNTHETIC in the fixture)"})):
        g.create_array(name, shape=arr.shape, dtype="float32", chunks=(64, 64), compressors=blosc, fill_value=np.nan,
                       dimension_names=["latitude", "longitude"], attributes=att)[...] = arr.astype("f4")
    g.attrs["variables"] = ["qsdiv", "rho_mean", "elev_mean"]


def write_pyramid(out: Path, var: str, arr: np.ndarray, lat, lon, levels: int, units: str):
    """topozarr GeoZarr multiscale store; arr (64, y, x) with dim d, or (y, x)."""
    import topozarr
    import xarray as xr
    import xproj  # noqa: F401
    if out.exists():
        shutil.rmtree(out)
    if arr.ndim == 3:
        ds = xr.Dataset(coords={"d": np.asarray(M.D_VALUES_UM, "f8")})
        ds[var] = xr.DataArray(arr.astype("f4"), dims=("d", "y", "x"), coords={"y": lat, "x": lon})
        ds["d"].attrs.update(units="um", long_name="median grain diameter d")
    else:
        ds = xr.Dataset()
        ds[var] = xr.DataArray(arr.astype("f4"), dims=("y", "x"), coords={"y": lat, "x": lon})
    ds[var].attrs.update(units=units)
    ds["y"].attrs.update(units="degrees_north", standard_name="latitude")
    ds["x"].attrs.update(units="degrees_east", standard_name="longitude")
    ds.attrs.update({"title": f"Mars dune atlas field {var} (FIXTURE)", "note": FIXTURE_NOTE, "d_default_index": int(M.D_DEFAULT_INDEX)})
    ds = ds.proj.assign_crs(spatial_ref="EPSG:4326")
    pyr = topozarr.create_pyramid(ds, levels=levels, x_dim="x", y_dim="y", method="nearest" if var in ("rdpa", "at", "ae", "ab", "ao") else "mean")
    pyr.write(str(out), mode="w")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=str(REPO / "staging" / "fixture-mars"))
    ap.add_argument("--dunefrac", required=True, help="fv3_dunefrac.npz (frac on the FV3 grid lat -89..89, lon 1..359)")
    ap.add_argument("--shards", default="2,7;0,10;0,3", help="shard (row, col) list: Nili Patera; north polar erg x2")
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args(argv)
    root = Path(a.out)
    shards = [tuple(int(x) for x in s.split(",")) for s in a.shards.split(";")]
    t0 = time.time()
    z = np.load(a.dunefrac)
    frac = np.roll(z["frac"][::-1], 90, axis=1)                    # FV3 (lat asc, lon 1..359) -> contract grid
    assert np.allclose(np.roll(z["lon"], 90)[0], 181) and z["lat"][::-1][0] == 89
    lat = FC.lat_of(np.arange(FC.NY)).astype("f8"); lon = FC.lon_of(np.arange(FC.NX)).astype("f8")
    fld_all = write_cells(root, shards, frac, a.workers)
    print(f"cells.zarr {time.time() - t0:.0f}s", flush=True)
    # map fields on the whole grid (subsampled hours), the shards' exact values on top
    mp = {v: np.full((FC.NY, FC.NX, 64), np.nan) for v in ("dpm", "rdpm", "rdpa", "qha_rdp_dp", "uft", "ufm")}
    rho_mean = np.full((FC.NY, FC.NX), np.nan)
    with _pool(a.workers) as ex:
        for iy, row, rm in ex.map(_map_job, range(FC.NY), chunksize=2):
            for k in mp:
                mp[k][iy] = row[k]
            rho_mean[iy] = rm
    print(f"map fields {time.time() - t0:.0f}s", flush=True)
    have = np.isfinite(fld_all[..., FIELD_VARS.index("dpm"), 0])
    for k in mp:
        mp[k][have] = fld_all[have][:, FIELD_VARS.index(k)]
    extra = {v: np.full((FC.NY, FC.NX, 64), np.nan) for v in ("at", "ae", "ab", "qacb", "qace")}
    for v in extra:
        extra[v][have] = fld_all[have][:, FIELD_VARS.index(v)]
    from dune_atlas_pipeline.qsdiv import divergence
    qsdiv = np.stack([divergence(mp["rdpm"][..., k], mp["rdpa"][..., k], lat, lon, R=M.R_MARS) for k in range(64)], -1) * M.S2Y
    # elevation: native 0.25 deg 2-D grid and the 2-deg cell means
    elat = 90 - 0.125 - 0.25 * np.arange(720); elon = -180 + 0.125 + 0.25 * np.arange(1440)
    elev = FC.elevation(elat[:, None], elon[None, :])
    elev_mean = elev.reshape(90, 8, 180, 8).mean((1, 3))
    write_aux(root, qsdiv, rho_mean, elev_mean)
    fdir = root / DS / "fields"
    fdir.mkdir(parents=True, exist_ok=True)
    flux = {"dpm", "rdpm", "qacb", "qace"}
    for v, arr in {**mp, **extra}.items():
        disp = arr * M.S2Y if v in flux else arr
        write_pyramid(fdir / f"{v}.zarr", v, np.moveaxis(disp, -1, 0), lat, lon, 2, "m²/yr" if v in flux else "rad" if v in ("rdpa", "at", "ae", "ab") else "1")
    write_pyramid(fdir / "qsdiv.zarr", "qsdiv", np.moveaxis(qsdiv, -1, 0), lat, lon, 2, "m/yr")
    write_pyramid(fdir / "rho_mean.zarr", "rho_mean", rho_mean, lat, lon, 2, "kg m-3")
    write_pyramid(root / PREFIX / "fields" / "elevation.zarr", "elevation", elev, elat, elon, 3, "m")
    stats = {"shards": shards, "seconds": round(time.time() - t0), "dpm_d29_shards_m2yr": [float(np.nanmin(mp["dpm"][have][:, 29]) * M.S2Y), float(np.nanmax(mp["dpm"][have][:, 29]) * M.S2Y)],
             "rho_mean_range": [float(np.nanmin(rho_mean)), float(np.nanmax(rho_mean))]}
    (root / "FIXTURE.json").write_text(json.dumps({"note": FIXTURE_NOTE, **stats}, indent=1))
    print(json.dumps(stats))


if __name__ == "__main__":
    main()
