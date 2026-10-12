"""Read back the per-cell downloads written by scripts/write-cell-exports.ts and compare with the
cell store and the pipeline reference flux functions.

    python app/scripts/check-netcdf.py <fixture dir> <export dir>

NetCDF (xarray, scipy engine): wind_hist == cells.zarr hist exactly; every field var(ut) ==
cells.zarr fields (float32) exactly; coordinates / attributes present; flux_rose matches
flux.py flux_rose / crest_flux_rose (about the mode directions ae / ab) to rtol 1e-6, NaN
crest rows exactly where the defining flux (qace / qacb) is not > 0. CSV bundle: files present,
shapes, and values equal to the NetCDF.
"""
import io
import json
import pathlib
import sys
import zipfile

import numpy as np
import pandas as pd
import xarray as xr
import zarr

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from dune_atlas_pipeline import constants as C, flux  # noqa: E402

fixture = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "staging" / "fixture")
outdir = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else ROOT / "staging" / "check-netcdf")
g = zarr.open_group(str(fixture / "cells.zarr"), mode="r")
aux = zarr.open_group(str(fixture / "cells-aux.zarr"), mode="r")  # sidecar: qsdiv(ut), ai_mean/valid/sat
veg = zarr.open_group(str(fixture / "cells-aux-veg.zarr"), mode="r")  # sidecar: tot_cov_mean (%), tot_cov_n_months
fv = list(g.attrs["field_vars"])
ut_values = np.asarray(g.attrs["ut_values"])
cells = json.loads((outdir / "cells.json").read_text())
report = []
for c in cells:
    iy, ix = c["iy"], c["ix"]
    ds = xr.open_dataset(outdir / c["nc"], engine="scipy", mask_and_scale=False)
    h = np.asarray(g["hist"][iy, ix])
    F = np.asarray(g["fields"][iy, ix])  # (var, ut) float32
    # --- structure, coords, attrs
    # (xarray decodes the char variable rose_mode_name to strings, dropping name_strlen)
    assert {k: v for k, v in ds.sizes.items() if k != "name_strlen"} == {"um_bin": 128, "ua_bin": 128, "ut": 64, "nv": 2, "rose_mode": 3}, dict(ds.sizes)
    raw = xr.open_dataset(outdir / c["nc"], engine="scipy", decode_cf=False, mask_and_scale=False)
    assert raw.sizes["name_strlen"] == 16 and raw["rose_mode_name"].dims == ("rose_mode", "name_strlen")
    raw.close()
    for v in ("um_bin", "um_bin_bnds", "ua_bin", "ua_bin_bnds", "ua_bin_bearing_from", "ut", "latitude", "longitude", "cell_y", "cell_x", "wind_hist", "dune_present", "flux_rose", "rose_mode", "rose_mode_name"):
        assert v in ds.variables, v
    np.testing.assert_array_equal(ds["um_bin_bnds"].values[:, 0], np.asarray(g.attrs["um_edges"])[:-1])
    np.testing.assert_array_equal(ds["ua_bin_bnds"].values[:, 1], np.asarray(g.attrs["ua_edges"])[1:])
    np.testing.assert_array_equal(ds["ut"].values, np.round(ut_values, 2))
    assert int(ds["cell_y"]) == iy and int(ds["cell_x"]) == ix
    gr = g.attrs["grid"]
    assert abs(float(ds["latitude"]) - (gr["lat0"] + gr["dlat"] * iy)) < 1e-9 and abs(float(ds["longitude"]) - (gr["lon0"] + gr["dlon"] * ix)) < 1e-9
    assert ds["cell_y"].attrs["grid_dlat"] == gr["dlat"] and "grid_registration" in ds["cell_y"].attrs
    for k in ("title", "institution", "source", "dataset_id", "data_version", "references", "license", "Conventions", "history", "comment"):
        assert ds.attrs.get(k), k
    assert ds.attrs["Conventions"] == "CF-1.8" and ds.attrs["license"] == "CC BY 4.0" and ds.attrs["institution"] == "Geomorphology Lab, Monash University"
    refs = ds.attrs["references"]
    assert refs.startswith("Dune Atlas / dune map: Paper: ") and " | ERA5-Land: Paper: " in refs, refs[:200]
    assert " | Global Aridity Index (Global-AI_PET v3.1): Paper: Zomer" in refs
    for doi in ("10.1038/s41467-026-75466-y", "10.5281/zenodo.20046812", "10.5281/zenodo.20054674", "10.5194/essd-13-4349-2021", "10.24381/cds.e2161bac",
                "10.1038/s41597-022-01493-1", "10.6084/m9.figshare.7504448.v7"):
        assert doi in refs, doi
    assert ds.attrs["comment"].startswith("This page was created with assistance from Claude AI.")
    assert c["nc"] == f"dune-atlas_era5-land_{c['lat']:g}_{c['lon']:g}.nc", c["nc"]
    # --- histogram (exact)
    assert ds["wind_hist"].dtype == np.int32
    np.testing.assert_array_equal(ds["wind_hist"].values, h.astype(np.int64))
    assert int(ds["wind_hist"].attrs["total_hours_binned"]) == int(h.sum())
    # --- fields (exact float32)
    for i, v in enumerate(fv):
        a = ds[v]
        assert a.dtype == np.float32 and a.dims == ("ut",), (v, a.dtype, a.dims)
        np.testing.assert_array_equal(a.values, F[i], err_msg=v)
        for k in ("units", "long_name", "long_name_latex", "description"):
            assert k in a.attrs, (v, k)
    for v in fv:  # field attributes are exactly these (coordinates is decoded into encoding)
        assert sorted(k for k in ds[v].attrs if k != "_FillValue") == ["description", "description_latex", "long_name", "long_name_latex", "units"], (v, sorted(ds[v].attrs))
    assert int(ds["dune_present"]) == int(g["dunes"][iy, ix])
    # --- cells-aux: qsdiv(ut) m yr-1 and the aridity cell scalars, exact float32
    qs = np.asarray(aux["qsdiv"][iy, ix])
    assert ds["qsdiv"].dtype == np.float32 and ds["qsdiv"].dims == ("ut",) and ds["qsdiv"].attrs["units"] == "m yr-1"
    np.testing.assert_array_equal(ds["qsdiv"].values, qs)
    for v in ("ai_mean", "ai_valid_frac", "ai_sat_frac"):
        assert ds[v].dims == () and ds[v].attrs["units"] == "1", v
        np.testing.assert_array_equal(ds[v].values, np.float32(aux[v][iy, ix]), err_msg=v)
    assert "10.6084/m9.figshare.7504448.v7" in ds["ai_mean"].attrs["references"] and ds["ai_mean"].attrs["license"] == "CC BY 4.0"
    assert np.isfinite(float(ds["ai_mean"])), "fixture cells are on land"
    # --- cells-aux-veg: vegetation cover scalars, exact float32
    for v, u in (("tot_cov_mean", "%"), ("tot_cov_n_months", "1")):
        assert ds[v].dims == () and ds[v].dtype == np.float32 and ds[v].attrs["units"] == u, v
        np.testing.assert_array_equal(ds[v].values, np.float32(veg[v][iy, ix]), err_msg=v)
    assert "10.4225/08/5848a3f19a7b3" in ds["tot_cov_mean"].attrs["references"] and ds["tot_cov_mean"].attrs["url"] == "https://map.geo-rapp.org/"
    assert ds["tot_cov_mean"].attrs["license"].startswith("CC BY 4.0") and 0 <= float(ds["tot_cov_mean"]) <= 103
    # --- flux rose vs the Python reference
    fr = ds["flux_rose"].values.astype(np.float64)
    assert ds["flux_rose"].dims == ("rose_mode", "ut", "ua_bin") and ds["flux_rose"].attrs["units"] == "m2 yr-1"
    names = [bytes(x).rstrip(b"\0").decode() if not isinstance(x, str) else x for x in ds["rose_mode_name"].values]
    assert names == ["flat_bed", "elongation", "transverse"], names
    hd = h.astype(np.float64)
    checked = 0
    for k in range(64):
        ut = ut_values[k]
        np.testing.assert_allclose(fr[0, k], flux.flux_rose(hd, ut) * C.S2Y, rtol=1e-6, atol=1e-30)
        for m, (alpha_var, mask_var) in ((1, ("ae", "qace")), (2, ("ab", "qacb"))):
            alpha = float(F[fv.index(alpha_var), k])
            ok = np.isfinite(alpha) and F[fv.index(mask_var), k] > 0
            if ok:
                np.testing.assert_allclose(fr[m, k], flux.crest_flux_rose(hd, ut, alpha) * C.S2Y, rtol=1e-6, atol=1e-30)
                checked += 1
            else:
                assert np.isnan(fr[m, k]).all(), (m, k)
    # --- CSV bundle, read with the documented recipe: pd.read_csv(f, header=0, skiprows=[1, 2])
    z = zipfile.ZipFile(outdir / c["zip"])
    assert z.namelist() == ["README.txt", "wind_histogram.csv", "fields_by_threshold.csv", "flux_rose.csv", "metadata.json"], z.namelist()
    assert z.testzip() is None
    assert all(i.compress_type == zipfile.ZIP_DEFLATED for i in z.infolist() if i.filename.endswith(".csv")), [i.compress_type for i in z.infolist()]
    # (float_precision="round_trip" makes pandas' parser bit-exact; documented in README.txt)
    read = lambda name: pd.read_csv(io.BytesIO(z.read(name)), header=0, skiprows=[1, 2], float_precision="round_trip")
    units_row = lambda name: pd.read_csv(io.BytesIO(z.read(name)), header=0, nrows=1, dtype=str).iloc[0].to_dict()
    dir_cols = ["ua_bin", "ua_bin_lo", "ua_bin_hi", "ua_bin_bearing_toward", "ua_bin_bearing_from"]
    def check_dirs(df, n_outer):
        d = df[dir_cols].values.reshape(n_outer, 128, 5)
        np.testing.assert_array_equal(d[:, :, 0], np.broadcast_to(ds["ua_bin"].values, (n_outer, 128)))
        np.testing.assert_array_equal(d[0, :, 1], ds["ua_bin_bnds"].values[:, 0])
        np.testing.assert_array_equal(d[0, :, 2], ds["ua_bin_bnds"].values[:, 1])
        np.testing.assert_array_equal(d[0, :, 3], ds["ua_bin_bearing_toward"].values)
        np.testing.assert_array_equal(d[0, :, 4], ds["ua_bin_bearing_from"].values)
    wh = read("wind_histogram.csv")
    assert list(wh.columns) == ["um_bin", "um_bin_lo", "um_bin_hi", *dir_cols, "wind_hist"], list(wh.columns)
    assert len(wh) == 128 * 128 and wh["wind_hist"].dtype.kind == "i"
    np.testing.assert_array_equal(wh["wind_hist"].values.reshape(128, 128), ds["wind_hist"].values)
    np.testing.assert_array_equal(wh["um_bin"].values.reshape(128, 128)[:, 0], ds["um_bin"].values)
    np.testing.assert_array_equal(wh["um_bin_lo"].values.reshape(128, 128)[:, 0], ds["um_bin_bnds"].values[:, 0])
    check_dirs(wh, 128)
    u = units_row("wind_histogram.csv")
    assert u["wind_hist"] == ds["wind_hist"].attrs["units"] and u["ua_bin"] == ds["ua_bin"].attrs["units"] and u["um_bin"] == ds["um_bin"].attrs["units"]
    fb = read("fields_by_threshold.csv")
    assert list(fb.columns) == ["ut", *fv, "qsdiv"], list(fb.columns)
    np.testing.assert_array_equal(fb["qsdiv"].values.astype(np.float32), qs)
    np.testing.assert_array_equal(fb["ut"].values, ds["ut"].values)
    u = units_row("fields_by_threshold.csv")
    for v in fv:
        np.testing.assert_array_equal(fb[v].values.astype(np.float32), ds[v].values, err_msg=v)
        assert u[v] == ds[v].attrs["units"], (v, u[v], ds[v].attrs["units"])
    long_row = pd.read_csv(io.BytesIO(z.read("fields_by_threshold.csv")), header=0, skiprows=[1], nrows=1, dtype=str).iloc[0].to_dict()
    for v in fv:
        assert long_row[v] == ds[v].attrs["long_name"], (v, long_row[v])
    rose = read("flux_rose.csv")
    assert list(rose.columns) == ["rose_mode", "ut", *dir_cols, "flux_rose"], list(rose.columns)
    assert len(rose) == 3 * 64 * 128 and list(rose["rose_mode"].unique()) == ["flat_bed", "elongation", "transverse"]
    np.testing.assert_array_equal(rose["ut"].values.reshape(3, 64, 128)[0, :, 0], ds["ut"].values)
    check_dirs(rose, 3 * 64)
    # exactly the NetCDF float32 values (shortest round-trip text), empty = NaN in the same places
    np.testing.assert_array_equal(rose["flux_rose"].values.astype(np.float32).reshape(3, 64, 128), ds["flux_rose"].values)
    assert units_row("flux_rose.csv")["flux_rose"] == ds["flux_rose"].attrs["units"]
    meta = json.loads(z.read("metadata.json"))
    assert meta["cell"]["cell_y"] == iy and sorted(meta["fields"]["dpm"]) == ["description", "description_latex", "long_name", "long_name_latex", "units"]
    assert meta["ut"] == [round(x, 2) for x in ut_values.tolist()]
    for v in ("ai_mean", "ai_valid_frac", "ai_sat_frac"):
        assert np.float32(meta["aux"][v]["value"]) == np.float32(aux[v][iy, ix]), v
    for v in ("tot_cov_mean", "tot_cov_n_months"):
        assert np.float32(meta["aux"][v]["value"]) == np.float32(veg[v][iy, ix]), v
    assert [x["source"] for x in meta["citation"]] == ["Dune Atlas / dune map", "ERA5-Land", "Global Aridity Index (Global-AI_PET v3.1)", "Vegetation cover (CSIRO MODIS Fractional Cover v3.1)"]
    vc = meta["citation"][3]
    assert vc["paper"]["doi"] == "10.1016/j.rse.2015.01.021" and vc["paper_2"]["doi"] == "10.1080/2150704X.2018.1465611" and vc["data"]["doi"] == "10.4225/08/5848a3f19a7b3"
    readme = z.read("README.txt").decode()
    assert "tot_cov_mean" in readme and "https://map.geo-rapp.org/" in readme
    for f in ("wind_histogram.csv", "fields_by_threshold.csv", "flux_rose.csv"):
        hdr = pd.read_csv(io.BytesIO(z.read(f)), header=None, nrows=3, dtype=str)
        assert [c_["name"] for c_ in meta["files"][f]["columns"]] == hdr.iloc[0].tolist(), f
        assert [c_["units"] for c_ in meta["files"][f]["columns"]] == hdr.iloc[1].tolist(), f
    readme = z.read("README.txt").decode()
    assert "pd.read_csv(f, header=0, skiprows=[1, 2])" in readme and "This page was created with assistance from Claude AI." in readme
    # plain attributes carry no LaTeX
    for v in list(ds.variables):
        for k, a in ds[v].attrs.items():
            if isinstance(a, str) and not k.endswith("_latex"):
                assert "\\" not in a and "$" not in a, (v, k, a)
    # also readable by the netCDF-C library, if installed
    try:
        import netCDF4  # noqa: F401
        with xr.open_dataset(outdir / c["nc"], engine="netcdf4") as d4:
            np.testing.assert_array_equal(d4["wind_hist"].values, h.astype(np.int64))
        engines = ["scipy", "netcdf4"]
    except ImportError:
        engines = ["scipy"]
    report.append({"cell": [iy, ix], "nc": c["nc"], "ai_mean": float(aux["ai_mean"][iy, ix]), "tot_cov_mean": float(veg["tot_cov_mean"][iy, ix]), "tot_cov_n_months": int(veg["tot_cov_n_months"][iy, ix]), "qsdiv_ut14_m_per_kyr": float(qs[14]) * 1000, "crest_rows_checked": checked, "crest_rows_masked": 128 - checked, "hist_total": int(h.sum()), "engines": engines})
    ds.close()
print(json.dumps({"ok": True, "cells": report}))
