"""Wind-dataset grids (ERA5-Land 0.1°, ERA5 0.25°) on a synthetic 0.25° fixture: grid parsing and edges, cell store
build, field pyramid levels/edges, flux divergence, exact-area regridding and dune overlap, cells-aux sidecar."""
import json

import numpy as np
import pytest
import xarray as xr
import zarr

from dune_atlas_pipeline import cellmasks as CM
from dune_atlas_pipeline import cellsaux as CA
from dune_atlas_pipeline import cellstore as CS
from dune_atlas_pipeline import constants as C
from dune_atlas_pipeline import fields as F
from dune_atlas_pipeline import qsdiv as QS
from dune_atlas_pipeline.grid import DATASETS, ERA5_GRID, ERA5_LAND_GRID, Grid, grid_of

E5 = DATASETS["era5"]
# land block (rows 256-319 = 26.0..10.25 N, columns 704-767 = -4..11.75 E) and a bottom-row strip (row 720 = 90 S,
# a 1-row edge shard: 721 = 45 * 16 + 1)
BLOCK = (slice(256, 320), slice(704, 768))
EDGE = (slice(720, 721), slice(0, 40))


# ------------------------------------------------------------------------------------------- grid
def test_grid_from_float32_coords_and_edges():
    for g in (ERA5_LAND_GRID, ERA5_GRID):
        lat = g.lat().astype("f4"); lon = g.lon().astype("f4")
        assert Grid.from_coords(lat, lon) == g
    g = ERA5_GRID
    assert g.attrs() == {"lat0": 90.0, "dlat": -0.25, "lon0": -180.0, "dlon": 0.25, "ny": 721, "nx": 1440,
                         "cell_registration": "centre"}
    assert g.transform_4326() == (0.25, 0.0, -180.125, 0.0, -0.25, 90.125)
    assert ERA5_LAND_GRID.transform_4326() == (0.1, 0.0, -180.05, 0.0, -0.1, 90.05)
    e = g.lat_edges()
    assert e[0] == 90.0 and e[1] == 89.875 and e[-1] == -90.0 and e[-2] == -89.875 and len(e) == 722
    le = g.lon_edges()
    assert le[0] == -180.125 and le[-1] == 179.875 and np.allclose(np.diff(le), 0.25)
    assert g.label == "0.25°" and ERA5_LAND_GRID.label == "0.1°"
    with pytest.raises(AssertionError):
        Grid.from_coords(np.r_[90.0, 89.75, 89.4], np.arange(4.0))


# ------------------------------------------------------------------------------------------- fixture
@pytest.fixture(scope="module")
def era5_dir(tmp_path_factory):
    return make_era5_dir(tmp_path_factory.mktemp("era5"))


