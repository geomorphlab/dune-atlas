"""Mars terrain (pipeline/src/dune_atlas_pipeline/mars/terrain.py): terrarium coding, Web-Mercator tile
geometry, bilinear DEM sampling, block pyramid consistency, area-mean elevation grid and 2-degree cell means.
Synthetic in-memory DEMs only (the real DEM lives on Gadi)."""
import math

import numpy as np
import pytest

from dune_atlas_pipeline.mars import terrain as T


def test_terrarium_roundtrip_and_quantisation():
    e = np.array([-8201.4, -0.5, 0.0, 0.49, 1.5, 21229.0, 123.25, np.nan])
    rgb = T.terrarium_encode(e, quant=None)
    d = T.terrarium_decode(rgb)
    assert np.allclose(d[:-1], e[:-1], atol=1 / 256)
    assert d[-1] == 0.0                                   # NaN -> 0 m
    q = T.terrarium_decode(T.terrarium_encode(e, quant=1.0))
    assert np.all(np.abs(q[:-1] - e[:-1]) <= 0.5)
    assert np.all(T.terrarium_encode(e, quant=1.0)[..., 2] == 0)   # integer metres -> B = 0
    # canonical terrarium example: 0 m -> (128, 0, 0)
    assert T.terrarium_encode(np.array([0.0]))[0].tolist() == [128, 0, 0]


def test_webp_lossless_roundtrip():
    rng = np.random.default_rng(0)
    a = np.cumsum(rng.normal(0, 5, (512, 512)), axis=1).astype("f4")
    rgb = T.terrarium_encode(a)
    back = T.webp_decode(T.webp_bytes(rgb, quality=50, method=2))
    assert np.array_equal(back, rgb)


def test_mercator_geometry():
    lat, lon = T.tile_centres(0, 0, 0)
    assert lon[0] == pytest.approx(-180 + 360 / 1024) and lon[-1] == pytest.approx(180 - 360 / 1024)
    assert lat[0] == pytest.approx(T.merc_lat(0, 0.5)) and lat[255] > 0 > lat[256]
    assert T.merc_lat(0, 0) == pytest.approx(T.MERC_LAT, abs=1e-9)
    # the maximum zoom oversamples the 200 m DEM everywhere (finest DEM pixel is at the equator)
    px_deg = 360 / (T.TILE * 2 ** T.MAXZOOM)
    assert px_deg < 0.003374120830641


def _linear_dem(H=180, W=360, nodata=None):
    """Elevation linear in (lat, lon) away from the antimeridian: bilinear sampling is exact there."""
    res = 360.0 / W
    lat = 90 - (np.arange(H) + 0.5) * res
    lon = -180 + (np.arange(W) + 0.5) * res
    a = (10.0 * lat[:, None] + 3.0 * lon[None, :]).astype("f4")
    return T.DEM(path=None, array=a, res=res), a, lat, lon


def test_bilinear_exact_for_linear_field():
    dem, a, _, _ = _linear_dem()
    lat = np.linspace(80, -80, 37)
    lon = np.linspace(-170, 170, 41)
    s = dem.sample_bilinear(lat, lon)
    assert np.allclose(s, 10 * lat[:, None] + 3 * lon[None, :], atol=1e-3)
    assert dem.point(12.3, -45.6) == pytest.approx(10 * 12.3 + 3 * -45.6, abs=1e-3)
    # pixel centres return the pixel value exactly
    assert dem.point(0.5, 0.5) == pytest.approx(float(a[89, 180]))


def test_bilinear_wraps_longitude_and_clamps_rows():
    dem, a, _, _ = _linear_dem()
    s = dem.sample_bilinear(np.array([0.5]), np.array([179.75, -179.75, 180.0]))
    # 179.75 is between col 359 (179.5) and col 0 (-179.5 + 360 = 180.5): half way 179.5..180.5 -> 0.25
    v359, v0 = float(a[89, 359]), float(a[89, 0])
    assert s[0, 0] == pytest.approx(0.75 * v359 + 0.25 * v0, abs=1e-3)
    assert s[0, 2] == pytest.approx(0.5 * v359 + 0.5 * v0, abs=1e-3)
    n = dem.sample_bilinear(np.array([89.9, -89.9]), np.array([0.5]))
    assert n[0, 0] == pytest.approx(float(a[0, 180])) and n[1, 0] == pytest.approx(float(a[-1, 180]))


