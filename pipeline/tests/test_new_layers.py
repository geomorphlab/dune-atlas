"""Aridity (native pyramid, decode rules, per-cell means), flux divergence, cells-aux sidecar, create-only upload."""
import json
import os
from pathlib import Path

import numpy as np
import pytest

from dune_atlas_pipeline import aridity as AR
from dune_atlas_pipeline import cellsaux as CA
from dune_atlas_pipeline import nativepyramid as NP
from dune_atlas_pipeline import qsdiv as QS
from dune_atlas_pipeline import stream_upload as SU
from dune_atlas_pipeline.fields import bitround

REPO = Path(__file__).resolve().parents[2]
D = os.environ.get("DUNE_WORLD_DATA", "")
HAVE_DATA = os.path.isdir(D)


# --------------------------------------------------------------------------- aridity decode
def test_decode_rules():
    ai = np.array([[0, 0, 0, 65535, 65535, 1234, 3]], "u2")
    et = np.array([[65535, 0, 2000, 0, 15, 900, 2500]], "u2")
    v, sat, c = AR.decode(ai, et)
    assert np.isnan(v[0, 0])                       # ocean (ET0 nodata) -> NaN, not AI = 0
    assert np.isnan(v[0, 1]) and np.isnan(v[0, 3])  # ET0 = 0 -> undefined
    assert v[0, 2] == 0.0                           # genuine hyper-arid zero kept
    assert v[0, 4] == np.float32(6.5535) and sat[0, 4] and sat.sum() == 1   # saturation kept, flagged
    assert v[0, 5] == np.float32(0.1234) and v[0, 6] == np.float32(0.0003)
    assert c["valid"] == 4 and c["genuine_zero_kept"] == 1 and c["saturated_kept_6.5535"] == 1


# --------------------------------------------------------------------------- per-cell means
def _brute(fine, i_lo, i_hi, cols):
    blk = fine[max(0, i_lo):max(0, min(fine.shape[0], i_hi))][:, cols]
    f = np.isfinite(blk)
    return (blk[f].mean() if f.any() else np.nan), f.sum()


def test_cell_means_exact_blocks_periodic_and_extent():
    rng = np.random.default_rng(1)
    ny, nx = 48, 96                                  # fine grid: 1/12 deg -> 12 px per 1-deg cell... scaled
    fine = rng.random((ny, nx)).astype("f4")
    fine[rng.random((ny, nx)) < 0.3] = np.nan
    dx = 1.0 / 12
    # target: centres every 1 deg starting at the fine grid's top edge (half the first row outside)
    lat = 4.0 - np.arange(5) * 1.0                    # fine grid spans lat 4 .. 0
    lon = -4.0 + np.arange(8) * 1.0                   # fine spans lon -4 .. 4 (periodic)
    r = AR.cell_means(fine, {"hi": fine > 0.5}, lat_centres=lat, lon_centres=lon, dlat=1.0, dlon=1.0,
                      x0=-4.0, y0=4.0, dx=dx, dy=-dx)
    for i in range(5):
        for j in range(8):
            cols = np.arange(12 * j - 6, 12 * j + 6) % nx
            m, n = _brute(fine, 12 * i - 6, 12 * i + 6, cols)
            if np.isnan(m):
                assert np.isnan(r["mean"][i, j])
            else:
                assert r["mean"][i, j] == pytest.approx(m, rel=1e-6)
            assert r["valid_frac"][i, j] == pytest.approx(n / 144)
    assert r["valid_frac"][0].max() <= 0.5 and r["valid_frac"][4].max() <= 0.5   # half outside the extent


def test_cell_means_fractional_overlap_generic_grid():
    fine = np.arange(12, dtype="f4").reshape(1, 12)   # 1 row, lon pixels of 1 deg from 0
    r = AR.cell_means(np.repeat(fine, 2, 0), lat_centres=np.array([1.0]), lon_centres=np.array([1.75]),
                      dlat=2.0, dlon=1.5, x0=0.0, y0=2.0, dx=1.0, dy=-1.0)
    # footprint lon [1.0, 2.5]: pixel 1 full (value 1), pixel 2 half (value 2) -> (1 + 0.5*2) / 1.5
    assert r["mean"][0, 0] == pytest.approx((1 + 0.5 * 2) / 1.5)
    assert r["valid_frac"][0, 0] == pytest.approx(1.0)


