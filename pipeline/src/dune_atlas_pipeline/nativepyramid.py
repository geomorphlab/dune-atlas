"""GeoZarr multiscale pyramid for a single 2-D field at its NATIVE resolution (any regular lon/lat grid).

Used for layers that are independent of the wind grid (e.g. the 30-arc-second aridity index). Same
metadata conventions as the topozarr-built `fields/<var>.zarr` stores that the app's zarr-layer (with the
dune-atlas per-level-bounds patch) and `FieldReader` read:

* root attrs: `zarr_conventions` (multiscales, proj, spatial), `proj:code`/`proj:wkt2`, `spatial:dimensions`,
  `spatial:registration` = pixel, `spatial:transform` [dx, 0, x0, 0, dy, y0] (x0/y0 = outer cell EDGES),
  `spatial:shape`, `spatial:bbox`, `zarr-layer` hints {var: {clim, colormap}}, and
  `multiscales.layout` [{asset, derived_from, transform{scale, translation}, resampling_method,
  spatial:transform, spatial:shape}] - one entry per level;
* level groups "0", "1", ...: array `<var>` dims (y, x), coordinate arrays `x`, `y` (cell centres, float64)
  and a scalar `spatial_ref`.

Differences from the topozarr stores (deliberate):

* arrays are 2-D (y, x) - no `ut` dimension (threshold-independent layer; registry thresholdAware: false);
* level factors need not be powers of two: they are integer divisors of BOTH native dimensions, so every
  level tiles the native extent exactly (edges identical at every level, no trimmed partial windows).
  E.g. 43200 x 18000 (30"): factors 1, 2, 4, 8, 16, 36, 72, 144 -> widths 43200 ... 300 px;
* every coarse level is computed directly from native pixels as a count-weighted nan-mean (sum of finite
  pixels / number of finite pixels in the f x f window; equal pixel weights). A coarse pixel is finite iff its
  window contains >= 1 finite native pixel; all-NaN windows stay NaN;
* values are float32, mantissa rounded to `keepbits` bits (fields.bitround) AFTER coarsening, blosc zstd-5
  byte-shuffle inside a sharding codec (inner chunk `chunk` x `chunk`, shard `chunk*shard_chunks`), index at
  the shard end (zarrita reads it with a suffix range). All-NaN inner chunks / shards are not written.
"""
from __future__ import annotations

import os
import time

import numpy as np

from .fields import bitround, _du, _maxrss_gb

CONVENTIONS = [
    {"schema_url": "https://raw.githubusercontent.com/zarr-conventions/multiscales/refs/tags/v0.1/schema.json",
     "spec_url": "https://github.com/zarr-conventions/multiscales/blob/v0.1/README.md",
     "uuid": "d35379db-88df-4056-af3a-620245f8e347", "name": "multiscales",
     "description": "Multiscale layout of zarr datasets"},
    {"schema_url": "https://raw.githubusercontent.com/zarr-conventions/proj/refs/tags/v0.1/schema.json",
     "spec_url": "https://github.com/zarr-conventions/proj/blob/v0.1/README.md",
     "uuid": "f17cb550-5864-4468-aeb7-f3180cfb622f", "name": "proj",
     "description": "Coordinate reference system information for geospatial data"},
    {"schema_url": "https://raw.githubusercontent.com/zarr-conventions/spatial/refs/tags/v0.1/schema.json",
     "spec_url": "https://github.com/zarr-conventions/spatial/blob/v0.1/README.md",
     "uuid": "689b58e2-cf7b-45e0-9fff-9cfc0883d6b4", "name": "spatial",
     "description": "Spatial coordinate information"},
]


def wkt2_4326() -> str:
    import pyproj
    return pyproj.CRS.from_epsg(4326).to_wkt("WKT2_2019", pretty=False)


def common_factors(ny: int, nx: int, max_px: int = 256, near_pow2: bool = True) -> list[int]:
    """Level factors: 1, then for each power of two 2^k the common divisor of (ny, nx) closest to 2^k
    (ties -> smaller), strictly increasing, until the level is <= max_px wide."""
    import math
    g = math.gcd(ny, nx)
    divs = [d for d in range(1, g + 1) if g % d == 0]
    out = [1]
    k = 1
    while nx // out[-1] > max_px:
        target = 2 ** k
        cands = [d for d in divs if d > out[-1]]
        if not cands:
            break
        d = min(cands, key=lambda d: (abs(math.log2(d) - k), d)) if near_pow2 else cands[0]
        out.append(d)
        k = max(k + 1, int(round(math.log2(d))) + 1)
    return out


