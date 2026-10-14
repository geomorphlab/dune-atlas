"""Mars dunes (pipeline/src/dune_atlas_pipeline/mars/dunes.py): contract-grid orientation, overlap fraction,
spherical areas on the Mars 2000 sphere and antimeridian handling. Synthetic polygons only."""
import json
import math

import numpy as np
import pytest

shapely = pytest.importorskip("shapely")
pytest.importorskip("pyproj")
from shapely.geometry import MultiPolygon, box  # noqa: E402

from dune_atlas_pipeline.mars import dunes as D  # noqa: E402

R = D.R_MARS_2000


def test_contract_axes_and_fv3_reorientation():
    lat, lon = D.contract_axes()
    assert lat[0] == 89 and lat[-1] == -89 and lon[0] == -179 and lon[-1] == 179
    fv3_lat = np.arange(-89, 90, 2.0)
    fv3_lon = np.arange(1, 360, 2.0)
    a = fv3_lat[:, None] * 1000 + fv3_lon[None, :]
    c = D.fv3_to_contract(a)
    # contract cell (i, j) holds FV3 (lat = lat[i], lon = lon[j] mod 360)
    for i, j in [(0, 0), (44, 89), (45, 90), (89, 179), (10, 37)]:
        assert c[i, j] == pytest.approx(lat[i] * 1000 + (lon[j] % 360))


def test_overlap_fraction_cells():
    full = box(10, 20, 12, 22)                     # exactly one cell (lat 21, lon 11)
    half = box(-180, -2, -179, 0)                  # western half of cell (lat -1, lon -179)
    f = D.overlap_fraction([full, half])
    lat, lon = D.contract_axes()
    i, j = int(np.where(lat == 21)[0][0]), int(np.where(lon == 11)[0][0])
    assert f[i, j] == pytest.approx(1.0, abs=1e-12)
    i2, j2 = int(np.where(lat == -1)[0][0]), 0
    assert f[i2, j2] == pytest.approx(0.5, abs=1e-12)
    assert np.count_nonzero(f) == 2
    # a box straddling 4 cells: fractions sum to its area in cell units (equal-area plane)
    q = D.overlap_fraction([box(-1, -1, 1, 1)])
    assert np.count_nonzero(q) == 4 and q.max() == pytest.approx(0.25, rel=1e-3)


def test_spherical_area_matches_analytic():
    G = D.geod()
    # band lon 0..10, lat 0..10 on the sphere: geodesic edges vs analytic lat/lon box differ slightly;
    # a small box agrees to < 1e-4
    g = box(0, 0, 0.5, 0.5)
    a = abs(G.geometry_area_perimeter(g)[0])
    exact = R * R * math.radians(0.5) * math.sin(math.radians(0.5))
    assert a == pytest.approx(exact, rel=1e-4)
    assert D.cea(g).area * R * R == pytest.approx(exact, rel=1e-12)


def test_antimeridian_bbox_centroid_and_validation():
    g = MultiPolygon([box(179, 10, 180, 11), box(-180, 10, -179, 11)])
    assert D.crosses_antimeridian(g)
    w, s, e, n = D.bbox(g)
    assert (w, s, e, n) == pytest.approx((179, 10, -179, 11))
    lon, lat = D.centroid_lonlat(g)
    assert abs(abs(lon) - 180) < 1e-6 and lat == pytest.approx(10.5, abs=1e-2)
    v = D.validate_lonlat(g)
    assert v == {"lon_ok": True, "lat_ok": True, "ring_jumps": 0}
    assert not D.crosses_antimeridian(box(10, 0, 11, 1))


def test_tippecanoe_args_follow_earth():
    from dune_atlas_pipeline import dunes as earth
    a = D.tippecanoe_args()
    assert len(a) == len(earth.TIPPECANOE_ARGS)
    same = [x for x in a if not x.startswith(("--attribution=", "--name=", "--description="))]
    assert same == [x for x in earth.TIPPECANOE_ARGS if not x.startswith(("--attribution=", "--name=", "--description="))]
    assert "--maximum-zoom=10" in a and "--use-attribute-for-id=id" in a


def _polar_feats():
    from shapely.geometry import mapping, Polygon
    # a field crossing the Web-Mercator limit (84-86.5 N) and one wholly beyond it; plus a southern one
    a = Polygon([(-30, 84), (40, 84), (40, 86.5), (-30, 86.5)])
    b = Polygon([(100, 85.2), (110, 85.2), (110, 85.6), (100, 85.6)])
    c = Polygon([(10, -86), (20, -86), (20, -84), (10, -84)])
    return [{"type": "Feature", "id": i + 1, "geometry": mapping(g), "properties": {"id": i + 1}}
            for i, g in enumerate([a, b, c])]


