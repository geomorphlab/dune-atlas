"""Vegetation cover layer: grid/IO checks, pyramid levels and transforms, sidecar layout, registry fragment."""
import json
import os
from pathlib import Path

import numpy as np
import pytest

from dune_atlas_pipeline import vegetation as VG
from dune_atlas_pipeline.fields import bitround

REPO = Path(__file__).resolve().parents[2]
STAGED_NC = REPO / "staging" / "new-layers" / "veg" / "tot_cov_mean_2001_2025.nc"
STAGED_PYR = REPO / "staging" / "new-layers" / "veg" / "fields" / "vegetation.zarr"
STAGED_AUX = REPO / "staging" / "new-layers" / "veg" / "cells-aux-veg.zarr"


def _fake_nc(path, rng):
    import netCDF4
    m = rng.uniform(0, 103, (VG.NY, VG.NX)).astype("f4")
    n = rng.integers(0, 301, (VG.NY, VG.NX)).astype("i2")
    m[n == 0] = np.nan
    with netCDF4.Dataset(path, "w") as d:
        d.createDimension("latitude", VG.NY); d.createDimension("longitude", VG.NX)
        d.createVariable("latitude", "f8", ("latitude",))[:] = np.round(90 - 0.1 * np.arange(VG.NY), 6)
        d.createVariable("longitude", "f8", ("longitude",))[:] = np.round(-180 + 0.1 * np.arange(VG.NX), 6)
        d.createVariable("tot_cov_mean", "f4", ("latitude", "longitude"), fill_value=np.float32(np.nan))[:] = m
        d.createVariable("n_months", "i2", ("latitude", "longitude"), fill_value=np.int16(-1))[:] = n
    return m, n


def test_level_transforms_exact_edges():
    for f in VG.LEVEL_FACTORS:
        t = VG.level_transform(f)
        assert t[2] == -180.05 and t[5] == 90.05            # outer edges identical at every level
        assert t[0] == pytest.approx(0.1 * f, abs=1e-12) and t[4] == pytest.approx(-0.1 * f, abs=1e-12)
        # centre of native cell (0, 0) = (-180, 90); level f covers f native cells per pixel
        assert t[2] + 0.5 * t[0] == pytest.approx(-180.05 + 0.05 * f)


def test_coarse_levels_count_weighted_and_trimmed():
    rng = np.random.default_rng(1)
    a = rng.uniform(0, 100, (VG.NY, VG.NX)).astype("f4")
    a[rng.random(a.shape) < 0.3] = np.nan
    lv = VG.coarse_levels(a)
    assert [lv[f].shape for f in VG.LEVEL_FACTORS] == [(1801, 3600), (900, 1800), (450, 900), (225, 450), (112, 225)]
    for f in (2, 16):
        for (i, j) in [(0, 0), (5, 7), (lv[f].shape[0] - 1, lv[f].shape[1] - 1)]:
            w = a[i * f:(i + 1) * f, j * f:(j + 1) * f]
            exp = np.nanmean(w) if np.isfinite(w).any() else np.nan
            assert np.allclose(lv[f][i, j], exp, rtol=1e-6, equal_nan=True)
    allnan = np.full((32, 32), np.nan, "f4"); allnan[0, 0] = 5
    lv2 = VG.coarse_levels(allnan, factors=(1, 16))
    assert lv2[16][0, 0] == 5 and np.isnan(lv2[16][1, 1])


def test_load_checks_and_pyramid_roundtrip(tmp_path):
    import zarr
    rng = np.random.default_rng(2)
    m, n = _fake_nc(tmp_path / "v.nc", rng)
    m2, n2 = VG.load(tmp_path / "v.nc")
    assert np.array_equal(np.isfinite(m2), n2 > 0) and np.allclose(m2, m, equal_nan=True)
    st = VG.build_pyramid(tmp_path / "v.nc", str(tmp_path / "veg.zarr"))
    assert st["keepbits_max_rel_err"] <= 2 ** -13 and st["keepbits_zero_preserved"]
    g = zarr.open_group(str(tmp_path / "veg.zarr"), mode="r")
    lay = g.attrs["multiscales"]["layout"]
    assert [e["spatial:shape"] for e in lay] == [[1801, 3600], [900, 1800], [450, 900], [225, 450], [112, 225]]
    assert g.attrs["spatial:transform"] == [0.1, 0.0, -180.05, 0.0, -0.1, 90.05]
    l0 = g["0"][VG.VAR][...]
    assert l0.shape == (1801, 3600) and g["0"][VG.VAR].metadata.dimension_names == ("y", "x")
    assert np.array_equal(l0, bitround(m, 12), equal_nan=True)
    x4 = g["4"]["x"][...]; y4 = g["4"]["y"][...]
    assert x4[0] == pytest.approx(-180.05 + 0.8) and y4[0] == pytest.approx(90.05 - 0.8)
    assert g.attrs["zarr-layer"][VG.VAR] == {"clim": VG.CLIM, "colormap": VG.COLORMAP}


