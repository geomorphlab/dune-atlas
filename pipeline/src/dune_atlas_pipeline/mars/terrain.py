"""Mars terrain: MOLA–HRSC blended DEM -> Terrarium WebP PMTiles (hillshade basemap), a native-resolution
GeoZarr elevation pyramid (fields/elevation.zarr) and the 2-degree cell mean elevation (cells-aux elev_mean).

Source DEM (read in place, never modified): USGS Astrogeology "Mars MGS MOLA - MEX HRSC Blended DEM Global
200m v2", GeoTIFF int16 metres (scale 1, offset 0, nodata -32768), 106,694 x 53,347 px, geographic
(planetocentric lon/lat on the Mars 2000 sphere, R = 3,396,190 m), pixel size 0.003374120830641 deg
(= 200 m at the equator), outer edges lon -180 ... 179.99845, lat 90 ... -89.99922, uncompressed strips.

Tile geometry
-------------
MapLibre computes tile bounds with spherical Web-Mercator math on lon/lat, so Mars lon/lat is treated as if
it were EPSG:4326 and mapped to EPSG:3857 XYZ tiles (no datum shift; the radius does not enter tile
geometry). Tiles are 512 px; pixel (i, j) of tile (z, x, y) has its centre at global pixel coordinates
X = 512 x + j + 1/2, Y = 512 y + i + 1/2 on a 512 * 2^z square: lon = 360 X / N - 180,
lat = atan(sinh(pi (1 - 2 Y / N))). Coverage is the Web-Mercator square (|lat| <= 85.0511 deg).

Resampling: the maximum zoom (z8, 0.00275 deg/px at the equator, finer than the 0.00337 deg DEM pixel at
every latitude) is sampled bilinearly from the DEM at pixel centres (nodata-aware, longitude periodic);
every lower zoom is the 2 x 2 mean of the zoom above in float32 (Mercator pixel space), i.e. an average
filter for all downsampling. Values are quantised only at encoding time.

Terrarium: v = elevation + 32768; R = floor(v / 256), G = floor(v) mod 256, B = floor(256 frac(v)); decoded
elevation = (R * 256 + G + B / 256) - 32768 m. The atlas rounds to `QUANT_M` (1 m: the DEM is integer
metres) before encoding, so B = 0 and |decoded - bilinear DEM| <= 0.5 m. Lossless WebP (PIL).
"""
from __future__ import annotations

import io
import json
import math
import os
import time

import numpy as np

DEM_PATH = "/g/data/k10/ag5517/omega-claude/data/raw_mola/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif"
R_MARS_2000 = 3396190.0           # Mars 2000 sphere radius of the DEM / dune shapefile (m)
TILE = 512
MAXZOOM = 8
BLOCK_ZOOM = 4                    # unit of parallel work: one z4 tile and its subtree to MAXZOOM
QUANT_M = 1.0                     # vertical quantisation of the terrarium tiles (m)
# PIL save kwargs (lossless: quality/method = effort). Pilot (docs/validation-mars-terrain.md): q75/m4 is 1-2 %
# larger than q100/m6 and 19x faster to encode (0.12 vs 2.2 s per 512 px tile).
WEBP = {"lossless": True, "quality": 75, "method": 4}
MERC_LAT = 85.0511287798066

DEM_ATTRIBUTION = {   # copied from the USGS product page (fetched 2026-10-13)
    "source": ("Mars MGS MOLA – MEX HRSC Blended DEM Global 200m v2 (USGS Astrogeology Science Center; originators "
               "DLR, NASA, Goddard Space Flight Center; publication date 2018-01-31)"),
    "citation": ("Fergason, R. L, Hare, T. M., & Laura, J. (2018). HRSC and MOLA Blended Digital Elevation Model "
                 "at 200m v2. Astrogeology PDS Annex, U.S. Geological Survey. "
                 "https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m"),
    "url": "https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m",
    "licence": "CC0 (MOLA), CC BY-SA 3.0 IGO (HRSC)",
    "use_constraints": "Please cite authors",
    "changes": ("Processed for the atlas: Web-Mercator Terrarium tiles (bilinear at z8, 2x2 means below, 1 m "
                "rounding) and a 1/64-degree area-mean grid; Mars 2000 planetocentric lon/lat used as EPSG:4326."),
}
ELEV_DEG = 1.0 / 64               # native resolution of fields/elevation.zarr (deg)


# ----------------------------------------------------------------------------- terrarium
def terrarium_encode(elev: np.ndarray, quant: float | None = QUANT_M) -> np.ndarray:
    """float elevation (m) -> uint8 RGB (..., 3). NaN -> 0 m. Values are clipped to the terrarium range."""
    e = np.asarray(elev, "f8")
    e = np.where(np.isfinite(e), e, 0.0)
    if quant:
        e = np.round(e / quant) * quant
    v = np.clip(e + 32768.0, 0.0, 65535.99609375)
    iv = np.floor(v)
    r = (iv // 256).astype(np.uint8)
    g = (iv % 256).astype(np.uint8)
    b = np.floor((v - iv) * 256).astype(np.uint8)
    return np.stack([r, g, b], axis=-1)


def terrarium_decode(rgb: np.ndarray) -> np.ndarray:
    rgb = np.asarray(rgb)
    return (rgb[..., 0].astype("f8") * 256 + rgb[..., 1] + rgb[..., 2] / 256.0 - 32768.0)


def webp_bytes(rgb: np.ndarray, **kw) -> bytes:
    from PIL import Image
    buf = io.BytesIO()
    Image.fromarray(np.ascontiguousarray(rgb), "RGB").save(buf, "WEBP", **{**WEBP, **kw})
    return buf.getvalue()


def webp_decode(data: bytes) -> np.ndarray:
    from PIL import Image
    return np.asarray(Image.open(io.BytesIO(data)).convert("RGB"))


# ----------------------------------------------------------------------------- Web-Mercator geometry
def merc_lat(z: int, Y) -> np.ndarray:
    """Latitude (deg) at global pixel coordinate Y (0 = north edge) of a 512 * 2^z square."""
    n = TILE * 2 ** z
    return np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * np.asarray(Y, "f8") / n))))


