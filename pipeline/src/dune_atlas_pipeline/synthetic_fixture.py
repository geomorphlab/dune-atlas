"""Synthetic Earth fixture: the local test stores of the atlas (`staging/fixture`) built from synthetic
inputs, so that the fixture-dependent tests run without the source data (CI).

    python -m dune_atlas_pipeline.synthetic_fixture --out staging/fixture      (about 2-3 min, ~150 MB)

Layout (as the fixture built from the source data with `dune-atlas fixture` and the sidecar commands):

  cells.zarr, cells-aux.zarr, cells-aux-veg.zarr       ERA5-Land 0.1°, the shards of cli.FIXTURE_CELLS
  fields/<v>.zarr                                      pyramids of cli.FIXTURE_VARS (+ dpm) over cli.FIXTURE_FIELDS
  datasets/era5/{cells,cells-aux,cells-aux-veg}.zarr   ERA5 0.25°, the shards of ERA5_CELLS; global pyramids
                                                       fields/{dpm,rdpa,uft,at,qsdiv}.zarr
  datasets/era5-v1/cells.zarr                          the first ERA5 build (land = lsm > 0.5), same cells
  decode_reference.json                                reference values of one cell (app/scripts/check-decode.mjs)

Every store is written by the pipeline's own writers (cellstore.write_region / create_store, cellsaux.build,
vegetation.build_cells_aux*, fields.build_field_pyramid, cellmasks.build), so the store schemas are those of the
published stores. Only the inputs are synthetic (seeded, deterministic):

  * geography: a straight coastline through 24.5° S, 14.55° E (land to the east, 0.25° of longitude per degree of
    latitude), a Namib-like dune belt along it and a Kalahari-like dune patch; land fractions of the 0.1° and
    0.25° cells from the coastline (ERA5-Land land = fraction > 0.5, ERA5 lsm = fraction);
  * wind histograms: per cell a Weibull speed distribution and a two-mode direction distribution, sampled to the
    dataset's number of hours; the 23 sand-flux fields from the histograms with qsat_compute.qsat_fields (crest
    orientations from a smooth synthetic field instead of the mode search, to keep the build fast);
  * flux divergence: qsdiv.divergence of the synthetic RDP/RDD; aridity and vegetation: smooth fields;
  * map pyramids: smooth fields (the pyramids are checked for their layout and masking, not their values).

Values are therefore not those of the published atlas: tests that compare with published numbers use the
fixture built from the source data and skip on this one (`synthetic: true` in decode_reference.json).
"""
from __future__ import annotations

import argparse
import functools
import json
import os
import shutil
import tempfile
import time
from pathlib import Path

import numpy as np
import xarray as xr

from . import cellmasks, cellsaux, cellstore, constants as C, fields, qsat_compute, qsdiv, vegetation
from .cli import FIXTURE_CELLS, FIXTURE_FIELDS, FIXTURE_VARS
from .grid import ERA5_GRID, ERA5_LAND_GRID, get_dataset

REPO = Path(__file__).resolve().parents[3]
ERA5_CELLS = (448, 480, 768, 800)          # ERA5 shards (16 x 16 cells) around 24.5° S, 15.25° E
ERA5_FIELDS = dict(latitude=slice(440, 500), longitude=slice(760, 820))
TILE = cellstore.SHARD


# ----------------------------------------------------------------------------- geography
def coast_lon(lat):
    return 14.55 + 0.25 * (-np.asarray(lat, "f8") - 24.5)


def land_fraction(g):
    """Fraction of each cell of grid g east of the coastline (only between 10° S and 36° S; ocean elsewhere)."""
    lat, lon = g.lat()[:, None], g.lon()[None, :]
    h = g.res / 2
    f = np.clip((lon + h - coast_lon(lat)) / g.res, 0, 1)
    f[(g.lat() > -10) | (g.lat() < -36)] = 0
    f[:, (g.lon() < 5) | (g.lon() > 40)] = 0
    return f


