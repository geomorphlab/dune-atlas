"""The qsat view (qsat_view.py) reproduces the field definitions from the wind histograms."""
import os
import numpy as np
import pytest

D = os.environ.get("DUNE_WORLD_DATA", os.path.expanduser("~/Documents/research/projects/dune-world/data"))
pytestmark = pytest.mark.skipif(not os.path.isdir(D), reason="source data not available")


@pytest.fixture(scope="module")
def sources():
    import xarray as xr
    from dune_atlas_pipeline import qsat_view
    if not qsat_view.DRIFT_STORE.exists():
        pytest.skip("drift store missing (scripts/drift/compute_drift.py)")
    dh = xr.open_zarr(f"{D}/era5-land_1950_2024_uam10_hist.zarr", consolidated=False)
    return dh, qsat_view.open_qsat(D), qsat_view.open_source(D)


def _crest_q(alpha, ut):
    from dune_atlas_pipeline import constants as C
    uf = C.UM_CENTRES * C.KAPPA / np.log(C.Z / C.Z0)
    uc = uf[:, None] * (1 + C.BETA * C.DASPECT * np.abs(np.sin(C.UA_CENTRES[None, :] - alpha)))
    return uf, np.where(uc > ut, (uc**2 - ut**2) * ut * C.FLUXK, 0.0)


def test_derived_fields_match_histograms(sources):
    from dune_atlas_pipeline import constants as C, flux
    dh, cq, src = sources
    land = np.isfinite(src.uft.isel(ut=0).values)
    rng = np.random.default_rng(7)
    cells = [tuple(x) for x in np.argwhere(land)[rng.choice(int(land.sum()), 40, replace=False)]]
    u40 = src.uft.isel(ut=40).values
    cells += [tuple(x) for x in np.argwhere(land & (u40 == 0))[:10]]  # edge rule cells
    n_zero = n_nan = 0
    for i, j in cells:
        h = dh.histogram_um_ua.isel(latitude=i, longitude=j).values.astype(float)
        c = cq[["dpm", "rdpm", "rdpa", "qha_rdp_dp", "qhbf", "qhef", "ab", "ae"]].isel(latitude=i, longitude=j).compute()
        for k in (0, 14, 40, 63):
            ut = C.UT_VALUES[k]
            dp, rdp, rdd = flux.dp_rdp_rdd(h, ut)
            if dp > 0:
                assert abs(float(c.dpm[k]) - dp) <= 1.2e-7 * dp
                assert abs(float(c.rdpm[k]) - rdp) <= 1.2e-7 * max(rdp, 1e-300)
                if rdp > 1e-3 * dp:
                    assert abs((float(c.rdpa[k]) - rdd + np.pi) % (2 * np.pi) - np.pi) < 1e-6
                assert abs(float(c.qha_rdp_dp[k]) - rdp / dp) < 1e-6
            else:
                assert float(c.dpm[k]) == 0 and np.isnan(float(c.qha_rdp_dp[k]))
            for v, ang in (("qhbf", "ab"), ("qhef", "ae")):
                uf, q = _crest_q(float(c[ang][k]), ut)
                f = (uf > ut)[:, None]
                tot = (h * q).sum(); got = float(c[v][k])
                if tot == 0:
                    assert np.isnan(got); n_nan += 1
                else:
                    F = (h * q * f).sum() / tot
                    assert abs(got - F) < 1e-12 and 0.0 <= got <= 1.0
                    n_zero += int(F == 0)
    assert n_zero > 0 and n_nan > 0  # both edge rules exercised


def test_source_vars_pass_through(sources):
    _, cq, src = sources
    for v in ("ab", "ae", "at", "qacb", "uft", "ufm", "sige_sigh"):
        a = cq[v].isel(ut=14, latitude=slice(600, 664), longitude=slice(1800, 1864)).values
        b = src[v].isel(ut=14, latitude=slice(600, 664), longitude=slice(1800, 1864)).values
        assert np.array_equal(a, b, equal_nan=True)