def merc_lon(z: int, X) -> np.ndarray:
    return np.asarray(X, "f8") / (TILE * 2 ** z) * 360.0 - 180.0


def tile_centres(z: int, x: int, y: int, ntx: int = 1):
    """(lat[512], lon[512 * ntx]) of pixel centres of tiles (z, x..x+ntx-1, y)."""
    off = np.arange(TILE) + 0.5
    lat = merc_lat(z, TILE * y + off)
    lon = merc_lon(z, TILE * x + np.arange(TILE * ntx) + 0.5)
    return lat, lon


def mean2(a: np.ndarray) -> np.ndarray:
    """2 x 2 mean (float32; NaN if any of the four is NaN - the DEM has no nodata in practice)."""
    h, w = a.shape
    return a.reshape(h // 2, 2, w // 2, 2).mean(axis=(1, 3), dtype="f8").astype("f4")


# ----------------------------------------------------------------------------- DEM access
def fill_nan(A: np.ndarray, max_iter: int = 10000) -> np.ndarray:
    """Fill NaN gaps by repeated 3 x 3 mean of the valid neighbours (inward dilation). All-NaN -> NaN."""
    A = A.astype("f4", copy=True)
    nan = np.isnan(A)
    it = 0
    while nan.any() and (~nan).any() and it < max_iter:
        V = np.pad(np.where(nan, 0, A), 1)
        M = np.pad((~nan).astype("f4"), 1)
        h, w = A.shape
        s = sum(V[1 + di:1 + di + h, 1 + dj:1 + dj + w] for di in (-1, 0, 1) for dj in (-1, 0, 1))
        n = sum(M[1 + di:1 + di + h, 1 + dj:1 + dj + w] for di in (-1, 0, 1) for dj in (-1, 0, 1))
        new = nan & (n > 0)
        A[new] = s[new] / n[new]
        nan &= ~new
        it += 1
    return A


class DEM:
    """Geographic DEM with outer edges (x0, y0), pixel size res (deg, square), longitude periodic.
    Backed by a rasterio dataset (`path`) or an in-memory array (`array`, tests)."""

    def __init__(self, path: str | None = DEM_PATH, array: np.ndarray | None = None,
                 x0: float = -180.0, y0: float = 90.0, res: float | None = None, nodata=-32768):
        self.ds = None
        if array is not None:
            self.arr = array
            self.H, self.W = array.shape
            self.x0, self.y0 = x0, y0
            self.res = res if res is not None else 360.0 / self.W
            self.nodata = nodata
        else:
            import rasterio
            self.ds = rasterio.open(path)
            t = self.ds.transform
            assert abs(t.a + t.e) < 1e-15 and t.b == 0 and t.d == 0, t
            self.H, self.W = self.ds.height, self.ds.width
            self.x0, self.y0, self.res = t.c, t.f, t.a
            self.nodata = self.ds.nodata
        self.bytes_read = 0
        self.read_s = 0.0
        self.nodata_px = 0
        self.filled_px = 0
        self.fill = True

    def info(self) -> dict:
        d = {"width": self.W, "height": self.H, "x0": self.x0, "y0": self.y0, "res_deg": self.res,
             "x1": self.x0 + self.W * self.res, "y1": self.y0 - self.H * self.res, "nodata": self.nodata}
        if self.ds is not None:
            s = self.ds
            d.update(dtype=s.dtypes[0], crs_wkt=s.crs.to_wkt(), scales=list(s.scales), offsets=list(s.offsets),
                     block_shapes=[list(b) for b in s.block_shapes], compression=str(s.compression),
                     res_m_equator=self.res * math.pi / 180 * R_MARS_2000, tags=s.tags(), band_tags=s.tags(1))
        return d

    def _read(self, r0: int, r1: int, c0: int, c1: int) -> np.ndarray:
        """rows r0..r1-1 (0 <= r0 < r1 <= H), columns c0..c1-1 within [0, W]."""
        t0 = time.time()
        if self.ds is None:
            a = self.arr[r0:r1, c0:c1]
        else:
            from rasterio.windows import Window
            a = self.ds.read(1, window=Window(c0, r0, c1 - c0, r1 - r0))
        self.bytes_read += a.nbytes
        self.read_s += time.time() - t0
        return a

    def read(self, r0: int, r1: int, c0: int, c1: int) -> np.ndarray:
        """float32 rows r0..r1 inclusive (clamped to the raster), columns c0..c1 inclusive with periodic
        wrap (c may be < 0 or >= W); nodata -> NaN."""
        r0, r1 = max(r0, 0), min(r1, self.H - 1)
        parts = []
        c = c0
        while c <= c1:
            cm = c % self.W
            take = min(c1 - c + 1, self.W - cm)
            parts.append(self._read(r0, r1 + 1, cm, cm + take))
            c += take
        a = parts[0] if len(parts) == 1 else np.concatenate(parts, axis=1)
        a = a.astype("f4")
        if self.nodata is not None:
            bad = a == self.nodata
            n = int(bad.sum())
            if n:
                self.nodata_px += n
                a[bad] = np.nan
        return a

    def sample_bilinear(self, lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
        """(len(lat), len(lon)) float32 bilinear sample at pixel-centre positions (separable grid).
        Rows clamp at the raster edges; columns are periodic. NaN neighbours get zero weight."""
        r = (self.y0 - np.asarray(lat, "f8")) / self.res - 0.5
        r = np.clip(r, 0.0, self.H - 1.0)
        i0 = np.minimum(np.floor(r).astype(np.int64), self.H - 2)
        fr = (r - i0).astype("f4")
        c = (np.asarray(lon, "f8") - self.x0) / self.res - 0.5
        j0 = np.floor(c).astype(np.int64)
        fc = (c - j0).astype("f4")
        rr0, rr1 = int(i0.min()), int(i0.max()) + 1
        cc0, cc1 = int(j0.min()), int(j0.max()) + 1
        A = self.read(rr0, rr1, cc0, cc1)
        ia, ja = i0 - rr0, j0 - cc0
        if not np.isnan(A).any():
            B = A[ia] * (1 - fr)[:, None] + A[ia + 1] * fr[:, None]
            return (B[:, ja] * (1 - fc) + B[:, ja + 1] * fc).astype("f4")
        M = np.isfinite(A).astype("f4")
        V = np.where(M > 0, A, 0).astype("f4")
        out = []
        for X in (V, M):
            B = X[ia] * (1 - fr)[:, None] + X[ia + 1] * fr[:, None]
            out.append(B[:, ja] * (1 - fc) + B[:, ja + 1] * fc)
        with np.errstate(invalid="ignore", divide="ignore"):
            res = np.where(out[1] > 1e-6, out[0] / out[1], np.nan).astype("f4")
        if self.fill and np.isnan(res).any():
            # sample points whose 4 neighbours are all nodata: bilinear on a gap-filled window
            P = 32                                   # read a padded window so the fill sees real neighbours
            r0p = max(rr0 - P, 0)
            F = fill_nan(self.read(r0p, rr1 + P, cc0 - P, cc1 + P))
            ib, jb = ia + (rr0 - r0p), ja + P
            B = F[ib] * (1 - fr)[:, None] + F[ib + 1] * fr[:, None]
            g = (B[:, jb] * (1 - fc) + B[:, jb + 1] * fc).astype("f4")
            bad = np.isnan(res)
            self.filled_px += int(bad.sum())
            res[bad] = g[bad]
        return res

    def point(self, lat: float, lon: float) -> float:
        """Independent scalar bilinear sample (direct 2 x 2 read; for validation)."""
        r = min(max((self.y0 - lat) / self.res - 0.5, 0.0), self.H - 1.0)
        c = (lon - self.x0) / self.res - 0.5
        i0, j0 = min(int(math.floor(r)), self.H - 2), int(math.floor(c))
        a = self.read(i0, i0 + 1, j0, j0 + 1).astype("f8")
        fr, fc = r - i0, c - j0
        return float(a[0, 0] * (1 - fr) * (1 - fc) + a[0, 1] * (1 - fr) * fc + a[1, 0] * fr * (1 - fc)
                     + a[1, 1] * fr * fc)


# ----------------------------------------------------------------------------- rendering
def render_strip(dem: DEM, y8: int, x8: int, ntx: int, zmax: int = MAXZOOM) -> np.ndarray:
    """One row of `ntx` tiles at zmax: (512, 512 ntx) float32 bilinear DEM samples."""
    lat, lon = tile_centres(zmax, x8, y8, ntx)
    return dem.sample_bilinear(lat, lon)


def render_tile(dem: DEM, z: int, x: int, y: int, zmax: int = MAXZOOM) -> np.ndarray:
    """Tile (z, x, y) as the full pipeline makes it: zmax bilinear samples, 2 x 2 means down to z."""
    k = 2 ** (zmax - z)
    rows = []
    for t in range(k):
        s = render_strip(dem, y * k + t, x * k, k, zmax)
        for _ in range(zmax - z):
            s = mean2(s)
        rows.append(s)
    return np.concatenate(rows, axis=0)


def render_block(dem: DEM, bx: int, by: int, zb: int = BLOCK_ZOOM, zmax: int = MAXZOOM, sink=None) -> np.ndarray:
    """Render block tile (zb, bx, by) and its whole subtree to zmax. `sink(z, x, y, float32 tile)` receives
    every tile (zb..zmax). Returns the zb tile (512 x 512 float32) for the zooms below zb."""
    K = 2 ** (zmax - zb)
    nxt = None                                  # zmax-1 mosaic of the block
    if zmax > zb:
        nxt = np.empty((K // 2 * TILE, K // 2 * TILE), "f4")
    for t in range(K):
        s = render_strip(dem, by * K + t, bx * K, K, zmax)
        for k in range(K):
            sink(zmax, bx * K + k, by * K + t, s[:, k * TILE:(k + 1) * TILE])
        if nxt is not None:
            h = mean2(s)                        # 256 rows of zmax-1
            nxt[t * TILE // 2:(t + 1) * TILE // 2] = h
    if nxt is None:
        return s
    mosaic, z = nxt, zmax - 1
    while True:
        n = mosaic.shape[0] // TILE
        for i in range(n):
            for j in range(n):
                sink(z, bx * n + j, by * n + i, mosaic[i * TILE:(i + 1) * TILE, j * TILE:(j + 1) * TILE])
        if z == zb:
            return mosaic
        mosaic, z = mean2(mosaic), z - 1


def low_zoom_tiles(top: dict, zb: int = BLOCK_ZOOM, sink=None):
    """Zooms zb-1..0 from the zb tiles {(x, y): 512 x 512 float32} (2 x 2 means of mosaics)."""
    n = 2 ** zb
    mosaic = np.empty((n * TILE, n * TILE), "f4")
    for (x, y), a in top.items():
        mosaic[y * TILE:(y + 1) * TILE, x * TILE:(x + 1) * TILE] = a
    for z in range(zb - 1, -1, -1):
        mosaic = mean2(mosaic)
        m = 2 ** z
        for i in range(m):
            for j in range(m):
                sink(z, j, i, mosaic[i * TILE:(i + 1) * TILE, j * TILE:(j + 1) * TILE])


# ----------------------------------------------------------------------------- PMTiles assembly
def pmtiles_header(maxzoom: int, minzoom: int = 0) -> dict:
    from pmtiles.tile import TileType, Compression
    lat_e7 = int(round(MERC_LAT * 1e7))
    return {"tile_type": TileType.WEBP, "tile_compression": Compression.NONE, "min_zoom": minzoom,
            "max_zoom": maxzoom, "min_lon_e7": -1800000000, "min_lat_e7": -lat_e7, "max_lon_e7": 1800000000,
            "max_lat_e7": lat_e7, "center_zoom": 2, "center_lon_e7": -700000000, "center_lat_e7": -100000000}


def pmtiles_metadata(maxzoom: int, extra: dict | None = None) -> dict:
    a = DEM_ATTRIBUTION
    return {
        "name": "dune-atlas Mars MOLA–HRSC terrarium",
        "format": "webp", "type": "baselayer", "encoding": "terrarium", "tileSize": TILE,
        "minzoom": 0, "maxzoom": maxzoom,
        "description": ("Mars elevation (m) as Terrarium-encoded lossless WebP, 512 px Web-Mercator tiles in Mars "
                        "planetocentric lon/lat (Mars 2000 sphere) treated as EPSG:4326; decoded = R*256 + G + "
                        f"B/256 - 32768 m, rounded to {QUANT_M:g} m. z{maxzoom}: bilinear from the 200 m DEM; "
                        "lower zooms: 2x2 means. Coverage |lat| <= 85.05 deg."),
        "attribution": ('<a href="' + a["url"] + '" target="_blank" rel="noopener">MOLA–HRSC blended DEM v2 '
                        '(Fergason et al. 2018, USGS Astrogeology; MOLA CC0, HRSC CC BY-SA 3.0 IGO)</a>'),
        "citation": a["citation"], "source": a["source"], "license": a["licence"], "source_url": a["url"],
        **(extra or {}),
    }


class BlobSink:
    """Collects encoded tiles of one block into a binary blob file + (z, x, y, offset, length) index."""

    def __init__(self, path: str, quant=QUANT_M, webp_kw=None):
        self.path, self.quant, self.kw = path, quant, webp_kw or {}
        self.f = open(path + ".tmp", "wb")
        self.index, self.off = [], 0
        self.t_enc = 0.0
        self.stats = {}

    def __call__(self, z, x, y, a):
        t0 = time.time()
        b = webp_bytes(terrarium_encode(a, self.quant), **self.kw)
        self.t_enc += time.time() - t0
        self.f.write(b)
        self.index.append((z, x, y, self.off, len(b)))
        self.off += len(b)
        s = self.stats.setdefault(z, [0, 0, 0.0, -1e9, 1e9])
        s[0] += 1; s[1] += len(b)
        fin = a[np.isfinite(a)]
        s[2] += int(a.size - fin.size)
        if fin.size:
            s[3] = max(s[3], float(fin.max())); s[4] = min(s[4], float(fin.min()))

    def close(self):
        self.f.close()
        os.replace(self.path + ".tmp", self.path)
        with open(self.path + ".json.tmp", "w") as f:
            json.dump(self.index, f)
        os.replace(self.path + ".json.tmp", self.path + ".json")


def assemble_pmtiles(blobs: list[str], out: str, maxzoom: int, minzoom: int = 0, zmax_keep: int | None = None,
                     extra_meta: dict | None = None) -> dict:
    """Write PMTiles `out` from block blobs (tiles in tile-id order, clustered). zmax_keep: only z <= it."""
    from pmtiles.tile import zxy_to_tileid
    from pmtiles.writer import Writer
    zk = maxzoom if zmax_keep is None else zmax_keep
    entries = []
    for bi, p in enumerate(blobs):
        with open(p + ".json") as f:
            for z, x, y, off, ln in json.load(f):
                if minzoom <= z <= zk:
                    entries.append((zxy_to_tileid(z, x, y), bi, off, ln, z))
    entries.sort()
    tids = [e[0] for e in entries]
    assert len(set(tids)) == len(tids), "duplicate tile ids"
    per_zoom = {}
    fh = [open(p, "rb") for p in blobs]
    try:
        with open(out + ".tmp", "wb") as f:
            w = Writer(f)
            for tid, bi, off, ln, z in entries:
                fh[bi].seek(off)
                w.write_tile(tid, fh[bi].read(ln))
                d = per_zoom.setdefault(z, [0, 0])
                d[0] += 1; d[1] += ln
            w.finalize(pmtiles_header(zk, minzoom), pmtiles_metadata(zk, extra_meta))
    finally:
        for h in fh:
            h.close()
    os.replace(out + ".tmp", out)
    return {"tiles": len(entries), "bytes": os.path.getsize(out),
            "per_zoom": {z: {"n": n, "bytes": b} for z, (n, b) in sorted(per_zoom.items())}}


# ----------------------------------------------------------------------------- elevation grid
def elevation_grid(dem: DEM, deg: float = ELEV_DEG, band_rows: int = 64, progress=None) -> np.ndarray:
    """Area-overlap mean of the DEM on the global lon/lat grid of `deg` pixels (outer edges -180..180,
    90..-90), (180/deg, 360/deg) float32. Fractional DEM-pixel overlaps are weighted exactly; equal weight per
    DEM pixel area within a target pixel (cos(lat) variation over 1/64 deg is < 3e-4 except at the poles);
    nodata excluded; longitude periodic."""
    from ..aridity import overlap_weights
    ny, nx = int(round(180 / deg)), int(round(360 / deg))
    lat_c = 90 - (np.arange(ny) + 0.5) * deg
    lon_c = -180 + (np.arange(nx) + 0.5) * deg
    Wy = overlap_weights(dem.y0, -dem.res, dem.H, lat_c, deg / 2)
    Wx = overlap_weights(dem.x0, dem.res, dem.W, lon_c, deg / 2, periodic=True)
    Wx = Wx.tocsr().astype("f4")                 # (nx, W): A @ Wx.T == (Wx @ A.T).T
    wx_sum = np.asarray(Wx.sum(axis=1)).ravel()
    out = np.full((ny, nx), np.nan, "f4")
    for k0 in range(0, ny, band_rows):
        k1 = min(ny, k0 + band_rows)
        Wb = Wy[k0:k1]
        cols = Wb.nonzero()[1]
        if not len(cols):
            continue
        r0, r1 = int(cols.min()), int(cols.max())
        A = dem.read(r0, r1, 0, dem.W - 1)
        Wb = Wb[:, r0:r1 + 1].toarray().astype("f4")
        fin = np.isfinite(A)
        if fin.all():
            s = Wb @ np.asarray(Wx @ A.T).T
            n = Wb.sum(axis=1)[:, None] * wx_sum[None, :]
            out[k0:k1] = s / n
        else:
            s = Wb @ np.asarray(Wx @ np.where(fin, A, 0).T).T
            n = Wb @ np.asarray(Wx @ fin.astype("f4").T).T
            with np.errstate(invalid="ignore", divide="ignore"):
                out[k0:k1] = np.where(n > 0, s / n, np.nan)
        if progress:
            progress(k1, ny)
    return out


def cell_mean_elevation(elev: np.ndarray, deg: float = ELEV_DEG, cell_deg: float = 2.0) -> np.ndarray:
    """Area-weighted mean of the `deg` grid over 2-degree cells, contract orientation (rows lat 89 -> -89,
    cols lon -179 -> 179): weights = exact spherical area of each fine row (sin lat difference)."""
    ny, nx = elev.shape
    f = int(round(cell_deg / deg))
    edges = np.radians(90 - np.arange(ny + 1) * deg)
    w = (np.sin(edges[:-1]) - np.sin(edges[1:]))[:, None].astype("f8")
    fin = np.isfinite(elev)
    v = np.where(fin, elev, 0).astype("f8") * w
    ww = fin * w
    s = v.reshape(ny // f, f, nx // f, f).sum((1, 3))
    n = ww.reshape(ny // f, f, nx // f, f).sum((1, 3))
    with np.errstate(invalid="ignore", divide="ignore"):
        return np.where(n > 0, s / n, np.nan).astype("f4")


def elevation_var_attrs() -> dict:
    a = DEM_ATTRIBUTION
    return {"long_name": "Elevation", "long_name_latex": r"z", "units": "m",
            "description": ("Elevation relative to the Mars areoid (MOLA datum), MOLA–HRSC blended DEM v2, "
                            "area mean over 1/64 deg pixels, rounded to 1 m (coarser levels: means, <= 0.5 m "
                            "rounding)."),
            "colormap": "greys", "clim": [-8000, 12000], "log_scale": False, "display_transform": "none",
            "cyclic": False, "resampling": "area-overlap mean", "source": a["source"], "licence": a["licence"]}


def build_elevation_store(elev: np.ndarray, out: str, keepbits: int = 14, chunk: int = 512,
                          shard_chunks: int = 8) -> dict:
    """fields/elevation.zarr via Earth's nativepyramid (same conventions as fields/aridity.zarr). Level 0 is
    rounded to integer metres; keepbits 14 keeps every integer |z| < 32768 exactly and rounds coarse-level
    means to <= 0.5 m."""
    from ..nativepyramid import common_factors, write_native_pyramid
    ny, nx = elev.shape
    deg = 180.0 / ny
    a = DEM_ATTRIBUTION
    root_attrs = {
        "title": "dune-atlas Mars field: elevation (MOLA–HRSC blended DEM v2), 1/64 degree",
        "source": a["citation"] + " " + a["url"], "license": a["licence"], "attribution": a, "body": "mars",
        "dune_atlas:crs_note": ("Mars 2000 planetocentric lon/lat (sphere R = 3,396,190 m) labelled EPSG:4326 for "
                                "the web map, as all Mars atlas layers (no datum shift)."),
        "dune_atlas:resampling": "area-overlap mean of 200 m DEM pixels; coarser levels count-weighted means",
        "dune_atlas:threshold_independent": True,
    }
    st = write_native_pyramid(out, "elevation", np.round(elev).astype("f4"), x0=-180.0, y0=90.0, dx=deg, dy=-deg,
                              factors=common_factors(ny, nx), var_attrs=elevation_var_attrs(),
                              root_attrs=root_attrs, zarr_layer_hint={"clim": [-8000, 12000], "colormap": "greys"},
                              keepbits=keepbits, chunk=chunk, shard_chunks=shard_chunks)
    return st


# ----------------------------------------------------------------------------- pilot / jobs
def _status(path, **kw):
    if not path:
        return
    with open(path + ".tmp", "w") as f:
        json.dump({"t": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), **kw}, f)
    os.replace(path + ".tmp", path)


def _log(path, rec):
    if path:
        with open(path, "a") as f:
            f.write(json.dumps(rec) + "\n")
            f.flush()


def _pilot_one(args):
    """Render + encode one sample tile with several encodings; independent point checks at zmax."""
    z, x, y, variants, npts, dem_path = args
    dem = DEM(dem_path)
    t0 = time.time()
    a = render_tile(dem, z, x, y)
    t_render = time.time() - t0
    rec = {"z": z, "x": x, "y": y, "render_s": round(t_render, 3), "read_s": round(dem.read_s, 3),
           "read_mb": round(dem.bytes_read / 1e6, 2), "nan": int(np.isnan(a).sum()),
           "min": float(np.nanmin(a)), "max": float(np.nanmax(a)), "nodata_px": dem.nodata_px}
    for name, (q, kw) in variants.items():
        t1 = time.time()
        b = webp_bytes(terrarium_encode(a, q), **kw)
        rec[name] = {"bytes": len(b), "enc_s": round(time.time() - t1, 3)}
        if name == "1m_q100_m6":
            dec = terrarium_decode(webp_decode(b))
            rec["max_abs_decode_vs_float"] = float(np.nanmax(np.abs(dec - a)))
    if z == MAXZOOM and npts:
        rng = np.random.default_rng(z * 100003 + x * 1009 + y)
        ii, jj = rng.integers(0, TILE, npts), rng.integers(0, TILE, npts)
        lat, lon = tile_centres(z, x, y)
        dec = terrarium_decode(webp_decode(webp_bytes(terrarium_encode(a, QUANT_M))))
        d = [abs(dec[i, j] - dem.point(lat[i], lon[j])) for i, j in zip(ii, jj)]
        rec["point_check_max_abs_m"] = float(max(d))
    return rec


def pilot(out_dir: str, dem_path: str = DEM_PATH, workers: int = 12, npts: int = 20) -> dict:
    """Sample tiles at z4..z8 on regular strides (uniform over the Mercator square), several encodings."""
    from multiprocessing import Pool
    os.makedirs(out_dir, exist_ok=True)
    dem = DEM(dem_path)
    info = dem.info()
    with open(os.path.join(out_dir, "dem_info.json"), "w") as f:
        json.dump(info, f, indent=1, default=str)
    strides = {4: (4, 4), 5: (8, 4), 6: (8, 8), 7: (16, 16), 8: (16, 16)}
    variants = {"1m_q100_m6": (1.0, {"quality": 100, "method": 6}),
                "1m_q75_m4": (1.0, {"quality": 75, "method": 4}),
                "0.25m_q100_m6": (0.25, {"quality": 100, "method": 6}),
                "1m_q50_m2": (1.0, {"quality": 50, "method": 2})}
    jobs = []
    for z, (sx, sy) in strides.items():
        n = 2 ** z
        for y in range(sy // 2, n, sy):
            for x in range(sx // 2, n, sx):
                jobs.append((z, x, y, variants, npts, dem_path))
    jobs.sort(key=lambda j: j[0])                        # big (low-zoom) tiles first
    t0 = time.time()
    recs = []
    prog = os.path.join(out_dir, "progress.jsonl")
    with Pool(workers) as p:
        for r in p.imap_unordered(_pilot_one, jobs):
            recs.append(r)
            _log(prog, r)
    wall = time.time() - t0
    summ = {"dem": info, "wall_s": round(wall, 1), "workers": workers, "n_tiles": len(recs), "per_zoom": {}}
    for z in sorted(strides):
        rz = [r for r in recs if r["z"] == z]
        d = {"n": len(rz), "render_s_mean": float(np.mean([r["render_s"] for r in rz])),
             "read_s_mean": float(np.mean([r["read_s"] for r in rz])),
             "nan_px": int(sum(r["nan"] for r in rz)), "nodata_px": int(sum(r["nodata_px"] for r in rz)),
             "min": min(r["min"] for r in rz), "max": max(r["max"] for r in rz)}
        for v in variants:
            b = np.array([r[v]["bytes"] for r in rz], "f8")
            d[v] = {"bytes_mean": float(b.mean()), "bytes_max": float(b.max()),
                    "enc_s_mean": float(np.mean([r[v]["enc_s"] for r in rz])),
                    "extrapolated_zoom_bytes": float(b.mean() * 4 ** z)}
        d["max_abs_decode_vs_float"] = max(r["max_abs_decode_vs_float"] for r in rz)
        if z == MAXZOOM:
            d["point_check_max_abs_m"] = max(r["point_check_max_abs_m"] for r in rz)
        summ["per_zoom"][z] = d
    for v in variants:
        tot = sum(summ["per_zoom"][z][v]["extrapolated_zoom_bytes"] for z in strides)
        low = summ["per_zoom"][4][v]["extrapolated_zoom_bytes"] * (1 / 3)   # z0-3 ~ z4/3
        summ[f"extrap_total_z0_8_bytes[{v}]"] = tot + low
        summ[f"extrap_total_z0_7_bytes[{v}]"] = tot + low - summ["per_zoom"][8][v]["extrapolated_zoom_bytes"]
    # full-job cost estimate: zmax renders (render_s of z8 tiles) + every tile encoded
    r8 = summ["per_zoom"][MAXZOOM]["render_s_mean"]
    n_all = sum(4 ** z for z in range(MAXZOOM + 1))
    for v in variants:
        enc = np.mean([summ["per_zoom"][z][v]["enc_s_mean"] for z in strides])
        summ[f"est_core_hours_z0_8[{v}]"] = (4 ** MAXZOOM * r8 + n_all * enc) / 3600
    with open(os.path.join(out_dir, "pilot_summary.json"), "w") as f:
        json.dump(summ, f, indent=1, default=str)
    return summ


def _block_job(args):
    bx, by, dem_path, blob_dir, zb, zmax, quant = args
    dem = DEM(dem_path)
    path = os.path.join(blob_dir, f"blk_{zb}_{bx}_{by}.bin")
    t0 = time.time()
    sink = BlobSink(path, quant=quant)
    top = render_block(dem, bx, by, zb, zmax, sink)
    sink.close()
    return {"bx": bx, "by": by, "s": round(time.time() - t0, 1), "enc_s": round(sink.t_enc, 1),
            "read_s": round(dem.read_s, 1), "read_mb": round(dem.bytes_read / 1e6, 1), "nodata_px": dem.nodata_px,
            "filled_px": dem.filled_px, "stats": sink.stats, "path": path}, top


def build_tiles(work: str, out: str, dem_path: str = DEM_PATH, workers: int = 24, zb: int = BLOCK_ZOOM,
                zmax: int = MAXZOOM, quant: float = QUANT_M, low_out: str | None = None, low_zmax: int = 5,
                limit: int | None = None) -> dict:
    """Full terrarium PMTiles: (zb, bx, by) blocks in parallel -> blobs; z<zb from the block tops; assemble."""
    from multiprocessing import Pool
    blob_dir = os.path.join(work, "blobs")
    os.makedirs(blob_dir, exist_ok=True)
    status, prog = os.path.join(work, "status.json"), os.path.join(work, "progress.jsonl")
    n = 2 ** zb
    blocks = [(bx, by) for by in range(n) for bx in range(n)]
    if limit:
        blocks = blocks[:limit]
    tops, recs = {}, []
    t0 = time.time()
    todo = []
    for bx, by in blocks:          # resume: blocks whose blob + index + top exist are kept
        p = os.path.join(blob_dir, f"blk_{zb}_{bx}_{by}.bin")
        if os.path.exists(p + ".json") and os.path.exists(p + ".top.npy"):
            tops[(bx, by)] = np.load(p + ".top.npy")
        else:
            todo.append((bx, by, dem_path, blob_dir, zb, zmax, quant))
    _status(status, phase="blocks", done=len(tops), total=len(blocks), elapsed_s=0)
    with Pool(workers) as p:
        for rec, top in p.imap_unordered(_block_job, todo):
            np.save(rec["path"] + ".top.npy", top)
            tops[(rec["bx"], rec["by"])] = top
            recs.append(rec)
            _log(prog, {k: v for k, v in rec.items() if k != "path"})
            _status(status, phase="blocks", done=len(tops), total=len(blocks), elapsed_s=round(time.time() - t0))
    t_blocks = time.time() - t0
    low_path = os.path.join(blob_dir, f"low_{zb}.bin")
    if len(tops) == n * n:
        sink = BlobSink(low_path, quant=quant)
        low_zoom_tiles(tops, zb, sink)
        sink.close()
    blobs = [os.path.join(blob_dir, f"blk_{zb}_{bx}_{by}.bin") for bx, by in blocks]
    if os.path.exists(low_path):
        blobs.append(low_path)
    _status(status, phase="assemble", elapsed_s=round(time.time() - t0))
    meta = {"dune_atlas:resampling": f"z{zmax} bilinear from DEM pixel centres; lower zooms 2x2 means",
            "dune_atlas:quantisation_m": quant}
    res = {"blocks_s": round(t_blocks, 1), "n_blocks_rendered": len(recs),
           "pmtiles": assemble_pmtiles(blobs, out, zmax, extra_meta=meta)}
    if low_out:
        res["pmtiles_low"] = assemble_pmtiles(blobs, low_out, zmax, zmax_keep=low_zmax, extra_meta=meta)
    res["nodata_px_read"] = int(sum(r["nodata_px"] for r in recs))
    res["gap_filled_px_zmax"] = int(sum(r["filled_px"] for r in recs))
    nan_z = {}
    for r in recs:
        for z, st in r["stats"].items():
            nan_z[z] = nan_z.get(z, 0) + st[2]
    res["nan_px_per_zoom"] = nan_z
    res["read_gb"] = round(sum(r["read_mb"] for r in recs) / 1e3, 2)
    res["total_s"] = round(time.time() - t0, 1)
    _status(status, phase="done", **{k: v for k, v in res.items() if k != "pmtiles"})
    return res


def build_elevation(work: str, store_out: str, npz_out: str, dem_path: str = DEM_PATH) -> dict:
    status = os.path.join(work, "status_elev.json")
    os.makedirs(work, exist_ok=True)
    dem = DEM(dem_path)
    t0 = time.time()
    elev = elevation_grid(dem, progress=lambda k, n: _status(status, phase="grid", rows=k, of=n,
                                                             elapsed_s=round(time.time() - t0)))
    t_grid = time.time() - t0
    np.save(os.path.join(work, "elevation_64.npy"), elev)
    em = cell_mean_elevation(elev)
    lat = 89.0 - 2.0 * np.arange(90)
    lon = -179.0 + 2.0 * np.arange(180)
    np.savez_compressed(npz_out, elev_mean=em, lat=lat, lon=lon,
                        grid=json.dumps({"lat0": 89, "dlat": -2, "lon0": -179, "dlon": 2, "ny": 90, "nx": 180,
                                         "cell_registration": "centre"}),
                        source=DEM_ATTRIBUTION["source"])
    _status(status, phase="store", elapsed_s=round(time.time() - t0))
    st = build_elevation_store(elev, store_out)
    res = {"grid_s": round(t_grid, 1), "read_gb": round(dem.bytes_read / 1e9, 2), "nodata_px": dem.nodata_px,
           "elev64": {"shape": list(elev.shape), "nan": int(np.isnan(elev).sum()), "min": float(np.nanmin(elev)),
                      "max": float(np.nanmax(elev)), "mean_of_cell_means": float(np.nanmean(em))},
           "elev_mean": {"min": float(np.nanmin(em)), "max": float(np.nanmax(em)), "nan": int(np.isnan(em).sum())},
           "store": st, "total_s": round(time.time() - t0, 1)}
    _status(status, phase="done", **res)
    return res


def check_pmtiles(path: str, dem: DEM | None = None, n_tiles: int = 64, npts: int = 64, seed: int = 0,
                  zcheck: int = MAXZOOM) -> dict:
    """Read back a terrarium PMTiles: header/metadata, tile count per zoom, and (with `dem`) decode `n_tiles`
    random zcheck tiles and compare `npts` random pixels each with an independent bilinear DEM sample
    (DEM.point); also check that each sampled parent tile at zcheck-1 equals the rounded 2x2 mean of its
    decoded children to within quantisation (<= 1 m)."""
    from pmtiles.reader import Reader, MmapSource, all_tiles
    out = {"bytes": os.path.getsize(path)}
    with open(path, "rb") as f:
        src = MmapSource(f)
        r = Reader(src)
        h = r.header()
        out["header"] = {k: (v.name if hasattr(v, "name") else v) for k, v in h.items()
                         if k in ("tile_type", "tile_compression", "min_zoom", "max_zoom", "addressed_tiles_count",
                                  "tile_entries_count", "tile_contents_count", "clustered", "min_lat_e7", "max_lat_e7")}
        out["metadata"] = r.metadata()
        per = {}
        for (z, x, y), data in all_tiles(src):
            d = per.setdefault(z, [0, 0, 0])
            d[0] += 1; d[1] += len(data); d[2] = max(d[2], len(data))
        out["per_zoom"] = {z: {"n": n, "bytes": b, "bytes_max": m, "complete": n == 4 ** z}
                           for z, (n, b, m) in sorted(per.items())}
        if dem is not None:
            rng = np.random.default_rng(seed)
            n = 2 ** zcheck
            dmax, ddiff, pmax = 0.0, [], 0.0
            for _ in range(n_tiles):
                x, y = int(rng.integers(0, n)), int(rng.integers(0, n))
                a = terrarium_decode(webp_decode(r.get(zcheck, x, y)))
                lat, lon = tile_centres(zcheck, x, y)
                ii, jj = rng.integers(0, TILE, npts), rng.integers(0, TILE, npts)
                for i, j in zip(ii, jj):
                    dv = abs(a[i, j] - dem.point(float(lat[i]), float(lon[j])))
                    ddiff.append(dv)
                    dmax = max(dmax, dv)
                # parent consistency (zcheck-1): parent = 2x2 mean of the float children, so decoded parent vs
                # mean of decoded children differs by <= 0.5 (parent rounding) + 0.5 (children rounding)
                px, py = x // 2, y // 2
                par = terrarium_decode(webp_decode(r.get(zcheck - 1, px, py)))
                kids = np.zeros((2 * TILE, 2 * TILE))
                for dx in (0, 1):
                    for dy in (0, 1):
                        kids[dy * TILE:(dy + 1) * TILE, dx * TILE:(dx + 1) * TILE] = terrarium_decode(
                            webp_decode(r.get(zcheck, 2 * px + dx, 2 * py + dy)))
                pmax = max(pmax, float(np.abs(par - kids.reshape(TILE, 2, TILE, 2).mean((1, 3))).max()))
            out["point_check"] = {"zoom": zcheck, "tiles": n_tiles, "points": len(ddiff),
                                  "max_abs_m": float(dmax), "mean_abs_m": float(np.mean(ddiff)),
                                  "dem_nodata_px_seen": dem.nodata_px}
            out["parent_check_max_abs_m"] = pmax
    return out


def main(argv=None):
    import argparse
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.mars.terrain")
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("info"); a.add_argument("--dem", default=DEM_PATH)
    b = sub.add_parser("pilot"); b.add_argument("--out", required=True); b.add_argument("--dem", default=DEM_PATH)
    b.add_argument("--workers", type=int, default=12)
    c = sub.add_parser("tiles"); c.add_argument("--work", required=True); c.add_argument("--out", required=True)
    c.add_argument("--low-out"); c.add_argument("--dem", default=DEM_PATH); c.add_argument("--workers", type=int, default=24)
    c.add_argument("--maxzoom", type=int, default=MAXZOOM); c.add_argument("--limit", type=int)
    k = sub.add_parser("check"); k.add_argument("--pmtiles", required=True); k.add_argument("--dem", default=DEM_PATH)
    k.add_argument("--n-tiles", type=int, default=64); k.add_argument("--no-dem", action="store_true")
    e = sub.add_parser("elevation"); e.add_argument("--work", required=True); e.add_argument("--store", required=True)
    e.add_argument("--npz", required=True); e.add_argument("--dem", default=DEM_PATH)
    a = p.parse_args(argv)
    if a.cmd == "info":
        r = DEM(a.dem).info()
    elif a.cmd == "pilot":
        r = pilot(a.out, a.dem, a.workers)
    elif a.cmd == "check":
        r = check_pmtiles(a.pmtiles, None if a.no_dem else DEM(a.dem), n_tiles=a.n_tiles)
    elif a.cmd == "tiles":
        r = build_tiles(a.work, a.out, a.dem, a.workers, zmax=a.maxzoom, low_out=a.low_out, limit=a.limit)
    else:
        r = build_elevation(a.work, a.store, a.npz, a.dem)
    print(json.dumps(r, default=str), flush=True)


if __name__ == "__main__":
    main()


# ----------------------------------------------------------------------------- registry
def registry_fragment() -> dict:
    """registry/mars/generated/x_elevation.yaml {layers} (follows Earth's aridity entry)."""
    a = DEM_ATTRIBUTION
    return {
        # no `groups`: the group `environment` (title/description) is owned by registry/mars/layers.yaml
        "layers": [{
            "id": "elevation", "title": "Elevation (MOLA–HRSC)", "titleTex": r"Elevation $z$ (MOLA–HRSC)",
            "group": "environment", "type": "zarr-field", "source": "dune-atlas/mars/v1/fields/elevation.zarr",
            "variable": "elevation", "thresholdAware": False, "units": "m",
            "description": ("Elevation $z$ of the surface relative to the Mars areoid (MOLA datum), from the Mars MGS "
                            "MOLA – MEX HRSC Blended DEM Global 200m v2."),
            "citation": a["citation"],
            "attribution": {**{k: a[k] for k in ("source", "citation", "licence", "url")},
                            "changes": ("Area mean over 1/64° (~0.93 km) pixels of the 200 m DEM, rounded to 1 m; "
                                        "coarser zoom levels are means (≤ 0.5 m rounding).")},
            "visible": False, "opacity": 0.85, "queryable": True,
            "display": {"transform": "none", "colormap": "turbo", "clim": [-8000, 12000],
                        "legendNote": "Colour scale saturates beyond the ends (Olympus Mons 21 km, Hellas −8.2 km)."},
        }],
    }