def test_common_factors_global_30s():
    f = NP.common_factors(18000, 43200)
    assert f[:5] == [1, 2, 4, 8, 16] and all(18000 % x == 0 and 43200 % x == 0 for x in f)
    assert 43200 // f[-1] <= 256 and 43200 // f[-2] > 256


# --------------------------------------------------------------------------- native pyramid
def test_native_pyramid_metadata_and_means(tmp_path):
    import zarr
    a = np.full((12, 24), np.nan, "f4")
    a[0, 0] = 1.0; a[4:8, 4:8] = 3.0; a[0, 6] = 5.0; a[1, 7] = 7.0
    out = str(tmp_path / "t.zarr")
    st = NP.write_native_pyramid(out, "v", a, x0=-180, y0=90, dx=15.0, dy=-15.0, factors=[1, 2, 4, 6],
                                 var_attrs={"units": "1"}, root_attrs={"title": "t"},
                                 zarr_layer_hint={"clim": [0, 1], "colormap": "viridis"}, keepbits=None, chunk=4)
    g = zarr.open_group(out, mode="r")
    lay = g.attrs["multiscales"]["layout"]
    assert [l["spatial:shape"] for l in lay] == [[12, 24], [6, 12], [3, 6], [2, 4]]
    for l in lay:  # every level spans exactly the native edges
        t, (ny, nx) = l["spatial:transform"], l["spatial:shape"]
        assert (t[2], t[2] + nx * t[0], t[5], t[5] + ny * t[4]) == (-180, 180, 90, -90)
    assert g.attrs["spatial:bbox"] == [-180, -90, 180, 90]
    l2 = g["2/v"][...]
    assert l2[0, 0] == 1.0 and l2[0, 1] == pytest.approx(6.0) and l2[1, 1] == 3.0   # count-weighted
    assert (np.isfinite(l2) == np.isfinite(a).reshape(3, 4, 6, 4).any((1, 3))).all()    # footprint
    assert np.isnan(g["0/v"][...][~np.isfinite(a)]).all() and g["0/v"].metadata.dimension_names == ("y", "x")
    assert g["1/x"][0] == -180 + 15.0 and st["levels"][3]["factor"] == 6


# --------------------------------------------------------------------------- divergence
def _grid(dl=1.0):
    lat = 90.0 - dl * np.arange(int(180 / dl) + 1)
    lon = -180.0 + dl * np.arange(int(360 / dl))
    return lat, lon


def test_divergence_analytic_fields():
    lat, lon = _grid(0.5)
    PHI, LAM = np.meshgrid(np.deg2rad(lat), np.deg2rad(lon), indexing="ij")
    R = QS.R_EARTH
    # u_east = sin(lambda): div = cos(lambda) / (R cos phi); v_north = cos(phi): div = -2 sin(phi) / R
    for u, v, exact in ((np.sin(LAM), 0 * LAM, np.cos(LAM) / (R * np.cos(PHI))),
                        (0 * LAM, np.cos(PHI), -2 * np.sin(PHI) / R)):
        q, th = np.hypot(u, v), np.arctan2(v, u)
        d = QS.divergence(q, th, lat, lon)
        inner = np.abs(lat) < 80
        assert np.isnan(d[[0, -1]]).all()                                   # pole rows
        err = np.abs(d[inner] - exact[inner]) / np.abs(exact[inner]).max()
        assert err.max() < 2e-4


def test_divergence_nan_propagates_to_neighbours_and_wraps():
    lat, lon = _grid(1.0)
    q = np.ones((lat.size, lon.size)); th = np.zeros_like(q)
    q[90, 0] = np.nan
    d = QS.divergence(q, th, lat, lon)
    bad = set(zip(*np.where(np.isnan(d[1:-1]))))
    assert bad == {(89, 0), (89, 1), (89, lon.size - 1), (88, 0), (90, 0)}  # rows shifted by 1 (pole row cut)
    assert np.allclose(d[2:-2][~np.isnan(d[2:-2])], 0, atol=1e-18)          # uniform eastward flux -> 0 (scale 1/R ~ 1.6e-7)