def test_clip_for_tiles():
    feats = _polar_feats()
    t, s = D.clip_for_tiles(feats)
    assert s["dropped_ids_beyond_lat_limit"] == [2] and s["n_clipped_at_lat_limit"] == 2
    for f in t:
        c = np.array(shapely.get_coordinates(shapely.geometry.shape(f["geometry"])))
        assert np.abs(c[:, 1]).max() <= D.TILE_LAT_LIMIT + 1e-9
    assert feats[0]["geometry"]["coordinates"][0][2][1] == 86.5     # input not mutated


def test_mvt_decoder_roundtrip():
    """Minimal MVT reader decodes a hand-built square polygon (tile units, ring closed)."""
    def varint(v):
        out = b""
        while True:
            c = v & 0x7F; v >>= 7
            out += bytes([c | (0x80 if v else 0)])
            if not v:
                return out
    zz = lambda v: (v << 1) ^ (v >> 31)
    cmds = [(1 << 3) | 1, zz(10), zz(10), (3 << 3) | 2, zz(100), zz(0), zz(0), zz(100), zz(-100), zz(0), (1 << 3) | 7]
    geom = b"".join(varint(c) for c in cmds)
    feat = b"\x08\x07" + b"\x18\x03" + b"\x22" + varint(len(geom)) + geom
    layer = b"\x0a\x05dunes" + b"\x12" + varint(len(feat)) + feat + b"\x28" + varint(4096)
    tile = b"\x1a" + varint(len(layer)) + layer
    p = D.mvt_polygons(tile)
    assert len(p) == 1 and p[0]["id"] == 7 and p[0]["layer"] == "dunes" and p[0]["extent"] == 4096
    assert p[0]["rings"][0].tolist() == [[10, 10], [110, 10], [110, 110], [10, 110], [10, 10]]


def test_polar_tiles_have_no_pole_edge(tmp_path):
    """Polygons reaching the Web-Mercator limit put vertices/edges on the world's top tile edge (MapLibre's globe
    extends such edges to the pole -> wedges); after clipping at the limit and the pole-edge nudge there are none
    at any zoom, and the geometry still reaches the limit (within one tile unit)."""
    import shutil
    if shutil.which("tippecanoe") is None:
        pytest.skip("tippecanoe not installed")
    pytest.importorskip("pmtiles")
    feats = _polar_feats()
    res = {}
    for name, fs in (("raw", feats), ("clipped", D.clip_for_tiles(feats)[0])):
        gj = D.write_geojson(fs, str(tmp_path / f"{name}.geojson"))
        out = D.build_vector_pmtiles(gj, str(tmp_path / f"{name}.pmtiles"))
        if name == "clipped":
            assert D.nudge_pole_edges(out)["vertices_moved"] > 0
        res[name] = D.polar_tile_check(out, maxzoom=6)
    assert sum(d["edges_on_pole_edge"] for d in res["raw"].values()) > 0
    assert all(d["verts_on_or_beyond_pole_edge"] == 0 and d["edges_on_pole_edge"] == 0 for d in res["clipped"].values())
    from pmtiles.reader import Reader, MmapSource
    with open(str(tmp_path / "clipped.pmtiles"), "rb") as fh:
        t = D.mvt_polygons(Reader(MmapSource(fh)).get(3, 3, 0))      # field a spans lon -30..40
    assert min(float(r[:, 1].min()) for f in t for r in f["rings"]) == 1.0   # still reaches the edge


def test_nudge_tile_unit():
    """nudge_tile moves only top-row vertices <= 0 to y = 1; other rows untouched; degenerate rings dropped."""
    import gzip
    sq = [np.array([[10, -50], [200, -50], [200, 300], [10, 300], [10, -50]], float)]
    deg = [np.array([[10, -50], [200, -50], [200, -10], [10, -10], [10, -50]], float)]   # wholly above the edge

    def tile(rings_list):
        feats = b""
        for k, rings in enumerate(rings_list):
            fb = D._enc_field(1, 0, k + 1) + D._enc_field(3, 0, 3) + D._enc_field(4, 2, D._encode_polygon(rings))
            feats += D._enc_field(2, 2, fb)
        lay = D._enc_field(1, 2, b"dunes") + feats + D._enc_field(5, 0, 4096)
        return gzip.compress(D._enc_field(3, 2, lay))
    t = tile([sq, deg])
    out, n = D.nudge_tile(t, 2, 0)
    p = D.mvt_polygons(out)
    assert n == 3 + 5 and len(p) == 1 and p[0]["id"] == 1 and p[0]["layer"] == "dunes"
    assert p[0]["rings"][0][:, 1].min() == 1 and p[0]["rings"][0][:, 1].max() == 300
    same, n2 = D.nudge_tile(t, 2, 1)
    assert n2 == 0 and same == t


