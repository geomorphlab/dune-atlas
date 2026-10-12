"""Dune presence map -> polygons (cell-exact edges) -> PMTiles.

Canonical mask: layers.nc `dunes` (= GitHub dune-mask-rev1.tif, 106,540 cells). The local
dune-mask-new*.tif files miss 9 cells and must not be used.

Grid: 1801 x 3600 ERA5-Land cells, centres lat 90 - 0.1 i, lon -180 + 0.1 j (pixel registered,
edges at +-0.05 deg). Column 0 therefore straddles the antimeridian (-180.05..-179.95).

Polygons
--------
* Fields = 8-connected components of dune cells; connectivity wraps across the antimeridian
  (column 3599 touches column 0).
* Geometry is built from 4-connected cell blocks (always valid rings, exact cell edges) and
  grouped per field into a (Multi)Polygon; diagonal-only contacts become separate parts that
  touch at a vertex (valid OGC MultiPolygon).
* Antimeridian: column 0 is duplicated east of column 3599 and everything is clipped to
  [-180, 180] x [-90, 90], so a field touching +-180 is split RFC 7946-style into parts on
  both sides and no coordinate leaves [-180, 180].
* Attributes: id (1 = largest field by area), cells, area_km2 (sum of layers.nc `area`, the
  spherical cell area in m^2 used by the paper; R ~= 6,371,007 m), lon/lat (area-weighted
  centroid of cell centres computed on the unit sphere, so it is correct across +-180), and
  west/south/east/north cell-edge bbox (west > east if the field crosses +-180).
"""
from __future__ import annotations

import json
import math
import os
import shutil
import subprocess

import numpy as np
from affine import Affine

NY, NX = 1801, 3600
RES = 0.1
TRANSFORM = Affine(RES, 0.0, -180.05, 0.0, -RES, 90.05)  # pixel-registered 0.1 deg grid
DUNE_RGBA = (214, 150, 52)          # sand/ochre, shared by vector style and raster fallback
VECTOR_MAXZOOM = 10
RASTER_MAXZOOM = 7


# ----------------------------------------------------------------------------- mask I/O
def load_layers(layers_nc: str):
    """Return (dunes bool[NY,NX], land bool[NY,NX], area_m2 float64[NY,NX]) from layers.nc."""
    import xarray as xr
    with xr.open_dataset(layers_nc) as ds:
        dunes = ds["dunes"].values.astype(bool)
        land = ds["land"].values.astype(bool)
        area = ds["area"].values.astype(np.float64)
        y, x = ds["y"].values, ds["x"].values
    assert dunes.shape == (NY, NX), dunes.shape
    assert np.allclose(y, 90 - RES * np.arange(NY)) and np.allclose(x, -180 + RES * np.arange(NX))
    return dunes, land, area


def spherical_cell_area(R: float = 6371007.181) -> np.ndarray:
    """Spherical cell areas (m^2) on the grid with latitude edges clipped to +-90.
    Used when no `area` array is supplied (tests); layers.nc `area` agrees to <1e-5."""
    lat = 90 - RES * np.arange(NY)
    top = np.radians(np.minimum(lat + RES / 2, 90))
    bot = np.radians(np.maximum(lat - RES / 2, -90))
    a = R * R * math.radians(RES) * (np.sin(top) - np.sin(bot))
    return np.broadcast_to(a[:, None], (NY, NX)).copy()


# ----------------------------------------------------------------------------- labelling
def label_fields(mask: np.ndarray, wrap: bool = True) -> tuple[np.ndarray, int]:
    """8-connected component labels (int32, 0 = background); if `wrap`, components touching
    across the antimeridian (last/first column, incl. diagonals) share one label.
    Labels are consecutive 1..n in order of first appearance (row-major)."""
    from scipy import ndimage
    lab, n = ndimage.label(mask, structure=np.ones((3, 3), bool))
    if wrap and n and mask.shape[1] == NX:
        parent = np.arange(n + 1)

        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        e, w = lab[:, -1], lab[:, 0]
        for di in (-1, 0, 1):
            ww = np.roll(w, di)
            if di == -1:
                ww[-1] = 0
            elif di == 1:
                ww[0] = 0
            for a, b in zip(e[(e > 0) & (ww > 0)], ww[(e > 0) & (ww > 0)]):
                ra, rb = find(a), find(b)
                if ra != rb:
                    parent[max(ra, rb)] = min(ra, rb)
        roots = np.array([find(i) for i in range(n + 1)])
        _, new = np.unique(roots, return_inverse=True)  # 0 stays 0 (root 0 is smallest)
        lab = new[lab].astype(np.int32)
        n = int(new.max())
    return lab.astype(np.int32), int(n)


