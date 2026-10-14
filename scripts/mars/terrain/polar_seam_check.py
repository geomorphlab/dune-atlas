"""Decoded seam check of the globe hillshade cap (app/src/mars/map/polarcap.ts) against the terrarium tiles.

For a tile zoom z, the top tile row (y = 0) of the local terrarium archive is shaded exactly as MapLibre 5
does it (hillshade_prepare: 3 x 3 Sobel on the DEM tile, x tileSize / 2^(e + 28.2562 - z), clamp to +-4;
hillshade: / cos(lat), 'standard' method with the atlas paint), at the tile pixel rows next to 85.0511 deg.
The cap is shaded with the polarcap.ts maths from the polar AEQD DEM texture of the level the app picks for
that zoom, at the same longitudes just poleward of the seam. Reported per zoom: mean / p95 |delta RGB| across
the seam, and the same statistic between two adjacent tile rows (natural pixel-to-pixel variation) for scale.

    conda run -n dune-atlas-tiles python scripts/mars/terrain/polar_seam_check.py \
        --devroot staging/mars/devroot --out staging/mars/terrain/polar_seam_check.json --png seam.png
"""
import argparse
import io
import json
import math
import os

import numpy as np
from PIL import Image

R = 3396190.0
C_ML = 40075016.6855785
MERC = 85.0511287798066
RHO = 90 - 84.95
PAINT = dict(exaggeration=0.65, shadow="#000000", highlight="#8d949c", accent="#2a2f35", direction=335.0, background="#1b1f24")


def hexc(c):
    v = int(c.lstrip("#"), 16)
    return np.array([(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255, 1.0])


def terr(a):
    a = a.astype("f8")
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768


def exag(z):
    f = 0.4 if z < 2 else 0.35 if z < 4.5 else 0.3
    return (z - 15) * f if z < 15 else 0.0


def shade(deriv, bearing=0.0):
    """MapLibre standard_hillshade + background; deriv (..., 2) already / cos(lat)."""
    az = math.radians(PAINT["direction"]) + bearing + math.pi
    slope = np.arctan(0.625 * np.hypot(deriv[..., 0], deriv[..., 1]))
    aspect = np.where(deriv[..., 0] != 0, np.arctan2(deriv[..., 1], -deriv[..., 0]), np.pi / 2 * np.sign(deriv[..., 1] + 1e-30))
    it = PAINT["exaggeration"]
    base = 1.875 - it * 1.75
    ss = (base ** slope - 1) / (base ** (np.pi / 2) - 1) * (np.pi / 2)
    acc = np.cos(ss)
    ci = min(max(it * 2, 0), 1)
    sh, hi, ac, bg = (hexc(PAINT[k]) for k in ("shadow", "highlight", "accent", "background"))
    s = np.abs(np.mod((aspect + az) / np.pi + 0.5, 2) - 1)
    accent_color = (1 - acc)[..., None] * ac * ci
    shade_color = (sh + (hi - sh) * s[..., None]) * np.sin(ss)[..., None] * ci
    hs = accent_color * (1 - shade_color[..., 3:4]) + shade_color
    return hs + bg * (1 - hs[..., 3:4])


def tile_row_colours(pm, z, row):
    """colours (n_lon, 4) and lon of the pixel row `row` (1..) of the top tile row at zoom z, MapLibre maths."""
    from pmtiles.reader import Reader, MmapSource
    n = 2 ** z
    with open(pm, "rb") as fh:
        r = Reader(MmapSource(fh))
        tiles = [terr(np.asarray(Image.open(io.BytesIO(r.get(z, x, 0))).convert("RGB"))) for x in range(n)]
    D = np.concatenate(tiles, axis=1)                    # (512, 512 n), periodic in x
    D = np.concatenate([D[:, -1:], D, D[:, :1]], axis=1)
    ts = 512
    i = row
    a, b, c = D[i - 1, :-2], D[i - 1, 1:-1], D[i - 1, 2:]
    d, f = D[i, :-2], D[i, 2:]
    g, h, ii = D[i + 1, :-2], D[i + 1, 1:-1], D[i + 1, 2:]
    der = np.stack([(c + 2 * f + ii) - (a + 2 * d + g), (g + 2 * h + ii) - (a + 2 * b + c)], -1) * ts / 2 ** (exag(z) + 28.2562 - z)
    der = np.clip(der, -4, 4)
    yn = (i + 0.5) / (ts * n)
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * yn))))
    der = der / math.cos(math.radians(lat))
    lon = -180 + (np.arange(ts * n) + 0.5) / (ts * n) * 360
    return shade(der), lon, lat


def cap_level(z, sizes=(256, 512, 1024, 2048, 4096)):
    tile_px = 2 * math.pi * R * math.cos(math.radians(MERC)) / (512 * 2 ** z)
    for N in sizes:
        if 2 * math.radians(RHO) * R / N <= tile_px * 1.0001:
            return N
    return sizes[-1]


