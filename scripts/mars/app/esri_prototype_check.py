"""Offline check of the Esri reprojection prototype (app/src/mars/map/esri.ts) where no browser is available:
a line-by-line numpy port of planTile + the row resampling, run on the real Esri OnMars tiles.

  1. geometry parity with the TypeScript plan (ts_plans.json from dump_plans.ts via vite-node);
  2. alignment: Web-Mercator views of Nili Patera and Proctor crater composed from synthesised tiles, with the
     PI dune polygons (Mars 2000 sphere, lon/lat) drawn on top in the same Web-Mercator pixel space;
  3. seams: jump across output-tile edges vs the pixel-to-pixel variation inside the tiles;
  4. requests and latency per view (1280 x 800 px viewport, 6 parallel fetches as a browser over HTTP/1.1).

    python scripts/mars/app/esri_prototype_check.py --shp <dunes.shp> --out staging/mars-app/esri
"""
import argparse
import io
import json
import math
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import requests
from PIL import Image, ImageDraw

BASE = "https://astro.arcgis.com/arcgis/rest/services/OnMars"
TILE, RES0 = 512, 0.3515625
SPAN0 = RES0 * TILE
MAXLEVEL = {"CTX1": 12, "CTX": 10, "MColorDEM": 7, "MDIM": 7}
SESSION = requests.Session()
CACHE = {}
STATS = {"requests": 0, "bytes": 0, "missing": 0, "seconds": 0.0}


def merc_lat(yn):
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * yn))))


def extra_levels(lat):
    return max(0, min(3, round(math.log2(1 / max(1e-6, math.cos(math.radians(lat)))))))


def plan_tile(z, x, y, max_level):
    n = 2 ** z
    west, east = x / n * 360 - 180, (x + 1) / n * 360 - 180
    north, south = merc_lat(y / n), merc_lat((y + 1) / n)
    level = max(0, min(max_level, z - 1 + extra_levels(merc_lat((y + 0.5) / n))))
    span = SPAN0 / 2 ** level
    res = span / TILE
    ncols, nrows = 2 * 2 ** level, 2 ** level
    eps = 1e-9
    c0, c1 = max(0, math.floor((west + 180) / span)), min(ncols - 1, math.floor((east + 180 - eps) / span))
    r0, r1 = max(0, math.floor((90 - north) / span)), min(nrows - 1, math.floor((90 - south - eps) / span))
    sx, sw = (west + 180) / res - c0 * TILE, (east - west) / res
    rows = np.array([(90 - merc_lat((y + (j + 0.5) / TILE) / n)) / res - r0 * TILE for j in range(TILE)])
    return dict(level=level, c0=c0, c1=c1, r0=r0, r1=r1, sx=sx, sw=sw, rows=rows, west=west, east=east, north=north, south=south)


def fetch(service, level, row, col):
    url = f"{BASE}/{service}/MapServer/tile/{level}/{row}/{col}"
    if url in CACHE:
        return CACHE[url]
    t = time.time()
    r = SESSION.get(url, timeout=60)
    STATS["requests"] += 1
    STATS["seconds"] += time.time() - t
    if r.ok:
        STATS["bytes"] += len(r.content)
        im = np.asarray(Image.open(io.BytesIO(r.content)).convert("RGB"), dtype="f4")
    else:
        STATS["missing"] += 1
        im = None
    CACHE[url] = im
    return im


