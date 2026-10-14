"""Mars cells.zarr builder (mars/cells.py) on a synthetic FV3 file: orientation, series rounding, fields, layout."""
import json

import numpy as np
import pytest

netCDF4 = pytest.importorskip("netCDF4")
zarr = pytest.importorskip("zarr")

from dune_atlas_pipeline.mars import cells as CE  # noqa: E402
from dune_atlas_pipeline.mars import constants as M  # noqa: E402
from dune_atlas_pipeline.mars import fields as F  # noqa: E402
from dune_atlas_pipeline.mars import physics as P  # noqa: E402

NT = 48


def _fake_fv3(d, nt=NT, seed=0):
    rng = np.random.default_rng(seed)
    lat = np.arange(-89, 90, 2.0); lon = np.arange(1, 360, 2.0)
    with netCDF4.Dataset(d / CE.FV3_FILE, "w", format="NETCDF3_64BIT_OFFSET") as ds:
        ds.createDimension("time", nt); ds.createDimension("lat", 90); ds.createDimension("lon", 180)
        ds.createDimension("phalf", 57); ds.createDimension("scalar_axis", 1)
        ds.createVariable("lat", "f8", ("lat",))[:] = lat
        ds.createVariable("lon", "f8", ("lon",))[:] = lon
        ds.createVariable("time", "f8", ("time",))[:] = 3340 + np.arange(1, nt + 1) / 24
        ds.createVariable("areo", "f4", ("time", "scalar_axis"))[:] = (1800 + np.arange(nt) * 0.0215)[:, None]
        ak = np.linspace(0, 3, 57).astype("f4"); ak[-1] = 0.0
        bk = np.linspace(0, 1, 57).astype("f4"); bk[-2] = 0.9997; ak[-2] = 0.0     # lowest layer ~1.7 m
        ds.createVariable("ak", "f4", ("phalf",))[:] = ak
        ds.createVariable("bk", "f4", ("phalf",))[:] = bk
        shape = (nt, 90, 180)
        u = rng.normal(0, 10, shape).astype("f4"); v = rng.normal(0, 8, shape).astype("f4")
        u[:, 45, 10] = 77.0                               # marker: FV3 lat 1, lon 21 -> contract row 44, col 100
        T = (200 + 30 * rng.random(shape)).astype("f4"); ps = (600 + 100 * rng.random(shape)).astype("f4")
        for name, a in (("ucomp_bot", u), ("vcomp_bot", v), ("temp_bot", T), ("ps", ps)):
            ds.createVariable(name, "f4", ("time", "lat", "lon"))[:] = a
    frac = np.zeros((90, 180)); frac[45, 10] = 0.25; frac[0, 0] = 1.0; frac[49, 33] = 0.5   # (49, 33): Nili cell
    np.savez(d / "dunefrac.npz", frac=frac, lat=lat, lon=lon)
    return u, v, T, ps, ak, bk


def test_orientation_mapping():
    a = np.arange(90 * 180).reshape(90, 180)
    c = CE.fv3_to_contract(a)
    fl = np.arange(-89, 90, 2); fo = np.arange(1, 360, 2)
    for i, j in ((0, 0), (44, 100), (89, 179), (10, 89), (10, 90)):
        lat, lon = CE.LAT[i], CE.LON[j]
        fi, fj = int(np.where(fl == lat)[0][0]), int(np.where(fo == lon % 360)[0][0])
        assert c[i, j] == a[fi, fj]


def test_choose_keepbits_meets_tolerance():
    rng = np.random.default_rng(1)
    for kind, tol, x in (("abs", 0.005, rng.normal(0, 20, 10000)), ("abs", 0.02, 150 + 150 * rng.random(10000)),
                         ("rel", 5e-4, 0.002 + 0.03 * rng.random(10000))):
        x = x.astype("f4")
        k = CE.choose_keepbits(x, kind, tol)
        assert CE.rounding_error(x, CE.bitround(x, k), kind) <= tol
        assert CE.rounding_error(x, CE.bitround(x, k - 2), kind) > tol      # not wastefully high


