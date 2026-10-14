// Port of pipeline/src/dune_atlas_pipeline/flux.py (notebook dune-world-era5land-rev0 cell 14).
// Keep line-for-line equivalent: tests/flux-parity.test.ts checks this against the Python output.
//
// hist: n_um speed x n_ua direction counts, C order (index = um * n_ua + ua); bin centres come
// from the cell store attrs (`Bins`), defaulting to the ERA5-Land 128 x 128 constants.
// Fluxes are m^2/s; multiply by C.S2Y for m^2/yr.
import { C } from "../util/constants";

export interface Bins {
  /** speed-bin centres (m/s) */
  umCentres: ArrayLike<number>;
  /** direction-bin centres (rad, CCW from east, toward) */
  uaCentres: ArrayLike<number>;
  umEdges?: ArrayLike<number>;
  uaEdges?: ArrayLike<number>;
}
export const DEFAULT_BINS: Bins = { umCentres: C.UM_CENTRES, uaCentres: C.UA_CENTRES, umEdges: C.UM_EDGES, uaEdges: C.UA_EDGES };

/** Bin centres from bin edges (cell store attrs um_edges / ua_edges). */
export function binsFromEdges(umEdges: ArrayLike<number>, uaEdges: ArrayLike<number>): Bins {
  const c = (e: ArrayLike<number>) => Array.from({ length: e.length - 1 }, (_, i) => 0.5 * (e[i + 1] + e[i]));
  return { umCentres: c(umEdges), uaCentres: c(uaEdges), umEdges, uaEdges };
}

const LOG_Z_Z0 = Math.log(C.Z / C.Z0);

/** flat_friction_velocity: u*_f = um * kappa / ln(z/z0) per speed bin. */
export function flatFrictionVelocity(um: ArrayLike<number> = C.UM_CENTRES): Float64Array {
  const out = new Float64Array(um.length);
  for (let i = 0; i < um.length; i++) out[i] = (um[i] * C.KAPPA) / LOG_Z_Z0;
  return out;
}

const UF_CACHE = new WeakMap<object, Float64Array>();
function ufOf(bins: Bins): Float64Array {
  const key = bins.umCentres as unknown as object;
  let uf = UF_CACHE.get(key);
  if (!uf) UF_CACHE.set(key, (uf = flatFrictionVelocity(bins.umCentres)));
  return uf;
}

/** flat_flux: saturated flat-bed flux q(u*) per speed bin (m^2/s); 0 below threshold. */
export function flatFlux(ut: number, uf: Float64Array = ufOf(DEFAULT_BINS)): Float64Array {
  const out = new Float64Array(uf.length);
  for (let i = 0; i < uf.length; i++) {
    const u = uf[i];
    out[i] = u > ut ? (u * u - ut * ut) * ut * C.FLUXK : 0;
  }
  return out;
}

/** Column sums of q * hist over speed, and per-direction counts. */
function directionSums(hist: ArrayLike<number>, q: Float64Array): { num: Float64Array; w: Float64Array; total: number } {
  const nUm = q.length, nUa = hist.length / nUm;
  const num = new Float64Array(nUa);
  const w = new Float64Array(nUa);
  let total = 0;
  for (let i = 0; i < nUm; i++) {
    const qi = q[i];
    const row = i * nUa;
    for (let j = 0; j < nUa; j++) {
      const h = hist[row + j];
      num[j] += qi * h;
      w[j] += h;
      total += h;
    }
  }
  return { num, w, total };
}

/** flux_rose: time-averaged flat-bed flux per direction bin (sum over speed of n q / total hours);
 *  petals sum to DP. */
export function fluxRose(hist: ArrayLike<number>, ut: number, bins: Bins = DEFAULT_BINS): Float64Array {
  const { num, total } = directionSums(hist, flatFlux(ut, ufOf(bins)));
  return num.map((v) => v / total);
}

/** crest_flux_rose: time-averaged saturated CREST flux with speed-up per direction bin,
 *  uc = uf (1 + BETA DASPECT |sin(ua - alpha)|), q = (uc^2 - ut^2) ut FLUXK if uc > ut,
 *  sum_speed n q / sum_all n (m^2/s). alpha = stored mode direction (ae or ab) at this ut.
 *  Petals sum to <|Q(alpha)|>. */