def render_tile(service, z, x, y):
    p = plan_tile(z, x, y, MAXLEVEL[service])
    mh, mw = (p["r1"] - p["r0"] + 1) * TILE, (p["c1"] - p["c0"] + 1) * TILE
    mosaic = np.zeros((mh, mw, 3), "f4")
    alpha = np.zeros((mh, mw), "f4")
    for r in range(p["r0"], p["r1"] + 1):
        for c in range(p["c0"], p["c1"] + 1):
            im = fetch(service, p["level"], r, c)
            if im is not None:
                mosaic[(r - p["r0"]) * TILE:(r - p["r0"] + 1) * TILE, (c - p["c0"]) * TILE:(c - p["c0"] + 1) * TILE] = im
                alpha[(r - p["r0"]) * TILE:(r - p["r0"] + 1) * TILE, (c - p["c0"]) * TILE:(c - p["c0"] + 1) * TILE] = 1
    xs = p["sx"] + (np.arange(TILE) + 0.5) * p["sw"] / TILE - 0.5      # bilinear across columns (canvas smoothing)
    x0 = np.clip(np.floor(xs).astype(int), 0, mw - 1); x1 = np.clip(x0 + 1, 0, mw - 1); fx = np.clip(xs - np.floor(xs), 0, 1)[:, None]
    sy = np.clip(np.floor(p["rows"]).astype(int), 0, mh - 1)            # nearest source row
    out = mosaic[sy][:, x0] * (1 - fx) + mosaic[sy][:, x1] * fx
    a = alpha[sy][:, x0]
    return out, a, p


def lonlat_to_px(lon, lat, z):
    n = 2 ** z * TILE
    x = (np.asarray(lon) + 180) / 360 * n
    lr = np.radians(np.asarray(lat))
    y = (1 - np.log(np.tan(np.pi / 4 + lr / 2)) / np.pi) / 2 * n
    return x, y


