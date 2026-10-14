// Mars flux and wind roses from the hourly series (u, v, T, rho) at one grain diameter d, with the
// per-hour threshold of Pahtz & Duran (2023) (cell/marsphysics.ts; never duplicated here).
// The counterpart of cell/flux.ts (Earth: histogram x one threshold). Python reference:
// scripts/mars/app/make_rose_fixture.py (pipeline mars/physics.py) -> tests/mars/rose-parity.test.ts.
//
// Per hour h: u*_h from the eq. 2.2 smooth-wall profile at that hour's lowest-level height z_h and kinematic
// viscosity nu_h = mu(T_h)/rho_h (marsphysics frictionVelocity; no roughness length), direction ua_h = atan2(v, u),
// u*,th_h = threshold(d, rho_h, T_h); flat bed q_h = q(u*_h); crest mode about alpha:
// u_c = u*_h (1 + beta A |sin(ua_h - alpha)|), q_c = q(u_c; the same hour's u*,th).
// Rose per direction bin j (the Earth 128 bins, edges -pi..pi): sum_{h in j} q_h / N (m^2/s),
// N = hours with valid data; petals sum to the time-averaged flux (DP for the flat bed).
// Excess-shear classes: u/u*,th of each hour (u = u*_h or u_c), Earth edges 1 .. 5, inf.
import { M, frictionVelocity, threshold, transportRate, uPlus, viscosity } from "../../../cell/marsphysics";
import { DEFAULT_BINS, EXCESS_SHEAR_EDGES } from "../../../cell/flux";
import { sectorOf, towardBearings, type WindRose } from "../../../cell/roses";
import { towardToFrom } from "../../../util/angles";
import type { MarsSeries } from "./cellstore";

const UA_EDGES = DEFAULT_BINS.uaEdges as ArrayLike<number>;
const N_BINS = (UA_EDGES.length - 1);
const W_BIN = (2 * Math.PI) / N_BINS;

/** direction bin of a direction ua (rad): edges[j] <= ua < edges[j+1] for the interior edges, i.e.
 *  numpy.digitize(ua, edges[1:-1]); ua = pi falls in the last bin. */
export function dirBin(ua: number): number {
  let j = Math.floor((ua - UA_EDGES[0]) / W_BIN);
  if (j < 0) j = 0; else if (j > N_BINS - 1) j = N_BINS - 1;
  while (j > 0 && ua < UA_EDGES[j]) j--;
  while (j < N_BINS - 1 && ua >= UA_EDGES[j + 1]) j++;
  return j;
}

export interface HourState {
  n: number;
  /** hours with finite u, v and positive T, rho, z */
  nValid: number;
  valid: Uint8Array;
  ustar: Float64Array;
  ua: Float64Array;
  speed: Float64Array;
  bin: Int16Array;
  /** kinematic viscosity mu(T)/rho (m^2/s) */
  nu: Float64Array;
}

const STATE = new WeakMap<Float32Array, HourState>();
export function hourState(s: MarsSeries): HourState {
  let st = STATE.get(s.u);
  if (st) return st;
  const n = s.u.length;
  st = { n, nValid: 0, valid: new Uint8Array(n), ustar: new Float64Array(n), ua: new Float64Array(n), speed: new Float64Array(n), bin: new Int16Array(n), nu: new Float64Array(n) };
  for (let h = 0; h < n; h++) {
    const u = s.u[h], v = s.v[h], T = s.T[h], rho = s.rho[h], z = s.z[h];
    if (!(Number.isFinite(u) && Number.isFinite(v) && T > 0 && rho > 0 && z > 0)) continue;
    const nu = viscosity(T) / rho;
    const f = frictionVelocity(u, v, z, nu);
    st.nu[h] = nu;
    st.valid[h] = 1; st.nValid++;
    st.ustar[h] = f.ustar; st.ua[h] = f.ua; st.speed[h] = Math.hypot(u, v); st.bin[h] = dirBin(f.ua);
  }
  STATE.set(s.u, st);
  return st;
}

export interface HourThresholds { d: number; ut: Float64Array; s: Float64Array; gt: Float64Array; nu: Float64Array; gaSqrtS: Float64Array }
const THR = new WeakMap<Float32Array, Map<number, HourThresholds>>();
/** per-hour threshold quantities for grain diameter dUm (µm), cached per series */
export function hourThresholds(s: MarsSeries, dUm: number): HourThresholds {
  let m = THR.get(s.u);
  if (!m) THR.set(s.u, (m = new Map()));
  const hit = m.get(dUm);
  if (hit) return hit;
  const st = hourState(s), n = st.n, d = dUm * 1e-6;
  const out: HourThresholds = { d, ut: new Float64Array(n).fill(NaN), s: new Float64Array(n), gt: new Float64Array(n), nu: new Float64Array(n), gaSqrtS: new Float64Array(n).fill(NaN) };
  for (let h = 0; h < n; h++) {
    if (!st.valid[h]) continue;
    const t = threshold(d, s.rho[h], s.T[h]);
    out.ut[h] = t.ut; out.s[h] = t.s; out.gt[h] = t.gt; out.nu[h] = t.nu; out.gaSqrtS[h] = t.gaSqrtS;
  }
  if (m.size > 80) m.delete(m.keys().next().value!);
  m.set(dUm, out);
  return out;
}

export interface MarsRoses {
  /** time-averaged flux per direction bin (m^2/s) */
  rose: Float64Array;
  /** the same split by excess-shear class: classes[c][j] (m^2/s); sums over c give `rose` */
  classes: Float64Array[];
  /** hours averaged over */
  nHours: number;
}