# ----------------------------------------------------------------------------- polygons
def _unit_vectors():
    lat = np.radians(90 - RES * np.arange(NY))[:, None]
    lon = np.radians(-180 + RES * np.arange(NX))[None, :]
    return np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat) * np.ones_like(lon)


def field_attributes(lab: np.ndarray, n: int, area_m2: np.ndarray) -> list[dict]:
    """Per-label attributes (index k-1 for label k); id assigned later."""
    lv = lab.ravel()
    cells = np.bincount(lv, minlength=n + 1)
    w = area_m2.ravel()
    A = np.bincount(lv, weights=w, minlength=n + 1)
    ux, uy, uz = (u.ravel() for u in _unit_vectors())
    sx = np.bincount(lv, weights=w * ux, minlength=n + 1)
    sy = np.bincount(lv, weights=w * uy, minlength=n + 1)
    sz = np.bincount(lv, weights=w * uz, minlength=n + 1)
    from scipy import ndimage
    objs = ndimage.find_objects(lab, max_label=n)
    out = []
    for k in range(1, n + 1):
        ys, xs = objs[k - 1]
        # bbox from cell edges. A field occupying column 0 (which straddles -180) or both
        # ends of the grid wraps: west/east are taken around the largest empty column gap.
        c0, c1 = xs.start, xs.stop - 1
        if c0 == 0:
            cols = np.flatnonzero((lab[ys] == k).any(0))
            ext = np.concatenate([cols, [cols[0] + NX]])
            g = int(np.argmax(np.diff(ext)))           # largest circular gap
            c0, c1 = int(ext[g + 1] % NX), int(cols[g])
        west = -180.05 + RES * c0
        east = -180.05 + RES * (c1 + 1)
        if west < -180:
            west += 360                                  # column 0's west edge = 179.95
        north = min(90.05 - RES * ys.start, 90.0)
        south = max(90.05 - RES * ys.stop, -90.0)
        lon = math.degrees(math.atan2(sy[k], sx[k]))
        lat = math.degrees(math.atan2(sz[k], math.hypot(sx[k], sy[k])))
        out.append(dict(cells=int(cells[k]), area_km2=round(float(A[k]) / 1e6, 1),
                        lon=round(lon, 3), lat=round(lat, 3),
                        west=round(west, 2), south=round(south, 2),
                        east=round(east, 2), north=round(north, 2)))
    return out


def field_geometries(lab: np.ndarray, n: int, wrap: bool = True,
                     transform: Affine = TRANSFORM) -> list:
    """Shapely geometry per label (index k-1), cell-exact edges, clipped to +-180/+-90."""
    import rasterio.features
    import shapely
    from shapely.geometry import shape, box, MultiPolygon, Polygon
    arr = lab
    if wrap and lab.shape[1] == NX:
        arr = np.concatenate([lab, lab[:, :1]], axis=1)   # duplicate col 0 at lon 180
    parts: list[list] = [[] for _ in range(n)]
    for geom, val in rasterio.features.shapes(arr, mask=arr > 0, transform=transform, connectivity=4):
        parts[int(val) - 1].append(shape(geom))
    world = box(-180, -90, 180, 90)
    geoms = []
    for ps in parts:
        polys = []
        for p in ps:
            if not world.contains(p):
                p = p.intersection(world)
            polys.extend(getattr(p, "geoms", [p]))
        polys = [p for p in polys if isinstance(p, Polygon) and p.area > 0]
        g = polys[0] if len(polys) == 1 else MultiPolygon(polys)
        if not g.is_valid:
            g = shapely.make_valid(g)
        geoms.append(g)
    return geoms


def polygons_from_mask(mask: np.ndarray, area_m2: np.ndarray | None = None, wrap: bool = True,
                       transform: Affine = TRANSFORM) -> list[dict]:
    """GeoJSON features (sorted by area, id 1 = largest) for a full-grid boolean mask."""
    from shapely.geometry import mapping
    if area_m2 is None:
        area_m2 = spherical_cell_area() if mask.shape == (NY, NX) else np.full(mask.shape, 1.0)
    lab, n = label_fields(mask, wrap=wrap)
    attrs = field_attributes(lab, n, area_m2) if mask.shape == (NY, NX) else \
        [dict(cells=int(c)) for c in np.bincount(lab.ravel(), minlength=n + 1)[1:]]
    geoms = field_geometries(lab, n, wrap=wrap, transform=transform)
    order = sorted(range(n), key=lambda k: (-attrs[k].get("area_km2", attrs[k]["cells"]),
                                            -attrs[k]["cells"], k))
    feats = []
    for rank, k in enumerate(order, start=1):
        props = {"id": rank, **attrs[k]}
        feats.append({"type": "Feature", "id": rank, "geometry": mapping(geoms[k]), "properties": props})
    return feats