def render_view(service, lon, lat, z, w=1280, h=800, dunes=None):
    cx, cy = lonlat_to_px(lon, lat, z)
    x0, y0 = cx - w / 2, cy - h / 2
    tx0, ty0, tx1, ty1 = int(x0 // TILE), int(y0 // TILE), int((x0 + w) // TILE), int((y0 + h) // TILE)
    canvas = np.zeros((h, w, 3), "f4")
    tiles = []
    for ty in range(max(0, ty0), min(2 ** z - 1, ty1) + 1):
        for tx in range(tx0, tx1 + 1):
            txw = tx % 2 ** z
            img, a, p = render_tile(service, z, txw, ty)
            tiles.append((tx, ty, p))
            ox, oy = int(round(tx * TILE - x0)), int(round(ty * TILE - y0))
            ys, xs = slice(max(0, oy), min(h, oy + TILE)), slice(max(0, ox), min(w, ox + TILE))
            canvas[ys, xs] = img[ys.start - oy:ys.stop - oy, xs.start - ox:xs.stop - ox]
    im = Image.fromarray(np.clip(canvas, 0, 255).astype("u1"))
    if dunes is not None:
        d = ImageDraw.Draw(im)
        for ring in dunes:
            px, py = lonlat_to_px(ring[:, 0], ring[:, 1], z)
            pts = list(zip((px - x0).tolist(), (py - y0).tolist()))
            if len(pts) > 2 and any(0 <= a < w and 0 <= b < h for a, b in pts):
                d.line(pts + [pts[0]], fill=(0, 255, 255), width=2)
    return im, tiles, canvas


def seam_metric(canvas, tiles, x0, y0):
    """median |jump| across tile edges / median |neighbour difference| inside tiles (grey levels)."""
    g = canvas.mean(-1)
    dx = np.abs(np.diff(g, axis=1)); dy = np.abs(np.diff(g, axis=0))
    edge_cols = sorted({int(round(tx * TILE - x0)) for tx, _, _ in tiles if 0 < round(tx * TILE - x0) < g.shape[1]})
    edge_rows = sorted({int(round(ty * TILE - y0)) for _, ty, _ in tiles if 0 < round(ty * TILE - y0) < g.shape[0]})
    jumps = np.concatenate([dx[:, c - 1] for c in edge_cols] + [dy[r - 1, :] for r in edge_rows]) if (edge_cols or edge_rows) else np.array([np.nan])
    mask = np.ones(dx.shape, bool)
    for c in edge_cols: mask[:, c - 1] = False
    inner = np.concatenate([dx[mask], dy.ravel()])
    return float(np.median(jumps)), float(np.median(inner)), float(np.percentile(jumps, 95)), float(np.percentile(inner, 95))


def view_requests(service, lon, lat, z, w=1280, h=800, workers=6):
    """unique source tiles for one view and the wall time with `workers` parallel fetches (cold cache)."""
    cx, cy = lonlat_to_px(lon, lat, z)
    x0, y0 = cx - w / 2, cy - h / 2
    urls = set(); n_out = 0
    for ty in range(max(0, int(y0 // TILE)), min(2 ** z - 1, int((y0 + h) // TILE)) + 1):
        for tx in range(int(x0 // TILE), int((x0 + w) // TILE) + 1):
            n_out += 1
            p = plan_tile(z, tx % 2 ** z, ty, MAXLEVEL[service])
            for r in range(p["r0"], p["r1"] + 1):
                for c in range(p["c0"], p["c1"] + 1):
                    urls.add(f"{BASE}/{service}/MapServer/tile/{p['level']}/{r}/{c}")
    t = time.time()
    with ThreadPoolExecutor(workers) as ex:
        codes = list(ex.map(lambda u: requests.get(u, timeout=60).status_code, sorted(urls)))
    return {"service": service, "z": z, "lat": lat, "lon": lon, "output_tiles": n_out, "source_tiles": len(urls),
            "missing": sum(c != 200 for c in codes), "wall_s": round(time.time() - t, 2)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shp", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--ts-plans", default=None)
    a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    report = {}
    if a.ts_plans:
        dev = 0.0
        for t in json.loads(Path(a.ts_plans).read_text()):
            p = plan_tile(t["z"], t["x"], t["y"], 12)
            assert all(p[k] == t[k] for k in ("level", "c0", "c1", "r0", "r1")), t
            dev = max(dev, abs(p["sx"] - t["sx"]), abs(p["sw"] - t["sw"]), *[abs(p["rows"][j] - t["rows"][i]) for i, j in enumerate((0, 255, 511))])
        report["ts_python_plan_max_abs_diff_px"] = dev
    import geopandas as gpd
    g = gpd.read_file(a.shp)
    rings = []
    for geom in g.geometry:
        for poly in (geom.geoms if geom.geom_type == "MultiPolygon" else [geom]):
            rings.append(np.asarray(poly.exterior.coords))
    views = [("nili_patera", 67.0, 9.0), ("proctor", 30.4, -47.4)]
    report["views"] = []
    for name, lon, lat in views:
        for service, z in (("CTX1", 8), ("CTX1", 10), ("MDIM", 6)):
            t0 = time.time(); r0 = STATS["requests"]
            im, tiles, canvas = render_view(service, lon, lat, z, dunes=rings)
            cx, cy = lonlat_to_px(lon, lat, z)
            seams = seam_metric(canvas, tiles, cx - 640, cy - 400)
            fn = f"esri_{service}_{name}_z{z}.png"
            im.save(out / fn)
            report["views"].append({"file": fn, "service": service, "z": z, "lon": lon, "lat": lat, "output_tiles": len(tiles),
                                    "source_requests": STATS["requests"] - r0, "levels": sorted({p["level"] for _, _, p in tiles}),
                                    "seam_jump_median": seams[0], "inner_diff_median": seams[1], "seam_jump_p95": seams[2], "inner_diff_p95": seams[3],
                                    "render_s_sequential": round(time.time() - t0, 1)})
            print(report["views"][-1], flush=True)
    report["request_latency"] = [view_requests(s, lon, lat, z) for s, lon, lat, z in
                                 (("CTX1", 67, 9, 4), ("CTX1", 67, 9, 7), ("CTX1", 67, 9, 10), ("CTX1", 160, 75, 7), ("MDIM", 67, 9, 5))]
    report["fetch_stats"] = STATS
    (out / "esri_report.json").write_text(json.dumps(report, indent=1))
    print(json.dumps(report["request_latency"], indent=0))


if __name__ == "__main__":
    main()
