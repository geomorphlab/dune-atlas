"""COG fallback prototype: drift potential (DP, m^2/yr) at preset thresholds as Cloud-Optimised
GeoTIFFs, plus a byte/request benchmark against the GeoZarr pyramid (docs/validation-fields.md).

Two flavours per threshold:
* `dp_ut{k}_3857.tif` -- EPSG:3857 GoogleMapsCompatible tiling, 256 px blocks, DEFLATE +
  floating-point predictor: the layout @geomatico/maplibre-cog-protocol requires (it does
  not reproject; single-band float + `#color:` ramp, NaN rendered transparent).
* `dp_ut{k}_4326.tif` -- native 0.1 deg grid (no resampling), 512 px blocks, ZSTD + predictor 3:
  for GPU-reprojecting readers (e.g. deck.gl/maplibre custom layers) or download.
Overviews use AVERAGE (GDAL skips nodata -> same count-weighted mean as fields.py).
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

import numpy as np

from . import constants as C

UT_PRESETS = (5, 14, 20, 30, 40)       # u*,th = 0.06, 0.15, 0.21, 0.31, 0.41 m/s
TRANSFORM_4326 = (0.1, 0.0, -180.05, 0.0, -0.1, 90.05)  # pixel-registered cell edges


def _dp_slice(data_dir: str, k: int) -> np.ndarray:
    import xarray as xr
    from .qsat_view import open_qsat
    dq = open_qsat(data_dir, chunks=None)
    return (dq["dpm"].isel(ut=k).values * C.S2Y).astype("float32")


def write_cog(arr: np.ndarray, path: str, crs: str = "EPSG:4326", *, compress: str = "ZSTD",
              blocksize: int = 512, level: int | None = None, tiling_scheme: str | None = None,
              warp_resampling: str = "NEAREST", tags: dict | None = None) -> float:
    """Write a single-band float32 COG via GDAL's COG driver (CreateCopy from a MEM dataset).
    Returns build seconds. For crs='EPSG:3857' the COG driver itself warps to the
    GoogleMapsCompatible tile matrix (TILING_SCHEME)."""
    import rasterio
    from rasterio.crs import CRS
    from rasterio.io import MemoryFile
    from rasterio.shutil import copy as rio_copy
    from rasterio.transform import Affine

    t0 = time.time()
    prof = dict(driver="GTiff", width=arr.shape[1], height=arr.shape[0], count=1, dtype="float32",
                crs=CRS.from_epsg(4326), transform=Affine(*TRANSFORM_4326), nodata=float("nan"))
    co = dict(COMPRESS=compress, PREDICTOR=3, BLOCKSIZE=blocksize, OVERVIEW_RESAMPLING="AVERAGE",
              NUM_THREADS="ALL_CPUS", BIGTIFF="IF_SAFER")
    if level is not None:
        co["LEVEL"] = level
    if crs != "EPSG:4326":
        co.update(TILING_SCHEME=tiling_scheme or "GoogleMapsCompatible", WARP_RESAMPLING=warp_resampling,
                  ADD_ALPHA="NO")
    with MemoryFile() as mf:
        with mf.open(**prof) as ds:
            ds.write(arr, 1)
            if tags:
                ds.update_tags(**{k: str(v) for k, v in tags.items()})
        with mf.open() as src:
            rio_copy(src, path, driver="COG", **co)
    return time.time() - t0


def build_dp_cogs(data_dir: str, out_dir: str, ut_indices=UT_PRESETS) -> list[dict]:
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for k in ut_indices:
        t0 = time.time()
        arr = _dp_slice(data_dir, k)
        t_read = time.time() - t0
        tags = dict(variable="dpm", long_name="Drift potential (DP)", units="m2/yr",
                    ut=f"{C.UT_VALUES[k]:.2f}", ut_index=k, source="Gunn (2026) doi:10.1038/s41467-026-75466-y")
        for crs, kw in (("EPSG:3857", dict(compress="DEFLATE", blocksize=256)),
                        ("EPSG:4326", dict(compress="ZSTD", blocksize=512))):
            p = Path(out_dir) / f"dp_ut{k:02d}_{crs.split(':')[1]}.tif"
            dt = write_cog(arr, str(p), crs, tags=tags, **kw)
            rows.append(dict(file=p.name, ut_index=k, ut=float(C.UT_VALUES[k]), crs=crs,
                             compress=kw["compress"], blocksize=kw["blocksize"],
                             bytes=p.stat().st_size, build_s=round(dt, 2), read_s=round(t_read, 2)))
    return rows


# ----------------------------------------------------------------------------- benchmark helpers
def cog_levels(path: str) -> list[dict]:
    """Per-IFD (full res + overviews) block byte counts, read from the TIFF tags."""
    import rasterio
    out = []
    with rasterio.open(path) as src:
        n_ov = len(src.overviews(1))
    for ov in range(-1, n_ov):
        kw = {} if ov < 0 else {"overview_level": ov}
        with rasterio.open(path, **kw) as src:
            bw, bh = src.block_shapes[0][1], src.block_shapes[0][0]
            nbx, nby = -(-src.width // bw), -(-src.height // bh)
            sizes = np.zeros((nby, nbx), dtype=np.int64)
            for by in range(nby):
                for bx in range(nbx):
                    s = src.get_tag_item(f"BLOCK_SIZE_{bx}_{by}", "TIFF", bidx=1)
                    sizes[by, bx] = int(s) if s else 0
            out.append(dict(level=ov + 1, width=src.width, height=src.height, block=(bh, bw),
                            transform=tuple(src.transform)[:6], crs=src.crs.to_string(), sizes=sizes))
    return out


def zarr_level_chunk_sizes(store: str, var: str, level: int, ut_index: int) -> dict:
    """Compressed inner-chunk sizes at one ut slice of a sharded fields/<var>.zarr level, from the
    shard indexes (uint64 offset, nbytes per inner chunk + crc32c, at the shard end)."""
    meta = json.loads((Path(store) / str(level) / var / "zarr.json").read_text())
    shape = meta["shape"]
    shard = meta["chunk_grid"]["configuration"]["chunk_shape"]
    inner = meta["codecs"][0]["configuration"]["chunk_shape"]
    per = [s // i for s, i in zip(shard, inner)]
    ny, nx = -(-shape[1] // inner[1]), -(-shape[2] // inner[2])
    sizes = np.zeros((ny, nx), dtype=np.int64)
    n_inner = int(np.prod(per))
    su = ut_index // shard[0]
    for sy in range(-(-shape[1] // shard[1])):
        for sx in range(-(-shape[2] // shard[2])):
            p = Path(store) / str(level) / var / "c" / str(su) / str(sy) / str(sx)
            if not p.exists():
                continue
            with open(p, "rb") as f:
                f.seek(-(16 * n_inner + 4), 2)
                idx = np.frombuffer(f.read(16 * n_inner), dtype="<u8").reshape(per + [2])
            iu = ut_index - su * shard[0]
            for iy in range(per[1]):
                for ix in range(per[2]):
                    off, nb = idx[iu, iy, ix]
                    gy, gx = sy * per[1] + iy, sx * per[2] + ix
                    if gy < ny and gx < nx and off != 2**64 - 1:
                        sizes[gy, gx] = int(nb)
    return dict(level=level, shape=shape, inner=inner, shard=shard, sizes=sizes,
                index_bytes=16 * n_inner + 4)


def main(argv=None):
    import argparse
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.cogs")
    p.add_argument("--data", default=os.environ.get("DUNE_WORLD_DATA",
                                                   os.path.expanduser("~/Documents/research/projects/dune-world/data")))
    p.add_argument("--out", required=True)
    p.add_argument("--ut", nargs="*", type=int, default=list(UT_PRESETS))
    a = p.parse_args(argv)
    rows = build_dp_cogs(a.data, a.out, a.ut)
    (Path(a.out) / "cog_build_stats.json").write_text(json.dumps(rows, indent=1))
    for r in rows:
        print(json.dumps(r))


if __name__ == "__main__":
    main()
