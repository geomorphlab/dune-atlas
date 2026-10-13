"""The 23 qsat fields at the 64 thresholds, computed from (speed, direction) wind histograms.

Produces, for any wind dataset, the fields the atlas shows for ERA5-Land through `qsat_view.open_qsat`
(time-averaged over the hourly record: every reduction is sum(n * x) / sum(n) over the histogram bins).

Crest-mode directions (Gunn (2026), Methods; dune-world notebook cells 3 and 12):
  qa(do)  = (uc^2 - ut^2) ut where uc = uf (1 + BETA DASPECT |sin(ua - do)|) > ut, else 0, on the
            orientation grid do = linspace(-pi, pi, 129)
  alpha_E = root of the periodic cubic spline of sum n qa sin(ua - do) with the most negative slope
  alpha_H = maximum of the periodic cubic spline of sum n qa |sin(ua - do)| over do in [0, pi]
Crest fluxes at alpha (cell 14 / flux.crest_flux): q = (uc^2 - ut^2) ut FLUXK where uc > ut, else 0;
  qnl, qnc, qal, qac = means of q cos(ua - alpha), q sin(ua - alpha), |q cos|, |q sin| (NaN if alpha is NaN).
Derived: at, ao, sige_sigh, qhab_nl_nc, qhab_ac_nc, qhne_ac_nl (cell 14); DP, RDP, RDD, RDP/DP of the
time-averaged flat-bed flux (scripts/drift/compute_drift.py); ufm, uft; qhbf/qhef as flux fractions
F = sum_{uf>ut} n q / sum n q with the qsat_view rules (uft == 0 and crest flux -> 0; no crest flux -> NaN).

Only numpy and scipy are needed, so the module also runs on HPC nodes without the rest of the pipeline.
"""
from __future__ import annotations

import numpy as np
from scipy.interpolate import CubicSpline

from . import constants as C

DO = np.linspace(-np.pi, np.pi, 2**7 + 1)        # crest-orientation grid (129 points, both ends)
DO_BED0 = 64                                      # DO[64] == 0.0: alpha_H is searched on DO[64:]
UF = C.UM_CENTRES * C.KAPPA / np.log(C.Z / C.Z0)  # flat-bed friction velocity per speed bin
UT = C.UT_VALUES
SPEEDUP = C.BETA * C.DASPECT


# --- mode finders, verbatim from the dune-world notebook (cell 3) -------------------------------
def _elongationmode(x, y):
    try:
        temp0 = CubicSpline(x, y, bc_type='periodic')
    except Exception:  # first and last values differ in rounding: use the last for both
        temp0 = CubicSpline(x, np.hstack((y[-1], y[1:])), bc_type='periodic')
    temp1 = temp0.roots(extrapolate=False)
    return temp1[np.argmin(temp0.derivative()(temp1))]


def _bedmode(x, y):
    try:
        temp0 = CubicSpline(x, y, bc_type='periodic')
    except Exception:
        temp0 = CubicSpline(x, np.hstack((y[-1], y[1:])), bc_type='periodic')
    temp1 = np.hstack((temp0.derivative().roots(extrapolate=False), x[0], x[-1]))
    return temp1[np.argmax(temp0(temp1))]


# --- orientation kernels -------------------------------------------------------------------------
_KERNELS = None


def orientation_kernels():
    """(Kc, Ka): qa sin(ua - do) on the full DO grid and qa |sin(ua - do)| on DO[64:], as
    (16384 bins, 64 ut * n_do) matrices, so that hist.reshape(n, 16384) @ K gives the
    histogram-weighted sums for all thresholds and orientations at once."""
    global _KERNELS
    if _KERNELS is None:
        s = np.sin(C.UA_CENTRES[:, None] - DO[None, :])                     # (d, k)
        uc = UF[:, None, None] * (1 + SPEEDUP * np.abs(s))[None]             # (s, d, k)
        kc = np.empty((len(UF), len(C.UA_CENTRES), len(UT), len(DO)))
        for i, ut in enumerate(UT):
            qa = np.where(uc > ut, (uc**2 - ut**2) * ut, 0.0)
            kc[:, :, i, :] = qa * s[None]
        ka = np.abs(kc[..., DO_BED0:])
        _KERNELS = (kc.reshape(len(UF) * len(C.UA_CENTRES), -1), np.ascontiguousarray(ka.reshape(len(UF) * len(C.UA_CENTRES), -1)))
    return _KERNELS


