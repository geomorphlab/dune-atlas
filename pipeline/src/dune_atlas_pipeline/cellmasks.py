"""Per-cell masks and regridded 0.1° products on a coarser wind grid (ERA5, 0.25°).

Overlap weights are exact areas on the sphere: the intersection of a target cell (lat/lon rectangle, centre ± d/2)
with a 0.1° source cell (centre ± 0.05°) is again a lat/lon rectangle, of area
R² Δλ (sin φ_north − sin φ_south). Rows are clipped to ±90° (the 0.1° and 0.25° pole rows are half cells).
The 0.1° edges (odd multiples of 0.05°) and the 0.25° edges (odd multiples of 0.125°) never coincide, so every
overlap is either zero or at least 0.025° wide.

* `land`  = ERA5 land-sea mask lsm > 0.5 (the invariant ERA5 field; `era5_lsm.npy` from
  pipeline/gadi/era5/era5_atlas_prep.py), `lsm` kept per cell;
* `dunes` = the target cell footprint overlaps at least one 0.1° dune cell (layers.nc `dunes`, = dune-mask-rev1);
* `area_weighted_mean` regrids a 0.1° field (e.g. vegetation cover) as the area-weighted mean of the valid 0.1°
  cells over the footprint, with the valid area fraction.

    python -m dune_atlas_pipeline.cellmasks build --lsm era5_lsm.npy --data DIR --out STAGING/era5_cellmasks.nc
"""
from __future__ import annotations

import argparse
import json

import numpy as np

from .grid import ERA5_GRID, ERA5_LAND_GRID, Grid

R_EARTH_KM = 6371.0


def lat_weights(dst: Grid, src: Grid):
    """Sparse (dst.ny, src.ny): sin φ_north − sin φ_south of the overlap of row bands (clipped to ±90°)."""
    import scipy.sparse as sp
    ed, es = np.deg2rad(dst.lat_edges()), np.deg2rad(src.lat_edges())   # north -> south
    rows, cols, vals = [], [], []
    for i in range(dst.ny):
        n, s = ed[i], ed[i + 1]
        ks = np.nonzero((es[:-1] > s) & (es[1:] < n))[0]
        top = np.minimum(es[ks], n)
        bot = np.maximum(es[ks + 1], s)
        w = np.sin(top) - np.sin(bot)
        keep = w > 0
        rows.extend([i] * int(keep.sum())); cols.extend(ks[keep].tolist()); vals.extend(w[keep].tolist())
    return sp.csr_matrix((vals, (rows, cols)), shape=(dst.ny, src.ny))


def lon_weights(dst: Grid, src: Grid):
    """Sparse (dst.nx, src.nx): overlap in radians of longitude, periodic."""
    from .aridity import overlap_weights
    W = overlap_weights(src.x_edge0, src.dlon, src.nx, dst.lon(), dst.dlon / 2, periodic=True)  # source pixels
    return (W * np.deg2rad(src.dlon)).tocsr()


def cell_area_factor(g: Grid) -> np.ndarray:
    """(ny, 1) sin φ_n − sin φ_s times Δλ (radians) per cell: area / R²."""
    e = np.deg2rad(g.lat_edges())
    return ((np.sin(e[:-1]) - np.sin(e[1:])) * np.deg2rad(g.dlon))[:, None]


def _apply(Wy, Wx, a):
    """Wy @ a @ Wx.T for sparse Wy (m, ny), dense a (ny, nx), sparse Wx (n, nx) -> dense (m, n)."""
    t = Wy @ np.asarray(a, "f8")                 # (m, nx)
    return np.asarray((Wx @ t.T).T)              # (m, n)


class Regrid:
    def __init__(self, dst: Grid = ERA5_GRID, src: Grid = ERA5_LAND_GRID):
        self.dst, self.src = dst, src
        self.Wy, self.Wx = lat_weights(dst, src), lon_weights(dst, src)
        self.area = cell_area_factor(dst) * np.ones((1, dst.nx))      # target cell area / R^2

    def overlap_area(self, mask: np.ndarray) -> np.ndarray:
        """Area / R² of each target cell covered by source cells where mask is True."""
        return _apply(self.Wy, self.Wx, np.asarray(mask, bool))

    def any_overlap(self, mask: np.ndarray) -> np.ndarray:
        return self.overlap_area(mask) > 0

    def area_weighted_mean(self, v: np.ndarray):
        """(mean over the valid source area, valid area fraction of the target footprint); float32."""
        fin = np.isfinite(v)
        num = _apply(self.Wy, self.Wx, np.where(fin, v, 0.0))
        den = _apply(self.Wy, self.Wx, fin)
        with np.errstate(invalid="ignore", divide="ignore"):
            mean = np.where(den > 0, num / den, np.nan)
        return mean.astype("f4"), np.clip(den / self.area, 0, 1).astype("f4")

    def source_touches(self, dst_mask: np.ndarray) -> np.ndarray:
        """Source cells overlapping at least one target cell where dst_mask is True."""
        t = self.Wy.T @ np.asarray(dst_mask, "f8")                    # (src.ny, dst.nx)
        return np.asarray((self.Wx.T @ t.T).T) > 0                    # (src.ny, src.nx)