def _round_coords(obj, nd=2):
    """Cell edges are multiples of 0.05 deg: round to 2 dp to remove float noise."""
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(v, nd) for v in obj]
        return [_round_coords(o, nd) for o in obj]
    return obj


def dune_polygons(layers_nc: str, window: tuple[slice, slice] | None = None):
    """Yield GeoJSON features of dune fields. With `window` (fixture), polygonise only that
    sub-grid (no antimeridian wrap; attributes from the window only)."""
    from shapely.geometry import mapping
    dunes, _, area = load_layers(layers_nc)
    if window is None:
        feats = polygons_from_mask(dunes, area)
    else:
        ys, xs = window
        m, a = dunes[ys, xs], area[ys, xs]
        tr = Affine(RES, 0.0, -180.05 + RES * (xs.start or 0), 0.0, -RES, 90.05 - RES * (ys.start or 0))
        lab, n = label_fields(m, wrap=False)
        geoms = field_geometries(lab, n, wrap=False, transform=tr)
        cells = np.bincount(lab.ravel(), minlength=n + 1)
        A = np.bincount(lab.ravel(), weights=a.ravel(), minlength=n + 1)
        feats = []
        order = sorted(range(1, n + 1), key=lambda k: -A[k])
        for rank, k in enumerate(order, 1):
            c = geoms[k - 1].centroid
            feats.append({"type": "Feature", "id": rank, "geometry": mapping(geoms[k - 1]),
                          "properties": {"id": rank, "cells": int(cells[k]),
                                         "area_km2": round(float(A[k]) / 1e6, 1),
                                         "lon": round(c.x, 3), "lat": round(c.y, 3)}})
    for f in feats:
        f["geometry"]["coordinates"] = _round_coords(f["geometry"]["coordinates"])
        yield f


# ----------------------------------------------------------------------------- summary
def summary(dunes: np.ndarray, land: np.ndarray, area: np.ndarray, feats: list[dict]) -> dict:
    lat = (90 - RES * np.arange(NY))[:, None]
    ex_ant = land & (lat > -60)
    return {
        "dune_cells": int(dunes.sum()),
        "polygon_cells_sum": int(sum(f["properties"]["cells"] for f in feats)),
        "n_fields": len(feats),
        "n_single_cell_fields": int(sum(f["properties"]["cells"] == 1 for f in feats)),
        "largest_field_cells": int(max(f["properties"]["cells"] for f in feats)),
        "n_fields_crossing_antimeridian": int(sum(f["properties"]["west"] > f["properties"]["east"] for f in feats)),
        "land_cells": int(land.sum()),
        "dune_cells_not_land": int((dunes & ~land).sum()),
        "dune_area_km2": float(area[dunes].sum() / 1e6),
        "polygon_area_km2_sum": float(sum(f["properties"]["area_km2"] for f in feats)),
        "land_area_km2": float(area[land].sum() / 1e6),
        "earth_area_km2": float(area.sum() / 1e6),
        "frac_land_cells": float(dunes.sum() / land.sum()),
        "frac_land_area": float(area[dunes].sum() / area[land].sum()),
        "frac_land_area_dunes_on_land": float(area[dunes & land].sum() / area[land].sum()),
        "frac_land_cells_ex_antarctica": float((dunes & (lat > -60)).sum() / ex_ant.sum()),
        "frac_land_area_ex_antarctica": float(area[dunes & (lat > -60)].sum() / area[ex_ant].sum()),
        "frac_earth_area": float(area[dunes].sum() / area.sum()),
    }


def geodesic_area_km2(geom_mapping) -> float:
    """WGS84 ellipsoidal area of a GeoJSON geometry (km^2) - cross-check only."""
    from pyproj import Geod
    from shapely.geometry import shape
    return abs(Geod(ellps="WGS84").geometry_area_perimeter(shape(geom_mapping))[0]) / 1e6


