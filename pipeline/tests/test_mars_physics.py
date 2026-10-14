"""Mars transport law (docs/mars-spec.md section 3; Pahtz & Duran 2023 JFM 963:A20)."""
import numpy as np
import pytest

from dune_atlas_pipeline.mars import constants as M, physics as P


def _earth_state(d=200e-6):
    rho, rho_p, g, nu = 1.2, 2650.0, 9.81, 1.5e-5
    s = rho_p / rho
    return dict(s=s, gt=(1 - 1 / s) * g, nu=nu, d=d, rho=rho, rho_p=rho_p)


def test_plus_units_equal_corrected_dimensional_form():
    rng = np.random.default_rng(0)
    rho = rng.uniform(0.003, 0.03, 1000); T = rng.uniform(150, 300, 1000)
    d = rng.choice(M.D_VALUES, 1000); us = rng.uniform(0, 2, 1000)
    q, th = P.flux(us, d, rho, T)
    q2 = P.transport_rate_dimensional(us, th["ut"], d, rho, th["gt"])
    np.testing.assert_allclose(q, q2, rtol=1e-12, atol=0)
    assert (q > 0).sum() > 100 and np.all(q[us <= th["ut"]] == 0)


def test_earth_sanity_rho_f_not_rho_p():
    """Eq. 3.2 on Earth (u* = 0.4, u*,th = 0.2 m/s, d = 200 um) gives a typical aeolian mass flux; the printed
    eq. 5.2 (rho_p in place of rho_f) is larger by the factor s ~ 2200."""
    e = _earth_state()
    Q = e["rho_p"] * M.PACKING * P.transport_rate(0.4, 0.2, e["d"], e["s"], e["gt"], e["nu"])
    assert 0.01 < Q < 0.03                                     # kg m^-1 s^-1
    du2 = 0.4 ** 2 - 0.2 ** 2
    Q_printed = (1.7 * e["s"] ** (1 / 3) * e["rho_p"] * np.sqrt(e["d"] / e["gt"]) * du2
                 + 12 * e["s"] ** (-2 / 3) * e["rho_p"] * (e["gt"] ** 3 * e["d"]) ** -0.5 * du2 ** 2)
    assert Q_printed / Q > 1000


def test_packed_sand_volume_flux():
    """Atlas fluxes are volumes of packed sand, q = Q/(rho_p phi) with phi = 0.6 (as the Earth atlas,
    FLUXCONSTANT = 5/0.6; docs/mars-spec.md section 3)."""
    assert M.PACKING == 0.6
    e = _earth_state()
    du = 0.4 ** 2 - 0.2 ** 2
    th = du / (e["s"] * e["gt"] * e["d"])
    dplus = e["gt"] * e["d"] / (e["gt"] * e["nu"]) ** (2 / 3)
    Q_over_rho_p = dplus ** 1.5 * (M.C1 * e["s"] ** (1 / 3) * th + M.C2 * e["s"] ** (1 / 3) * th ** 2) * e["nu"]
    q = P.transport_rate(0.4, 0.2, e["d"], e["s"], e["gt"], e["nu"])
    np.testing.assert_allclose(q, Q_over_rho_p / 0.6, rtol=1e-14)


def test_threshold_minimum_at_dstar_min():
    rho, T = 0.015, 210.0
    nu = P.viscosity(T) / rho; s = M.RHO_P / rho; gt = (1 - 1 / s) * M.G
    d_min = M.DSTAR_MIN / (np.sqrt(s) * gt ** (1 / 3) / nu ** (2 / 3))     # D* = 18 without Kn
    th = P.threshold(d_min, rho, T, knudsen=False)
    assert th["dstar"] == pytest.approx(M.DSTAR_MIN, rel=1e-12)
    assert th["ut"] == pytest.approx(M.UPLUS_MIN * (gt * nu) ** (1 / 3), rel=1e-12)
    for f in (0.5, 2.0):                                                    # minimum: larger on both sides
        assert P.threshold(d_min * f, rho, T, knudsen=False)["ut"] > th["ut"]


