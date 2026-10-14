"""Mars near-surface air state, friction velocity, cessation threshold and saturated transport rate.

Pahtz & Duran (2023), J. Fluid Mech. 963:A20, as specified in docs/mars-spec.md section 3:
  threshold  eq. 5.1 (= 3.1 with (D*min, u+min) = (18, 2.3)), D* with the rarefaction factor of eq. 3.20
  transport  eq. 3.2 in '+' units (the printed dimensional eq. 5.2 has rho_p where rho_f is required)
  Knudsen    Kn = sqrt(pi k / 2) nu / (c d)   (the printed form carries a spurious factor s)
  wind       u* from the lowest-level wind at that hour's lowest-level height through the smooth-wall
             mixing-length profile of eq. 2.2 under constant stress (profile_table.json), no roughness length
All functions are numpy-vectorised and broadcast over their arguments. SI units throughout.
app/src/cell/marsphysics.ts is a line-for-line port (checked by app/tests/marsphysics.test.ts).
"""
import json
import pathlib

import numpy as np
from . import constants as M


def air_state(ps, T, ak_lo, bk_lo, ak_hi, bk_hi):
    """Lowest-layer mid pressure (Pa) and density (kg m^-3) from surface pressure ps (Pa) and the
    lowest-level temperature T (K); (ak_lo, bk_lo) is the bottom interface (p = ak + bk ps there),
    (ak_hi, bk_hi) the top interface of the lowest layer."""
    p = 0.5 * ((ak_lo + bk_lo * ps) + (ak_hi + bk_hi * ps))
    return p, p / (M.R_AIR * T)


def viscosity(T):
    """Dynamic viscosity of CO2, Sutherland law (Pa s)."""
    return M.MU0 * (T / M.T0_MU) ** 1.5 * (M.T0_MU + M.S_MU) / (T + M.S_MU)


def layer_height(ps, T, ak_lo, bk_lo, ak_hi, bk_hi):
    """Height (m) of the lowest-layer mid pressure above the surface, hydrostatic with the layer temperature T:
    z = (R T / g) ln(p_lo / p_mid), p_lo = ak_lo + bk_lo ps (the surface), p_mid as in air_state."""
    p_lo = ak_lo + bk_lo * ps
    p_mid = 0.5 * (p_lo + (ak_hi + bk_hi * ps))
    return M.R_AIR * T / M.G * np.log(p_lo / p_mid)


_TABLE = json.loads((pathlib.Path(__file__).with_name("profile_table.json")).read_text())
LN_X = np.asarray(_TABLE["ln_x"], dtype=float)
U_PLUS = np.asarray(_TABLE["u_plus"], dtype=float)
assert _TABLE["kappa"] == M.KAPPA and _TABLE["damping"] == M.MIX_DAMP, "profile_table.json is stale"


def u_plus(x):
    """Universal smooth-wall profile u/u* at X = z u*/nu (eq. 2.2 + constant stress; profile_table.json):
    linear interpolation in ln X inside the table, u+ = X below it (viscous sublayer), log-layer continuation
    u+ = u+_end + ln(X/X_end)/kappa above it."""
    x = np.asarray(x, dtype=float)
    lx = np.log(np.maximum(x, 1e-300))
    out = np.interp(lx, LN_X, U_PLUS)
    out = np.where(lx < LN_X[0], x, out)
    return np.where(lx > LN_X[-1], U_PLUS[-1] + (lx - LN_X[-1]) / M.KAPPA, out)


N_BISECT = 60
LN_US_LO, LN_US_HI = np.log(1e-6), np.log(30.0)


def ustar_from_wind(U, z, nu):
    """u* (m/s) such that U = u* u+(z u*/nu), by bisection in ln u* over [1e-6, 30] m/s with a fixed number of
    steps (N_BISECT; the TS port does the same, so both agree to rounding). U = 0 gives 0."""
    U, z, nu = np.broadcast_arrays(np.asarray(U, float), np.asarray(z, float), np.asarray(nu, float))
    lo = np.full(U.shape, LN_US_LO); hi = np.full(U.shape, LN_US_HI)
    for _ in range(N_BISECT):
        mid = 0.5 * (lo + hi)
        us = np.exp(mid)
        f = us * u_plus(z * us / nu) - U
        lo = np.where(f < 0, mid, lo)
        hi = np.where(f < 0, hi, mid)
    return np.where(U > 0, np.exp(0.5 * (lo + hi)), 0.0)


