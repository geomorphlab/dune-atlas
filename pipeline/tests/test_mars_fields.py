"""Sample-weighted qsat engine (mars/fields.py): equivalence with the Earth histogram code and the Mars law."""
import json
import os

import numpy as np
import pytest

from dune_atlas_pipeline import qsat_compute as QC
from dune_atlas_pipeline.mars import constants as M
from dune_atlas_pipeline.mars import fields as F
from dune_atlas_pipeline.mars import physics as P

BACKENDS = ["numpy"] + (["numba"] if F.HAVE_NUMBA else [])
EARTH_FIXTURE = os.environ.get("DUNE_ATLAS_EARTH_FIXTURE",
                               os.path.join(os.path.dirname(__file__), "../../staging/fixture/cells.zarr"))
RTOL = 1e-10


def _synthetic_fixture() -> bool:
    """the synthetic fixture (synthetic_fixture.py) stores fields from synthetic crest orientations, not the mode search"""
    ref = os.path.join(os.path.dirname(EARTH_FIXTURE), "decode_reference.json")
    return os.path.exists(ref) and bool(json.load(open(ref)).get("synthetic"))


def _synthetic_hists(n=4, seed=1):
    rng = np.random.default_rng(seed)
    out = []
    for c in range(n):
        m = 150_000
        sp = rng.gamma(2.0, 1.5 + c, m)
        di = np.where(rng.random(m) < 0.6, rng.normal(0.5, 0.4, m), rng.normal(-2.0 + c, 0.6, m))
        di = (di + np.pi) % (2 * np.pi) - np.pi
        h, _, _ = np.histogram2d(sp, di, bins=[QC.C.UM_EDGES, QC.C.UA_EDGES])
        out.append(h.astype(np.uint32))
    out.append(np.zeros_like(out[0]))                                  # empty cell -> NaN throughout
    return np.array(out)


def _calm_hist():
    """One occupied bin: flux only at the lowest thresholds. The crest-mode splines are then identically zero
    on whole intervals, whose 'roots' tie in slope, so alpha_E is an arbitrary tie-break in both codes."""
    calm = np.zeros((1, 128, 128), np.uint32); calm[0, 3, 10] = 1000
    return calm


def _assert_equiv(got: dict, ref: dict, c: int):
    for v in F.QSAT_VARS:
        a, b = got[v], ref[v][c]
        fin = np.isfinite(b)
        assert np.array_equal(np.isfinite(a), fin), (v, c)
        if fin.any():
            scale = np.abs(b[fin]).max()
            np.testing.assert_allclose(a[fin], b[fin], rtol=RTOL, atol=RTOL * scale, err_msg=f"{v} cell {c}")


@pytest.mark.parametrize("backend", BACKENDS)
def test_synthetic_histograms_reproduce_qsat_compute(backend):
    H = _synthetic_hists()
    ref = QC.qsat_fields(H)
    for c in range(H.shape[0]):
        _assert_equiv(F.earth_histogram_fields(H[c], backend=backend), ref, c)


@pytest.mark.staging
@pytest.mark.skipif(not os.path.exists(EARTH_FIXTURE) or _synthetic_fixture(),
                    reason="Earth fixture cells.zarr built from the source data not present")
def test_earth_fixture_cells_reproduce_qsat_compute():
    import zarr
    g = zarr.open_group(EARTH_FIXTURE, mode="r")
    done = json.load(open(EARTH_FIXTURE + ".manifest.json"))["done"]
    land = g["land"]
    rng = np.random.default_rng(0)
    cells = []
    for sy, sx in done:
        if not land[sy:sy + 16, sx:sx + 16].any():
            continue
        h = g["hist"][sy:sy + 16, sx:sx + 16]
        ii, jj = np.nonzero(h.reshape(16, 16, -1).sum(-1))
        for k in rng.choice(len(ii), min(2, len(ii)), replace=False):
            cells.append(h[ii[k], jj[k]])
        if len(cells) >= 8:
            break
    assert len(cells) >= 4
    H = np.array(cells)
    ref = QC.qsat_fields(H)
    for c in range(H.shape[0]):
        _assert_equiv(F.earth_histogram_fields(H[c]), ref, c)


def test_degenerate_cell_crest_fluxes_match_at_given_modes():
    H = _calm_hist()
    ref = QC.qsat_fields(H)
    _assert_equiv(F.earth_histogram_fields(H[0], modes=(ref["ae"][0], ref["ab"][0])), ref, 0)


