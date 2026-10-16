"""Per-cell inputs on the active dataset's grid (datasets.py) that FV3 got from dunes.py and terrain.py on its 2°
grid: the dune-cover fraction (for cells.zarr `dunes`/`dune`) and the cell mean elevation (cells-aux `elev_mean`).

  dunefrac   area fraction of each cell covered by the merged dune polygons (MGD3 + Fenton 2020; the GeoJSON that
             dunes.py writes, `mars-dunes.geojson`), dunes.overlap_fraction on the dataset grid: spherical areas
             (cylindrical equal-area plane), cells that cross the antimeridian split into their two parts.
  elev-mean  spherical-area-weighted mean of a global lon/lat elevation grid over each cell, with exact fractional
             overlaps of the fine rows and columns (periodic in longitude). The fine grid is a level of the
             published elevation pyramid (fields/elevation.zarr, levels 2x2 means of the 1/64° area-mean grid of
             terrain.elevation_grid; level 2 = 1/16°), rows north to south from 90°, columns from -180°.

    DUNE_ATLAS_MARS_DATASET=<id> python -m dune_atlas_pipeline.mars.native_grid dunefrac \\
        --geojson mars-dunes.geojson --out dunefrac_<id>.npz
    DUNE_ATLAS_MARS_DATASET=<id> python -m dune_atlas_pipeline.mars.native_grid elev-mean \\
        --elevation elev_level2.npy --out elev_mean_<id>.npz

Both npz carry lat, lon (cell centres, contract orientation) and grid (JSON), as the FV3 files; cells.load_dunefrac
and sidecars.load_elev_mean read them for the active dataset.
"""
from __future__ import annotations

import argparse
import json

import numpy as np

from . import datasets as D


def _row_weights(fine_edges_deg: np.ndarray, lo: np.ndarray, hi: np.ndarray) -> np.ndarray:
    """(n_cells, n_fine) spherical-area overlap of fine rows [e_k+1, e_k] (north to south) with cell rows [lo, hi]:
    sin(min(top)) - sin(max(bottom)) where positive."""
    top, bot = fine_edges_deg[:-1][None, :], fine_edges_deg[1:][None, :]
    t = np.minimum(top, hi[:, None]); b = np.maximum(bot, lo[:, None])
    return np.where(t > b, np.sin(np.radians(t)) - np.sin(np.radians(b)), 0.0)


def _col_weights(fine_edges_deg: np.ndarray, w: np.ndarray, e: np.ndarray) -> np.ndarray:
    """(n_cells, n_fine) longitude overlap (deg) of fine columns with cell columns [w, e], periodic (360°)."""
    a, b = fine_edges_deg[:-1][None, :], fine_edges_deg[1:][None, :]
    out = np.zeros((len(w), len(a[0])))
    for shift in (-360.0, 0.0, 360.0):
        ww, ee = (w + shift)[:, None], (e + shift)[:, None]
        out += np.clip(np.minimum(b, ee) - np.maximum(a, ww), 0, None)
    return out


def cell_means(fine: np.ndarray, grid: dict) -> np.ndarray:
    """Spherical-area-weighted mean of a global (ny_f, nx_f) grid (rows 90 -> -90, cols -180 -> 180) over the
    cells of `grid`; NaN fine pixels excluded."""
    nyf, nxf = fine.shape
    lat_e = 90.0 - np.arange(nyf + 1) * (180.0 / nyf)
    lon_e = -180.0 + np.arange(nxf + 1) * (360.0 / nxf)
    lat, lon = D.grid_axes(grid)
    hl, hn = abs(grid["dlat"]) / 2, grid["dlon"] / 2
    Wy = _row_weights(lat_e, lat - hl, lat + hl)
    Wx = _col_weights(lon_e, lon - hn, lon + hn)
    fin = np.isfinite(fine)
    s = Wy @ np.where(fin, fine, 0.0).astype("f8") @ Wx.T
    n = Wy @ fin.astype("f8") @ Wx.T
    with np.errstate(invalid="ignore", divide="ignore"):
        return np.where(n > 0, s / n, np.nan)


def dunefrac_from_geoms(geoms, grid: dict) -> np.ndarray:
    from .dunes import overlap_fraction
    return overlap_fraction(geoms, grid)


def dunefrac(geojson: str, grid: dict) -> np.ndarray:
    """Dune fraction from the merged GeoJSON (as dunes.py: shapely.make_valid of every feature)."""
    import shapely
    from shapely.geometry import shape
    feats = json.load(open(geojson))["features"]
    return dunefrac_from_geoms([shapely.make_valid(shape(f["geometry"])) for f in feats], grid)


def save(path: str, ds: D.MarsDataset, **arrays) -> str:
    lat, lon = ds.axes()
    np.savez_compressed(path, lat=lat, lon=lon, grid=json.dumps(ds.grid), dataset=ds.id, **arrays)
    return path


def main(argv=None):
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.mars.native_grid")
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("dunefrac"); a.add_argument("--geojson", required=True); a.add_argument("--out", required=True)
    b = sub.add_parser("elev-mean"); b.add_argument("--elevation", required=True, help=".npy global grid, rows 90 -> -90")
    b.add_argument("--out", required=True)
    b.add_argument("--source", default="", help="source text (default: terrain.DEM_ATTRIBUTION source)")
    args = p.parse_args(argv)
    ds = D.active()
    if args.cmd == "dunefrac":
        f = dunefrac(args.geojson, ds.grid)
        save(args.out, ds, frac=f.astype("f4"), dune=(f > 0).astype("u1"))
        print(json.dumps({"dataset": ds.id, "cells_with_dunes": int((f > 0).sum()), "max_frac": float(f.max()),
                          "out": args.out}))
    else:
        from .terrain import DEM_ATTRIBUTION
        fine = np.load(args.elevation)
        em = cell_means(fine, ds.grid).astype("f4")
        save(args.out, ds, elev_mean=em, source=args.source or DEM_ATTRIBUTION["source"],
             fine_shape=np.asarray(fine.shape))
        print(json.dumps({"dataset": ds.id, "min": float(np.nanmin(em)), "max": float(np.nanmax(em)),
                          "nan": int(np.isnan(em).sum()), "out": args.out}))


if __name__ == "__main__":
    main()
