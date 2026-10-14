"""Mars sidecars (mars/sidecars.py, mars/pyramids.py): qsdiv with R_MARS, field pyramids, cells-aux, registry."""
import json

import numpy as np
import pytest

zarr = pytest.importorskip("zarr")
pytest.importorskip("topozarr")
yaml = pytest.importorskip("yaml")

from dune_atlas_pipeline.mars import cells as CE  # noqa: E402
from dune_atlas_pipeline.mars import constants as M  # noqa: E402
from dune_atlas_pipeline.mars import fields as F  # noqa: E402
from dune_atlas_pipeline.mars import sidecars as SC  # noqa: E402

QV = F.QSAT_VARS


def test_qsdiv_meridional_analytic():
    """Constant northward flux c: div = -c tan(phi) / R_MARS."""
    fields = np.zeros((23, 64, CE.NY, CE.NX), "f4")
    c = 1e-6
    fields[QV.index("rdpm")] = c
    fields[QV.index("rdpa")] = np.pi / 2
    q = SC.compute_qsdiv(fields)
    phi = np.radians(CE.LAT)[:, None]
    want = -c * np.tan(phi) / M.R_MARS * M.S2Y * np.ones((1, CE.NX))
    inner = slice(1, -1)
    np.testing.assert_allclose(q[5, inner], want[inner], rtol=2e-3, atol=1e-9 * np.abs(want).max())
    assert np.isfinite(q).all()


def _fake_export(path):
    rng = np.random.default_rng(0)
    base = []
    for s in range(4):
        n = 800
        t = np.arange(n) / 24
        sp = rng.weibull(2.0, n) * (6 + 3 * s)
        di = rng.normal(0.5 * s, 0.9, n)
        base.append(F.mars_cell_fields(sp * np.cos(di), sp * np.sin(di), 210 + 20 * np.sin(2 * np.pi * t),
                                       np.full(n, 0.015), np.full(n, 1.8)))
    fields = np.empty((23, 64, CE.NY, CE.NX), "f4")
    pick = rng.integers(0, 4, (CE.NY, CE.NX))
    for b in range(4):
        m = pick == b
        fields[:, :, m] = base[b][:, :, None]
    dunes = np.zeros((CE.NY, CE.NX), "f4"); dunes[30:40, 100:120] = 0.2
    np.savez(path, fields=fields, rho_mean=(0.01 + 0.01 * rng.random((CE.NY, CE.NX))).astype("f4"), dunes=dunes,
             lat=CE.LAT, lon=CE.LON, d_values_um=M.D_VALUES_UM, field_vars=np.array(QV))
    return fields


def test_build_all(tmp_path):
    fields = _fake_export(tmp_path / "fields_export.npz")
    em = np.linspace(-8000, 20000, 90 * 180, dtype="f4").reshape(90, 180)
    np.savez(tmp_path / "elev_mean.npz", elev_mean=em, lat=CE.LAT.astype("f8"), lon=CE.LON.astype("f8"),
             grid=json.dumps(CE.GRID), source="test DEM")
    st = SC.build_all(tmp_path / "fields_export.npz", tmp_path / "devroot", gen=tmp_path / "gen",
                      meta_json=tmp_path / "meta.json", vars_=["dpm", "ab", "uft"], log=lambda *_: None,
                      elev_npz=tmp_path / "elev_mean.npz")
    base = tmp_path / "devroot" / SC.PREFIX
    g = zarr.open_group(str(base / "fields" / "dpm.zarr"), mode="r")
    a = g["0"]["dpm"]
    assert a.shape == (64, 90, 180) and tuple(a.metadata.dimension_names) == ("d", "y", "x")
    np.testing.assert_allclose(a[29], fields[QV.index("dpm"), 29] * M.S2Y, rtol=2.5e-4)
    assert g.attrs["body"] == "mars" and g.attrs["d_default_index"] == 29
    np.testing.assert_array_equal(g["0"]["d"][:], M.D_VALUES_UM)
    ab = zarr.open_group(str(base / "fields" / "ab.zarr"), mode="r")["0"]["ab"][29]
    np.testing.assert_allclose(ab, fields[QV.index("ab"), 29], atol=1e-3)
    r = zarr.open_group(str(base / "fields" / "rho_mean.zarr"), mode="r")
    assert r["0"]["rho_mean"].shape == (90, 180)
    aux = zarr.open_group(str(base / "cells-aux.zarr"), mode="r")
    assert aux.attrs["variables"] == ["qsdiv", "rho_mean", "elev_mean"] and aux.attrs["grid"] == CE.GRID
    np.testing.assert_array_equal(aux["elev_mean"][:], em)
    assert aux["elev_mean"].attrs["units"] == "m" and "Fergason" in aux["elev_mean"].attrs["citation"]
    assert aux["qsdiv"].shape == (90, 180, 64) and tuple(aux["qsdiv"].metadata.dimension_names)[-1] == "d"
    np.testing.assert_allclose(aux["qsdiv"][:, :, 29], SC.compute_qsdiv(fields)[29], rtol=1e-6)
    meta = json.load(open(tmp_path / "meta.json"))
    assert set(meta) == set(QV) and meta["dpm"]["p98"] > meta["dpm"]["p2"]
    assert "hours of the Mars year" in meta["dpm"]["description"]
    q = yaml.safe_load(open(tmp_path / "gen" / "qsat_fields.yaml"))
    assert sorted(l["id"] for l in q["layers"]) == sorted(QV)
    for lay in q["layers"]:
        assert lay["source"] == f"{{dataset}}/fields/{lay['id']}.zarr"
        # definitions only (units / slider / data are info-popover rows); one citation + licence
        assert "Shown at the selected" not in lay["description"] and "Converted from" not in lay["description"]
        assert lay["attribution"]["licence"] == SC.LICENCE and lay["attribution"]["citation"] == SC.CITATION
        assert "u*,th (default" not in lay["description"]
    x = yaml.safe_load(open(tmp_path / "gen" / "x_extra_fields.yaml"))
    assert [l["id"] for l in x["layers"]] == ["qsdiv", "rho_mean"]
    assert x["layers"][0]["display"]["clim"][0] == -x["layers"][0]["display"]["clim"][1]
    assert st["cells_aux"]["variables"] == ["qsdiv", "rho_mean", "elev_mean"]