def make_era5_dir(d):
    """Synthetic ERA5 data directory: full-size stores with values only in BLOCK and EDGE (other chunks absent)."""
    import numcodecs
    g = ERA5_GRID
    rng = np.random.default_rng(5)
    land = np.zeros(g.shape, bool)
    land[BLOCK] = True
    land[EDGE] = True
    land[BLOCK][::7, ::5] = False                     # some interior non-land cells (view assignment)
    lsm = np.where(land, 0.9, 0.1)
    dunes = np.zeros(g.shape, bool); dunes[260:270, 710:720] = True; dunes[300, 760] = True
    xr.Dataset({"land": (("latitude", "longitude"), land.astype("u1")),
                "dunes": (("latitude", "longitude"), dunes.astype("u1")),
                "lsm": (("latitude", "longitude"), lsm.astype("f4"))},
               coords={"latitude": g.lat(), "longitude": g.lon()}).to_netcdf(d / E5.masks_file)
    comp = numcodecs.Blosc("lz4", 5, 1)
    h = zarr.open_group(str(d / E5.hist_store), mode="w", zarr_format=2)
    h.attrs.update({"title": "synthetic", "n_hours": E5.n_hours})
    for n, v in (("latitude", g.lat().astype("f4")), ("longitude", g.lon().astype("f4")),
                 ("um_bin", C.UM_CENTRES), ("ua_bin", C.UA_CENTRES)):
        a = h.create_array(n, shape=v.shape, dtype=v.dtype, chunks=v.shape, compressors=comp, fill_value=np.nan,
                           attributes={"_ARRAY_DIMENSIONS": [n]}); a[...] = v
    H = h.create_array("histogram_um_ua", shape=(*g.shape, 128, 128), dtype="u4", chunks=(13, 64, 128, 128),
                       compressors=comp, fill_value=None,
                       attributes={"_ARRAY_DIMENSIONS": ["latitude", "longitude", "um_bin", "ua_bin"]})
    q = zarr.open_group(str(d / E5.qsat_store), mode="w", zarr_format=2)
    for n, v in (("ut", C.UT_VALUES), ("latitude", g.lat().astype("f4")), ("longitude", g.lon().astype("f4"))):
        a = q.create_array(n, shape=v.shape, dtype=v.dtype, chunks=v.shape, compressors=comp, fill_value=np.nan,
                           attributes={"_ARRAY_DIMENSIONS": [n]}); a[...] = v
    arrs = {v: q.create_array(v, shape=(64, *g.shape), dtype="f8", chunks=(64, 64, 64), compressors=comp,
                              fill_value=np.nan, attributes={"_ARRAY_DIMENSIONS": ["ut", "latitude", "longitude"],
                                                             "units": "u", "long_name": f"long {v}"})
            for v in C.QSAT_VARS}
    ref = {}
    for sl in (BLOCK, EDGE):
        ny, nx = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        hb = rng.integers(0, 40, (ny, nx, 128, 128)).astype("u4")
        hb[..., :64, :] = 0
        hb[:, :, 0, 0] = E5.n_hours - hb.sum((2, 3))   # every cell sums to n_hours (also ocean: global source)
        H[sl] = hb
        ref[sl[0].start] = hb
        for v, a in arrs.items():
            a[:, sl[0], sl[1]] = rng.normal(size=(64, ny, nx))
    return d, land, dunes, lsm, ref


# ------------------------------------------------------------------------------------------- cell store
def test_cellstore_era5_region(era5_dir, tmp_path):
    d, land, dunes, lsm, ref = era5_dir
    out = str(tmp_path / "cells.zarr")
    n1 = CS.write_region(out, str(d), 256, 320, 704, 768, log=lambda s: None, dataset="era5")
    n2 = CS.write_region(out, str(d), 720, None, 0, 48, log=lambda s: None, dataset="era5")
    assert n1 == 16 and n2 == 3
    g = zarr.open_group(out, mode="r")
    at = g.attrs
    assert at["grid"] == ERA5_GRID.attrs() and at["n_hours"] == 657456 and at["dataset"]["name"] == "ERA5"
    assert at["land_cells"] == int(land.sum()) and at["dune_cells"] == int(dunes.sum())
    assert g["hist"].shape == (721, 1440, 128, 128) and g["fields"].shape == (721, 1440, 23, 64)
    i, j = 300, 760                                    # land cell inside BLOCK
    assert land[i, j]
    assert np.array_equal(g["hist"][i, j], ref[256][i - 256, j - 704])
    dq = xr.open_zarr(str(d / E5.qsat_store), consolidated=False)
    want = np.stack([dq[v].values[:, i, j] for v in CS.FIELD_VARS]).astype("f4")
    assert np.array_equal(g["fields"][i, j], want)
    i, j = 256, 704                                    # BLOCK cell made non-land (::7, ::5): no data
    assert not land[i, j] and (g["hist"][i, j] == 0).all() and np.isnan(g["fields"][i, j]).all()
    assert np.array_equal(g["hist"][720, 3], ref[720][0, 3])   # 1-row edge shard
    m = CS.load_manifest(out)
    assert m["anomalies"] == []
    assert (g["dunes"][:] == dunes).all() and (g["land"][:] == land).all()
    v = CS.validate_store(out, str(d), n=40, region=(256, 320, 704, 768), n_ocean=20, dataset="era5")
    assert v["hist_exact"] == v["n_checked"] == v["fields_exact_float32"] == 40
    assert v["hist_sum"]["n_eq_n_hours"] == 40