# ----------------------------------------------------------------------------- vector tiles
TIPPECANOE_ARGS = [
    "--layer=dunes", "--minimum-zoom=0", f"--maximum-zoom={VECTOR_MAXZOOM}",
    "--simplify-only-low-zooms",            # z10: no simplification -> exact cell staircase
    "--no-tiny-polygon-reduction",          # keep single-cell fields as real (tiny) polygons at z0
    "--no-feature-limit", "--no-tile-size-limit",  # never drop fields; tiles are small anyway
    "--use-attribute-for-id=id",
    "--attribution=Dune map: Gunn (2026), Supplementary Code (v1.0.0), Zenodo, doi:10.5281/zenodo.20054674",
    "--name=dune-atlas dunes", "--description=Global aeolian dune fields (0.1 deg ERA5-Land grid), 8-connected",
    "--force", "--quiet",
]


def build_vector_pmtiles(geojson: str, out: str, extra_args: list[str] | None = None) -> str:
    """Run tippecanoe. It records its argv in the public `generator_options` metadata, so it
    is invoked by bare name with paths relative to the output directory (no local paths)."""
    if shutil.which("tippecanoe") is None:
        raise RuntimeError("tippecanoe not found (conda-forge tippecanoe>=2.17)")
    out = os.path.abspath(out)
    cwd = os.path.dirname(out)
    src = os.path.relpath(os.path.abspath(geojson), cwd)
    cmd = ["tippecanoe", "-o", os.path.basename(out), *TIPPECANOE_ARGS, *(extra_args or []), src]
    subprocess.run(cmd, check=True, cwd=cwd)
    return out


def tile_sizes(pmtiles_path: str) -> dict:
    """{zoom: {n, bytes_total, bytes_max, bytes_mean}} of stored (compressed) tiles."""
    from pmtiles.reader import Reader, MmapSource, all_tiles
    out: dict = {}
    with open(pmtiles_path, "rb") as f:
        for (z, x, y), data in all_tiles(MmapSource(f)):
            d = out.setdefault(z, {"n": 0, "bytes_total": 0, "bytes_max": 0})
            d["n"] += 1
            d["bytes_total"] += len(data)
            d["bytes_max"] = max(d["bytes_max"], len(data))
    for d in out.values():
        d["bytes_mean"] = round(d["bytes_total"] / d["n"])
    return dict(sorted(out.items()))


def vector_zoom_stats(pmtiles_path: str, feats: list[dict], maxzoom: int = VECTOR_MAXZOOM) -> dict:
    """Decode every tile (tippecanoe-decode) and report, per zoom, how many dune fields
    (feature ids) are present, incl. single-cell fields; at maxzoom also check vertices lie on
    the 0.05-deg cell-edge lattice (or on tile-buffer clip lines)."""
    ncell = {f["id"]: f["properties"]["cells"] for f in feats}
    singles = {k for k, c in ncell.items() if c == 1}
    res = {}
    for z in range(maxzoom + 1):
        p = subprocess.run(["tippecanoe-decode", "-c", f"-Z{z}", f"-z{z}", pmtiles_path],
                           check=True, capture_output=True, text=True)
        ids, nfeat = set(), 0
        on_grid = on_clip = off = 0
        max_dev_m = 0.0
        W = 256 * 2 ** z
        for line in p.stdout.splitlines():
            line = line.strip().rstrip(",")
            if not line.startswith('{ "type": "Feature"'):
                continue
            ft = json.loads(line)
            nfeat += 1
            ids.add(ft["id"])
            if z == maxzoom:
                g = ft["geometry"]
                polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
                for poly in polys:
                    for ring in poly:
                        v = np.asarray(ring)
                        dlon = np.abs(v[:, 0] / 0.05 - np.round(v[:, 0] / 0.05)) * 0.05
                        dlat = np.abs(v[:, 1] / 0.05 - np.round(v[:, 1] / 0.05)) * 0.05
                        grid = (dlon < 2e-4) & (dlat < 2e-4)
                        px = (v[:, 0] + 180) / 360 * W
                        py = (1 - np.arcsinh(np.tan(np.radians(v[:, 1]))) / np.pi) / 2 * W
                        def near_clip(q):
                            r = np.mod(q, 256)
                            return (np.minimum(np.abs(r - 5), np.abs(r - 251)) < 0.6) | (np.minimum(r, 256 - r) < 0.6)
                        clip = ~grid & (near_clip(px) | near_clip(py))
                        on_grid += int(grid.sum()); on_clip += int(clip.sum()); off += int((~grid & ~clip).sum())
                        if grid.any():
                            dm = np.hypot(dlon[grid] * 111320 * np.cos(np.radians(v[grid, 1])), dlat[grid] * 110574)
                            max_dev_m = max(max_dev_m, float(dm.max()))
        r = {"tile_features": nfeat, "fields_present": len(ids), "fields_total": len(ncell),
             "single_cell_present": len(ids & singles), "single_cell_total": len(singles),
             "cells_in_present_fields": int(sum(ncell[i] for i in ids if i in ncell))}
        if z == maxzoom:
            r.update(vertices_on_cell_lattice=on_grid, vertices_on_tile_clip=on_clip,
                     vertices_off=off, max_lattice_dev_m=round(max_dev_m, 2))
        res[z] = r
    return res


