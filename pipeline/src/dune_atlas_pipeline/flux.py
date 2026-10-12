"""Reference flux computations from a single cell's wind histogram.

Drift potential and flux roses are time averages over the hourly record: count * q summed over
the speed (and direction) bins, divided by the total number of hours. Crest fluxes follow the
dune-world analysis (Gunn (2026), Methods).
"""
import numpy as np
from . import constants as C


def flat_friction_velocity(um=C.UM_CENTRES):
    return um * C.KAPPA / np.log(C.Z / C.Z0)


def flat_flux(ut, um=C.UM_CENTRES):
    """Saturated flux q(u*) for flat bed, per speed bin (m^2/s)."""
    uf = flat_friction_velocity(um)
    return np.where(uf > ut, (uf**2 - ut**2) * ut * C.FLUXK, 0.0)


def flux_rose(hist, ut):
    """hist: (128 speed, 128 dir) counts. Returns time-averaged flux per direction
    bin (m^2/s); petals sum to DP."""
    q = flat_flux(ut)[:, None]
    return (q * hist).sum(0) / hist.sum()


def dp_rdp_rdd(hist, ut):
    """Returns (DP, RDP, RDD[rad, math convention, toward]) of the time-averaged flat-bed flux."""
    qd = flux_rose(hist, ut)
    rdp = (qd * np.exp(1j * C.UA_CENTRES)).sum()
    return qd.sum(), np.abs(rdp), np.angle(rdp)


def math_to_bearing_deg(a):
    """Math angle (rad, CCW from east, 'toward') -> compass bearing (deg, 'toward')."""
    return (90.0 - np.degrees(a)) % 360.0


def crest_flux(ut, alpha, um=C.UM_CENTRES, ua=C.UA_CENTRES):
    """Saturated crest flux with speed-up (notebook cell 14 `qae` / `qab`), per (speed, direction)
    bin (m^2/s): uc = uf * (1 + BETA*DASPECT*|sin(ua - alpha)|), q = (uc^2 - ut^2)*ut*FLUXK if
    uc > ut else 0. `alpha` = crest-mode direction (stored `ae` or `ab`, rad) at this `ut`."""
    uf = flat_friction_velocity(um)[:, None]
    uc = uf * (1 + C.BETA * C.DASPECT * np.abs(np.sin(ua[None, :] - alpha)))
    return np.where(uc > ut, (uc**2 - ut**2) * ut * C.FLUXK, 0.0)


def crest_flux_rose(hist, ut, alpha):
    """Time-averaged crest flux per direction bin, sum_speed n*q / sum_all n (m^2/s); the
    petals sum to <|Q(alpha)|> (q >= 0)."""
    return (crest_flux(ut, alpha) * hist).sum(0) / hist.sum()


def crest_flux_components(hist, ut, alpha):
    """Time-averaged along/across-crest fluxes: returns
    (qnl, qnc, qal, qac) = means of q*cos(ua-alpha), q*sin(ua-alpha), |q cos|, |q sin| weighted
    by the histogram (stored qnlb/qncb/qalb/qacb for alpha=ab, qnle/-/qale/qace for alpha=ae)."""
    q = crest_flux(ut, alpha)
    d = C.UA_CENTRES[None, :] - alpha
    w = hist / hist.sum()
    ql, qc = q * np.cos(d), q * np.sin(d)
    return (ql * w).sum(), (qc * w).sum(), (np.abs(ql) * w).sum(), (np.abs(qc) * w).sum()


EXCESS_SHEAR_EDGES = np.array([1.0, 1.25, 1.5, 2.0, 3.0, 5.0, np.inf])  # classes of u*/u*,th


def flux_rose_by_excess_shear(hist, ut, alpha=None, edges=EXCESS_SHEAR_EDGES):
    """Time-averaged flux per (excess-shear class, direction bin), sum_speed n*q / sum_all n
    (m^2/s), split by the class of u*/u*,th of each (speed, direction) bin. Flat bed
    (alpha=None): u* = u*f, q = flat_flux; crest mode: u* = uc = uf*(1 + BETA*DASPECT*|sin(ua -
    alpha)|), q = crest_flux. Class k holds edges[k] <= u*/u*,th < edges[k+1]; only u* > u*,th
    carries flux, so summing over classes gives flux_rose / crest_flux_rose."""
    uf = flat_friction_velocity()[:, None]
    if alpha is None:
        u = np.broadcast_to(uf, hist.shape)
        q = np.broadcast_to(flat_flux(ut)[:, None], hist.shape)
    else:
        u = uf * (1 + C.BETA * C.DASPECT * np.abs(np.sin(C.UA_CENTRES[None, :] - alpha)))
        q = crest_flux(ut, alpha)
    r = u / ut
    total = hist.sum()
    out = np.zeros((len(edges) - 1, hist.shape[1]))
    for k in range(len(edges) - 1):
        m = (r >= edges[k]) & (r < edges[k + 1])
        out[k] = (np.where(m, q, 0.0) * hist).sum(0) / total
    return out
