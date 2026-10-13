"""qsat_compute (fields from histograms, used for further wind datasets) reproduces the atlas's ERA5-Land fields."""
import os
import numpy as np
import pytest

D = os.environ.get("DUNE_WORLD_DATA", os.path.expanduser("~/Documents/research/projects/dune-world/data"))
pytestmark = pytest.mark.skipif(not os.path.isdir(D), reason="source data not available")

ANGLES = ("ab", "ae", "at", "ao", "rdpa")


def test_fields_match_qsat_view():
    import xarray as xr
    import zarr
    from dune_atlas_pipeline import qsat_view, qsat_compute as Q, constants as C
    if not qsat_view.DRIFT_STORE.exists():
        pytest.skip("drift store missing (scripts/drift/compute_drift.py)")
    cq = qsat_view.open_qsat(D)
    land = np.isfinite(qsat_view.open_source(D).uft.isel(ut=0).values)
    rng = np.random.default_rng(3)
    cells = np.argwhere(land)[rng.choice(int(land.sum()), 12, replace=False)]
    hz = zarr.open_array(f"{D}/era5-land_1950_2024_uam10_hist.zarr/histogram_um_ua", mode="r")
    h = np.stack([np.asarray(hz[i, j]) for i, j in cells] + [np.zeros((128, 128), np.int64)])
    f = Q.qsat_fields(h)
    assert all(np.isnan(f[v][-1]).all() for v in C.QSAT_VARS)          # empty histogram -> NaN
    li, lj = xr.DataArray(cells[:, 0], dims="cell"), xr.DataArray(cells[:, 1], dims="cell")
    ref = cq[C.QSAT_VARS].isel(latitude=li, longitude=lj).compute()
    scale = f["qalb"][:-1] + f["qacb"][:-1]
    for v in C.QSAT_VARS:
        a, b = f[v][:-1], ref[v].transpose("cell", "ut").values
        assert np.array_equal(np.isnan(a), np.isnan(b)), v
        m = np.isfinite(a) & np.isfinite(b)
        if v in ANGLES:
            d = np.abs((a[m] - b[m] + np.pi) % (2 * np.pi) - np.pi)
            assert d.max() < 2e-7 if v == "rdpa" else (d > 1e-9).mean() < 1e-3, v
        elif v in ("qnlb", "qncb"):        # signed components: compare against the crest-flux scale
            assert (np.abs(a[m] - b[m]) <= 1e-9 * scale[m] + 1e-300).all(), v
        else:
            tol = 2e-7 if v in ("dpm", "rdpm", "qha_rdp_dp") else 1e-9      # drift store is float32
            rel = np.abs(a[m] - b[m]) / np.maximum(np.abs(b[m]), 1e-300)
            assert (rel < tol).mean() > 0.999, v