def test_cells_aux_veg_layout(tmp_path):
    import xarray as xr
    import zarr
    rng = np.random.default_rng(3)
    m, n = _fake_nc(tmp_path / "v.nc", rng)
    land = np.zeros((VG.NY, VG.NX), bool); land[100:300, 1000:1200] = True
    xr.Dataset({"land": (("y", "x"), land.astype("i1"))}).to_netcdf(tmp_path / "layers.nc")
    st = VG.build_cells_aux(str(tmp_path / "aux.zarr"), tmp_path / "v.nc", str(tmp_path))
    g = zarr.open_group(str(tmp_path / "aux.zarr"), mode="r")
    assert st["variables"] == ["tot_cov_mean", "tot_cov_n_months"] == g.attrs["variables"]
    a = g["tot_cov_mean"]
    assert a.chunks == (64, 64) and a.shards is None and a.metadata.dimension_names == ("latitude", "longitude")
    v = a[...]
    assert np.isnan(v[~land]).all() and np.allclose(v[land], m[land], equal_nan=True)
    assert np.array_equal(g["tot_cov_n_months"][...][land], n[land].astype("f4"))
    assert "sidecar_convention" in g.attrs and g.attrs["grid"]["ny"] == 1801
    import dune_atlas_pipeline.cellsaux as CA
    with pytest.raises(FileExistsError):              # arrays are immutable once written
        CA.write_variable(zarr.open_group(str(tmp_path / "aux.zarr"), mode="a"), "tot_cov_mean", m, land, {})


def test_registry_fragment_validates_and_is_2d():
    import jsonschema
    schema = json.loads((REPO / "registry" / "layers.schema.json").read_text())
    lay = VG.registry_layer()
    v = jsonschema.Draft202012Validator({**schema["$defs"]["layer"], "$defs": schema["$defs"]})
    assert not list(v.iter_errors(lay))
    assert lay["group"] == "climate" and lay["thresholdAware"] is False and lay["display"]["log"] is False
    assert set(lay["attribution"]) == {"source", "citation", "doi", "licence", "url", "changes"}
    assert lay["attribution"]["url"] == "https://map.geo-rapp.org/"
    cmaps = json.loads((REPO / "app" / "src" / "generated" / "colormaps.json").read_text())
    assert lay["display"]["colormap"] in cmaps
    import yaml
    frag = yaml.safe_load(VG.FRAGMENT.read_text())
    assert frag == VG.fragment(), "registry/generated/x_vegetation.yaml is stale: rerun `vegetation registry`"


@pytest.mark.skipif(not STAGED_NC.exists(), reason="staged vegetation NetCDF not present")
def test_staged_inputs_and_outputs_consistent():
    import zarr
    m, n = VG.load(STAGED_NC)
    fin = np.isfinite(m)
    assert 1.4e6 < fin.sum() < 1.5e6 and n.max() <= 300 and np.nanmax(m) <= 103.0 and np.nanmin(m) >= 0
    assert not fin[:, 0].any()                          # 180 deg column: no data in the monthly aggregates
    lat = 90 - 0.1 * np.arange(VG.NY)
    assert not fin[lat > 70.0001].any() and not fin[lat < -60.0001].any()
    if STAGED_PYR.exists():
        g = zarr.open_group(str(STAGED_PYR), mode="r")
        assert np.array_equal(g["0"][VG.VAR][...], bitround(m, 12), equal_nan=True)
