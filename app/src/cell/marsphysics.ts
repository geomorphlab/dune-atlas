// Port of pipeline/src/dune_atlas_pipeline/mars/physics.py (docs/reference/mars-spec.md section 3).
// Keep line-for-line equivalent: tests/marsphysics.test.ts checks it against the Python output
// (tests/fixtures/mars-physics-parity.json from scripts/make-mars-physics-fixture.py).
// Pahtz & Duran (2023) J. Fluid Mech. 963:A20: threshold eq. 5.1 with the rarefaction factor of eq. 3.20,
// transport eq. 3.2 in '+' units. SI units; fluxes are volume fluxes of packed sand q = Q/(rho_p phi) (m^2/s),
// phi = PACKING = 0.6 (as the Earth atlas).
import raw from "../generated/constants-mars.json";

export interface MarsConstants {
  G: number; R_MARS: number; R_AIR: number; MU0: number; T0_MU: number; S_MU: number; K_ADIABATIC: number;
  RHO_P: number; PACKING: number; KAPPA: number; MIX_DAMP: number; DSTAR_MIN: number; UPLUS_MIN: number; C1: number; C2: number;
  KN_A: number; KN_B: number; KN_C: number; GA_SQRT_S_MIN: number; BETA: number; DASPECT: number; S2Y: number;
  D_DEFAULT_INDEX: number; D_VALUES_UM: number[]; SERIES_VARS: string[];
  PROFILE_LN_X: number[]; PROFILE_U_PLUS: number[]; N_BISECT: number; LN_US_LO: number; LN_US_HI: number;
}
export const M: MarsConstants = raw as MarsConstants;
/** grain diameters of the slider (m) */
export const D_VALUES: number[] = M.D_VALUES_UM.map((v) => v * 1e-6);

const LX = M.PROFILE_LN_X, UP = M.PROFILE_U_PLUS, NP = LX.length;

/** Universal smooth-wall profile u+ = u / ustar at X = z ustar / nu (eq. 2.2 + constant stress); as numpy.interp in ln X inside
 *  the table, u+ = X below it, log-layer continuation above it. */
export function uPlus(x: number): number {
  const lx = Math.log(Math.max(x, 1e-300));
  if (lx < LX[0]) return x;
  if (lx > LX[NP - 1]) return UP[NP - 1] + (lx - LX[NP - 1]) / M.KAPPA;
  // numpy.interp: right-closed search on the increasing table, then linear interpolation
  let lo = 0, hi = NP - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (LX[m] <= lx) lo = m; else hi = m; }
  if (lx === LX[NP - 1]) return UP[NP - 1];
  const t = (lx - LX[lo]) / (LX[hi] - LX[lo]);
  return UP[lo] + t * (UP[hi] - UP[lo]);
}

/** ustar (m/s) with U = ustar * u+(z ustar / nu): fixed-step bisection in ln ustar (same steps and bracket as the pipeline). */
export function ustarFromWind(U: number, z: number, nu: number): number {
  if (!(U > 0)) return 0;
  let lo = M.LN_US_LO, hi = M.LN_US_HI;
  for (let i = 0; i < M.N_BISECT; i++) {
    const mid = 0.5 * (lo + hi);
    const us = Math.exp(mid);
    if (us * uPlus((z * us) / nu) - U < 0) lo = mid; else hi = mid;
  }
  return Math.exp(0.5 * (lo + hi));
}

/** Height (m) of the lowest-layer mid pressure, hydrostatic with the layer temperature (pipeline layer_height). */
export function layerHeight(ps: number, T: number, akLo: number, bkLo: number, akHi: number, bkHi: number): number {
  const pLo = akLo + bkLo * ps;
  const pMid = 0.5 * (pLo + (akHi + bkHi * ps));
  return ((M.R_AIR * T) / M.G) * Math.log(pLo / pMid);
}

/** Lowest-layer mid pressure (Pa) and density (kg m^-3); (akLo, bkLo) bottom, (akHi, bkHi) top interface. */
export function airState(ps: number, T: number, akLo: number, bkLo: number, akHi: number, bkHi: number) {
  const p = 0.5 * ((akLo + bkLo * ps) + (akHi + bkHi * ps));
  return { p, rho: p / (M.R_AIR * T) };
}

/** Dynamic viscosity of CO2, Sutherland law (Pa s). */
export function viscosity(T: number): number {
  return M.MU0 * (T / M.T0_MU) ** 1.5 * (M.T0_MU + M.S_MU) / (T + M.S_MU);
}

/** u* from the lowest-level wind (u, v) at height z (m) in air of kinematic viscosity nu (m^2/s), eq. 2.2 smooth
 *  wall; direction toward, CCW from east (rad). */
export function frictionVelocity(u: number, v: number, z: number, nu: number): { ustar: number; ua: number } {
  return { ustar: ustarFromWind(Math.hypot(u, v), z, nu), ua: Math.atan2(v, u) };
}

export interface Threshold { ut: number; s: number; gt: number; nu: number; dplus: number; dstar: number; kn: number; fkn: number; gaSqrtS: number }

/** Cessation threshold u*,th (m/s) for grain diameter d (m) in air of density rho (kg m^-3) and temperature T (K). */
export function threshold(d: number, rho: number, T: number, knudsen = true): Threshold {
  const s = M.RHO_P / rho;
  const gt = (1 - 1 / s) * M.G;
  const nu = viscosity(T) / rho;
  const dplus = (gt * d) / (gt * nu) ** (2 / 3);
  let kn = 0, fkn = 1;
  if (knudsen) {
    const c = Math.sqrt(M.K_ADIABATIC * M.R_AIR * T);
    kn = (Math.sqrt((Math.PI * M.K_ADIABATIC) / 2) * nu) / (c * d);
    fkn = 1 + kn * (M.KN_A + M.KN_B * Math.exp(-M.KN_C / kn));
  }
  const dstar = Math.sqrt(fkn) * Math.sqrt(s) * dplus;
  const r = dstar / M.DSTAR_MIN;
  const ut = M.UPLUS_MIN * (gt * nu) ** (1 / 3) * Math.max(r ** -0.5, r ** 0.5);
  const gaSqrtS = (Math.sqrt(s * gt * d ** 3) / nu) * Math.sqrt(s);
  return { ut, s, gt, nu, dplus, dstar, kn, fkn, gaSqrtS };
}

/** Saturated volume flux of packed sand q = Q/(rho_p phi) (m^2/s), eq. 3.2 in '+' units; 0 where u* <= u*,th. */
export function transportRate(ustar: number, ut: number, d: number, s: number, gt: number, nu: number): number {
  if (!(ustar > ut)) return 0;
  const dth = (ustar ** 2 - ut ** 2) / (s * gt * d);
  const dplus = (gt * d) / (gt * nu) ** (2 / 3);
  const qplus = dplus ** 1.5 * (M.C1 * s ** (1 / 3) * dth + M.C2 * s ** (1 / 3) * dth ** 2);
  return (qplus * nu) / M.PACKING;
}

/** q(u*) (m^2/s) for one hour; th may be passed when the same hour's threshold is reused (crest fluxes). */
export function flux(ustar: number, d: number, rho: number, T: number, th: Threshold = threshold(d, rho, T)): number {
  return transportRate(ustar, th.ut, d, th.s, th.gt, th.nu);
}
