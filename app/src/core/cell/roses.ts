// Wind rose and flux rose: data aggregation (pure) and plain-SVG rendering (string output, no DOM),
// so they can be unit-tested in node and dropped into the panel with innerHTML.
import { C } from "../util/constants";
import { bearingToXY, mathToBearingDeg, mod, towardToFrom } from "../util/angles";
import { escapeHtml } from "../util/format";
import { DARK_THEME, plotLabel, type PlotTheme } from "./plottheme";

/** Speed-class edges (m/s) aligned to the 0.15625 m/s histogram bins (16 bins = 2.5 m/s). */
export const DEFAULT_SPEED_EDGES = [0, 2.5, 5, 7.5, 10, 12.5, 20];
/** slow -> fast; readable on the dark panel background */
export const SPEED_COLORS = ["#24496b", "#2e78a8", "#3aa6c4", "#6fcfb0", "#c3e57e", "#fde74c"];

/** Allowed numbers of rose sectors for nUa source direction bins: divisors of nUa (>= 8), so
 *  every sector aggregates exactly nUa/n whole bins. For ERA5-Land (128): 8, 16, 32, 64, 128. */
export function roseBinChoices(nUa = C.UA_CENTRES.length): number[] {
  const out: number[] = [];
  for (let n = 8; n <= nUa; n++) if (nUa % n === 0) out.push(n);
  return out.length ? out : [nUa];
}
export const ROSE_BIN_CHOICES = roseBinChoices();

const bearingsCache = new WeakMap<object, number[]>();
/** Direction-bin -> bearing (deg) the wind blows TOWARD, from the bin centres (ua, math convention). */
export function towardBearings(uaCentres: ArrayLike<number> = C.UA_CENTRES): number[] {
  const key = uaCentres as unknown as object;
  let b = bearingsCache.get(key);
  if (!b) bearingsCache.set(key, (b = Array.from(uaCentres, mathToBearingDeg)));
  return b;
}
export const BIN_TOWARD_BEARING = towardBearings();

/** Do the source bin EDGES fall on N (true for ERA5-Land, edges at -pi..pi), or the centres? */
function edgesAtNorth(uaCentres: ArrayLike<number>): boolean {
  const w = 360 / uaCentres.length;
  const phase = mod(towardBearings(uaCentres)[0], w);
  return Math.abs(phase - w / 2) < w / 4;
}

/** Can n sectors be centred on N with whole source bins? (n <= 64 for ERA5-Land; with one bin
 *  per sector, n = 128, the source edges fall on N so sectors start at N instead.) */
export function sectorsCentred(n: number, uaCentres: ArrayLike<number> = C.UA_CENTRES): boolean {
  const m = uaCentres.length / n;
  return edgesAtNorth(uaCentres) ? m % 2 === 0 : m % 2 === 1;
}

/** Compass bearing of the centre of sector s of n. */
export function sectorCentre(s: number, n: number, uaCentres: ArrayLike<number> = C.UA_CENTRES): number {
  const w = 360 / n;
  return sectorsCentred(n, uaCentres) ? s * w : (s + 0.5) * w;
}

/** Sector index of a compass bearing for n equal sectors (see sectorsCentred). */
export function sectorOf(bearingDeg: number, n: number, uaCentres: ArrayLike<number> = C.UA_CENTRES): number {
  const w = 360 / n;
  const off = sectorsCentred(n, uaCentres) ? w / 2 : 0;
  return Math.floor(mod(bearingDeg + off, 360) / w) % n;
}

export interface WindRose {
  sectors: number;
  speedEdges: number[];
  /** freq[s][c]: % of all counted hours from sector s in speed class c */
  freq: number[][];
  totalHours: number;
}

/** Wind rose: direction the wind blows FROM (meteorological), stacked speed classes, % of hours
 *  (normalised by the histogram sum). */
export function windRoseData(hist: ArrayLike<number>, sectors = 16, speedEdges = DEFAULT_SPEED_EDGES, bins: { umCentres: ArrayLike<number>; uaCentres: ArrayLike<number> } = { umCentres: C.UM_CENTRES, uaCentres: C.UA_CENTRES }): WindRose {
  const nc = speedEdges.length - 1;
  const nUm = bins.umCentres.length, nUa = bins.uaCentres.length;
  const freq = Array.from({ length: sectors }, () => new Array<number>(nc).fill(0));
  const cls = Array.from(bins.umCentres, (u) => {
    for (let c = 0; c < nc; c++) if (u >= speedEdges[c] && u < speedEdges[c + 1]) return c;
    return u >= speedEdges[nc] ? -1 : 0;
  });
  const sec = towardBearings(bins.uaCentres).map((b) => sectorOf(towardToFrom(b), sectors, bins.uaCentres));
  let total = 0;
  for (let i = 0; i < nUm; i++) {
    const c = cls[i];
    for (let j = 0; j < nUa; j++) {
      const h = hist[i * nUa + j];
      total += h;
      if (c >= 0 && h) freq[sec[j]][c] += h;
    }
  }
  if (total > 0) for (const row of freq) for (let c = 0; c < nc; c++) row[c] = (100 * row[c]) / total;
  return { sectors, speedEdges, freq, totalHours: total };
}

