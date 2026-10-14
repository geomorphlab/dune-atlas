"""Tests for dune polygonisation (dunes.py) and the generated registry fragment."""
import io
import json
import os
from pathlib import Path

import numpy as np
import pytest
from shapely.geometry import shape

from dune_atlas_pipeline import dunes as D

REPO = Path(__file__).resolve().parents[2]
LAYERS_NC = Path(os.environ.get("DUNE_WORLD_DATA",
                                "")) / "layers.nc"


def grid(cells):
    m = np.zeros((D.NY, D.NX), bool)
    for i, j in cells:
        m[i, j] = True
    return m


def lattice(coords):
    v = np.asarray([c for ring in coords for c in ring]) if np.ndim(coords[0][0]) == 1 else \
        np.asarray([c for poly in coords for ring in poly for c in ring])
    return v


def on_lattice(v):
    return np.allclose(v / 0.05, np.round(v / 0.05), atol=1e-9)


# ------------------------------------------------------------------ labelling
def test_label_wraps_across_antimeridian():
    m = grid([(500, 0), (500, D.NX - 1), (700, D.NX - 1), (701, 0)])   # direct + diagonal wrap
    lab, n = D.label_fields(m, wrap=True)
    assert n == 2
    assert lab[500, 0] == lab[500, D.NX - 1] and lab[700, D.NX - 1] == lab[701, 0]
    _, n_nowrap = D.label_fields(m, wrap=False)
    assert n_nowrap == 4


def test_label_8_connected():
    m = grid([(100, 100), (101, 101), (102, 102), (100, 200)])
    lab, n = D.label_fields(m)
    assert n == 2


# ------------------------------------------------------------------ polygons
def test_diagonal_cells_one_multipolygon_exact_edges():
    feats = D.polygons_from_mask(grid([(900, 1800), (901, 1801)]))
    assert len(feats) == 1
    f = feats[0]
    g = shape(f["geometry"])
    assert g.is_valid and g.geom_type == "MultiPolygon" and len(g.geoms) == 2
    assert f["properties"]["cells"] == 2 and g.area == pytest.approx(0.02)
    assert on_lattice(lattice(f["geometry"]["coordinates"]))
    # cell (900,1800) is centred lat 0, lon 0 -> edges +-0.05
    assert g.bounds == pytest.approx((-0.05, -0.15, 0.15, 0.05))
    assert f["properties"]["west"] == pytest.approx(-0.05) and f["properties"]["east"] == pytest.approx(0.15)


def test_block_is_single_polygon_with_area_and_centroid():
    cells = [(i, j) for i in range(300, 305) for j in range(2000, 2003)]
    f = D.polygons_from_mask(grid(cells))[0]
    g = shape(f["geometry"])
    assert g.geom_type == "Polygon" and len(g.exterior.coords) == 5
    assert f["properties"]["cells"] == 15
    a = D.spherical_cell_area()
    assert f["properties"]["area_km2"] == pytest.approx(sum(a[c] for c in cells) / 1e6, abs=0.05)
    assert f["properties"]["lat"] == pytest.approx(90 - 0.1 * 302, abs=0.01)
    assert f["properties"]["lon"] == pytest.approx(-180 + 0.1 * 2001, abs=1e-6)


def test_antimeridian_field_split_and_inside_world():
    cells = [(800, D.NX - 2), (800, D.NX - 1), (800, 0), (800, 1)]
    feats = D.polygons_from_mask(grid(cells))
    assert len(feats) == 1
    f = feats[0]
    g = shape(f["geometry"])
    assert g.is_valid and g.geom_type == "MultiPolygon" and len(g.geoms) == 2
    minx, _, maxx, _ = g.bounds
    assert minx == pytest.approx(-180) and maxx == pytest.approx(180)
    assert g.area == pytest.approx(0.04)                      # 4 cells, split exactly
    p = f["properties"]
    assert p["cells"] == 4 and p["west"] > p["east"]          # bbox crosses +-180
    assert p["west"] == pytest.approx(179.75) and p["east"] == pytest.approx(-179.85)
    assert abs(abs(p["lon"]) - 180) < 0.06                   # spherical centroid near the seam
    assert on_lattice(lattice(f["geometry"]["coordinates"]))


def test_column_zero_cell_straddles_seam():
    f = D.polygons_from_mask(grid([(900, 0)]))[0]
    g = shape(f["geometry"])
    assert g.geom_type == "MultiPolygon" and g.area == pytest.approx(0.01)
    assert {round(p.area, 6) for p in g.geoms} == {0.005}
    assert f["properties"]["west"] == pytest.approx(179.95) and f["properties"]["east"] == pytest.approx(-179.95)


def test_ids_ranked_by_area():
    m = grid([(900, 10)] + [(900, j) for j in range(100, 105)] + [(950, j) for j in range(300, 303)])
    feats = D.polygons_from_mask(m)
    assert [f["properties"]["cells"] for f in feats] == [5, 3, 1]
    assert [f["id"] for f in feats] == [1, 2, 3]