def test_given_modes_path_matches():
    H = _synthetic_hists(2)
    ref = QC.qsat_fields(H)
    for c in range(2):
        got = F.earth_histogram_fields(H[c], modes=(ref["ae"][c], ref["ab"][c]))
        _assert_equiv(got, ref, c)


def _mars_series(n=2000, seed=3, scale=8.0):
    rng = np.random.default_rng(seed)
    t = np.arange(n) / 24
    sp = rng.weibull(2.0, n) * scale * (1 + 0.3 * np.sin(2 * np.pi * t))
    di = rng.normal(0.8, 0.9, n)
    return (sp * np.cos(di), sp * np.sin(di), 210 + 30 * np.sin(2 * np.pi * t) + rng.normal(0, 3, n),
            0.016 + 0.003 * np.cos(2 * np.pi * t / 668), 1.6 + 0.8 * rng.random(n))


def test_mars_law_equals_physics_transport_rate():
    u, v, T, rho, z = _mars_series()
    law, th = F.mars_law(rho, T)
    ustar = np.linspace(0, 3, len(rho))
    ref = P.transport_rate(ustar[:, None], th["ut"], M.D_VALUES[None, :], th["s"], th["gt"], th["nu"])
    np.testing.assert_allclose(law.q(ustar), ref, rtol=1e-11, atol=1e-11 * np.abs(ref).max())
    assert np.array_equal(law.ut, P.threshold(M.D_VALUES[None, :], rho[:, None], T[:, None])["ut"])


@pytest.mark.skipif(len(BACKENDS) < 2, reason="numba not installed")
def test_mars_backends_agree():
    u, v, T, rho, z = _mars_series()
    a = F.mars_cell_fields(u, v, T, rho, z, backend="numba")
    b = F.mars_cell_fields(u, v, T, rho, z, backend="numpy")
    assert np.array_equal(np.isfinite(a), np.isfinite(b))
    fin = np.isfinite(b)
    np.testing.assert_allclose(a[fin], b[fin], rtol=1e-11, atol=1e-11 * np.abs(b[fin]).max())


def test_mars_weights_equal_repeated_samples():
    u, v, T, rho, z = _mars_series(600)
    a = F.mars_cell_fields(u, v, T, rho, z, w=np.full(600, 2.0))
    b = F.mars_cell_fields(np.tile(u, 2), np.tile(v, 2), np.tile(T, 2), np.tile(rho, 2), np.tile(z, 2))
    fin = np.isfinite(b)
    assert np.array_equal(np.isfinite(a), fin)
    np.testing.assert_allclose(a[fin], b[fin], rtol=1e-9, atol=1e-12 * np.abs(b[fin]).max())


def test_mars_flat_bed_definitions():
    """DP, RDP, uft, ufm from first principles with physics.flux, per hour (u* from the eq. 2.2 profile at z)."""
    u, v, T, rho, z = _mars_series(1500)
    f = F.mars_cell_fields(u, v, T, rho, z)
    ustar, ua = P.friction_velocity(u, v, z, P.viscosity(T) / rho)
    np.testing.assert_allclose(ustar * P.u_plus(z * ustar / (P.viscosity(T) / rho)), np.hypot(u, v), rtol=1e-9)
    q, th = P.flux(ustar[:, None], M.D_VALUES[None, :], rho[:, None], T[:, None])
    i = {v: k for k, v in enumerate(F.QSAT_VARS)}
    np.testing.assert_allclose(f[i["dpm"]], q.mean(0), rtol=1e-12)
    r = (q * np.exp(1j * ua)[:, None]).mean(0)
    np.testing.assert_allclose(f[i["rdpm"]], np.abs(r), rtol=1e-11)
    above = ustar[:, None] > th["ut"]
    np.testing.assert_allclose(f[i["uft"]], above.mean(0), rtol=1e-12)
    with np.errstate(invalid="ignore"):
        ufm = (above * ustar[:, None] / th["ut"]).sum(0) / np.where(above.sum(0) > 0, above.sum(0), np.nan)
    np.testing.assert_allclose(f[i["ufm"]], ufm, rtol=1e-12)
    # grain-size ordering: coarser grains need stronger winds above the threshold minimum (~100 um)
    assert f[i["uft"]][-1] < f[i["uft"]][M.D_DEFAULT_INDEX]