def cap_colours(tex_path, N, lon, lat, z):
    D = terr(np.asarray(Image.open(tex_path).convert("RGB")))
    px = 2 * math.radians(RHO) * R / N
    rr = (90 - lat) / RHO
    u = 0.5 + 0.5 * rr * np.sin(np.radians(lon))
    v = 0.5 + 0.5 * rr * np.cos(np.radians(lon))
    j = np.clip(np.floor(u * N).astype(int), 1, N - 2)
    i = np.clip(np.floor(v * N).astype(int), 1, N - 2)
    e = lambda di, dj: D[i + di, j + dj]
    gu = ((e(-1, 1) + 2 * e(0, 1) + e(1, 1)) - (e(-1, -1) + 2 * e(0, -1) + e(1, -1))) / (8 * px)
    gv = ((e(1, -1) + 2 * e(1, 0) + e(1, 1)) - (e(-1, -1) + 2 * e(-1, 0) + e(-1, 1))) / (8 * px)
    lo = np.radians(lon)
    east = np.stack([np.cos(lo), -np.sin(lo)], -1)
    south = np.stack([np.sin(lo), np.cos(lo)], -1)
    G = np.stack([gu * east[:, 0] + gv * east[:, 1], gu * south[:, 0] + gv * south[:, 1]], -1)
    cl = math.cos(math.radians(lat))
    der = np.clip(G * cl * (2 * math.pi * R / C_ML) / 2 ** exag(z), -4, 4) / cl
    return shade(der)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--devroot", default="staging/mars/devroot")
    ap.add_argument("--out", required=True)
    ap.add_argument("--png")
    a = ap.parse_args()
    base = os.path.join(a.devroot, "dune-atlas", "mars", "v1", "basemaps")
    pm = os.path.join(base, "hrsc-mola-terrarium.pmtiles")
    res, strips = {}, []
    for z in (2, 3, 4, 5):
        tile1, lon, lat1 = tile_row_colours(pm, z, 1)
        tile3, _, lat3 = tile_row_colours(pm, z, 3)
        N = cap_level(z)
        lat_c = MERC + (MERC - lat1)                         # mirror of the first tile row across the seam
        cap = cap_colours(os.path.join(base, "hrsc-mola-polar", f"n-{N}.webp"), N, lon, lat_c, z)
        d_seam = np.abs(cap[:, :3] - tile1[:, :3]) * 255
        d_rows = np.abs(tile3[:, :3] - tile1[:, :3]) * 255
        res[z] = {"cap_texture": N, "tile_row_lat": round(lat1, 5), "cap_lat": round(lat_c, 5),
                  "seam_mean_abs_dRGB": round(float(d_seam.mean()), 2), "seam_p95_abs_dRGB": round(float(np.percentile(d_seam, 95)), 2),
                  "adjacent_tile_rows_mean_abs_dRGB": round(float(d_rows.mean()), 2),
                  "adjacent_tile_rows_p95_abs_dRGB": round(float(np.percentile(d_rows, 95)), 2),
                  "mean_tile_RGB": [round(float(v), 1) for v in tile1[:, :3].mean(0) * 255],
                  "mean_cap_RGB": [round(float(v), 1) for v in cap[:, :3].mean(0) * 255]}
        strips.append((z, tile1, cap))
    with open(a.out, "w") as f:
        json.dump(res, f, indent=1)
    print(json.dumps(res, indent=1))
    if a.png:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, axs = plt.subplots(len(strips), 1, figsize=(10, 1.4 * len(strips)))
        for ax, (z, t, c) in zip(axs, strips):
            k = np.linspace(0, len(t) - 1, 1440).astype(int)
            img = np.stack([np.repeat(t[k, :3][None], 12, 0), np.repeat(c[k, :3][None], 12, 0)])
            ax.imshow(np.concatenate([img[1], img[0]], 0), aspect="auto", extent=[-180, 180, 0, 2], interpolation="nearest")
            ax.set_yticks([0.5, 1.5]); ax.set_yticklabels(["tile (85.05° −)", "cap (85.05° +)"], fontsize=7)
            ax.set_title(f"z{z}: cap texture {res[z]['cap_texture']} px; mean |ΔRGB| seam {res[z]['seam_mean_abs_dRGB']}, "
                         f"adjacent tile rows {res[z]['adjacent_tile_rows_mean_abs_dRGB']}", fontsize=8)
            ax.tick_params(labelsize=7)
        axs[-1].set_xlabel("longitude (°E)", fontsize=8)
        fig.suptitle("Hillshade colour on both sides of the 85.05° N seam (MapLibre maths; tiles vs globe cap)", fontsize=9)
        fig.tight_layout()
        fig.savefig(a.png, dpi=130)


if __name__ == "__main__":
    main()