export function crestFluxRose(hist: ArrayLike<number>, ut: number, alpha: number, bins: Bins = DEFAULT_BINS): Float64Array {
  const uf = ufOf(bins);
  const ua = bins.uaCentres;
  const nUm = uf.length, nUa = ua.length;
  const k = C.BETA * C.DASPECT;
  const g = new Float64Array(nUa);
  for (let j = 0; j < nUa; j++) g[j] = 1 + k * Math.abs(Math.sin(ua[j] - alpha));
  const num = new Float64Array(nUa);
  let total = 0;
  const ut2 = ut * ut;
  for (let i = 0; i < nUm; i++) {
    const row = i * nUa;
    const u = uf[i];
    for (let j = 0; j < nUa; j++) {
      const h = hist[row + j];
      total += h;
      if (!h) continue;
      const uc = u * g[j];
      if (uc > ut) num[j] += (uc * uc - ut2) * ut * C.FLUXK * h;
    }
  }
  return num.map((v) => v / total);
}

/** Classes of excess shear u* : u*,th for stacking the flux rose (last class open-ended). */
export const EXCESS_SHEAR_EDGES = [1, 1.25, 1.5, 2, 3, 5, Infinity];

/** flux_rose_by_excess_shear: time-averaged flux per (class, direction bin), sum_speed n q /
 *  sum_all n (m^2/s), split by the class of u* : u*,th of each (speed, direction) bin. alpha null
 *  = flat bed (u* = u*f); otherwise crest mode about alpha (u* = uc, as crestFluxRose). Summing
 *  over classes gives fluxRose / crestFluxRose exactly (only u* > u*,th carries flux). */
export function fluxRoseByExcessShear(hist: ArrayLike<number>, ut: number, alpha: number | null, bins: Bins = DEFAULT_BINS, edges: number[] = EXCESS_SHEAR_EDGES): Float64Array[] {
  const uf = ufOf(bins);
  const ua = bins.uaCentres;
  const nUm = uf.length, nUa = ua.length, nc = edges.length - 1;
  const out = Array.from({ length: nc }, () => new Float64Array(nUa));
  const g = new Float64Array(nUa).fill(1);
  if (alpha !== null) { const k = C.BETA * C.DASPECT; for (let j = 0; j < nUa; j++) g[j] = 1 + k * Math.abs(Math.sin(ua[j] - alpha)); }
  const ut2 = ut * ut;
  let total = 0;
  for (let i = 0; i < nUm; i++) {
    const row = i * nUa;
    for (let j = 0; j < nUa; j++) {
      const h = hist[row + j];
      total += h;
      if (!h) continue;
      const u = alpha === null ? uf[i] : uf[i] * g[j];
      if (!(u > ut)) continue;
      const r = u / ut;
      let c = 0;
      while (c < nc - 1 && r >= edges[c + 1]) c++;
      out[c][j] += (u * u - ut2) * ut * C.FLUXK * h;
    }
  }
  for (const a of out) for (let j = 0; j < nUa; j++) a[j] /= total;
  return out;
}

export interface DpResult {
  /** drift potential (m^2/s) */
  dp: number;
  /** resultant drift potential magnitude (m^2/s) */
  rdp: number;
  /** resultant drift direction, rad, math convention (CCW from east), toward */
  rdd: number;
}

/** dp_rdp_rdd: DP, RDP and RDD of the time-averaged flat-bed flux (sums over the flux rose). */
export function dpRdpRdd(hist: ArrayLike<number>, ut: number, bins: Bins = DEFAULT_BINS): DpResult {
  return dpFromRose(fluxRose(hist, ut, bins), bins.uaCentres);
}

export function dpFromRose(qd: Float64Array, ua: ArrayLike<number> = C.UA_CENTRES): DpResult {
  let s = 0, re = 0, im = 0;
  for (let j = 0; j < qd.length; j++) {
    const v = qd[j];
    s += v;
    re += v * Math.cos(ua[j]);
    im += v * Math.sin(ua[j]);
  }
  return { dp: s, rdp: Math.hypot(re, im), rdd: Math.atan2(im, re) };
}

/** 10 m wind speed (m/s) at which the flat-bed friction velocity reaches ut (inverse of flatFrictionVelocity). */
export function thresholdWindSpeed(ut: number): number {
  return (ut * LOG_Z_Z0) / C.KAPPA;
}