# ------------------------------------------------------------------ raster fallback
def test_coverage_png_alpha():
    Image = pytest.importorskip("PIL.Image")
    cov = np.zeros((256, 256), np.float32)
    cov[0, 0], cov[0, 1], cov[0, 2] = 1.0, 0.05, 0.6
    im = np.array(Image.open(io.BytesIO(D._coverage_to_png(cov))).convert("RGBA"))
    assert im[0, 0, 3] == 255 and im[1, 1, 3] == 0
    assert 0.4 * 255 <= im[0, 1, 3] <= 0.5 * 255                 # floored
    assert abs(int(im[0, 2, 3]) - 0.6 * 255) <= 10
    assert tuple(im[0, 0, :3]) == D.DUNE_RGBA


def test_raster_pmtiles_roundtrip(tmp_path):
    pytest.importorskip("pmtiles")
    from pmtiles.reader import MmapSource, all_tiles
    cells = [(i, j) for i in range(1100, 1110) for j in range(1950, 1960)]   # ~ -20 lat, 15 lon
    out = tmp_path / "r.pmtiles"
    counts = D.build_raster_pmtiles(grid(cells), str(out), maxzoom=4)
    assert counts == {z: 1 for z in range(5)}
    with open(out, "rb") as f:
        tiles = dict(all_tiles(MmapSource(f)))
    assert (4, 8, 8) in tiles                                      # lon 15 -> x 8, lat -20 -> y 8 at z4


# ------------------------------------------------------------------ registry fragment
def test_registry_fragment_validates():
    yaml = pytest.importorskip("yaml")
    jsonschema = pytest.importorskip("jsonschema")
    schema = json.loads((REPO / "registry/layers.schema.json").read_text())
    frag = yaml.safe_load((REPO / "registry/earth/generated/dunes.yaml").read_text())
    assert set(frag) == {"groups", "layers"}
    layer_schema = {**schema["$defs"]["layer"], "$defs": schema["$defs"]}
    group_schema = schema["properties"]["groups"]["items"]
    for g in frag["groups"]:
        jsonschema.validate(g, group_schema)
    for lyr in frag["layers"]:
        jsonschema.validate(lyr, layer_schema)
    # whole-fragment check inside a minimal registry document
    doc = {"version": 1, "dataBase": "https://data.geomorphlab.org",
           "threshold": {"dim": "ut", "values": [0.15], "defaultIndex": 0, "units": "m/s", "label": "u*,th"},
           "basemaps": [{"id": "osm", "title": "OSM", "kind": "raster", "attribution": "OSM"}], **frag}
    jsonschema.validate(doc, schema)
    vec = next(lyr for lyr in frag["layers"] if lyr["type"] == "pmtiles-vector")
    assert vec["sourceLayer"] == "dunes" and vec["visible"] is True
    assert vec["source"] == "dune-atlas/v1/dunes/dunes.pmtiles"
    assert "doi:10.5281/zenodo.20054674" in vec["citation"] and "Supplementary Code" in vec["citation"]
    assert "fill" in vec["style"]  # the app draws vector layers as fills only
    gids = {g["id"] for g in frag["groups"]}
    assert all(lyr["group"] in gids for lyr in frag["layers"])


# ------------------------------------------------------------------ real data
@pytest.mark.skipif(not LAYERS_NC.exists(), reason="layers.nc not available")
def test_global_dune_polygons_match_mask():
    dunes, land, area = D.load_layers(str(LAYERS_NC))
    feats = list(D.dune_polygons(str(LAYERS_NC)))
    s = D.summary(dunes, land, area, feats)
    assert s["dune_cells"] == 106540 and s["polygon_cells_sum"] == 106540
    assert s["n_fields"] == len(feats) == 1428
    assert s["frac_land_area"] == pytest.approx(0.078, abs=0.0005)    # paper: 7.8 %
    assert s["polygon_area_km2_sum"] == pytest.approx(s["dune_area_km2"], rel=1e-6)
    for f in feats:
        g = shape(f["geometry"])
        assert g.is_valid
        assert g.area == pytest.approx(0.01 * f["properties"]["cells"], rel=1e-9)
        assert -180 <= g.bounds[0] and g.bounds[2] <= 180


@pytest.mark.skipif(not LAYERS_NC.exists(), reason="layers.nc not available")
def test_fixture_window_still_works():
    win = (slice(1000, 1250), slice(1900, 2200))
    feats = list(D.dune_polygons(str(LAYERS_NC), window=win))
    dunes, _, _ = D.load_layers(str(LAYERS_NC))
    assert sum(f["properties"]["cells"] for f in feats) == int(dunes[win].sum())
    assert all({"cells", "area_km2", "lon", "lat"} <= set(f["properties"]) for f in feats)