/** Flat-bed (alpha null) or crest-mode (about alpha, rad) flux rose at grain diameter dUm. */
export function marsFluxRoses(s: MarsSeries, dUm: number, alpha: number | null, edges: number[] = EXCESS_SHEAR_EDGES): MarsRoses {
  const st = hourState(s), th = hourThresholds(s, dUm);
  const nc = edges.length - 1;
  const rose = new Float64Array(N_BINS);
  const classes = Array.from({ length: nc }, () => new Float64Array(N_BINS));
  const k = M.BETA * M.DASPECT;
  for (let h = 0; h < st.n; h++) {
    if (!st.valid[h]) continue;
    const ut = th.ut[h];
    const u = alpha === null ? st.ustar[h] : st.ustar[h] * (1 + k * Math.abs(Math.sin(st.ua[h] - alpha)));
    if (!(u > ut)) continue;
    const q = transportRate(u, ut, th.d, th.s[h], th.gt[h], th.nu[h]);
    const j = st.bin[h];
    rose[j] += q;
    const r = u / ut;
    let c = 0;
    while (c < nc - 1 && r >= edges[c + 1]) c++;
    classes[c][j] += q;
  }
  const N = st.nValid || 1;
  for (let j = 0; j < N_BINS; j++) rose[j] /= N;
  for (const a of classes) for (let j = 0; j < N_BINS; j++) a[j] /= N;
  return { rose, classes, nHours: st.nValid };
}

/** Speed classes of the Mars wind rose (lowest-level wind, m/s); the last class is open-ended. */
export const MARS_SPEED_EDGES = [0, 2.5, 5, 7.5, 10, 15, Infinity];
export const speedClassLabels = (edges = MARS_SPEED_EDGES) => edges.slice(0, -1).map((e, k) => (Number.isFinite(edges[k + 1]) ? `${e}–${edges[k + 1]}` : `> ${e}`));

/** Wind rose from the hourly series: direction the wind blows FROM (sector of the hour's direction
 *  bin, as the Earth rose of the histogram), stacked by speed class, % of valid hours. */
export function marsWindRose(s: MarsSeries, sectors = 16, speedEdges = MARS_SPEED_EDGES): WindRose {
  const st = hourState(s);
  const nc = speedEdges.length - 1;
  const freq = Array.from({ length: sectors }, () => new Array<number>(nc).fill(0));
  const ua = DEFAULT_BINS.uaCentres;
  const sec = towardBearings(ua).map((b) => sectorOf(towardToFrom(b), sectors, ua));
  for (let h = 0; h < st.n; h++) {
    if (!st.valid[h]) continue;
    const sp = st.speed[h];
    let c = 0;
    while (c < nc - 1 && sp >= speedEdges[c + 1]) c++;
    freq[sec[st.bin[h]]][c] += 1;
  }
  const total = st.nValid;
  if (total > 0) for (const row of freq) for (let c = 0; c < nc; c++) row[c] = (100 * row[c]) / total;
  return { sectors, speedEdges, freq, totalHours: total };
}

const quantile = (a: number[], q: number) => { if (!a.length) return NaN; const x = (a.length - 1) * q, i = Math.floor(x), f = x - i; return i + 1 < a.length ? a[i] * (1 - f) + a[i + 1] * f : a[i]; };

export interface ThresholdStats {
  /** u*,th over the valid hours: median and 5th / 95th percentiles (m/s) */
  utMedian: number; utP05: number; utP95: number;
  /** lowest-level wind speed (m/s) at the threshold: median over the hours of u*,th u+(z u*,th / nu) (eq. 2.2 profile) */
  windAtMedian: number;
  /** fraction of valid hours with u* > u*,th (flat bed) */
  fracAbove: number;
  /** fraction of valid hours where eq. 3.2 is outside its validity (Ga sqrt(s) <= 81) */
  fracInvalid: number;
  /** air density and temperature over the valid hours: medians */
  rhoMedian: number; TMedian: number;
  /** lowest-level height z (m): median and range over the valid hours */
  zMedian: number; zMin: number; zMax: number;
}

export function thresholdStats(s: MarsSeries, dUm: number): ThresholdStats {
  const st = hourState(s), th = hourThresholds(s, dUm);
  const ut: number[] = [], rho: number[] = [], T: number[] = [], uth: number[] = [], z: number[] = [];
  let above = 0, bad = 0;
  for (let h = 0; h < st.n; h++) {
    if (!st.valid[h]) continue;
    ut.push(th.ut[h]); rho.push(s.rho[h]); T.push(s.T[h]); z.push(s.z[h]);
    uth.push(th.ut[h] * uPlus((s.z[h] * th.ut[h]) / st.nu[h]));
    if (st.ustar[h] > th.ut[h]) above++;
    if (!(th.gaSqrtS[h] > M.GA_SQRT_S_MIN)) bad++;
  }
  const num = (a: number, b: number) => a - b;
  ut.sort(num); rho.sort(num); T.sort(num); uth.sort(num); z.sort(num);
  const N = st.nValid || 1;
  const med = quantile(ut, 0.5);
  return { utMedian: med, utP05: quantile(ut, 0.05), utP95: quantile(ut, 0.95), windAtMedian: quantile(uth, 0.5), zMedian: quantile(z, 0.5), zMin: z.length ? z[0] : NaN, zMax: z.length ? z[z.length - 1] : NaN, fracAbove: above / N, fracInvalid: bad / N, rhoMedian: quantile(rho, 0.5), TMedian: quantile(T, 0.5) };
}
