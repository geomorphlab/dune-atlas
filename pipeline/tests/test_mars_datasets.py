"""Mars wind datasets (mars/datasets.py): the FV3 descriptor reproduces the published store attributes, the
dataset specs load, native_grid.py (dune fraction across the antimeridian, cell-mean elevation) and a cells.zarr
build of a contract-source dataset (MACDA grid, 12 samples per sol) in a subprocess with DUNE_ATLAS_MARS_DATASET."""
import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

zarr = pytest.importorskip("zarr")
shapely = pytest.importorskip("shapely")

from dune_atlas_pipeline.mars import cells as CE  # noqa: E402
from dune_atlas_pipeline.mars import datasets as D  # noqa: E402
from dune_atlas_pipeline.mars import native_grid as NG  # noqa: E402

SRC = Path(__file__).resolve().parents[1] / "src"


def test_default_dataset_is_fv3():
    assert os.environ.get(D.ENV, D.DEFAULT) == "fv3-beta1"
    assert CE.DS.id == "fv3-beta1" and (CE.NY, CE.NX, CE.NT) == (90, 180, 16032)
    assert CE.GRID == {"lat0": 89, "dlat": -2, "lon0": -179, "dlon": 2, "ny": 90, "nx": 180,
                       "cell_registration": "centre"}
    # the `dataset` attribute of the published v2 store, key for key
    assert list(CE.DATASET) == ["id", "name", "resolution_deg", "n_hours", "source", "citation", "transport_law",
                                "fields_method"]
    assert CE.DATASET["resolution_deg"] == 2 and CE.DATASET["n_hours"] == 16032
    assert CE.LAT.dtype.kind == "i" and CE.LAT[0] == 89 and CE.LON[-1] == 179


def test_specs_load_and_grids():
    ds = D.all_datasets()
    assert {"fv3-beta1", "emars-v1-my30", "macda-v2-my30"} <= set(ds)
    em, ma = ds["emars-v1-my30"], ds["macda-v2-my30"]
    lat, lon = em.axes()
    assert (em.ny, em.nx) == (34, 60) and np.isclose(lat[0], 84.857142857) and np.isclose(lat[-1], -84.857142857)
    assert np.allclose(np.diff(lat), -180 / 35) and lon[0] == -177 and lon[-1] == 177
    x0, y0, dx, dy = em.edges()
    assert np.isclose(y0, 87.428571428) and x0 == -180 and dx == 6
    lat, lon = ma.axes()
    assert (ma.ny, ma.nx) == (36, 72) and lat[0] == 87.5 and lat[-1] == -87.5 and lon[0] == -180 and lon[-1] == 175
    assert ma.edges() == (-182.5, 90.0, 5.0, -5.0)
    assert em.samples_per_sol == 24 and ma.samples_per_sol == 12
    with pytest.raises(KeyError):
        D.get("no-such-dataset")


def test_dunefrac_across_antimeridian():
    from shapely.geometry import box
    g = D.get("macda-v2-my30").grid                       # column 0 is centred on -180 (spans 177.5 .. -177.5)
    geoms = [box(-180, 10, -179, 11), box(179, 10, 180, 11)]   # 2 deg of a 5 deg cell, one row
    f = NG.dunefrac_from_geoms(geoms, g)
    lat, _ = D.grid_axes(g)
    row = int(np.argmin(np.abs(lat - 12.5)))
    area = np.radians(2) * (np.sin(np.radians(11)) - np.sin(np.radians(10)))
    cell = np.radians(5) * (np.sin(np.radians(15)) - np.sin(np.radians(10)))
    assert np.isclose(f[row, 0], area / cell, rtol=1e-9)
    assert (f > 0).sum() == 1


def test_cell_means_exact_on_aligned_and_constant_fields():
    fine = np.full((180, 360), 7.0); fine[:90] = 1.0           # north 1, south 7 (1 deg grid)
    m = NG.cell_means(fine, D.get("macda-v2-my30").grid)
    assert np.allclose(m[:18], 1.0) and np.allclose(m[18:], 7.0)
    e = NG.cell_means(np.full((180, 360), 3.0), D.get("emars-v1-my30").grid)
    assert np.allclose(e, 3.0)
    # a row straddling the equator on the EMARS grid (none does: rows are symmetric about it)
    lat, _ = D.grid_axes(D.get("emars-v1-my30").grid)
    assert not np.any(np.isclose(lat, 0))