# --------------------------------------------------------------------------- cells-aux sidecar
def test_cells_aux_layout(tmp_path):
    import zarr
    land = np.zeros((40, 70), bool); land[3:9, 20:30] = True; land[35, 69] = True
    out = str(tmp_path / "aux.zarr")
    root = CA.open_store(out, land)
    cube = np.random.default_rng(0).random((40, 70, 64)).astype("f4")
    CA.write_variable(root, "qsdiv", cube, land, {"units": "m/yr"})
    CA.write_variable(root, "ai_mean", cube[..., 0], land, {"units": "1"})
    with pytest.raises(FileExistsError):
        CA.write_variable(root, "ai_mean", cube[..., 0], land, {})
    g = zarr.open_group(out, mode="r")
    q = g["qsdiv"][...]
    assert (q[land] == cube[land]).all() and np.isnan(q[~land]).all()
    assert g["qsdiv"].shards == (16, 16, 64) and g["qsdiv"].chunks == (1, 1, 64)
    shards = sorted(p.relative_to(Path(out) / "qsdiv" / "c").as_posix() for p in (Path(out) / "qsdiv" / "c").rglob("*") if p.is_file())
    assert shards == ["0/1/0", "2/4/0"]                                        # land-only shards
    assert g.attrs["variables"] == ["qsdiv", "ai_mean"] and g["ai_mean"].chunks == (64, 64)


# --------------------------------------------------------------------------- create-only upload
def test_upload_new_refuses_collisions(tmp_path):
    bucket = tmp_path / "bucket"
    (bucket / "dune-atlas/v1/fields/old.zarr").mkdir(parents=True)
    (bucket / "dune-atlas/v1/fields/old.zarr/zarr.json").write_text("{}")
    src = tmp_path / "new.zarr"; (src / "0").mkdir(parents=True)
    (src / "zarr.json").write_text("{}"); (src / "0" / "zarr.json").write_text("{}"); (src / "._junk").write_text("x")
    tgt = SU.LocalTarget(bucket)
    led = SU.Ledger(tmp_path / "ledger.json")
    existing = tgt.list_keys("dune-atlas/v1/")
    with pytest.raises(SU.CollisionError):                  # would land on an existing store prefix
        SU.upload_new_stores(tgt, led, [(src, "fields/old.zarr")], "dune-atlas/v1", existing, log=lambda m: None)
    assert tgt.list_keys("dune-atlas/v1/") == existing      # nothing written
    r = SU.upload_new_stores(tgt, led, [(src, "fields/new.zarr")], "dune-atlas/v1", existing, log=lambda m: None)
    assert r["objects"] == 2 and "dune-atlas/v1/fields/new.zarr/0/zarr.json" in tgt.list_keys("dune-atlas/v1/")
    with pytest.raises(FileExistsError):
        tgt.put_new("dune-atlas/v1/fields/new.zarr/zarr.json", src / "zarr.json")
    again = tgt.list_keys("dune-atlas/v1/")                 # resumed run: our own keys accepted, nothing re-sent
    r2 = SU.upload_new_stores(tgt, led, [(src, "fields/new.zarr")], "dune-atlas/v1", again, log=lambda m: None, resume=True)
    assert r2["uploaded_now"] == 0
    with pytest.raises(SU.CollisionError):                  # without resume the same run is refused
        SU.upload_new_stores(tgt, led, [(src, "fields/new.zarr")], "dune-atlas/v1", again, log=lambda m: None)


# --------------------------------------------------------------------------- registry
def test_extra_registry_fragment_validates():
    import jsonschema
    from dune_atlas_pipeline import extra_layers
    schema = json.loads((REPO / "registry" / "layers.schema.json").read_text())
    frag = extra_layers.fragment()
    v = jsonschema.Draft202012Validator({**schema["$defs"]["layer"], "$defs": schema["$defs"]})
    for layer in frag["layers"]:
        assert not list(v.iter_errors(layer)), layer["id"]
    ids = {l["id"]: l for l in frag["layers"]}
    assert ids["aridity"]["thresholdAware"] is False and ids["qsdiv"]["thresholdAware"] is True
    assert ids["qsdiv"]["display"]["transform"] == "scale" and ids["qsdiv"]["display"]["scale"] == 1000.0
    assert set(ids["aridity"]["attribution"]) >= {"source", "citation", "doi", "licence", "url"}
    import yaml
    assert yaml.safe_load((REPO / "registry" / "earth" / "generated" / "x_extra_fields.yaml").read_text()) == frag


def test_bitround_bound_used_for_reports():
    x = np.float32(np.linspace(0.0003, 6.5535, 10001))
    r = bitround(x, 12)
    assert (np.abs(r - x) / x).max() <= 2.0 ** -13 + 1e-9
