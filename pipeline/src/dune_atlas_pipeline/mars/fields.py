"""The 23 qsat fields at the 64 grain sizes from weighted wind samples (Mars: one sample per GCM hour).

A generalisation of the Earth histogram code (dune_atlas_pipeline.qsat_compute + the qsat_view rules) in
which every reduction sum(n x) / sum(n) runs over *samples* i with weight w_i, friction velocity u_i and
direction ua_i (toward, CCW from east), and the flux law is injected per sample and per slider index k:

    q_ik(u) = a_ik x + b_ik x^2,   x = u^2 - ut_ik^2,   for u > ut_ik, else 0              (`FluxLaw`)

* Earth (histogram bins as samples, weights = counts): ut_ik = UT[k], a_ik = ut FLUXK, b_ik = 0; the
  crest-mode kernel uses (uc^2 - ut^2) ut (a_mode = ut), exactly as qsat_compute.orientation_kernels.
* Mars (hours as samples, weights 1): u_i from the hour's lowest-level wind at its height z_i through the eq. 2.2
  smooth-wall profile (physics.friction_velocity), ut_ik = u*,th(d_k, rho_i, T_i) and the Pahtz & Duran (2023)
  eq. 3.2 rate from mars/physics.py. Eq. 3.2 is a quadratic in the excess Shields number, so it is exactly of the
  form above; `mars_law` obtains (a, b) by evaluating physics.transport_rate itself at two excess-stress
  probes and checks the quadratic form at a third (rtol 1e-11), so the physics is not re-implemented here.
  The crest-mode kernel uses the same q (mode positions are invariant to a positive factor).

Definitions (identical to qsat_compute; Gunn (2026) Methods, dune-world notebook cells 3, 12, 14):
  crest modes   qa(do) = q(uc), uc = u (1 + BETA DASPECT |sin(ua - do)|), do = linspace(-pi, pi, 129);
                alpha_E = root of the periodic cubic spline of sum w qa sin(ua - do) with the most negative
                slope; alpha_H = maximum of the spline of sum w qa |sin(ua - do)| over do in [0, pi]
                (the notebook mode finders, imported from qsat_compute)
  crest fluxes  qnl, qnc, qal, qac = sum w q(uc) {cos, sin, |cos|, |sin|}(ua - alpha) / sum w at alpha_H
                (b) and alpha_E (e), with the SAME sample's threshold
  flat bed      DP = sum w q(u) / sum w, RDP = |sum w q(u) e^{i ua}| / sum w, RDD = arg(...), RDP/DP
  wind          uft = sum_{u > ut} w / sum w, ufm = sum_{u > ut} w u/ut / sum_{u > ut} w
  fractions     qhbf / qhef = sum_{u > ut} w q(uc) / sum w q(uc), with the qsat_view rules
  derived       at, ao, sige_sigh, qhab_nl_nc, qhab_ac_nc, qhne_ac_nl (cell 14)
Fluxes are returned in the law's units (m^2/s for both laws).

Backends: numba (`backend="numba"`, default when importable) and a vectorised numpy reference
(`backend="numpy"`); both are tested against qsat_compute.qsat_fields.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .. import qsat_compute as QC          # DO grid and the notebook mode finders (Earth, verbatim)
from . import constants as M
from . import physics as P

DO = QC.DO                                 # 129 crest orientations, -pi..pi (both ends)
DO_BED0 = QC.DO_BED0                       # DO[64] == 0: alpha_H is searched on DO[64:]
SPEEDUP = M.BETA * M.DASPECT               # crest speed-up BETA * A (Mars = Earth value)
QSAT_VARS = list(QC.C.QSAT_VARS)           # the 23 variables, pipeline order

try:                                       # numba is optional (Gadi venv has it; tests run both backends)
    import numba as _nb
    HAVE_NUMBA = True
except Exception:                          # pragma: no cover
    _nb = None
    HAVE_NUMBA = False


@dataclass
class FluxLaw:
    """Per-sample, per-slider-index flux law q = a x + b x^2, x = u^2 - ut^2 (u > ut), arrays (n, K).
    a_mode / b_mode: coefficients for the crest-mode kernel (default: a, b)."""
    ut: np.ndarray
    a: np.ndarray
    b: np.ndarray
    a_mode: np.ndarray | None = None
    b_mode: np.ndarray | None = None

    def q(self, u):
        """q for per-sample speeds u (n,) or (n, K) -> (n, K)."""
        u = np.asarray(u, "f8")
        u = u[:, None] if u.ndim == 1 else u
        x = u * u - self.ut * self.ut
        return np.where(u > self.ut, self.a * x + self.b * x * x, 0.0)


# ---------------------------------------------------------------------------------------------- laws
def earth_law(n: int, ut_values=None) -> FluxLaw:
    """The Earth atlas law for n samples: q = (u^2 - ut^2) ut FLUXK at the 64 fixed thresholds."""
    C = QC.C
    ut = np.ascontiguousarray(np.broadcast_to(np.asarray(C.UT_VALUES if ut_values is None else ut_values, "f8"),
                                              (n, len(C.UT_VALUES) if ut_values is None else len(ut_values))))
    return FluxLaw(ut=ut, a=ut * C.FLUXK, b=np.zeros_like(ut), a_mode=ut.copy(), b_mode=np.zeros_like(ut))


def mars_law(rho, T, d=M.D_VALUES, knudsen=True, check=True) -> tuple[FluxLaw, dict]:
    """Pahtz & Duran (2023) law per hour (rho, T: (n,)) and grain size d (K,): returns (FluxLaw, threshold dict
    from physics.threshold with (n, K) arrays). (a, b) come from physics.transport_rate at excess Shields numbers
    1 and 2 (x = s g~ d and 2 s g~ d); `check` verifies q(x) at Theta - Theta_t = 0.37 to rtol 1e-11."""
    rho = np.asarray(rho, "f8")[:, None]
    T = np.asarray(T, "f8")[:, None]
    d = np.asarray(d, "f8")[None, :]
    th = P.threshold(d, rho, T, knudsen)
    ut, s, gt, nu = th["ut"], th["s"], th["gt"], th["nu"]
    x1 = s * gt * d                                                     # Theta - Theta_t = 1
    rate = lambda x: P.transport_rate(np.sqrt(ut * ut + x), ut, d, s, gt, nu)   # noqa: E731
    q1, q2 = rate(x1), rate(2.0 * x1)
    b = (q2 - 2.0 * q1) / (2.0 * x1 * x1)
    a = (4.0 * q1 - q2) / (2.0 * x1)
    if check:
        x3 = 0.37 * x1
        ref = rate(x3)
        np.testing.assert_allclose(a * x3 + b * x3 * x3, ref, rtol=1e-11, atol=0)
    return FluxLaw(ut=np.ascontiguousarray(ut), a=np.ascontiguousarray(a), b=np.ascontiguousarray(b)), th


# ---------------------------------------------------------------------------------------------- kernels (numpy)
def _mode_sums_np(u, w, S, ut, am, bm, sp):
    n, J = S.shape
    K = ut.shape[1]
    sc = np.zeros((K, J)); sa = np.zeros((K, J - DO_BED0))
    aS = np.abs(S)
    for k in range(K):
        act = u * (1 + sp) > ut[:, k]
        if not act.any():
            continue
        uu, utk = u[act][:, None], ut[act, k][:, None]
        uc = uu * (1 + sp * aS[act])
        x = uc * uc - utk * utk
        q = np.where(uc > utk, am[act, k][:, None] * x + bm[act, k][:, None] * x * x, 0.0) * w[act][:, None]
        sc[k] = (q * S[act]).sum(0)
        sa[k] = (q[:, DO_BED0:] * aS[act, DO_BED0:]).sum(0)
    return sc, sa


def _crest_np(u, ua, w, ut, a, b, alpha, sp):
    K = ut.shape[1]
    out = np.zeros((6, K))
    for k in range(K):
        al = alpha[k]
        if not np.isfinite(al):
            out[:4, k] = np.nan
            continue
        dd = ua - al
        sd, cd = np.sin(dd), np.cos(dd)
        uc = u * (1 + sp * np.abs(sd))
        x = uc * uc - ut[:, k] ** 2
        q = np.where(uc > ut[:, k], a[:, k] * x + b[:, k] * x * x, 0.0) * w
        out[0, k] = (q * cd).sum(); out[1, k] = (q * sd).sum()
        out[2, k] = (q * np.abs(cd)).sum(); out[3, k] = (q * np.abs(sd)).sum()
        out[4, k] = q.sum(); out[5, k] = q[u > ut[:, k]].sum()
    return out


def _flat_np(u, ua, w, ut, a, b):
    x = u[:, None] ** 2 - ut ** 2
    above = u[:, None] > ut
    q = np.where(above, a * x + b * x * x, 0.0) * w[:, None]
    wa = np.where(above, w[:, None], 0.0)
    return np.stack([q.sum(0), (q * np.cos(ua)[:, None]).sum(0), (q * np.sin(ua)[:, None]).sum(0),
                     wa.sum(0), (wa * (u[:, None] / ut)).sum(0)])


# ---------------------------------------------------------------------------------------------- kernels (numba)
def _mode_sums_nb(u, w, S, utT, amT, bmT, sp, bed0):
    n, J = S.shape
    K = utT.shape[0]
    sc = np.zeros((K, J)); sa = np.zeros((K, J - bed0))
    for k in range(K):
        for i in range(n):
            utk = utT[k, i]
            ui = u[i]
            if ui * (1.0 + sp) <= utk:
                continue
            ak = amT[k, i]; bk = bmT[k, i]; wi = w[i]; ut2 = utk * utk
            for j in range(J):
                s = S[i, j]
                a_s = abs(s)
                uc = ui * (1.0 + sp * a_s)
                if uc > utk:
                    x = uc * uc - ut2
                    q = (ak * x + bk * x * x) * wi
                    sc[k, j] += q * s
                    if j >= bed0:
                        sa[k, j - bed0] += q * a_s
    return sc, sa


def _crest_nb(u, ua, w, utT, aT, bT, alpha, sp):
    K = utT.shape[0]; n = u.shape[0]
    out = np.zeros((6, K))
    for k in range(K):
        al = alpha[k]
        if not np.isfinite(al):
            for m in range(4):
                out[m, k] = np.nan
            continue
        s0 = 0.0; s1 = 0.0; s2 = 0.0; s3 = 0.0; s4 = 0.0; s5 = 0.0
        for i in range(n):
            utk = utT[k, i]
            ui = u[i]
            if ui * (1.0 + sp) <= utk:
                continue
            dd = ua[i] - al
            sd = np.sin(dd); cd = np.cos(dd)
            uc = ui * (1.0 + sp * abs(sd))
            if uc > utk:
                x = uc * uc - utk * utk
                q = (aT[k, i] * x + bT[k, i] * x * x) * w[i]
                s0 += q * cd; s1 += q * sd; s2 += q * abs(cd); s3 += q * abs(sd); s4 += q
                if ui > utk:
                    s5 += q
        out[0, k] = s0; out[1, k] = s1; out[2, k] = s2; out[3, k] = s3; out[4, k] = s4; out[5, k] = s5
    return out


def _flat_nb(u, ua, w, utT, aT, bT):
    K = utT.shape[0]; n = u.shape[0]
    out = np.zeros((5, K))
    cu = np.cos(ua); su = np.sin(ua)
    for k in range(K):
        for i in range(n):
            utk = utT[k, i]
            if u[i] > utk:
                x = u[i] * u[i] - utk * utk
                q = (aT[k, i] * x + bT[k, i] * x * x) * w[i]
                out[0, k] += q; out[1, k] += q * cu[i]; out[2, k] += q * su[i]
                out[3, k] += w[i]; out[4, k] += w[i] * (u[i] / utk)
    return out


if HAVE_NUMBA:
    _mode_sums_nb = _nb.njit(cache=False, fastmath=False)(_mode_sums_nb)
    _crest_nb = _nb.njit(cache=False, fastmath=False)(_crest_nb)
    _flat_nb = _nb.njit(cache=False, fastmath=False)(_flat_nb)


# ---------------------------------------------------------------------------------------------- engine
def _modes(sc, sa):
    K = sc.shape[0]
    ae = np.empty(K); ab = np.empty(K)
    xb = DO[DO_BED0:]
    with np.errstate(all="ignore"):
        for k in range(K):
            ae[k] = QC._elongationmode(DO, sc[k])
            ab[k] = QC._bedmode(xb, sa[k])
    return ae, ab


def sample_fields(u, ua, w, law: FluxLaw, speedup: float = SPEEDUP, backend: str = "auto",
                  modes=None, return_sums: bool = False) -> dict:
    """The 23 fields {var: (K,) float64} of one cell from samples u (n,), ua (n,), weights w (n,) and `law`.
    `modes` = (ae, ab) skips the mode search. NaN throughout if sum w == 0."""
    u = np.ascontiguousarray(u, "f8"); ua = np.ascontiguousarray(ua, "f8"); w = np.ascontiguousarray(w, "f8")
    K = law.ut.shape[1]
    tot = float(w.sum())
    if not tot > 0:
        return {v: np.full(K, np.nan) for v in QSAT_VARS}
    am = law.a if law.a_mode is None else law.a_mode
    bm = law.b if law.b_mode is None else law.b_mode
    if backend == "auto":
        backend = "numba" if HAVE_NUMBA else "numpy"
    if modes is None:
        S = np.sin(ua[:, None] - DO[None, :])                            # as qsat_compute.orientation_kernels
        if backend == "numba":
            sc, sa = _mode_sums_nb(u, w, S, np.ascontiguousarray(law.ut.T), np.ascontiguousarray(am.T),
                                   np.ascontiguousarray(bm.T), float(speedup), DO_BED0)
        else:
            sc, sa = _mode_sums_np(u, w, S, law.ut, am, bm, speedup)
        ae, ab = _modes(sc, sa)
    else:
        ae, ab = (np.asarray(m, "f8") for m in modes)
    if backend == "numba":
        utT, aT, bT = (np.ascontiguousarray(x.T) for x in (law.ut, law.a, law.b))
        fl = _flat_nb(u, ua, w, utT, aT, bT)
        rb = _crest_nb(u, ua, w, utT, aT, bT, ab, float(speedup))
        re = _crest_nb(u, ua, w, utT, aT, bT, ae, float(speedup))
    else:
        fl = _flat_np(u, ua, w, law.ut, law.a, law.b)
        rb = _crest_np(u, ua, w, law.ut, law.a, law.b, ab, speedup)
        re = _crest_np(u, ua, w, law.ut, law.a, law.b, ae, speedup)
    f = {"ab": ab, "ae": ae}
    with np.errstate(all="ignore"):
        dp = fl[0] / tot
        r = (fl[1] + 1j * fl[2]) / tot
        f["dpm"], f["rdpm"], f["rdpa"] = dp, np.abs(r), np.angle(r)
        f["qha_rdp_dp"] = np.where(dp > 0, f["rdpm"] / dp, np.nan)
        f["uft"] = fl[3] / tot
        f["ufm"] = fl[4] / np.where(fl[3] > 0, fl[3], np.nan)
        f["qnlb"], f["qncb"], f["qalb"], f["qacb"] = rb[:4] / tot
        f["qnle"], _, f["qale"], f["qace"] = re[:4] / tot
        f["at"] = (np.where(f["qncb"] > 0, ab + np.pi / 2, ab - np.pi / 2) + np.pi) % (2 * np.pi) - np.pi
        f["ao"] = (np.where(f["qnlb"] > 0, ab, ab - np.pi) + np.pi) % (2 * np.pi) - np.pi
        f["sige_sigh"] = f["qace"] / f["qacb"]
        f["qhab_nl_nc"] = np.abs(f["qnlb"] / f["qncb"])
        f["qhab_ac_nc"] = np.abs(f["qacb"] / f["qncb"])
        f["qhne_ac_nl"] = f["qace"] / f["qnle"]
        for v, (crest, qall, qab) in (("qhbf", (f["qalb"] + f["qacb"] > 0, rb[4], rb[5])),
                                      ("qhef", (f["qale"] + f["qace"] > 0, re[4], re[5]))):
            F = np.where(qall > 0, qab / qall, np.nan)
            F = np.where(f["uft"] > 0, F, np.where(crest, 0.0, np.nan))
            f[v] = np.clip(F, 0.0, 1.0)
    out = {v: np.asarray(f[v], "f8") for v in QSAT_VARS}
    if return_sums:
        out["_sums"] = {"flat": fl, "crest_b": rb, "crest_e": re, "tot": tot}
    return out


def stack(fields: dict) -> np.ndarray:
    """{var: (K,)} -> (23, K) in QSAT_VARS order."""
    return np.stack([fields[v] for v in QSAT_VARS])


# ---------------------------------------------------------------------------------------------- adapters
def histogram_samples(hist2d):
    """Earth histogram (128 speed, 128 dir) -> samples (u*, ua, w) over the non-empty bins (bin centres)."""
    h = np.asarray(hist2d)
    iu, ia = np.nonzero(h)
    return QC.UF[iu], QC.C.UA_CENTRES[ia], h[iu, ia].astype("f8")


def earth_histogram_fields(hist2d, backend="auto", modes=None) -> dict:
    """Earth fields of one cell from its histogram through the sample engine (equivalence with qsat_fields)."""
    u, ua, w = histogram_samples(hist2d)
    return sample_fields(u, ua, w, earth_law(len(u)), speedup=QC.SPEEDUP, backend=backend, modes=modes)


def mars_cell_fields(u, v, T, rho, z, w=None, d=M.D_VALUES, backend="auto", return_threshold=False):
    """Mars fields of one cell from its hourly series: lowest-level wind (u, v) (m/s) at that hour's lowest-level
    height z (m), temperature T (K) and air density rho (kg m^-3). u* per hour from physics.friction_velocity (the
    eq. 2.2 smooth-wall profile, nu = viscosity(T) / rho). Returns (23, len(d)) float64 (QSAT_VARS order)
    [, threshold dict, u*]."""
    T = np.asarray(T, "f8"); rho = np.asarray(rho, "f8")
    ustar, ua = P.friction_velocity(np.asarray(u, "f8"), np.asarray(v, "f8"), np.asarray(z, "f8"),
                                    P.viscosity(T) / rho)
    law, th = mars_law(rho, T, d)
    w = np.ones(len(ustar)) if w is None else np.asarray(w, "f8")
    f = stack(sample_fields(ustar, ua, w, law, speedup=SPEEDUP, backend=backend))
    return (f, th, ustar) if return_threshold else f