def block_nanmean_levels(arr: np.ndarray, factors: list[int], band: int | None = None):
    """{f: (ny/f, nx/f) float32 nan-mean of f x f native windows} for f in factors (f > 1), plus
    {f: count of finite pixels} - computed in row bands (float64 accumulation) to bound memory."""
    ny, nx = arr.shape
    fs = [f for f in factors if f > 1]
    for f in fs:
        assert ny % f == 0 and nx % f == 0, (f, arr.shape)
    import math
    lcm = 1
    for f in fs:
        lcm = lcm * f // math.gcd(lcm, f)
    band = band or lcm * max(1, 720 // lcm)
    sums = {f: np.zeros((ny // f, nx // f), "f8") for f in fs}
    cnts = {f: np.zeros((ny // f, nx // f), "i4") for f in fs}
    for r0 in range(0, ny, band):
        r1 = min(ny, r0 + band)
        a = arr[r0:r1]
        fin = np.isfinite(a)
        v = np.where(fin, a, 0).astype("f8")
        c = fin.astype("i4")
        for f in fs:
            assert r0 % f == 0 and (r1 - r0) % f == 0, (r0, r1, f)
            h = (r1 - r0) // f
            sums[f][r0 // f: r0 // f + h] = v.reshape(h, f, nx // f, f).sum((1, 3))
            cnts[f][r0 // f: r0 // f + h] = c.reshape(h, f, nx // f, f).sum((1, 3))
    means = {}
    for f in fs:
        with np.errstate(invalid="ignore", divide="ignore"):
            means[f] = np.where(cnts[f] > 0, sums[f] / np.maximum(cnts[f], 1), np.nan).astype("f4")
    return means, cnts


def _sharded_float_array(group, name, data, chunk, shard_chunks, attrs, dims):
    from zarr.codecs import BloscCodec
    ny, nx = data.shape
    ch = (min(chunk, ny), min(chunk, nx))
    sh = (min(ch[0] * shard_chunks, ny), min(ch[1] * shard_chunks, nx))
    # shard shape must be a multiple of the chunk shape
    sh = (sh[0] // ch[0] * ch[0] if sh[0] >= ch[0] else ch[0], sh[1] // ch[1] * ch[1] if sh[1] >= ch[1] else ch[1])
    a = group.create_array(name, shape=data.shape, dtype="float32", chunks=ch, shards=sh,
                           compressors=[BloscCodec(cname="zstd", clevel=5, shuffle="shuffle", typesize=4)],
                           fill_value=np.nan, dimension_names=dims, attributes=attrs, overwrite=True)
    a[...] = data
    return a


def write_native_pyramid(out: str, var: str, arr: np.ndarray, *, x0: float, y0: float, dx: float, dy: float,
                         factors: list[int], var_attrs: dict, root_attrs: dict, zarr_layer_hint: dict,
                         keepbits: int | None = 12, chunk: int = 512, shard_chunks: int = 8,
                         resampling: str = "mean") -> dict:
    """Write `out` (GeoZarr multiscales). `arr` (ny, nx) float32, row 0 = northern edge (dy < 0).
    x0, y0 = outer EDGES of pixel (0, 0); dx > 0, dy < 0 native pixel size in degrees."""
    import zarr
    t0 = time.time()
    ny, nx = arr.shape
    assert dx > 0 and dy < 0
    wkt = wkt2_4326()
    means, _ = block_nanmean_levels(arr, factors)
    t_coarse = time.time() - t0
    root = zarr.open_group(out, mode="w", zarr_format=3)
    proj_attrs = {"zarr_conventions": [CONVENTIONS[1]], "proj:code": "EPSG:4326", "proj:wkt2": wkt}
    layout = []
    level_stats = []
    for li, f in enumerate(factors):
        data = arr.astype("f4", copy=False) if f == 1 else means[f]
        if keepbits is not None and keepbits < 23:
            data = bitround(data, keepbits)
        ly, lx = data.shape
        tr = [f * dx, 0.0, x0, 0.0, f * dy, y0]
        g = root.create_group(str(li), overwrite=True)
        g.attrs.update({**{k: v for k, v in root_attrs.items() if k in ("title", "source", "license")},
                        "coordinates": "spatial_ref", **proj_attrs, "dune_atlas:level_factor": f})
        _sharded_float_array(g, var, data, chunk, shard_chunks, {**var_attrs, "coordinates": "spatial_ref"}, ["y", "x"])
        xs = x0 + (np.arange(lx) + 0.5) * f * dx
        ys = y0 + (np.arange(ly) + 0.5) * f * dy
        for name, vals, d, extra in (("x", xs, "x", {"units": "degrees_east", "standard_name": "longitude"}),
                                     ("y", ys, "y", {"units": "degrees_north", "standard_name": "latitude"})):
            c = g.create_array(name, shape=vals.shape, dtype="float64", chunks=vals.shape, fill_value=np.nan,
                               dimension_names=[d], attributes={**extra, "dune_atlas:position": "cell centre"},
                               overwrite=True)
            c[...] = vals
        sr = g.create_array("spatial_ref", shape=(), dtype="int64", fill_value=0,
                            attributes={"crs_wkt": wkt, "spatial_ref": wkt}, overwrite=True)
        sr[...] = 0
        entry = {"asset": str(li)}
        if f > 1:
            entry.update({"derived_from": "0", "transform": {"scale": [float(f), float(f)],
                                                             "translation": [(f - 1) / 2, (f - 1) / 2]},
                          "resampling_method": resampling})
        entry.update({"spatial:transform": tr, "spatial:shape": [ly, lx]})
        layout.append(entry)
        level_stats.append({"level": li, "factor": f, "shape": [ly, lx], "res_deg": f * dx,
                            "finite": int(np.isfinite(data).sum())})
    root.attrs.update({
        **root_attrs,
        "zarr_conventions": CONVENTIONS,
        **{k: v for k, v in proj_attrs.items() if k != "zarr_conventions"},
        "spatial:dimensions": ["y", "x"],
        "spatial:registration": "pixel",
        "spatial:transform": [dx, 0.0, x0, 0.0, dy, y0],
        "spatial:bbox": [x0, y0 + ny * dy, x0 + nx * dx, y0],
        "spatial:shape": [ny, nx],
        "zarr-layer": {var: zarr_layer_hint},
        "multiscales": {"layout": layout, "resampling_method": resampling},
    })
    nobj = sum(len(fs) for _, _, fs in os.walk(out))
    return {"var": var, "levels": level_stats, "factors": factors, "keepbits": keepbits, "chunk": chunk,
            "shard": chunk * shard_chunks, "bytes": _du(out), "objects": nobj,
            "coarsen_s": round(t_coarse, 1), "total_s": round(time.time() - t0, 1), "peak_rss_gb": round(_maxrss_gb(), 2)}