def build(lsm_path: str, data_dir: str, out: str, dst: Grid = ERA5_GRID) -> dict:
    """era5_cellmasks.nc (land, dunes, lsm on the ERA5 grid) + statistics of dune cells without ERA5 land."""
    import xarray as xr
    lsm = np.load(lsm_path).astype("f8")
    assert lsm.shape == dst.shape, lsm.shape
    with xr.open_dataset(f"{data_dir}/layers.nc") as L:
        dunes01 = L["dunes"].values.astype(bool)
    assert dunes01.shape == ERA5_LAND_GRID.shape
    land = lsm > 0.5
    R = Regrid(dst, ERA5_LAND_GRID)
    dune_area = R.overlap_area(dunes01)                    # / R^2
    dunes = dune_area > 0
    km2 = R_EARTH_KM ** 2
    src_area = cell_area_factor(ERA5_LAND_GRID) * np.ones((1, ERA5_LAND_GRID.nx))
    lost_src = dunes01 & ~R.source_touches(land)           # 0.1° dune cells overlapping no ERA5 land cell
    st = {
        "grid": dst.attrs(), "land_cells": int(land.sum()), "lsm_eq_0p5": int((lsm == 0.5).sum()),
        "dune_cells_0p1": int(dunes01.sum()), "dune_area_0p1_km2": float(src_area[dunes01].sum() * km2),
        "dune_cells": int(dunes.sum()), "dune_cells_land": int((dunes & land).sum()),
        "dune_cells_lsm_le_0p5": int((dunes & ~land).sum()),
        "dune_area_in_lsm_le_0p5_cells_km2": float(dune_area[dunes & ~land].sum() * km2),
        "dune_area_in_land_cells_km2": float(dune_area[dunes & land].sum() * km2),
        "dune_cells_0p1_without_era5_land": int(lost_src.sum()),
        "dune_area_0p1_without_era5_land_km2": float(src_area[lost_src].sum() * km2),
        "weights": "exact spherical overlap areas of lat/lon rectangles (R² Δλ Δsin φ), rows clipped to ±90°",
    }
    lat, lon = dst.lat(), dst.lon()
    ds = xr.Dataset(
        {"land": (("latitude", "longitude"), land.astype("u1"), {
            "long_name": "atlas land cell", "flag_values": [0, 1], "definition": "ERA5 land-sea mask lsm > 0.5"}),
         "dunes": (("latitude", "longitude"), dunes.astype("u1"), {
             "long_name": "cell footprint overlaps a 0.1° dune cell", "flag_values": [0, 1],
             "definition": "at least one 0.1° cell of the dune map (dune-mask-rev1) overlaps the cell footprint"}),
         "lsm": (("latitude", "longitude"), lsm.astype("f4"), {
             "long_name": "ERA5 land-sea mask", "units": "1", "standard_name": "land_binary_mask"}),
         "dune_area": (("latitude", "longitude"), (dune_area * km2).astype("f4"), {
             "long_name": "area of 0.1° dune cells inside the cell footprint", "units": "km2"})},
        coords={"latitude": ("latitude", lat, {"units": "degrees_north"}),
                "longitude": ("longitude", lon, {"units": "degrees_east"})},
        attrs={"title": "dune-atlas ERA5 0.25° cell masks", "grid": json.dumps(dst.attrs()),
               "statistics": json.dumps(st)})
    enc = {v: {"zlib": True, "complevel": 4} for v in ds.data_vars}
    ds.to_netcdf(out, encoding=enc)
    return st


def main(argv=None):
    from .cli import DEFAULT_DATA
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.cellmasks")
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build")
    b.add_argument("--lsm", required=True); b.add_argument("--data", default=DEFAULT_DATA); b.add_argument("--out", required=True)
    a = p.parse_args(argv)
    st = build(a.lsm, a.data, a.out)
    print(json.dumps(st, indent=1))
    return st


if __name__ == "__main__":
    main()