def test_paper_table1_mars_case():
    """Table 1: s = 2.5e5, Ga = 1 is 'a typical transport environment on Mars (d ~ 100 um)'."""
    rho = M.RHO_P / 2.5e5
    th = P.threshold(100e-6, rho, 210.0)
    ga = th["ga_sqrt_s"] / np.sqrt(th["s"])
    assert 0.7 < ga < 1.4


def test_knudsen_limits():
    th = P.threshold(np.array([50e-6, 200e-6, 1000e-6]), 0.015, 210.0)
    assert np.all(np.diff(th["kn"]) < 0) and np.all(th["kn"] < 0.2)
    np.testing.assert_allclose(th["fkn"], 1 + th["kn"] * (2.49 + 0.84 * np.exp(-1.74 / th["kn"])))
    lo = P.threshold(200e-6, 0.015, 210.0, knudsen=False)
    assert abs(th["ut"][1] / lo["ut"] - 1) < 0.02            # small correction at typical Mars pressure


def test_validity_over_axis_and_climate():
    """Ga sqrt(s) > 81 for every axis value, over the FV3 density/temperature envelope."""
    d = M.D_VALUES[:, None, None]; rho = np.array([0.0035, 0.015, 0.03])[None, :, None]
    T = np.array([140.0, 210.0, 300.0])[None, None, :]
    assert P.threshold(d, rho, T)["ga_sqrt_s"].min() > M.GA_SQRT_S_MIN


def test_regression_values():
    """Pinned values (spec constants, k = 1.33): u*,th for d = 200 um, T = 210 K."""
    ut = P.threshold(200e-6, np.array([0.0035, 0.0137, 0.0242, 0.030]), 210.0)["ut"]
    np.testing.assert_allclose(ut, [0.5599, 0.3292, 0.2792, 0.2644], rtol=2e-3)


def test_profile_limits():
    """Eq. 2.2 + constant stress: viscous sublayer u+ = X, log layer slope 1/kappa with u+ = ln(c X)/kappa,
    c close to the paper's 'f_u ~ kappa^-1 ln(9X)' (stated as approximate)."""
    x = np.array([1e-3, 1e-2, 0.1, 1.0])
    np.testing.assert_allclose(P.u_plus(x), x, rtol=2e-2)
    lx = np.log([1e4, 1e5, 1e6])
    slope = np.diff(P.u_plus(np.exp(lx))) / np.diff(lx)
    np.testing.assert_allclose(slope, 1 / M.KAPPA, rtol=1e-3)
    c = np.exp(M.KAPPA * P.u_plus(1e6)) / 1e6
    assert 7 < c < 10
    assert np.all(np.diff(P.u_plus(np.logspace(-3, 9, 500))) > 0)


def test_ustar_inversion_roundtrip():
    rng = np.random.default_rng(1)
    U = rng.uniform(0.05, 40, 2000); z = rng.uniform(1.5, 2.5, 2000)
    nu = P.viscosity(rng.uniform(140, 300, 2000)) / rng.uniform(0.003, 0.032, 2000)
    us = P.ustar_from_wind(U, z, nu)
    np.testing.assert_allclose(us * P.u_plus(z * us / nu), U, rtol=1e-12)
    assert P.ustar_from_wind(0.0, 2.0, 5e-4) == 0.0
    # smaller than the earlier z0 = 1 mm log law at typical Mars densities, never larger than the viscous limit
    nu0 = P.viscosity(210.0) / 0.019
    assert P.ustar_from_wind(8.0, 2.0, nu0) < M.KAPPA * 8.0 / np.log(2.0 / 1e-3)


def test_layer_height():
    z = P.layer_height(600.0, 210.0, 0.0, 1.0, 2.5, 0.995)
    p_lo, p_mid = 600.0, 0.5 * (600.0 + 2.5 + 0.995 * 600.0)
    assert z == pytest.approx(M.R_AIR * 210.0 / M.G * np.log(p_lo / p_mid), rel=1e-12)
    assert 1 < z < 10


def test_axis():
    assert M.D_VALUES_UM[M.D_DEFAULT_INDEX] == 200 and len(M.D_VALUES) == 64
    r = M.D_VALUES_UM[1:] / M.D_VALUES_UM[:-1]
    assert np.all((r > 1.02) & (r < 1.08))