# ------------------------------------------------------------------------------------------- pyramids
def test_field_pyramid_era5_levels_and_land(era5_dir, tmp_path):
    d, land, *_ = era5_dir
    from dune_atlas_pipeline.qsat_view import open_qsat
    dq = open_qsat(str(d), chunks=None, dataset="era5")
    assert grid_of(dq) == ERA5_GRID
    out = str(tmp_path / "dpm.zarr")
    dq1 = dq[["dpm"]].isel(ut=slice(0, 2))
    st = F.build_field_pyramid(dq1, "dpm", out, dataset="era5", land=land)
    assert st["levels"] == 4 and st["level_widths"] == [1440, 720, 360, 180]
    r = zarr.open_group(out, mode="r")
    assert r.attrs["dataset_name"] == "ERA5" and r.attrs["dataset_resolution"] == "0.25°"
    lv = r.attrs["multiscales"]["layout"]
    for k, L in enumerate(lv):
        tr = L["spatial:transform"]
        f = 2 ** k
        assert np.allclose([tr[0], tr[2], tr[4], tr[5]], [0.25 * f, -180.125, -0.25 * f, 90.125]), (k, tr)
        assert L["spatial:shape"] == [721 // f, 1440 // f]
    a0 = r["0"]["dpm"][0]
    assert np.isnan(a0[~land]).all() and np.isfinite(a0[land]).all()
    x = dq["dpm"].values[0] * C.S2Y
    assert np.allclose(a0[land], x[land], rtol=2.5e-4)


# ------------------------------------------------------------------------------------------- qsdiv
def test_divergence_analytic_on_0p25():
    g = ERA5_GRID
    lat, lon = g.lat(), g.lon()
    lam = np.deg2rad(lon)[None, :] * np.ones((g.ny, 1))
    # q e^{i theta} = (sin lambda, 0)  ->  div = cos(lambda) / (R cos phi)
    qx = np.sin(lam)
    q, th = np.abs(qx), np.where(qx >= 0, 0.0, np.pi)
    d = QS.divergence(q, th, lat, lon)
    phi = np.deg2rad(lat)[:, None]
    want = np.cos(lam) / (QS.R_EARTH * np.cos(phi))
    rows = np.abs(lat) < 80
    assert np.isnan(d[0]).all() and np.isnan(d[-1]).all()
    assert np.allclose(d[rows], want[rows], rtol=2e-5, atol=1e-12)


def test_qsdiv_compute_era5_masks_to_land(era5_dir):
    d, land, *_ = era5_dir
    arr = QS.compute(str(d), log=lambda s: None, dataset="era5")
    assert arr.shape == (64, 721, 1440)
    fin = np.isfinite(arr[14])
    assert not fin[~land].any()
    # a finite value needs the cell and its four neighbours on land
    i, j = np.argwhere(fin)[0]
    assert land[i - 1:i + 2, j].all() and land[i, j - 1:j + 2].all()
    assert fin.sum() > 0 and not fin[720].any()


# ------------------------------------------------------------------------------------------- regrid
def test_regrid_exact_areas_and_dune_overlap():
    R = CM.Regrid(ERA5_GRID, ERA5_LAND_GRID)
    ones = np.ones(ERA5_LAND_GRID.shape)
    full = R.overlap_area(ones.astype(bool))
    assert np.allclose(full, R.area, rtol=1e-12)                    # every footprint fully covered (poles too)
    assert abs(full.sum() - 4 * np.pi) < 1e-9                       # sphere
    mean, vf = R.area_weighted_mean(np.where(ones > 0, 3.0, 0))
    assert np.allclose(mean, 3.0) and np.allclose(vf, 1.0)
    # one 0.1° dune cell at (i, j): exactly the 0.25° cells whose edges intersect its footprint
    rng = np.random.default_rng(0)
    for _ in range(20):
        i, j = int(rng.integers(0, 1801)), int(rng.integers(0, 3600))
        m = np.zeros(ERA5_LAND_GRID.shape, bool); m[i, j] = True
        hit = np.argwhere(R.any_overlap(m))
        la, lo = 90 - 0.1 * i, -180 + 0.1 * j
        lat_lo, lat_hi = max(-90, la - 0.05), min(90, la + 0.05)
        ys = [a for a in range(721) if max(lat_lo, 90 - 0.25 * a - 0.125) < min(lat_hi, 90 - 0.25 * a + 0.125)]
        xs = [b for b in range(1440) if abs(((lo - (-180 + 0.25 * b)) + 180) % 360 - 180) < 0.175]
        assert sorted(map(tuple, hit.tolist())) == sorted((a, b) for a in ys for b in xs), (i, j)
    # area-weighted mean = exact weighted average of two halves
    v = np.full(ERA5_LAND_GRID.shape, np.nan); v[:, :1800] = 1.0; v[:, 1800:] = 2.0
    mean, vf = R.area_weighted_mean(v)
    assert np.allclose(mean[:, 1], 1.0) and np.allclose(mean[:, 1438], 2.0)
    # cell 720 (lon -0.125..0.125): 0.075° of value 1 (0.1° cell -0.15..-0.05), 0.175° of value 2
    assert np.allclose(mean[:, 720], (0.075 * 1 + 0.175 * 2) / 0.25)
    assert np.isfinite(mean).all() and np.allclose(vf, 1.0)


def test_cellmasks_build(tmp_path):
    d = tmp_path
    dunes01 = np.zeros(ERA5_LAND_GRID.shape, "u1"); dunes01[1000, 2000] = 1; dunes01[500:503, 100] = 1
    xr.Dataset({"dunes": (("latitude", "longitude"), dunes01), "land": (("latitude", "longitude"), dunes01)}
               ).to_netcdf(d / "layers.nc")
    lsm = np.zeros(ERA5_GRID.shape, "f4")
    np.save(d / "lsm.npy", lsm)
    st = CM.build(str(d / "lsm.npy"), str(d), str(d / "m.nc"))
    assert st["land_cells"] == 0 and st["dune_cells"] >= 2 and st["dune_cells_land"] == 0
    assert st["dune_cells_0p1_without_era5_land"] == 4
    assert abs(st["dune_area_in_lsm_le_0p5_cells_km2"] - st["dune_area_0p1_km2"]) < 1e-6 * st["dune_area_0p1_km2"]
    with xr.open_dataset(d / "m.nc") as M:
        assert M.dunes.values.sum() == st["dune_cells"] and M.land.values.sum() == 0


# ------------------------------------------------------------------------------------------- cells-aux
def test_cellsaux_era5(era5_dir, tmp_path):
    d, land, dunes, lsm, _ = era5_dir
    q = np.full((64, 721, 1440), np.nan, "f4"); q[:, 300, 760] = np.arange(64)
    QS.write_native(q, str(tmp_path / "q.zarr"), ERA5_GRID)
    ai = {k: np.full(ERA5_GRID.shape, 0.5, "f4") for k in ("ai_mean", "ai_valid_frac", "ai_sat_frac")}
    out = str(tmp_path / "cells-aux.zarr")
    r = CA.build(out, str(d), str(tmp_path / "q.zarr"), ai_means=ai, dataset="era5")
    assert r["variables"] == ["qsdiv", "ai_mean", "ai_valid_frac", "ai_sat_frac", "lsm"]
    g = zarr.open_group(out, mode="r")
    assert g.attrs["grid"] == ERA5_GRID.attrs() and g.attrs["dataset"] == "era5"
    assert np.array_equal(g["qsdiv"][300, 760], np.arange(64, dtype="f4"))
    assert g["lsm"][300, 760] == np.float32(0.9) and np.isnan(g["lsm"][0, 0])
    assert "900" in g["ai_valid_frac"].attrs["description"] and "0.25°" in g["ai_mean"].attrs["description"]
    assert "NaN" not in json.dumps(dict(g.attrs)) and "NaN" not in json.dumps(dict(g["lsm"].attrs))