def _contract_source(path, ds, nt, seed=0):
    rng = np.random.default_rng(seed)
    g = zarr.open_group(path, mode="w", zarr_format=3)
    g.attrs.update({"dataset": ds.id, "grid": ds.grid,
                    "interfaces": {"ak_bottom": 0.0, "bk_bottom": 1.0, "ak_top": 0.0, "bk_top": 2 * 0.9995 - 1}})
    shape = (ds.ny, ds.nx, nt)
    arrs = {"u": rng.normal(0, 10, shape), "v": rng.normal(0, 8, shape), "T": 200 + 30 * rng.random(shape),
            "ps": 600 + 100 * rng.random(shape)}
    arrs["u"][3, 5, :] = 40.0                                  # marker
    for k, a in arrs.items():
        g.create_array(k, data=a.astype("f4"), chunks=shape)
    g.create_array("ls", data=np.linspace(0, 1, nt).astype("f4"))
    g.create_array("sol", data=(np.arange(nt) / ds.samples_per_sol).astype("f4"))
    return arrs


def test_contract_dataset_build(tmp_path):
    ds = D.get("macda-v2-my30")
    nt = 24
    arrs = _contract_source(str(tmp_path / "source.zarr"), ds, nt)
    frac = np.zeros((ds.ny, ds.nx), "f4"); frac[3, 5] = 0.4
    NG.save(str(tmp_path / "dunefrac.npz"), ds, frac=frac, dune=(frac > 0).astype("u1"))
    code = ("import json; from dune_atlas_pipeline.mars import cells as CE; "
            f"s = CE.build({str(tmp_path / 'source.zarr')!r}, {str(tmp_path / 'dunefrac.npz')!r}, "
            f"{str(tmp_path / 'cells.zarr')!r}, {str(tmp_path / 'w')!r}, nproc=1, shards=[(0, 0)], "
            "log=lambda *_: None); print(json.dumps({'cells': s['cells'], 'nan': s['fields_nan']}))")
    env = dict(os.environ, **{D.ENV: ds.id, "PYTHONPATH": str(SRC)})
    r = subprocess.run([sys.executable, "-c", code], env=env, capture_output=True, text=True, check=True)
    res = json.loads(r.stdout.strip().splitlines()[-1])
    assert res["cells"] == 256                                  # one 16 x 16 shard
    g = zarr.open_group(str(tmp_path / "cells.zarr"), mode="r")
    a = dict(g.attrs)
    assert a["grid"] == ds.grid and a["dataset"]["id"] == ds.id and a["dataset"]["samples_per_sol"] == 12
    assert a["license"] == "OGL-UK-3.0" and a["title"] == ds.store_title and a["series_note"] == ds.series_note
    S = g["series"]
    assert S.shape == (36, 72, 5, nt)
    np.testing.assert_allclose(S[3, 5, 0], 40.0, atol=0.005)
    np.testing.assert_allclose(S[1, 2, 2], arrs["T"][1, 2].astype("f4"), atol=0.02)
    # p = s ps and z = (R T / g) ln(1/s) at the lowest sigma level
    from dune_atlas_pipeline.mars import constants as M
    z = M.R_AIR * arrs["T"][1, 2] / M.G * np.log(1 / 0.9995)
    np.testing.assert_allclose(S[1, 2, 4], z, atol=1e-3)
    rho = 0.9995 * arrs["ps"][1, 2] / (M.R_AIR * arrs["T"][1, 2])
    np.testing.assert_allclose(S[1, 2, 3], rho, rtol=5e-4)
    assert g["dunes"][3, 5] == pytest.approx(0.4) and g["dune"][3, 5] == 1
    built = g["fields"][:16, :16]
    # undefined ratios where a grain size never moves in 24 samples are NaN, as counted by the build
    assert int(np.isnan(built).sum()) == res["nan"] and np.isfinite(built).mean() > 0.9
    assert np.isnan(g["fields"][16:, 16:]).all()