/** Aggregate per-direction-bin values into n sectors by the bearing transport goes TOWARD. */
export function sectorSums(perBin: ArrayLike<number>, sectors = 32, uaCentres: ArrayLike<number> = C.UA_CENTRES): number[] {
  const out = new Array<number>(sectors).fill(0);
  const tb = towardBearings(uaCentres);
  for (let j = 0; j < tb.length; j++) {
    const v = perBin[j];
    if (Number.isFinite(v)) out[sectorOf(tb[j], sectors, uaCentres)] += v;
  }
  return out;
}

/** 'Nice' ring values; the last one is >= vmax. */
export function niceTicks(vmax: number, n = 4): number[] {
  if (!(vmax > 0) || !Number.isFinite(vmax)) return [];
  const raw = vmax / n;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
  const ticks: number[] = [];
  // last ring at or beyond vmax so the longest petal stays inside the outer ring
  for (let v = step; ticks.length === 0 || ticks[ticks.length - 1] < vmax * 0.9999; v += step) ticks.push(Number(v.toPrecision(6)));
  return ticks;
}

export interface RoseArrow {
  bearing: number; // deg, direction the arrow points (toward)
  color: string;
  label: string;
  axis?: boolean; // draw a line through the centre with both ends (unsigned axis)
  dash?: string;
  length?: number; // fraction of the outer radius (default 0.98)
}

export interface RoseSvgOptions {
  /** stacked petals: values[s][k]; single series -> values[s] = [v] */
  values: number[][];
  colors: string[];
  title: string;
  /** accessible description */
  desc: string;
  ringFormat: (v: number) => string;
  arrows?: RoseArrow[];
  size?: number;
  centreText?: string;
  /** max radius value (defaults to max stacked total) */
  vmax?: number;
  /** unique prefix for element ids (title/desc) when several roses share a page */
  id?: string;
  /** radial-axis label drawn next to the ring labels, e.g. "% of hours" */
  axisLabel?: string;
  /** source direction-bin centres (decides whether sectors are centred on N) */
  uaCentres?: ArrayLike<number>;
  /** colours of grid / labels (default: the dark on-screen theme) */
  theme?: PlotTheme;
  /** rotation of the petals only (deg; 180 draws a toward rose as a from rose); arrows are not turned */
  petalOffset?: number;
}

const f2 = (v: number) => (Math.round(v * 100) / 100).toString();