def dunes_0p1(land):
    g = ERA5_LAND_GRID
    lat, lon = g.lat()[:, None], g.lon()[None, :]
    c = coast_lon(lat)
    namib = (lat > -29) & (lat < -17) & (lon > c) & (lon < c + 1.4)
    kalahari = ((lat + 26) / 2.0) ** 2 + ((lon - 20.5) / 1.5) ** 2 < 1
    return land & (namib | kalahari)


# ----------------------------------------------------------------------------- winds and fields
UM, UA = C.UM_CENTRES, C.UA_CENTRES


def cell_hist(iy, ix, n_hours, salt):
    r = np.random.default_rng([iy, ix, salt])
    k, lam = 2.0, 3.0 + 3.0 * r.random()
    ps = (k / lam) * (UM / lam) ** (k - 1) * np.exp(-(UM / lam) ** k)
    m1, m2 = 0.4 * np.sin(0.3 * iy / (1 + salt)) + np.pi / 2, r.uniform(-np.pi, np.pi)
    w = 0.6 + 0.3 * r.random()
    pd = w * np.exp(3 * np.cos(UA - m1)) + (1 - w) * np.exp(1.5 * np.cos(UA - m2))
    p = np.outer(ps / ps.sum(), pd / pd.sum()).ravel()
    return r.multinomial(n_hours - int(r.integers(0, 3)), p / p.sum()).reshape(UM.size, UA.size)