# ----------------------------------------------------------------------------- raster tiles
def _merc_lat(yfrac):
    """Tile-space y fraction (0 = north edge) -> latitude (deg)."""
    return np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * yfrac))))


def _render_maxzoom_tiles(mask: np.ndarray, z: int, ss: int = 4) -> dict:
    """Coverage fraction tiles (float32 256x256) at zoom z for every tile touching a dune,
    by ss x ss supersampled nearest lookup of the cell grid (cell = >=2 px at z>=5)."""
    n = 2 ** z
    rows = np.flatnonzero(mask.any(1))
    lat_n, lat_s = 90.05 - RES * rows.min(), max(90.05 - RES * (rows.max() + 1), -85.0511)

    def ty(lat):
        return int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
    tiles = {}
    k = 256 * ss
    off = (np.arange(k) + 0.5) / k
    for y in range(max(ty(lat_n), 0), min(ty(lat_s), n - 1) + 1):
        lat = _merc_lat((y + off) / n)
        ii = np.clip(np.floor((90.05 - lat) / RES).astype(int), 0, NY - 1)
        sub_rows = mask[ii]
        cols = np.flatnonzero(sub_rows.any(0))
        if cols.size == 0:
            continue
        txs = set()
        for e in (-180.05 + RES * cols, -180.05 + RES * (cols + 1)):   # both cell edges
            txs.update((np.floor(((e + 180) % 360) / 360 * n).astype(int) % n).tolist())
        for x in sorted(txs):
            lon = -180 + 360 * (x + off) / n
            jj = np.floor((lon + 180.05) / RES).astype(int) % NX
            t = sub_rows[:, jj]
            if t.any():
                tiles[(x, y)] = t.reshape(256, ss, 256, ss).mean(axis=(1, 3)).astype(np.float32)
    return tiles


def _coverage_to_png(cov: np.ndarray, min_alpha: float = 0.45) -> bytes:
    """Palette PNG: colour DUNE_RGBA, alpha = coverage with a floor so sub-pixel fields stay
    visible at low zoom (coverage > 0 -> alpha >= min_alpha)."""
    import io
    from PIL import Image
    levels = 16
    a = np.where(cov > 0, np.maximum(cov, min_alpha), 0.0)
    q = np.round(a * (levels - 1)).astype(np.uint8)
    im = Image.frombytes("P", (q.shape[1], q.shape[0]), q.tobytes())
    im.putpalette(list(DUNE_RGBA) * levels)
    im.info["transparency"] = bytes(int(round(255 * i / (levels - 1))) for i in range(levels))
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True, transparency=im.info["transparency"])
    return buf.getvalue()


