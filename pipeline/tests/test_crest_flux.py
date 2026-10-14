"""crest_flux_rose / crest_flux_components (notebook cell 14 crest fluxes) reproduce the stored
crest-flux fields of the fixture cell store (float32), so the app's crest flux rose is checked
against the same reference. Requires staging/fixture (skipped otherwise)."""
import os
import pathlib
import numpy as np
import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
STORE = ROOT / "staging" / "fixture" / "cells.zarr"
pytestmark = [pytest.mark.staging, pytest.mark.skipif(not (STORE / "zarr.json").exists(), reason="fixture not built")]

CELLS = [(1100, 1950), (1174, 1954), (1145, 1948), (1072, 1928)]


@pytest.mark.parametrize("y,x", CELLS)
@pytest.mark.parametrize("k", [5, 14, 30, 45])
def test_crest_components_match_stored(y, x, k):
    import zarr
    from dune_atlas_pipeline import constants as C, flux
    g = zarr.open_group(str(STORE), mode="r")
    fv = g.attrs["field_vars"]
    h = g["hist"][y, x].astype(float)
    f = g["fields"][y, x].astype(float)
    v = lambda n: f[fv.index(n), k]
    ut = C.UT_VALUES[k]
    nlb, ncb, alb, acb = flux.crest_flux_components(h, ut, v("ab"))
    nle, _, ale, ace = flux.crest_flux_components(h, ut, v("ae"))
    got = dict(qnlb=nlb, qncb=ncb, qalb=alb, qacb=acb, qnle=nle, qale=ale, qace=ace)
    for name, val in got.items():
        np.testing.assert_allclose(val, v(name), rtol=2e-5, atol=1e-13, err_msg=name)
    # the rose petals sum to the time-averaged crest flux, |q| = q
    rose = flux.crest_flux_rose(h, ut, v("ae"))
    assert np.all(rose >= 0)
    q = flux.crest_flux(ut, v("ae"))
    np.testing.assert_allclose(rose.sum(), (q * h).sum() / h.sum(), rtol=1e-12)


@pytest.mark.parametrize("y,x", CELLS[:2])
@pytest.mark.parametrize("k", [5, 14, 40])
def test_excess_shear_classes_sum_to_rose(y, x, k):
    import zarr
    from dune_atlas_pipeline import constants as C, flux
    g = zarr.open_group(str(STORE), mode="r")
    fv = g.attrs["field_vars"]
    h = g["hist"][y, x].astype(float)
    ut = C.UT_VALUES[k]
    flat = flux.flux_rose_by_excess_shear(h, ut)
    np.testing.assert_allclose(flat.sum(0), flux.flux_rose(h, ut), rtol=1e-12, atol=1e-300)
    ae = float(g["fields"][y, x][fv.index("ae"), k])
    crest = flux.flux_rose_by_excess_shear(h, ut, ae)
    np.testing.assert_allclose(crest.sum(0), flux.crest_flux_rose(h, ut, ae), rtol=1e-12, atol=1e-300)
    assert np.all(flat >= 0) and np.all(crest >= 0)