def test_build_small_store(tmp_path):
    u, v, T, ps, ak, bk = _fake_fv3(tmp_path)
    out = str(tmp_path / "cells.zarr")
    s = CE.build(str(tmp_path), str(tmp_path / "dunefrac.npz"), out, str(tmp_path / "w"), nproc=2,
                 shards=[(32, 96), (0, 0)], export=str(tmp_path / "export"), log=lambda *_: None,
                 bench_shard=(32, 96))
    assert s["shards_done"] == 2 and s["cells"] == 512
    g = zarr.open_group(out, mode="r")
    assert g.attrs["grid"] == CE.GRID and g.attrs["body"] == "mars"
    assert g.attrs["d_values_um"][M.D_DEFAULT_INDEX] == 200
    assert g.attrs["series_vars"] == ["u", "v", "T", "rho", "z"] and g.attrs["series_units"]["z"] == "m"
    assert g["series"].shape == (90, 180, 5, NT) and g["fields"].shape == (90, 180, 23, 64)
    assert g["series"].shards == (16, 16, 5, NT) and g["series"].chunks == (1, 1, 5, NT)
    # marker cell (contract row 44, col 100) carries FV3 lat 1, lon 21
    ser = g["series"][44, 100]
    assert np.all(np.abs(ser[0] - 77.0) <= 0.005)
    kb = g.attrs["series_keepbits"]
    fi, fj = 45, 10
    np.testing.assert_allclose(ser[1], v[:, fi, fj], atol=0.005)
    np.testing.assert_allclose(ser[2], T[:, fi, fj], atol=0.02)
    p, rho = P.air_state(ps[:, fi, fj].astype("f8"), T[:, fi, fj].astype("f8"), ak[-1], bk[-1], ak[-2], bk[-2])
    np.testing.assert_allclose(ser[3], rho, rtol=5e-4)
    z = P.layer_height(ps[:, fi, fj].astype("f8"), T[:, fi, fj].astype("f8"), ak[-1], bk[-1], ak[-2], bk[-2])
    assert 1.0 < z.min() and z.max() < 2.5
    np.testing.assert_allclose(ser[4], z, atol=1e-3)
    assert set(kb) == {"u", "v", "T", "rho", "z"}
    # fields equal the engine on the unrounded series
    want = F.mars_cell_fields(u[:, fi, fj], v[:, fi, fj], T[:, fi, fj], rho.astype("f4"), z.astype("f4"))
    got = g["fields"][44, 100]
    fin = np.isfinite(want)
    assert np.array_equal(np.isfinite(got), fin)
    np.testing.assert_allclose(got[fin], want[fin].astype("f4"), rtol=2e-6, atol=1e-30)
    # unwritten shard reads as fill; dunes oriented
    assert np.isnan(g["fields"][80, 170]).all()
    assert g["dunes"][44, 100] == np.float32(0.25) and g["dune"][44, 100] == 1 and g["dunes"][89, 90] == 1.0
    np.testing.assert_allclose(g["ls"][:2], [0.0, 0.0215], atol=1e-3)
    z = np.load(tmp_path / "export" / "fields_export.npz")
    assert z["fields"].shape == (23, 64, 90, 180)
    np.testing.assert_array_equal(z["fields"][:, :, 44, 100], got)
    bench = json.load(open(tmp_path / "w" / "keepbits_benchmark.json"))
    assert set(bench["rows"]) == {"u", "v", "T", "rho", "z"}
    v_ = CE.validate(out, cells=[(44, 100), (40, 100), (0, 0)], require_all_shards=False)
    assert v_["ok"] and v_["objects"]["series"]["objects"] == 2
    with pytest.raises(AssertionError):
        CE.validate(out)                                 # 70 of 72 shards missing


