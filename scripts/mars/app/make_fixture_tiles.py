"""Fixture tiles for the Mars app (App track; environment with pmtiles, PIL/WebP, tippecanoe, geopandas):

  basemaps/hrsc-mola-terrarium.pmtiles  FAKE low-zoom DEM: Terrarium-encoded 512 px lossless WebP tiles,
                                        z0-3, Web-Mercator, of the synthetic elevation (fixture_common.py)
                                        - the real archive is built by the Terrain track from the MOLA–HRSC DEM
  dunes/dunes.pmtiles                   the PI dune shapefile (3,514 polygons) as vector tiles z0-7, layer
                                        `dunes` (tippecanoe) - a fixture stand-in for the Terrain track's archive

    python scripts/mars/app/make_fixture_tiles.py --shp <dunes.shp> [--out staging/fixture-mars] [--maxzoom 3]
"""
import argparse
import io
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
sys.path.insert(0, str(HERE))
import fixture_common as FC  # noqa: E402

PREFIX = "dune-atlas/mars/v1"
TILE = 512


def terrarium_rgb(h):
    v = np.clip(h + 32768.0, 0, 65535.996)
    r = np.floor(v / 256.0)
    g = np.floor(v - r * 256.0)
    b = np.floor((v - np.floor(v)) * 256.0)
    return np.stack([r, g, b], -1).astype("u1")


def decode_terrarium(rgb):
    rgb = rgb.astype("f8")
    return rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768


def tile_elevation(z, x, y):
    n = 2 ** z
    j = (np.arange(TILE) + 0.5) / TILE
    lon = ((x + j) / n) * 360 - 180
    lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (y + j) / n))))
    return FC.elevation(lat[:, None], lon[None, :])


def write_terrarium(out: Path, maxzoom: int):
    from PIL import Image
    from pmtiles.tile import Compression, TileType, zxy_to_tileid
    from pmtiles.writer import Writer
    out.parent.mkdir(parents=True, exist_ok=True)
    tiles = []
    for z in range(maxzoom + 1):
        for x in range(2 ** z):
            for y in range(2 ** z):
                tiles.append((zxy_to_tileid(z, x, y), z, x, y))
    tiles.sort()
    err = 0.0
    with open(out, "wb") as f:
        w = Writer(f)
        for tid, z, x, y in tiles:
            h = tile_elevation(z, x, y)
            rgb = terrarium_rgb(h)
            err = max(err, float(np.abs(decode_terrarium(rgb) - h).max()))
            buf = io.BytesIO()
            Image.fromarray(rgb, "RGB").save(buf, format="WEBP", lossless=True)
            w.write_tile(tid, buf.getvalue())
        w.finalize({"tile_type": TileType.WEBP, "tile_compression": Compression.NONE, "min_zoom": 0, "max_zoom": maxzoom,
                    "min_lon_e7": -1800000000, "min_lat_e7": -850511287, "max_lon_e7": 1800000000, "max_lat_e7": 850511287,
                    "center_zoom": 0, "center_lon_e7": 0, "center_lat_e7": 0},
                   {"name": "hrsc-mola-terrarium (FIXTURE: synthetic elevation)", "encoding": "terrarium", "tileSize": TILE,
                    "attribution": "synthetic fixture, not the MOLA–HRSC DEM"})
    return {"tiles": len(tiles), "max_decode_error_m": err, "bytes": out.stat().st_size}


def write_dunes(out: Path, shp: str, maxzoom: int):
    import geopandas as gpd
    out.parent.mkdir(parents=True, exist_ok=True)
    g = gpd.read_file(shp)
    g = g.set_crs(None, allow_override=True) if g.crs is None else g
    g["id"] = np.arange(1, len(g) + 1)
    with tempfile.TemporaryDirectory() as td:
        gj = Path(td) / "dunes.geojson"
        gj.write_text(json.dumps(json.loads(g.to_json(drop_id=True))))
        cmd = ["tippecanoe", "-o", str(out), "--force", "-l", "dunes", "-Z0", f"-z{maxzoom}", "--no-feature-limit",
               "--no-tile-size-limit", "--detect-shared-borders", "--use-attribute-for-id=id", "-q", str(gj)]
        subprocess.run(cmd, check=True)
    return {"features": int(len(g)), "bytes": out.stat().st_size, "bounds": [float(v) for v in g.total_bounds]}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=str(REPO / "staging" / "fixture-mars"))
    ap.add_argument("--shp", required=True)
    ap.add_argument("--maxzoom", type=int, default=3)
    ap.add_argument("--dune-maxzoom", type=int, default=7)
    a = ap.parse_args(argv)
    root = Path(a.out) / PREFIX
    s1 = write_terrarium(root / "basemaps" / "hrsc-mola-terrarium.pmtiles", a.maxzoom)
    s2 = write_dunes(root / "dunes" / "dunes.pmtiles", a.shp, a.dune_maxzoom)
    print(json.dumps({"terrarium": s1, "dunes": s2}))


if __name__ == "__main__":
    main()