def crest_modes(hist):
    """hist: (n, 128 speed, 128 dir) counts. Returns (ae, ab), each (n, 64)."""
    n = hist.shape[0]
    kc, ka = orientation_kernels()
    h = hist.reshape(n, -1).astype(np.float64)
    qnc = (h @ kc).reshape(n, len(UT), len(DO))
    qac = (h @ ka).reshape(n, len(UT), len(DO) - DO_BED0)
    ae = np.empty((n, len(UT)))
    ab = np.empty((n, len(UT)))
    xb = DO[DO_BED0:]
    with np.errstate(all='ignore'):
        for c in range(n):
            for k in range(len(UT)):
                ae[c, k] = _elongationmode(DO, qnc[c, k])
                ab[c, k] = _bedmode(xb, qac[c, k])
    return ae, ab


# --- fields --------------------------------------------------------------------------------------
def _crest_reductions(hist, tot, alpha):
    """Time-averaged crest fluxes at alpha (n, 64): (qnl, qnc, qal, qac, q_all, q_above) where
    q_all = sum n q, q_above = sum over bins with uf > ut of n q (both unnormalised)."""
    n = hist.shape[0]
    out = np.full((6, n, len(UT)), np.nan)
    h = hist.astype(np.float64)
    for k, ut in enumerate(UT):
        a = alpha[:, k]                                                      # (n,)
        d = C.UA_CENTRES[None, :] - a[:, None]                               # (n, dir)
        sd, cd = np.sin(d), np.cos(d)
        uc = UF[None, :, None] * (1 + SPEEDUP * np.abs(sd))[:, None, :]       # (n, s, dir)
        q = np.where(uc > ut, (uc**2 - ut**2) * ut * C.FLUXK, 0.0)
        hq = h * q
        w = hq.sum(1)                                                        # (n, dir) sum_s n q
        above = UF > ut
        out[4, :, k] = w.sum(1)
        out[5, :, k] = hq[:, above, :].sum((1, 2))
        ok = np.isfinite(a)
        out[0, ok, k] = (w * cd).sum(1)[ok] / tot[ok]
        out[1, ok, k] = (w * sd).sum(1)[ok] / tot[ok]
        out[2, ok, k] = (w * np.abs(cd)).sum(1)[ok] / tot[ok]
        out[3, ok, k] = (w * np.abs(sd)).sum(1)[ok] / tot[ok]
    return out


def qsat_fields(hist, modes=None):
    """hist: (n, 128 speed, 128 dir) integer counts. Returns {var: (n, 64) float64} for the 23
    variables in constants.QSAT_VARS. Cells with an empty histogram give NaN throughout.
    `modes` = (ae, ab) to skip the mode search (e.g. to test the flux part against stored modes)."""
    hist = np.asarray(hist)
    n = hist.shape[0]
    tot = hist.reshape(n, -1).sum(1).astype(np.float64)
    good = tot > 0
    if modes is None:
        ae = np.full((n, len(UT)), np.nan)
        ab = np.full((n, len(UT)), np.nan)
        if good.any():
            ae[good], ab[good] = crest_modes(hist[good])
    else:
        ae = np.where(good[:, None], modes[0], np.nan)
        ab = np.where(good[:, None], modes[1], np.nan)
    f = {"ab": ab, "ae": ae}
    with np.errstate(all='ignore'):
        # flat bed: DP, RDP, RDD (compute_drift.py), uft, ufm
        hs = hist.sum(2).astype(np.float64)                                   # (n, s) hours per speed bin
        q = np.where(UF[None, :] > UT[:, None], (UF[None, :]**2 - UT[:, None]**2) * UT[:, None] * C.FLUXK, 0.0)
        num = np.matmul(hist.transpose(0, 2, 1).astype(np.float64), q.T)     # (n, dir, ut)
        dp = num.sum(1) / tot[:, None]
        r = np.einsum('ndk,d->nk', num, np.exp(1j * C.UA_CENTRES)) / tot[:, None]
        f["dpm"], f["rdpm"], f["rdpa"] = dp, np.abs(r), np.angle(r)
        f["qha_rdp_dp"] = np.where(dp > 0, f["rdpm"] / dp, np.nan)
        above = UF[None, :] > UT[:, None]                                     # (ut, s)
        n_above = hs @ above.T                                                # (n, ut)
        f["uft"] = n_above / tot[:, None]
        f["ufm"] = (hs @ (above * (UF[None, :] / UT[:, None])).T) / np.where(n_above > 0, n_above, np.nan)
        # crest modes
        rb = _crest_reductions(hist, tot, ab)
        re = _crest_reductions(hist, tot, ae)
        f["qnlb"], f["qncb"], f["qalb"], f["qacb"] = rb[:4]
        f["qnle"], _, f["qale"], f["qace"] = re[:4]
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
    for v in C.QSAT_VARS:
        f[v] = np.where(good[:, None], f[v], np.nan)
    return {v: f[v] for v in C.QSAT_VARS}