function wedge(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const [x0o, y0o] = bearingToXY(a0, r1), [x1o, y1o] = bearingToXY(a1, r1);
  const [x0i, y0i] = bearingToXY(a0, r0), [x1i, y1i] = bearingToXY(a1, r0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${f2(cx + x0i)},${f2(cy + y0i)}L${f2(cx + x0o)},${f2(cy + y0o)}A${f2(r1)},${f2(r1)} 0 ${large} 1 ${f2(cx + x1o)},${f2(cy + y1o)}L${f2(cx + x1i)},${f2(cy + y1i)}` +
    (r0 > 0 ? `A${f2(r0)},${f2(r0)} 0 ${large} 0 ${f2(cx + x0i)},${f2(cy + y0i)}Z` : "Z");
}

/** Render a (stacked) rose as an SVG string. Bearings are compass, N up, clockwise. */
export function roseSvg(o: RoseSvgOptions): string {
  const size = o.size ?? 260;
  const T0 = o.theme ?? DARK_THEME;
  const pad = Math.max(22, 2 * T0.fs.compass);
  const R = size / 2 - pad;
  const cx = size / 2, cy = size / 2;
  const n = o.values.length;
  const w = 360 / n;
  const totals = o.values.map((row) => row.reduce((a, b) => a + b, 0));
  const vmax = o.vmax ?? Math.max(0, ...totals);
  const ticks = niceTicks(vmax, 3);
  const top = ticks.length ? Math.max(vmax, ticks[ticks.length - 1]) : 1;
  const scale = (v: number) => (R * v) / top;
  const parts: string[] = [];
  const id = o.id ?? "rose";
  const T = T0;
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-labelledby="${id}-t ${id}-d" class="rose">`);
  parts.push(`<title id="${id}-t">${escapeHtml(o.title)}</title><desc id="${id}-d">${escapeHtml(o.desc)}</desc>`);
  parts.push(`<g class="rose-grid" fill="none" stroke="${T.grid}" stroke-width="${f2(0.6 * T.lw)}">`);
  for (const t of ticks) parts.push(`<circle cx="${cx}" cy="${cy}" r="${f2(scale(t))}"/>`);
  for (let b = 0; b < 360; b += 45) {
    const [x, y] = bearingToXY(b, R);
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${f2(cx + x)}" y2="${f2(cy + y)}" stroke-dasharray="${b % 90 ? "2 3" : ""}"/>`);
  }
  parts.push(`</g>`);
  // sectors touch (full 360/n each, no gaps); a hairline stroke in the fill colour hides seams
  parts.push(`<g class="rose-petals" stroke-width="0.35" stroke-linejoin="round">`);
  for (let s = 0; s < n; s++) {
    const c = sectorCentre(s, n, o.uaCentres) + (o.petalOffset ?? 0);
    const a0 = c - w / 2, a1 = c + w / 2;
    let acc = 0;
    o.values[s].forEach((v, k) => {
      if (!(v > 0)) return;
      const r0 = scale(acc), r1 = scale(acc + v);
      acc += v;
      const col = o.colors[k % o.colors.length];
      parts.push(`<path d="${wedge(cx, cy, r0, r1, a0, a1)}" fill="${col}" stroke="${col}"/>`);
    });
  }
  parts.push(`</g>`);
  for (const a of o.arrows ?? []) {
    if (!Number.isFinite(a.bearing)) continue;
    const L = R * (a.length ?? 0.98);
    const [x, y] = bearingToXY(a.bearing, L);
    const [hx1, hy1] = bearingToXY(a.bearing + 155, 9), [hx2, hy2] = bearingToXY(a.bearing - 155, 9);
    const x0 = a.axis ? cx - x : cx, y0 = a.axis ? cy - y : cy;
    parts.push(`<g class="rose-arrow" stroke="${a.color}" fill="${a.color}" stroke-width="2"><title>${escapeHtml(a.label)}</title>`);
    parts.push(`<line x1="${f2(x0)}" y1="${f2(y0)}" x2="${f2(cx + x)}" y2="${f2(cy + y)}"${a.dash ? ` stroke-dasharray="${a.dash}"` : ""}/>`);
    const head = (ex: number, ey: number, b1: [number, number], b2: [number, number]) =>
      `<path stroke="none" d="M${f2(ex)},${f2(ey)}L${f2(ex + b1[0])},${f2(ey + b1[1])}L${f2(ex + b2[0])},${f2(ey + b2[1])}Z"/>`;
    if (!a.axis) parts.push(head(cx + x, cy + y, [hx1, hy1], [hx2, hy2]));
    else {
      parts.push(`<circle cx="${f2(cx + x)}" cy="${f2(cy + y)}" r="2.5"/><circle cx="${f2(cx - x)}" cy="${f2(cy - y)}" r="2.5"/>`);
    }
    parts.push(`</g>`);
  }
  parts.push(`<g class="rose-labels" font-size="${T.fs.compass}" fill="${T.text}" text-anchor="middle">`);
  for (const [lab, b] of [["N", 0], ["E", 90], ["S", 180], ["W", 270]] as const) {
    const [x, y] = bearingToXY(b, R + 0.95 * T.fs.compass);
    parts.push(`<text x="${f2(cx + x)}" y="${f2(cy + y + 0.36 * T.fs.compass)}">${lab}</text>`);
  }
  for (const t of ticks) {
    const [x, y] = bearingToXY(157.5, scale(t));
    // plain text (no halo), just outside the ring towards SSE
    const lab = escapeHtml(o.ringFormat(t));
    parts.push(`<text class="ring" font-size="${T.fs.ring}" x="${f2(cx + x + 0.25 * T.fs.ring)}" y="${f2(cy + y + 0.35 * T.fs.ring)}" text-anchor="start" fill="${T.ring}">${lab}</text>`);
  }
  if (o.axisLabel) parts.push(plotLabel(T, o.axisLabel, size - 4, size - 5, T.fs.axis, { anchor: "end", fill: T.label, cls: "axis-label" }));
  if (o.centreText) parts.push(plotLabel(T, o.centreText, cx, cy + 0.35 * T.fs.axis, T.fs.axis, { anchor: "middle" }));
  parts.push(`</g></svg>`);
  return parts.join("");
}