class Synth:
    """Synthetic sources of one dataset: (dh, dq) as cellstore.open_sources returns them, computed per tile."""

    def __init__(self, ds, land):
        self.ds, self.land = ds, land
        self.salt = 1 if ds.id == "era5-land" else 2
        self.meta = fields.load_metadata(REPO / "registry" / ("qsat_field_metadata.json" if ds.id == "era5-land"
                                                              else "datasets/era5/qsat_field_metadata.json"))

    @functools.lru_cache(maxsize=32)
    def hist_tile(self, ty, tx):
        g = self.ds.grid
        ys, xs = range(ty * TILE, min(g.ny, ty * TILE + TILE)), range(tx * TILE, min(g.nx, tx * TILE + TILE))
        h = np.zeros((len(ys), len(xs), UM.size, UA.size), np.int64)
        for a, iy in enumerate(ys):
            for b, ix in enumerate(xs):
                if self.land[iy, ix]:
                    h[a, b] = cell_hist(iy, ix, self.ds.n_hours, self.salt)
        return h

    @functools.lru_cache(maxsize=32)
    def field_tile(self, ty, tx):
        h = self.hist_tile(ty, tx)
        ny, nx = h.shape[:2]
        flat = h.reshape(ny * nx, UM.size, UA.size)
        lat = self.ds.grid.lat()[ty * TILE: ty * TILE + ny]
        ae = (np.pi / 2 + 0.3 * np.sin(np.radians(lat))[:, None, None] + 0.2 * np.linspace(-1, 1, C.UT_VALUES.size)
              ) * np.ones((ny, nx, 1))
        ae = ae.reshape(ny * nx, -1)
        ab = np.mod(ae + np.pi / 2, np.pi)
        f = qsat_compute.qsat_fields(flat, modes=(ae, ab))
        return {v: f[v].reshape(ny, nx, -1) for v in C.QSAT_VARS}

    def _da(self, fn, shape, chunks, dtype, dims, coords, attrs):
        import dask.array as da
        arr = da.map_blocks(fn, dtype=dtype, chunks=chunks, meta=np.empty((0,) * len(shape), dtype))
        return xr.DataArray(arr, dims=dims, coords=coords, attrs=attrs)

    def sources(self):
        g = self.ds.grid
        lat, lon = g.lat(), g.lon()
        tiles = (tuple([TILE] * (g.ny // TILE) + ([g.ny % TILE] if g.ny % TILE else [])),
                 tuple([TILE] * (g.nx // TILE) + ([g.nx % TILE] if g.nx % TILE else [])))

        def hist_block(block_info=None):
            (y0, y1), (x0, x1) = block_info[None]["array-location"][:2]
            if not self.land[y0:y1, x0:x1].any():
                return np.zeros((y1 - y0, x1 - x0, UM.size, UA.size), np.int64)
            return self.hist_tile(y0 // TILE, x0 // TILE)

        hist = self._da(hist_block, (g.ny, g.nx, UM.size, UA.size), tiles + ((UM.size,), (UA.size,)), np.int64,
                        ("latitude", "longitude", "um_bin", "ua_bin"),
                        {"latitude": lat, "longitude": lon, "um_bin": np.arange(UM.size), "ua_bin": np.arange(UA.size)}, {})
        dh = xr.Dataset({"histogram_um_ua": hist})

        def field_block(var):
            def f(block_info=None):
                (_, _), (y0, y1), (x0, x1) = block_info[None]["array-location"]
                out = np.full((C.UT_VALUES.size, y1 - y0, x1 - x0), np.nan)
                if self.land[y0:y1, x0:x1].any():
                    t = self.field_tile(y0 // TILE, x0 // TILE)[var]
                    out[:] = np.moveaxis(t, -1, 0)
                    out[:, ~self.land[y0:y1, x0:x1]] = np.nan
                return out
            return f

        dq = xr.Dataset({v: self._da(field_block(v), (C.UT_VALUES.size, g.ny, g.nx), ((C.UT_VALUES.size,),) + tiles,
                                     np.float64, ("ut", "latitude", "longitude"),
                                     {"ut": C.UT_VALUES, "latitude": lat, "longitude": lon},
                                     {k: self.meta[v][k] for k in ("long_name", "units", "description")})
                         for v in C.QSAT_VARS})
        return dh, dq


def smooth_fields(ds, land, region, full_extent=False):
    """Map-pyramid input: smooth fields over `region` (NaN off land), source attrs from the field metadata;
    full_extent: the whole grid, with values only in `region` (as the published ERA5 pyramids)."""
    g = ds.grid
    meta = Synth(ds, land).meta
    ys, xs = region["latitude"], region["longitude"]
    lat, lon = g.lat()[ys], g.lon()[xs]
    k = np.arange(C.UT_VALUES.size)[:, None, None]
    base = (np.sin(np.radians(lat) * 7)[None, :, None] * np.cos(np.radians(lon) * 5)[None, None, :])
    out = {}
    for i, v in enumerate(C.QSAT_VARS):
        a = np.asarray(base * (1 + 0.01 * i) * np.exp(-k / 40.0), "f8")
        if v in ("dpm", "rdpm", "uft", "ufm", "qacb", "qncb", "qalb", "qnlb", "qace", "qale", "qnle", "qhbf", "qhef",
                 "sige_sigh", "qha_rdp_dp", "qhab_nl_nc", "qhab_ac_nc", "qhne_ac_nl"):
            a = np.abs(a) * (1e-6 if v.startswith(("dp", "rdp", "q")) and v not in ("qha_rdp_dp",) else 1)
        else:
            a = a * np.pi
        da = xr.DataArray(a, dims=("ut", "latitude", "longitude"),
                          coords={"ut": C.UT_VALUES, "latitude": lat, "longitude": lon},
                          attrs={kk: meta[v][kk] for kk in ("long_name", "units", "description")})
        da = da.where(xr.DataArray(land[ys, xs], dims=("latitude", "longitude")))
        if full_extent:
            full = xr.DataArray(np.full((C.UT_VALUES.size, g.ny, g.nx), np.nan, "f4"), dims=da.dims,
                                coords={"ut": C.UT_VALUES, "latitude": g.lat(), "longitude": g.lon()}, attrs=da.attrs)
            full[:, ys, xs] = da.values
            da = full
        out[v] = da
    return xr.Dataset(out)


# ----------------------------------------------------------------------------- build
def _patched(sources: dict):
    """cellstore.open_sources -> the synthetic sources of the requested dataset."""
    def open_sources(data_dir, dataset=None):
        return sources[get_dataset(dataset).id]
    return open_sources


def build(out: str, log=print) -> dict:
    t0 = time.time()
    out = Path(out)
    if out.exists():
        raise FileExistsError(f"{out} exists; choose a new directory")
    out.mkdir(parents=True)
    tmp = Path(tempfile.mkdtemp(prefix="dune-atlas-synth-"))
    try:
        return _build(out, tmp, log, t0)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def _build(out, tmp, log, t0):
    gl, ge = ERA5_LAND_GRID, ERA5_GRID
    frac01 = land_fraction(gl)
    land01 = frac01 > 0.5
    dunes01 = dunes_0p1(land01)
    # source data directory: layers.nc (ERA5-Land masks), era5_cellmasks.nc (ERA5, via cellmasks.build)
    data = tmp / "data"; data.mkdir()
    xr.Dataset({"land": (("y", "x"), land01.astype("u1")), "dunes": (("y", "x"), dunes01.astype("u1"))},
               coords={"y": gl.lat(), "x": gl.lon()}).to_netcdf(data / "layers.nc")
    lsm = land_fraction(ge)
    np.save(tmp / "lsm.npy", lsm)
    cellmasks.build(str(tmp / "lsm.npy"), str(data), str(data / "era5_cellmasks.nc"))
    data_v1 = tmp / "data-v1"; data_v1.mkdir()
    os.symlink(data / "layers.nc", data_v1 / "layers.nc")
    cellmasks.build(str(tmp / "lsm.npy"), str(data), str(data_v1 / "era5_cellmasks.nc"), land_above=0.5)

    ds_l, ds_e = get_dataset("era5-land"), get_dataset("era5")
    land_e = cellstore.load_masks(str(data), ds_e)[0]
    land_e1 = cellstore.load_masks(str(data_v1), ds_e)[0]
    synth = {"era5-land": Synth(ds_l, land01), "era5": Synth(ds_e, land_e)}
    srcs = {k: s.sources() for k, s in synth.items()}
    orig = cellstore.open_sources
    cellstore.open_sources = _patched(srcs)
    try:
        log("cells.zarr (ERA5-Land)")
        cellstore.write_region(str(out / "cells.zarr"), str(data), *FIXTURE_CELLS, log=lambda s: None)
        e5 = out / "datasets" / "era5"
        log("datasets/era5/cells.zarr")
        cellstore.write_region(str(e5 / "cells.zarr"), str(data), *ERA5_CELLS, log=lambda s: None, dataset="era5")
        log("datasets/era5-v1/cells.zarr")
        v1 = Synth(ds_e, land_e1)
        srcs_v1 = dict(srcs, era5=v1.sources())
        cellstore.open_sources = _patched(srcs_v1)
        cellstore.write_region(str(out / "datasets" / "era5-v1" / "cells.zarr"), str(data_v1), *ERA5_CELLS,
                               log=lambda s: None, dataset="era5")
    finally:
        cellstore.open_sources = orig

    # sidecars: qsdiv from the synthetic RDP / RDD of the written cells, aridity and vegetation smooth fields
    for ds, syn, root, cells, ddir in ((ds_l, synth["era5-land"], out, FIXTURE_CELLS, data),
                                      (ds_e, synth["era5"], out / "datasets" / "era5", ERA5_CELLS, data)):
        g = ds.grid
        log(f"{root.relative_to(out) if root != out else '.'}/cells-aux.zarr")
        y0, y1, x0, x1 = cells
        q = np.full((C.UT_VALUES.size, g.ny, g.nx), np.nan, "f4")
        _, dq = srcs[ds.id]
        rdpm = dq["rdpm"].isel(latitude=slice(y0, y1), longitude=slice(x0, x1)).values
        rdpa = dq["rdpa"].isel(latitude=slice(y0, y1), longitude=slice(x0, x1)).values
        lat, lon = g.lat()[y0:y1], g.lon()[x0:x1]
        q[:, y0:y1, x0:x1] = np.stack([qsdiv.divergence(rdpm[k], rdpa[k], lat, lon) for k in range(C.UT_VALUES.size)]) * C.S2Y
        qs = tmp / f"qsdiv-{ds.id}.zarr"
        qsdiv.write_native(q, str(qs), g)
        del q
        landm = cellstore.load_masks(str(ddir), ds)[0]
        dist = g.lon()[None, :] - coast_lon(g.lat())[:, None]            # degrees inland of the coastline
        ai = np.where(landm, np.clip(0.03 + 0.03 * dist, 0.01, 0.6), np.nan).astype("f4")   # arid near the coast
        ai_means = {"ai_mean": ai, "ai_valid_frac": np.where(landm, 1.0, np.nan).astype("f4"),
                    "ai_sat_frac": np.where(landm, 0.0, np.nan).astype("f4")}
        cellsaux.build(str(root / "cells-aux.zarr"), str(ddir), str(qs), ai_means=ai_means, dataset=ds.id)
    log("cells-aux-veg.zarr (both datasets)")
    lat01 = gl.lat()[:, None] * np.ones((1, gl.nx))
    veg = np.where(land01, np.clip(5 + 1.5 * (lat01 + 35), 1, 60), np.nan).astype("f4")
    import netCDF4
    vnc = tmp / "veg.nc"
    with netCDF4.Dataset(vnc, "w") as d:
        d.createDimension("latitude", gl.ny); d.createDimension("longitude", gl.nx)
        d.createVariable("latitude", "f8", ("latitude",))[:] = gl.lat()
        d.createVariable("longitude", "f8", ("longitude",))[:] = gl.lon()
        m = d.createVariable("tot_cov_mean", "f4", ("latitude", "longitude"), fill_value=np.float32(np.nan))
        m[:] = veg
        n = d.createVariable("n_months", "i2", ("latitude", "longitude"), fill_value=np.int16(0))
        n[:] = np.where(np.isfinite(veg), 300, 0).astype("i2")
    vegetation.build_cells_aux(str(out / "cells-aux-veg.zarr"), str(vnc), str(data))
    vegetation.build_cells_aux_regridded(str(out / "datasets" / "era5" / "cells-aux-veg.zarr"), str(vnc), str(data), "era5")

    log("field pyramids")
    dq_l = smooth_fields(ds_l, land01, FIXTURE_FIELDS)
    reg_l = dict(latitude=slice(0, None), longitude=slice(0, None))
    for v in [*FIXTURE_VARS, "dpm"]:
        fields.build_field_pyramid(dq_l, v, str(out / "fields" / f"{v}.zarr"), levels=3, region=reg_l)
    dq_e = smooth_fields(ds_e, land_e, ERA5_FIELDS, full_extent=True)
    for v in ("dpm", "rdpa", "uft", "at"):
        fields.build_field_pyramid(dq_e, v, str(out / "datasets" / "era5" / "fields" / f"{v}.zarr"), levels=4,
                                   region=reg_l, dataset="era5")
    qsdiv.build_pyramid(str(tmp / "qsdiv-era5.zarr"), str(out / "datasets" / "era5" / "fields" / "qsdiv.zarr"),
                        dataset="era5")
    os.symlink("datasets/era5", out / "era5")

    # decode reference (app/scripts/check-decode.mjs)
    import zarr
    cy, cx = 1100, 1950
    root = zarr.open_group(str(out / "cells.zarr"), mode="r")
    h = np.asarray(root["hist"][cy, cx], "u8").ravel()
    fv = root.attrs["field_vars"]
    f = np.asarray(root["fields"][cy, cx])
    p = zarr.open_group(str(out / "fields" / "qacb.zarr"), mode="r")["0"]["qacb"]
    ref = {"cell": [cy, cx], "hist_sum": int(h.sum()), "hist_wsum": int((h * np.arange(h.size, dtype="u8")).sum() % 2147483648),
           "fields_qacb_ut14": float(f[fv.index("qacb"), 14]), "fields_at_ut14": float(f[fv.index("at"), 14]),
           "pyr_qacb_ut14_y100_x50": float(p[14, 100, 50]), "pyr_shape": list(p.shape), "synthetic": True}
    (out / "decode_reference.json").write_text(json.dumps(ref))
    st = {"seconds": round(time.time() - t0, 1), "land_cells_0p1": int(land01.sum()), "dune_cells_0p1": int(dunes01.sum())}
    log(json.dumps(st))
    return st


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--out", default=str(REPO / "staging" / "fixture"))
    a = p.parse_args(argv)
    build(a.out)


if __name__ == "__main__":
    main()