def build_raster_pmtiles(mask: np.ndarray, out: str, maxzoom: int = RASTER_MAXZOOM) -> dict:
    """Transparent PNG PMTiles of the dune mask, z0..maxzoom. Coverage is rendered exactly
    at maxzoom and mean-pooled 2x2 to lower zooms. Returns {zoom: n_tiles}."""
    from pmtiles.tile import zxy_to_tileid, TileType, Compression
    from pmtiles.writer import Writer
    levels = {maxzoom: _render_maxzoom_tiles(mask, maxzoom)}
    for z in range(maxzoom - 1, -1, -1):
        child = levels[z + 1]
        parents = {(x // 2, y // 2) for (x, y) in child}
        cur = {}
        for (px, py) in parents:
            big = np.zeros((512, 512), np.float32)
            for dx in (0, 1):
                for dy in (0, 1):
                    c = child.get((2 * px + dx, 2 * py + dy))
                    if c is not None:
                        big[dy * 256:(dy + 1) * 256, dx * 256:(dx + 1) * 256] = c
            cur[(px, py)] = big.reshape(256, 2, 256, 2).mean(axis=(1, 3))
        levels[z] = cur
    entries = []
    for z, tiles in levels.items():
        for (x, y), cov in tiles.items():
            entries.append((zxy_to_tileid(z, x, y), cov))
    entries.sort(key=lambda e: e[0])
    with open(out, "wb") as f:
        w = Writer(f)
        for tid, cov in entries:
            w.write_tile(tid, _coverage_to_png(cov))
        w.finalize(
            {"tile_type": TileType.PNG, "tile_compression": Compression.NONE,
             "min_zoom": 0, "max_zoom": maxzoom,
             "min_lon_e7": -1800000000, "min_lat_e7": -850511287,
             "max_lon_e7": 1800000000, "max_lat_e7": 850511287,
             "center_zoom": 2, "center_lon_e7": 150000000, "center_lat_e7": 200000000},
            {"name": "dune-atlas dunes (raster fallback)", "format": "png",
             "attribution": "Dune map: Gunn (2026), Supplementary Code (v1.0.0), Zenodo, doi:10.5281/zenodo.20054674",
             "description": "Dune mask coverage; alpha = cell coverage per pixel (floor 0.45 where >0)"},
        )
    return {z: len(t) for z, t in sorted(levels.items())}


# ----------------------------------------------------------------------------- driver
def build_all(layers_nc: str, out_dir: str, raster: bool = True) -> dict:
    os.makedirs(out_dir, exist_ok=True)
    dunes, land, area = load_layers(layers_nc)
    feats = list(dune_polygons(layers_nc))
    gj = os.path.join(out_dir, "dunes.geojson")
    with open(gj, "w") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f, separators=(",", ":"))
    s = summary(dunes, land, area, feats)
    build_vector_pmtiles(gj, os.path.join(out_dir, "dunes.pmtiles"))
    s["dunes_pmtiles_bytes"] = os.path.getsize(os.path.join(out_dir, "dunes.pmtiles"))
    s["dunes_geojson_bytes"] = os.path.getsize(gj)
    if raster:
        rp = os.path.join(out_dir, "dunes-raster.pmtiles")
        s["raster_tiles_per_zoom"] = build_raster_pmtiles(dunes, rp)
        s["dunes_raster_pmtiles_bytes"] = os.path.getsize(rp)
    with open(os.path.join(out_dir, "dunes_summary.json"), "w") as f:
        json.dump(s, f, indent=1)
    return s


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--layers", default=os.path.join(os.environ.get(
        "DUNE_WORLD_DATA", os.path.expanduser("~/Documents/research/projects/dune-world/data")), "layers.nc"))
    p.add_argument("--out", default="staging/dunes")
    p.add_argument("--no-raster", action="store_true")
    a = p.parse_args()
    print(json.dumps(build_all(a.layers, a.out, raster=not a.no_raster), indent=1))


# ----------------------------------------------------------------------------- inverted layer
NONDUNE_TIPPECANOE_ARGS = [a for a in TIPPECANOE_ARGS
                           if not a.startswith(("--layer=", "--name=", "--description=", "--use-attribute-for-id"))] + [
    "--layer=nondune_land", "--name=dune-atlas non-dune land",
    "--description=ERA5-Land land cells without dunes (0.1 deg grid), for the inverted dune view",
    "--use-attribute-for-id=id",
]


def build_nondune_pmtiles(layers_nc: str, out_dir: str) -> dict:
    """Vector tiles of land cells WITHOUT dunes (land & ~dunes), cell-exact like the dune layer, so the app
    can colour 'where dunes are not' (invert toggle). Writes nondune-land.geojson + nondune-land.pmtiles."""
    os.makedirs(out_dir, exist_ok=True)
    dunes, land, area = load_layers(layers_nc)
    mask = land & ~dunes
    feats = polygons_from_mask(mask, area)
    gj = os.path.join(out_dir, "nondune-land.geojson")
    with open(gj, "w") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f, separators=(",", ":"))
    out = os.path.join(out_dir, "nondune-land.pmtiles")
    out = os.path.abspath(out)
    cmd = ["tippecanoe", "-o", os.path.basename(out), *NONDUNE_TIPPECANOE_ARGS,
           os.path.relpath(os.path.abspath(gj), os.path.dirname(out))]
    subprocess.run(cmd, check=True, cwd=os.path.dirname(out))
    cells = int(sum(ft["properties"]["cells"] for ft in feats))
    return {"features": len(feats), "cells": cells, "expected_cells": int(mask.sum()),
            "pmtiles_bytes": os.path.getsize(out), "geojson_bytes": os.path.getsize(gj)}
