"""Polar-cap DEM textures for the globe hillshade cap (app/src/mars/map/polarcap.ts).

The terrarium basemap (terrain.py) is Web-Mercator and ends at 85.0511 deg; MapLibre's globe fills the caps by
stretching the top tile row to the pole (radial smear). The app draws each cap from a DEM texture in a polar
azimuthal-equidistant (AEQD) grid with MapLibre's own hillshade maths instead. This module samples the
MOLA–HRSC DEM (read in place) on that grid.

Texture geometry (shared with polarcap.ts `capUV`): a square of N x N px, centre = pole, radius RHO_DEG of arc
(degrees of latitude from the pole) to the middle of the edge. Texture coordinates u (right) and v (down) in
[0, 1]; with r = (90 - |lat|) / RHO_DEG:
    north:  u = 0.5 + 0.5 r sin(lon),  v = 0.5 + 0.5 r cos(lon)      (lon 0 down, 90 E right)
    south:  u = 0.5 + 0.5 r sin(lon),  v = 0.5 - 0.5 r cos(lon)      (lon 0 up,   90 E right)
RHO_DEG = 90 - 84.95: the cap starts at 85.0511 deg, the extra 0.1 deg gives the 3 x 3 slope stencil real
neighbours at the seam. Pixel size = 2 RHO_DEG (pi / 180) R / N on the ground (AEQD distortion < 0.1 %).
Levels N = 4096 (146 m) ... 256 are 2 x 2 means of the 4096 sampling (bilinear from the 200 m DEM). Values
rounded to 1 m, Terrarium RGB, lossless WebP (the same encoding as the basemap tiles).
"""
from __future__ import annotations

import json
import math
import os
import time

import numpy as np

from . import terrain as T

LAT_EDGE = 84.95
RHO_DEG = 90.0 - LAT_EDGE
SIZES = (4096, 2048, 1024, 512, 256)


def cap_uv(lon, lat, north: bool):
    r = (90.0 - np.abs(np.asarray(lat, "f8"))) / RHO_DEG
    lo = np.radians(lon)
    u = 0.5 + 0.5 * r * np.sin(lo)
    v = 0.5 + (0.5 if north else -0.5) * r * np.cos(lo)
    return u, v


def cap_lonlat(N: int, north: bool):
    """(lon, lat) of the N x N pixel centres (row-major, v down)."""
    c = (np.arange(N) + 0.5) / N - 0.5
    x, y = np.meshgrid(c * 2, c * 2)               # x right, y down, in units of the radius
    r = np.hypot(x, y)
    if north:
        lon = np.degrees(np.arctan2(x, y))
    else:
        lon = np.degrees(np.arctan2(x, -y))
    lat = (90.0 - r * RHO_DEG) * (1 if north else -1)
    return lon, lat


def read_band(dem: T.DEM, lat_min: float, north: bool):
    """(A float32 rows, first row index) covering |lat| >= lat_min at one pole (+1 row margin), gaps filled."""
    if north:
        r0, r1 = 0, int(math.ceil((dem.y0 - lat_min) / dem.res)) + 1
    else:
        r0, r1 = int(math.floor((dem.y0 + lat_min) / dem.res)) - 1, dem.H - 1
    A = dem.read(r0, r1, 0, dem.W - 1)
    if np.isnan(A).any():
        A = T.fill_nan(A)
    return A, max(r0, 0)


def sample_points(dem: T.DEM, band, lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    """Point-wise bilinear sample from a preloaded row band (read_band), longitude periodic, rows clamped."""
    A, rb = band
    r = np.clip((dem.y0 - lat) / dem.res - 0.5, 0.0, dem.H - 1.0)
    c = (lon - dem.x0) / dem.res - 0.5
    i0 = np.minimum(np.floor(r).astype(np.int64), dem.H - 2)
    j0 = np.floor(c).astype(np.int64)
    fr, fc = (r - i0).astype("f4"), (c - j0).astype("f4")
    ia = np.clip(i0 - rb, 0, A.shape[0] - 2)
    j0m, j1m = j0 % dem.W, (j0 + 1) % dem.W
    v00, v01 = A[ia, j0m], A[ia, j1m]
    v10, v11 = A[ia + 1, j0m], A[ia + 1, j1m]
    return ((v00 * (1 - fc) + v01 * fc) * (1 - fr) + (v10 * (1 - fc) + v11 * fc) * fr).astype("f4")


def cap_dem(dem: T.DEM, north: bool, N: int = SIZES[0], chunk_rows: int = 256) -> np.ndarray:
    lon, lat = cap_lonlat(N, north)
    band = read_band(dem, float(np.abs(lat).min()) - 0.01, north)
    out = np.empty((N, N), "f4")
    for i0 in range(0, N, chunk_rows):
        out[i0:i0 + chunk_rows] = sample_points(dem, band, lat[i0:i0 + chunk_rows], lon[i0:i0 + chunk_rows])
    return out


def build_caps(out_dir: str, dem_path: str = T.DEM_PATH, sizes=SIZES) -> dict:
    os.makedirs(out_dir, exist_ok=True)
    dem = T.DEM(dem_path)
    res = {"lat_edge": LAT_EDGE, "rho_deg": RHO_DEG, "lat0": 85.0511287798066, "encoding": "terrarium",
           "quant_m": T.QUANT_M, "format": "webp-lossless", "projection": "polar azimuthal equidistant (see module doc)",
           "radius_m": T.R_MARS_2000, "levels": {}, "attribution": T.DEM_ATTRIBUTION}
    for pole, north in (("n", True), ("s", False)):
        t0 = time.time()
        a = cap_dem(dem, north, sizes[0])
        lev = a
        checks = {}
        rng = np.random.default_rng(1 if north else 2)
        for N in sizes:
            if N != lev.shape[0]:
                while lev.shape[0] > N:
                    lev = T.mean2(lev)
            b = T.webp_bytes(T.terrarium_encode(lev))
            p = os.path.join(out_dir, f"{pole}-{N}.webp")
            with open(p, "wb") as f:
                f.write(b)
            dec = T.terrarium_decode(T.webp_decode(b))
            checks[N] = {"bytes": len(b), "max_abs_decode_m": float(np.abs(dec - lev).max()),
                         "min_m": float(lev.min()), "max_m": float(lev.max()),
                         "px_m": 2 * math.radians(RHO_DEG) * T.R_MARS_2000 / N}
        # independent point check at the finest level: random pixel centres vs DEM.point
        N = sizes[0]
        lon, lat = cap_lonlat(N, north)
        dec = T.terrarium_decode(T.webp_decode(open(os.path.join(out_dir, f"{pole}-{N}.webp"), "rb").read()))
        ii, jj = rng.integers(0, N, 200), rng.integers(0, N, 200)
        d = [abs(dec[i, j] - dem.point(float(lat[i, j]), float(lon[i, j]))) for i, j in zip(ii, jj)]
        checks["point_check_max_abs_m"] = float(max(d))
        checks["s"] = round(time.time() - t0, 1)
        res["levels"][pole] = checks
    with open(os.path.join(out_dir, "index.json"), "w") as f:
        json.dump(res, f, indent=1, default=str)
    return res


def main(argv=None):
    import argparse
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.mars.terrain_polar")
    p.add_argument("--out", required=True)
    p.add_argument("--dem", default=T.DEM_PATH)
    a = p.parse_args(argv)
    print(json.dumps(build_caps(a.out, a.dem), default=str), flush=True)


if __name__ == "__main__":
    main()