def test_bilinear_nodata_aware():
    dem, a, _, _ = _linear_dem()
    a2 = a.copy().astype("f4")
    a2[89, 180] = -32768
    d2 = T.DEM(path=None, array=a2, res=1.0)
    s = d2.sample_bilinear(np.array([0.3]), np.array([0.4, 0.75]))
    assert np.isfinite(s).all() and np.all(np.abs(s) < 1000)      # nodata pixel gets zero weight
    assert d2.nodata_px > 0
    d2.fill = False
    assert np.isnan(d2.sample_bilinear(np.array([0.5]), np.array([0.5]))[0, 0])  # only the nodata pixel
    d2.fill = True
    v = d2.sample_bilinear(np.array([0.5]), np.array([0.5]))[0, 0]            # gap-filled from neighbours
    assert v == pytest.approx(float(a[89, 180]), abs=1e-3) and d2.filled_px == 1   # linear field: 3x3 mean exact


def test_fill_nan():
    a = np.arange(25, dtype="f4").reshape(5, 5)
    b = a.copy(); b[1:4, 1:4] = np.nan
    f = T.fill_nan(b)
    assert np.isfinite(f).all() and np.array_equal(f[0], a[0]) and abs(f[2, 2] - 12) < 1.5


def test_block_pyramid_matches_direct_tiles():
    """render_block (zmax strips, 2x2 means through the subtree) == render_tile per tile, and the low zooms
    from block tops equal direct renders."""
    dem, *_ = _linear_dem(H=90, W=180)
    zmax, zb = 3, 1
    tiles = {}

    def sink(z, x, y, arr):
        tiles[(z, x, y)] = arr.copy()
    tops = {}
    for by in range(2):
        for bx in range(2):
            tops[(bx, by)] = T.render_block(dem, bx, by, zb, zmax, sink)
    T.low_zoom_tiles(tops, zb, sink)
    assert len(tiles) == sum(4 ** z for z in range(zmax + 1))
    for key in [(0, 0, 0), (1, 1, 0), (2, 3, 1), (3, 5, 6), (3, 0, 7)]:
        direct = T.render_tile(dem, *key, zmax=zmax)
        assert np.allclose(tiles[key], direct, atol=1e-3), key


def test_elevation_grid_and_cell_means():
    rng = np.random.default_rng(1)
    H, W = 90 * 6, 180 * 6                      # 1/3 deg DEM
    a = rng.normal(0, 1000, (H, W)).astype("f4")
    dem = T.DEM(path=None, array=a, res=1 / 3)
    g = T.elevation_grid(dem, deg=1.0, band_rows=7)     # exact 3 x 3 blocks
    ref = a.reshape(180, 3, 360, 3).mean((1, 3))
    assert g.shape == (180, 360) and np.allclose(g, ref, atol=1e-2)
    # non-integer ratio: constant field stays constant, mean preserved
    dem2 = T.DEM(path=None, array=np.full((300, 600), 7.0, "f4"), res=0.6)
    g2 = T.elevation_grid(dem2, deg=0.25)
    assert np.allclose(g2, 7.0)
    # 2-degree cell means, contract orientation and area weighting
    e = np.zeros((180, 360), "f4")
    e[:, 180:] = 100.0                           # east hemisphere 100 m
    e[:2] = 1000.0                               # top fine row-band (lat 90..88)
    cm = T.cell_mean_elevation(e, deg=1.0)
    assert cm.shape == (90, 180)
    assert cm[0, 0] == pytest.approx(1000.0) and cm[1, 0] == pytest.approx(0.0)
    assert cm[45, 90] == pytest.approx(100.0) and cm[45, 89] == pytest.approx(0.0)  # lon 1 vs -1
    lat_e = np.radians([2.0, 1.0, 0.0])
    w = np.sin(lat_e[:-1]) - np.sin(lat_e[1:])
    e2 = np.zeros((180, 360), "f4"); e2[88] = 10.0       # fine row lat 2..1 in cell lat 2..0 (row 44)
    assert T.cell_mean_elevation(e2, deg=1.0)[44, 0] == pytest.approx(10 * w[0] / w.sum(), rel=1e-5)