def friction_velocity(u, v, z, nu):
    """u* from the lowest-level wind vector (u, v) at height z (m) in air of kinematic viscosity nu (m^2/s)
    through the eq. 2.2 smooth-wall profile, and the direction the wind blows toward, CCW from east (rad)."""
    return ustar_from_wind(np.hypot(u, v), z, nu), np.arctan2(v, u)


def threshold(d, rho, T, knudsen=True):
    """Cessation threshold shear velocity u*,th (m/s) for grain diameter d (m) in air of density rho and
    temperature T. Returns a dict of u_t and the intermediate quantities (s, g~, nu, d+, D*, Kn, f_Kn,
    Ga sqrt(s))."""
    s = M.RHO_P / rho
    gt = (1.0 - 1.0 / s) * M.G
    nu = viscosity(T) / rho
    dplus = gt * d / (gt * nu) ** (2.0 / 3.0)
    if knudsen:
        c = np.sqrt(M.K_ADIABATIC * M.R_AIR * T)
        kn = np.sqrt(np.pi * M.K_ADIABATIC / 2.0) * nu / (c * d)
        fkn = 1.0 + kn * (M.KN_A + M.KN_B * np.exp(-M.KN_C / kn))
    else:
        kn = np.zeros(np.broadcast(d, rho, T).shape)
        fkn = np.ones_like(kn)
    dstar = np.sqrt(fkn) * np.sqrt(s) * dplus
    r = dstar / M.DSTAR_MIN
    ut = M.UPLUS_MIN * (gt * nu) ** (1.0 / 3.0) * np.maximum(r ** -0.5, r ** 0.5)
    ga_sqrt_s = np.sqrt(s * gt * d ** 3) / nu * np.sqrt(s)
    return {"ut": ut, "s": s, "gt": gt, "nu": nu, "dplus": dplus, "dstar": dstar, "kn": kn, "fkn": fkn,
            "ga_sqrt_s": ga_sqrt_s}


def transport_rate(ustar, ut, d, s, gt, nu):
    """Saturated volume flux q = Q / rho_p (m^2/s) from eq. 3.2 in '+' units:
    Q+ / d+^(3/2) = C1 s^(1/3) (Th - Th_t) + C2 s^(1/3) (Th - Th_t)^2, Q+ = Q/(rho_p nu),
    Th = u*^2 / (s g~ d); zero where u* <= u*,th."""
    dth = (ustar ** 2 - ut ** 2) / (s * gt * d)
    dplus = gt * d / (gt * nu) ** (2.0 / 3.0)
    qplus = dplus ** 1.5 * (M.C1 * s ** (1 / 3) * dth + M.C2 * s ** (1 / 3) * dth ** 2)
    return np.where(ustar > ut, qplus * nu, 0.0)       # Q/rho_p = Q+ nu


def flux(ustar, d, rho, T, knudsen=True):
    """q(u*) (m^2/s) and the threshold dict, for arrays of per-hour u*, rho, T and grain diameter d."""
    th = threshold(d, rho, T, knudsen)
    return transport_rate(ustar, th["ut"], d, th["s"], th["gt"], th["nu"]), th


def transport_rate_dimensional(ustar, ut, d, rho, gt):
    """The same law written dimensionally (corrected eq. 5.2), divided by rho_p. Used only in tests to pin
    the typo correction: equals transport_rate. The paper prints 1.7 s^(1/3) rho_p ... + 12 s^(-2/3) rho_p ...;
    eq. 3.2 gives exactly these coefficients with rho_f in place of rho_p."""
    du2 = ustar ** 2 - ut ** 2
    s = M.RHO_P / rho
    Q = (M.C1 * s ** (1 / 3) * rho * np.sqrt(d / gt) * du2
         + M.C2 * s ** (-2 / 3) * rho * (gt ** 3 * d) ** -0.5 * du2 ** 2)
    return np.where(ustar > ut, Q / M.RHO_P, 0.0)
