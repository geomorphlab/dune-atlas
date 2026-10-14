"""Saturated flux divergence (Gunn (2026), Methods M6) from RDP/RDD, all 64 thresholds.

    div q = 1/(R cos phi) [ d(q cos theta)/d lambda + d(q sin theta cos phi)/d phi ]

q = rdpm (m^2/s, magnitude of the time-averaged flux vector), theta = rdpa (radians CCW from east, toward),
phi/lambda latitude/longitude in radians, R = 6371 km; result x S2Y -> m/yr. Negative = flux convergence
(deposition), positive = divergence (erosion / sediment export).

Finite differences: numpy.gradient (= xarray `.differentiate`), i.e. 2nd-order central differences in the
interior and 1st-order one-sided at the latitude ends; longitude periodic (wrap at the antimeridian). Grid
coordinates are the exact float64 values lat0 + dlat i, lon0 + dlon j of the wind dataset (ERA5-Land
90 - 0.1 i, -180 + 0.1 j; ERA5 90 - 0.25 i, -180 + 0.25 j). Undefined values propagate: a cell has no value
if it or any of its four neighbours has none (coasts). The two pole rows (+-90 deg, cos phi = 0) have no value.
For a dataset with values over the ocean (ERA5) rdpm/rdpa are first limited to the dataset's land cells, so
coasts are treated as for ERA5-Land.
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

import numpy as np

from . import constants as C
from .grid import ERA5_LAND_GRID, get_dataset

R_EARTH = 6371e3
VAR = "qsdiv"
NY, NX = 1801, 3600


def exact_coords(ny=NY, nx=NX, lat0=90.0, dlat=-0.1, lon0=-180.0, dlon=0.1):
    return lat0 + dlat * np.arange(ny), lon0 + dlon * np.arange(nx)


def _ddlon_periodic(a: np.ndarray, lam: np.ndarray) -> np.ndarray:
    """d a / d lambda along the last axis, periodic (same stencil as the notebook's differentiate_periodic)."""
    ext = np.concatenate([a[..., -1:], a, a[..., :1]], axis=-1)
    lam_ext = np.concatenate([[lam[0] - (lam[1] - lam[0])], lam, [lam[-1] + (lam[-1] - lam[-2])]])
    return np.gradient(ext, lam_ext, axis=-1)[..., 1:-1]


def divergence(q: np.ndarray, theta: np.ndarray, lat_deg, lon_deg, R: float = R_EARTH,
               pole_nan: bool = True) -> np.ndarray:
    """Spherical divergence of the vector (q cos theta, q sin theta) on a lat/lon grid (rows = lat, any order;
    columns = lon, periodic). Units: [q]/m. `lat_deg`/`lon_deg` are used as given (their dtype matters).
    pole_nan: NaN where |lat| = 90 (cos phi = 0)."""
    lat_deg = np.asarray(lat_deg); lon_deg = np.asarray(lon_deg)
    phi = lat_deg * np.pi / 180
    lam = lon_deg * np.pi / 180
    qx = q * np.cos(theta)
    qy = q * np.sin(theta)
    c = np.cos(phi)[:, None]
    d = (np.gradient(qy * c, phi, axis=-2) + _ddlon_periodic(qx, lam)) / R / c
    if pole_nan:
        d[..., np.abs(np.asarray(lat_deg, "f8")) >= 90.0 - 1e-9, :] = np.nan
    return d


def compute(data_dir, log=print, dataset=None) -> np.ndarray:
    """(64, ny, nx) float32 m/yr from qsat_view.open_qsat rdpm/rdpa, exact coordinates, pole rows NaN."""
    from .qsat_view import open_qsat
    from .grid import grid_of
    ds = get_dataset(dataset)
    dq = open_qsat(data_dir, dataset=ds)
    assert grid_of(dq) == ds.grid
    t0 = time.time()
    q = dq["rdpm"].values          # float64 (64, ny, nx), m^2/s
    a = dq["rdpa"].values
    log(f"read rdpm/rdpa {time.time() - t0:.0f}s")
    if not ds.land_only_source:
        from .cellstore import load_masks
        land = load_masks(data_dir, ds)[0]
        q[:, ~land] = np.nan
        a[:, ~land] = np.nan
    g = ds.grid
    lat, lon = exact_coords(g.ny, g.nx, g.lat0, g.dlat, g.lon0, g.dlon)
    out = np.empty(q.shape, "f4")
    for k in range(q.shape[0]):
        out[k] = (divergence(q[k], a[k], lat, lon) * C.S2Y).astype("f4")
    return out


def var_attrs(grid=ERA5_LAND_GRID) -> dict:
    return {
        "long_name": "Saturated flux divergence (∇·qs)",
        "long_name_latex": r"\nabla\cdot\vec{q_s}",
        "description": ("Divergence of the time-averaged flat-bed saturated sand-flux vector (magnitude RDP, "
                        "direction RDD) on the sphere, div q = 1/(R cos φ)[∂(q cos θ)/∂λ + ∂(q sin θ cos φ)/∂φ], "
                        f"R = 6371 km, central differences on the {grid.label} grid (periodic in longitude). Negative values "
                        "(flux convergence) imply deposition, positive values erosion. Undefined at coasts "
                        "(a neighbouring cell has no wind data) and on the ±90° rows."),
        "description_tex": (r"$\nabla\cdot\vec{q_s} = \frac{1}{R\cos\phi}\left[\frac{\partial (q\cos\theta)}{\partial\lambda}"
                            r" + \frac{\partial (q\sin\theta\cos\phi)}{\partial\phi}\right]$ with $q = RDP$, "
                            r"$\theta = RDD$; negative values imply deposition."),
        "units": "m/yr", "source_units_tex": "m/yr",
        "derived_from": "rdpm, rdpa", "earth_radius_m": R_EARTH,
        "method": "Gunn (2026) Methods M6; numpy.gradient central differences, periodic in longitude, float64 coordinates",
    }


def as_dataset(arr: np.ndarray, grid=ERA5_LAND_GRID):
    """(64, ny, nx) m/yr -> xarray Dataset in the shape fields.build_field_pyramid expects."""
    import xarray as xr
    g = grid
    assert arr.shape[1:] == g.shape, (arr.shape, g)
    lat, lon = exact_coords(g.ny, g.nx, g.lat0, g.dlat, g.lon0, g.dlon)
    va = var_attrs(g)
    # fields.display_array: long_name -> long_name_tex, description -> plain text via tex_to_plain
    attrs = {"long_name": "Saturated flux divergence $" + va["long_name_latex"] + "$",
             "description": va["description"], "units": va["units"]}
    da = xr.DataArray(arr, dims=("ut", "latitude", "longitude"),
                      coords={"ut": C.UT_VALUES, "latitude": lat, "longitude": lon}, attrs=attrs)
    return da.to_dataset(name=VAR)


def build_pyramid(native: str, out: str, keepbits: int = 12, dataset=None) -> dict:
    """fields/qsdiv.zarr via fields.build_field_pyramid (count-weighted coastal-safe means, 12-bit rounding),
    then the extra attrs (LaTeX symbol, provenance, display scale) on every level's array."""
    import zarr
    from .fields import build_field_pyramid
    ds = get_dataset(dataset)
    arr = read_native(native)
    st = build_field_pyramid(as_dataset(arr, ds.grid), VAR, out, keepbits=keepbits, dataset=ds)
    va = var_attrs(ds.grid)
    extra = {k: va[k] for k in ("long_name_latex", "description_tex", "derived_from", "earth_radius_m", "method")}
    extra.update({"display_units": "m/kyr", "display_scale": 1000.0, "colormap": "piyg",
                  "sign_convention": "negative = flux convergence = deposition"})
    g = zarr.open_group(out, mode="a")
    for name in g.group_keys():
        if VAR in g[name]:
            g[name][VAR].attrs.update(extra)
    g.attrs.update({"dune_atlas:derived": "qsdiv from rdpm/rdpa (pipeline qsdiv.py)"})
    if ds.info:
        g.attrs.update({"dune_atlas:qsdiv_land": f"rdpm/rdpa limited to the {ds.name} land cells "
                                                 f"({ds.info['land_cells']}) before differencing"})
    if keepbits is not None and keepbits < 23:
        from .fields import bitround
        fin = np.isfinite(arr) & (arr != 0)
        r = bitround(arr, keepbits)
        st["keepbits_max_rel_err"] = float((np.abs(r[fin].astype("f8") - arr[fin]) / np.abs(arr[fin])).max())
    return st


def write_native(arr: np.ndarray, out: str, grid=ERA5_LAND_GRID):
    """Staging copy (full precision float32, zarr v3, one chunk per ut) used by the pyramid and cells-aux."""
    import zarr
    from zarr.codecs import BloscCodec
    assert arr.shape[1:] == grid.shape
    g = zarr.open_group(out, mode="w", zarr_format=3)
    g.attrs.update({"title": "dune-atlas staging: saturated flux divergence, m/yr", **var_attrs(grid)})
    a = g.create_array(VAR, shape=arr.shape, dtype="float32", chunks=(1, grid.ny, grid.nx), fill_value=np.nan,
                       compressors=[BloscCodec(cname="zstd", clevel=5, shuffle="shuffle", typesize=4)],
                       dimension_names=["ut", "latitude", "longitude"], attributes=var_attrs(grid))
    a[...] = arr
    g.create_array("ut", data=C.UT_VALUES, dimension_names=["ut"], attributes={"units": "m/s"})


def read_native(path: str) -> np.ndarray:
    import zarr
    return zarr.open_group(path, mode="r")[VAR][...]


def dune_stats(data_dir, arr_ut: np.ndarray, ut_index=C.UT_DEFAULT_INDEX, dataset=None) -> dict:
    """Median, quantiles and fraction negative over dune cells (dataset mask file `dunes`) at one threshold."""
    from .cellstore import load_masks
    dunes = load_masks(data_dir, dataset)[1]
    v = arr_ut[dunes]
    f = v[np.isfinite(v)]
    q = np.percentile(f, [1, 2, 5, 25, 50, 75, 95, 98, 99])
    return {"dune_cells": int(dunes.sum()), "finite": int(f.size), "median_m_per_kyr": float(np.median(f) * 1e3),
            "frac_negative": float((f < 0).mean()),
            "pct_m_per_kyr": dict(zip(["p1", "p2", "p5", "p25", "p50", "p75", "p95", "p98", "p99"], (q * 1e3).round(5).tolist())),
            "p98_abs_m_per_kyr": float(np.percentile(np.abs(f), 98) * 1e3)}


def registry_layer(clim_m_per_kyr=(-0.1, 0.1), colormap="piyg", group="drift", dataset=None) -> dict:
    from .fields import DATASET_SOURCE_PREFIX, fields_attribution, fields_citation
    ds = get_dataset(dataset)
    return {
        "id": VAR, "title": "Saturated flux divergence (∇·qs)", "titleTex": r"Saturated flux divergence $\nabla\cdot\vec{q}_s$",
        "group": group, "type": "zarr-field", "source": f"{DATASET_SOURCE_PREFIX[ds.id]}/qsdiv.zarr", "variable": VAR,
        "thresholdAware": True, "units": "m/kyr",
        "description": (r"Divergence of the time-averaged saturated sand-flux vector (magnitude RDP, direction RDD) on "
                        r"the sphere, following Gunn (2026), Methods M6: $\nabla\cdot\vec{q}_s = \frac{1}{R\cos\phi}"
                        r"\left[\frac{\partial (q\cos\theta)}{\partial\lambda} + \frac{\partial (q\sin\theta\cos\phi)}"
                        r"{\partial\phi}\right]$ with $q = RDP$, $\theta = RDD$. By conservation of sand mass, negative "
                        r"values (flux convergence) imply deposition and positive values (flux divergence) erosion. The "
                        r"values assume a saturated flux and an unlimited supply of loose sand, so on rock, crusted or "
                        r"vegetated surfaces actual erosion is limited by the sand available. No data at coasts (a "
                        r"neighbouring cell has no wind data) and on the ±90° rows."),
        "citation": fields_citation(ds), "attribution": fields_attribution(ds),
        "visible": False, "opacity": 0.85, "queryable": False,
        "display": {"transform": "scale", "scale": 1000.0, "colormap": colormap, "clim": list(clim_m_per_kyr)},
    }


def main(argv=None):
    import argparse
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.qsdiv")
    sub = p.add_subparsers(dest="cmd", required=True)
    dd = os.environ.get("DUNE_WORLD_DATA", os.path.expanduser("~/Documents/research/projects/dune-world/data"))
    c = sub.add_parser("compute", help="qsdiv, all 64 ut -> staging zarr (float32 m/yr)")
    c.add_argument("--data", default=dd)
    c.add_argument("--out", required=True)
    c.add_argument("--dataset", default="era5-land", choices=["era5-land", "era5"])
    b = sub.add_parser("pyramid", help="fields/qsdiv.zarr from the staging zarr (fields.build_field_pyramid)")
    b.add_argument("--native", required=True)
    b.add_argument("--out", required=True)
    b.add_argument("--keepbits", type=int, default=12)
    b.add_argument("--dataset", default="era5-land", choices=["era5-land", "era5"])
    a = p.parse_args(argv)
    if a.cmd == "compute":
        ds = get_dataset(a.dataset)
        arr = compute(a.data, dataset=ds)
        write_native(arr, a.out, ds.grid)
        print(json.dumps({"shape": list(arr.shape), "finite_ut14": int(np.isfinite(arr[C.UT_DEFAULT_INDEX]).sum()),
                          "dune_stats_ut14": dune_stats(a.data, arr[C.UT_DEFAULT_INDEX], dataset=ds)}))
    else:
        print(json.dumps(build_pyramid(a.native, a.out, keepbits=a.keepbits, dataset=a.dataset)))


if __name__ == "__main__":
    main()