def test_blob_assembly_and_readback(tmp_path):
    """Blocks -> blobs -> clustered PMTiles (+ low-zoom subset); readback checks pass on a synthetic DEM."""
    pytest.importorskip("pmtiles")
    rng = np.random.default_rng(3)
    a = np.cumsum(rng.normal(0, 20, (90, 180)), axis=1).astype("f4")
    dem = T.DEM(path=None, array=a, res=2.0)
    zmax, zb = 3, 1
    blobs, tops = [], {}
    for by in range(2):
        for bx in range(2):
            p = str(tmp_path / f"b{bx}{by}.bin")
            sink = T.BlobSink(p)
            tops[(bx, by)] = T.render_block(dem, bx, by, zb, zmax, sink)
            sink.close()
            blobs.append(p)
    low = str(tmp_path / "low.bin")
    s = T.BlobSink(low)
    T.low_zoom_tiles(tops, zb, s)
    s.close()
    out = str(tmp_path / "t.pmtiles")
    r = T.assemble_pmtiles(blobs + [low], out, zmax)
    assert r["tiles"] == sum(4 ** z for z in range(zmax + 1))
    r2 = T.assemble_pmtiles(blobs + [low], str(tmp_path / "t2.pmtiles"), zmax, zmax_keep=2)
    assert r2["tiles"] == 21
    c = T.check_pmtiles(out, dem, n_tiles=6, npts=20, zcheck=zmax)
    assert c["header"]["tile_type"] == "WEBP" and c["header"]["clustered"] and c["header"]["max_zoom"] == zmax
    assert all(v["complete"] for v in c["per_zoom"].values())
    assert c["point_check"]["max_abs_m"] <= 0.5 + 1e-6
    assert c["parent_check_max_abs_m"] <= 1.0 + 1e-6
    assert c["metadata"]["encoding"] == "terrarium" and "Fergason" in c["metadata"]["citation"]


def test_polar_cap_texture_geometry_and_sampling():
    from dune_atlas_pipeline.mars import terrain_polar as P
    for north in (True, False):
        lon, lat = P.cap_lonlat(64, north)
        u, v = P.cap_uv(lon, lat, north)
        c = (np.arange(64) + 0.5) / 64
        assert np.allclose(u, c[None, :], atol=1e-9) and np.allclose(v, c[:, None], atol=1e-9)
    # north: lon 0 down (v > 0.5), 90 E right; south: lon 0 up
    u, v = P.cap_uv(np.array([0.0, 90.0]), np.array([87.0, 87.0]), True)
    assert v[0] > 0.5 and abs(u[0] - 0.5) < 1e-12 and u[1] > 0.5
    u, v = P.cap_uv(np.array([0.0]), np.array([-87.0]), False)
    assert v[0] < 0.5
    # the seam latitude lies inside the texture with >= 2 px margin at N = 256 (3 x 3 stencil needs 1)
    r = (90 - 85.0511287798066) / P.RHO_DEG
    assert (1 - r) * 128 > 2
    # sampling: linear field in (lat, lon) on a synthetic DEM, away from the antimeridian
    dem, a, _, _ = _linear_dem(H=180, W=360)
    band = P.read_band(dem, 80.0, True)
    lat = np.array([85.3, 88.7, 82.1]); lon = np.array([-20.5, 33.3, 100.0])
    s = P.sample_points(dem, band, lat, lon)
    assert np.allclose(s, 10 * lat + 3 * lon, atol=1e-3)
    bands = P.read_band(dem, 80.0, False)
    s2 = P.sample_points(dem, bands, -lat, lon)
    assert np.allclose(s2, -10 * lat + 3 * lon, atol=1e-3)