def test_polar_cap_meshes_and_sphere_closure():
    """Cap meshes from the unclipped polygons: mesh area = source area poleward of the Mercator limit; the field
    wholly beyond the limit is in the mesh; dunes + invert = cap; tile band + caps = sphere."""
    from shapely.geometry import shape
    feats = _polar_feats()
    meshes, s = D.polar_cap_meshes(feats)
    for pole in ("N", "S"):
        d = s[pole]
        assert d["dunes_mesh_km2"] == pytest.approx(d["dunes_src_km2"], rel=1e-4, abs=1e-6)
        assert d["invert_mesh_km2"] == pytest.approx(d["invert_src_km2"], rel=1e-4)
        assert d["dunes_src_km2"] + d["invert_src_km2"] == pytest.approx(d["cap_km2"], rel=1e-9)
    t = meshes["dunes"]["N"]
    inb = (t[..., 0].min(1) >= 100) & (t[..., 0].max(1) <= 110)                 # field b (85.2-85.6 N)
    b_src = D.cea_area_m2(shape(feats[1]["geometry"])) / 1e6
    assert D.tri_area_m2(t[inb]) / 1e6 == pytest.approx(b_src, rel=1e-4)
    assert t[..., 1].min() >= D.MERC_LAT - 1e-9
    tfeats, _ = D.clip_for_tiles(feats)
    inv, si = D.invert_features(feats, tfeats)
    band_dunes = sum(D.cea_area_m2(shape(f["geometry"])) for f in tfeats) / 1e6
    total = si["invert_tile_geometry_km2"] + band_dunes + sum(s[p]["cap_km2"] for p in ("N", "S"))
    # tiles stop at TILE_LAT_LIMIT (the limit rounded down to 1e-6 deg), caps start at MERC_LAT: 2 strips of 0.09 km2
    strip = 2 * D.cea_area_m2(box(-180, D.TILE_LAT_LIMIT, 180, D.MERC_LAT)) / 1e6
    assert 0 < strip < 0.2
    assert total + strip == pytest.approx(si["sphere_km2"], rel=1e-12)
    assert si["invert_true_km2"] + si["dune_union_km2_cea"] == pytest.approx(si["sphere_km2"], rel=1e-9)


def test_invert_tiles_no_pole_edge(tmp_path):
    import shutil
    if shutil.which("tippecanoe") is None:
        pytest.skip("tippecanoe not installed")
    pytest.importorskip("pmtiles")
    feats = _polar_feats()
    tfeats, _ = D.clip_for_tiles(feats)
    inv, _ = D.invert_features(feats, tfeats)
    assert len(inv) == 1 and inv[0]["id"] == 1
    out = D.build_invert_pmtiles(D.write_geojson(inv, str(tmp_path / "inv.geojson")), str(tmp_path / "invert.pmtiles"))
    D.nudge_pole_edges(out)
    p = D.polar_tile_check(out, maxzoom=5)
    assert all(d["verts_on_or_beyond_pole_edge"] == 0 for d in p.values()), p
    assert all(d["tiles"] == (1 if z == 0 else 2 * 2 ** z) for z, d in p.items())   # every polar-row tile filled


def test_built_mars_dune_products():
    """The locally built dunes.pmtiles / invert.pmtiles / polar-caps.json (staging devroot; skipped if absent)."""
    import os
    pytest.importorskip("pmtiles")
    root = os.path.join(os.path.dirname(__file__), "..", "..", "staging", "mars", "devroot", "dune-atlas", "mars",
                        "v1", "dunes")
    if not os.path.exists(os.path.join(root, "dunes.pmtiles")):
        pytest.skip("dunes.pmtiles not built locally")
    for name, nfeat in (("dunes.pmtiles", 3000), ("invert.pmtiles", 1)):
        path = os.path.join(root, name)
        if not os.path.exists(path):
            continue
        p = D.polar_tile_check(path, maxzoom=8)
        assert all(d["verts_on_or_beyond_pole_edge"] == 0 and d["edges_on_pole_edge"] == 0 for d in p.values()), (name, p)
        # longest polar-row edge not on a clip line: source segments (a 0.37-deg straight segment at 85 N is
        # 1.15 z9 tiles), never a pole-to-edge spike
        assert max(d["max_free_edge_tile_frac"] for d in p.values()) < 1.5
        assert p[0]["features"] >= nfeat
        b = D.tile_bounds_check(path, maxzoom=5)
        assert all(d["verts_outside_buffer"] == 0 for d in b.values()), b
    caps = os.path.join(root, "polar-caps.json")
    if os.path.exists(caps):
        doc = json.load(open(caps))
        t = np.asarray(doc["layers"]["dunes"]["N"]).reshape(-1, 3, 2)
        # field id 451 (98 km2, 85.10-85.25 N, 156.2-161.1 E) is drawn by the cap
        f451 = (t[..., 0].min(1) >= 156.0) & (t[..., 0].max(1) <= 161.5) & (t[..., 1].min(1) >= 85.09)
        assert D.tri_area_m2(t[f451]) / 1e6 == pytest.approx(98.08, rel=0.01)
        for pole in ("N", "S"):
            cap = sum(D.tri_area_m2(np.asarray(doc["layers"][k][pole]).reshape(-1, 3, 2)) for k in ("dunes", "invert"))
            assert cap / 1e6 == pytest.approx(D.cea_area_m2(D.cap_band(pole == "N")) / 1e6, rel=1e-4)