def test_stats_and_fixture_on_small_store(tmp_path):
    from dune_atlas_pipeline.mars import fixture as FX
    from dune_atlas_pipeline.mars import stats as ST
    _fake_fv3(tmp_path)
    out = str(tmp_path / "cells.zarr")
    # shards holding the three example sites (fixture radius 0)
    sh = [(a * 16, b * 16) for a, b in FX.fixture_shards(0)]
    CE.build(str(tmp_path), str(tmp_path / "dunefrac.npz"), out, str(tmp_path / "w"), nproc=2, shards=sh,
             log=lambda *_: None)
    res = ST.compute(out, nproc=2, sample_cells=[(40, 123)])
    assert res["cells_with_series"] == 256 * len(sh)
    assert res["validity_ga_sqrt_s_le_81"]["pairs"] == 0
    assert set(res["sites"]) == set(ST.SITES) and res["sites"]["Nili Patera"]["cell"] == [40, 123]
    assert res["dune_cells_gt_1pct"] == 3 and res["dune_cells_gt_1pct_with_data"] == 1 and res["rho_dune"]["p50"] > 0
    assert res["rho_all"]["p0"] > 1e-4 and 1.0 < res["z_all"]["p0"] < res["z_all"]["p100"] < 2.5
    assert 0.5 < res["ustar_over_loglaw_dune"]["p50"] < 1.2
    for s in res["sites"].values():
        assert abs(sum(s["hours_share"]) - 1) < 1e-3
    c = res["consistency_rounded_series"]
    assert c["nan_pattern_mismatches"] == 0 and c["median_rel_diff"] < 1e-2
    a = res["frac_hours_above_threshold_ddef"]
    assert abs(a["all_cells"] - a["all_cells_from_series"]) < 1e-3     # rounded vs unrounded series
    fx = FX.build(out, str(tmp_path / "fx" / "cells.zarr"), radius=0, series_radius=0)
    assert fx["objects"] == 2 * len(sh)
    g0 = zarr.open_group(out, mode="r"); g1 = zarr.open_group(str(tmp_path / "fx" / "cells.zarr"), mode="r")
    np.testing.assert_array_equal(g1["series"][40, 123], g0["series"][40, 123])
    np.testing.assert_array_equal(g1["fields"][40, 123], g0["fields"][40, 123])
    assert g1.attrs["grid"] == CE.GRID and "fixture" in g1.attrs


def test_splice_one_node(tmp_path):
    """Splice node 29 into a copy whose node 29 was computed at another diameter: the node becomes the full-build
    value, every other node and the series stay bit-identical, and the validation passes."""
    import shutil
    _fake_fv3(tmp_path)
    out = str(tmp_path / "cells.zarr")
    CE.build(str(tmp_path), str(tmp_path / "dunefrac.npz"), out, str(tmp_path / "w"), nproc=2,
             shards=[(32, 96), (0, 0)], log=lambda *_: None)
    ref = zarr.open_group(out, mode="r")["fields"][32:48, 96:112]
    old = str(tmp_path / "old.zarr"); shutil.copytree(out, old)
    g = zarr.open_group(old, mode="r+")
    for ys, xs in ((slice(32, 48), slice(96, 112)), (slice(0, 16), slice(0, 16))):
        F = g["fields"][ys, xs]
        F[..., 29] *= np.float32(1.01)                     # stands in for the 199 um node
        g["fields"][ys, xs] = F
    g.attrs["d_values_um"] = [int(x) if k != 29 else 199 for k, x in enumerate(M.D_VALUES_UM)]
    new = str(tmp_path / "new.zarr"); shutil.copytree(old, new)
    st = CE.splice(str(tmp_path), new, 29, str(tmp_path / "ws"), nproc=2, log=lambda *_: None,
                   shards=[(32, 96), (0, 0)])
    assert st["old_um"] == 199 and st["new_um"] == 200 and st["control_max_rel"] < 1e-5
    gn = zarr.open_group(new, mode="r")
    got = gn["fields"][32:48, 96:112]
    same = (got == ref) | (np.isnan(got) & np.isnan(ref))
    assert same.all()
    assert gn.attrs["d_values_um"][29] == 200 and gn.attrs["d_node_history"][-1]["from_um"] == 199
    a, b = gn["fields"][...], zarr.open_group(old, mode="r")["fields"][...]
    keep = [k for k in range(64) if k != 29]
    assert (((a[..., keep] == b[..., keep]) | (np.isnan(a[..., keep]) & np.isnan(b[..., keep])))).all()
    v = CE.validate_splice(new, old, 29)
    assert v["ok"] and v["vars"]["dpm"]["new"]["quad_dev_p99"] <= v["vars"]["dpm"]["old"]["quad_dev_p99"]
    assert abs(v["vars"]["dpm"]["median_rel_change_vs_old_node"] + 0.01 / 1.01) < 1e-3     # undoes the 1.01 factor
    z = CE.export_store(new, str(tmp_path / "e.npz"), _rho_npz(tmp_path))
    assert z["nan"] > 0
    assert np.load(tmp_path / "e.npz")["d_values_um"][29] == 200


def _rho_npz(tmp_path):
    p = tmp_path / "rho.npz"
    np.savez(p, rho_mean=np.ones((90, 180), "f4"))
    return str(p)
