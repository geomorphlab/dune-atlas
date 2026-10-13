// Arrows and evenly spaced streamlines for directional fields (bearing, toward; or unsigned
// axes such as alpha_H). Pure geometry, tested in node; the map adapter supplies the projection.
//
// Streamlines (Jobard & Lefer 1997) are traced in SCREEN space on a unit-vector field:
//  * geo data are sampled as unit vectors, never raw angles: directions -> bilinear (sin, cos) of
//    the bearing, renormalised; axes -> doubled-angle vectors (sin 2θ, cos 2θ), θ = atan2/2;
//  * the screen field is built on a node grid (every few px) by mapping the geographic unit
//    vector through the local Jacobian of the projection (finite differences of node lon/lat);
//  * RK4 integration with a 1-2 px step, forward and backward from each seed; stop on leaving the
//    viewport / globe, no data or a weak (divergent) field, coming within dtest of another line
//    (spatial hash; the line's own recent points are ignored), or the maximum length;
//  * new seeds at +-dsep along the normal of accepted lines, then a grid fallback;
//  * lines shorter than 2 dsep are discarded. Direction fields never flip sign (vector field);
//    axial fields choose the sign that continues the previous step (dot >= 0).
import type { Feature, LineString, MultiLineString } from "geojson";

export interface Grid {
  data: Float32Array | Float64Array;
  nx: number;
  ny: number;
  /** centre of column 0 / row 0 and spacing (dlat < 0 for north-up rows) */
  lon0: number;
  lat0: number;
  dlon: number;
  dlat: number;
}

const D2R = Math.PI / 180;
const cosLat = (lat: number) => Math.max(0.05, Math.cos(lat * D2R));
const isGlobalGrid = (g: Grid) => Math.abs(Math.abs(g.dlon) * g.nx - 360) < 1e-6;

function colIndex(g: Grid, lon: number): number {
  let fx = (lon - g.lon0) / g.dlon;
  if (isGlobalGrid(g)) fx = ((fx % g.nx) + g.nx) % g.nx;
  else if (fx < -0.5 || fx > g.nx - 0.5) {
    // a window across the antimeridian has continuous longitudes beyond ±180: try lon ± 360
    for (const sh of [360, -360]) {
      const f2 = (lon + sh - g.lon0) / g.dlon;
      if (f2 >= -0.5 && f2 <= g.nx - 0.5) return f2;
    }
  }
  return fx;
}

export function sampleNearest(g: Grid, lon: number, lat: number): number {
  let i = Math.round(colIndex(g, lon));
  if (isGlobalGrid(g)) i %= g.nx;
  const j = Math.round((lat - g.lat0) / g.dlat);
  if (i < 0 || j < 0 || i >= g.nx || j >= g.ny) return NaN;
  return g.data[j * g.nx + i];
}

/** Direction-validity mask: NaN (no data) in `dir` wherever the mask field, sampled at the cell
 *  centre (nearest), is not > 0 and finite. In place; returns `dir`. NaN cells produce no
 *  arrows and stop / never seed streamlines. */
export function applyMask(dir: Grid, mask: Grid | null): Grid {
  const same = !!mask && mask.nx === dir.nx && mask.ny === dir.ny && Math.abs(mask.lon0 - dir.lon0) < 1e-9 && Math.abs(mask.lat0 - dir.lat0) < 1e-9 && Math.abs(mask.dlon - dir.dlon) < 1e-12 && Math.abs(mask.dlat - dir.dlat) < 1e-12;
  for (let j = 0; j < dir.ny; j++) for (let i = 0; i < dir.nx; i++) {
    const k = j * dir.nx + i;
    const m = !mask ? NaN : same ? mask.data[k] : sampleNearest(mask, dir.lon0 + i * dir.dlon, dir.lat0 + j * dir.dlat);
    if (!(m > 0 && Number.isFinite(m))) dir.data[k] = NaN;
  }
  return dir;
}

/** Bilinear unit-vector interpolation of a bearing field (deg): directions as (sin b, cos b),
 *  axes as doubled angles. Returns the bearing in [0, 360) (axes: either end), or NaN. Wraps
 *  across the antimeridian for global grids. */
export function sampleBearing(g: Grid, lon: number, lat: number, axis: boolean): number {
  const v = sampleUnit(g, lon, lat, axis);
  if (!v) return NaN;
  const out = Math.atan2(v[0], v[1]) / D2R;
  return ((out % 360) + 360) % 360;
}

/** Geographic unit vector (east, north) at (lon, lat); for axes one of the two ends. Null where
 *  any corner is missing or the interpolated vector is weak (|v| < minMag: divergent field). */
export function sampleUnit(g: Grid, lon: number, lat: number, axis: boolean, minMag = 0.2): [number, number] | null {
  const fx = colIndex(g, lon), fy = (lat - g.lat0) / g.dlat;
  const glob = isGlobalGrid(g);
  const i0 = Math.floor(fx), j0 = Math.floor(fy);
  if (j0 < 0 || j0 + 1 >= g.ny || (!glob && (i0 < 0 || i0 + 1 >= g.nx))) {
    const b = sampleNearest(g, lon, lat);
    return Number.isFinite(b) ? [Math.sin(b * D2R), Math.cos(b * D2R)] : null;
  }
  const i1 = glob ? (i0 + 1) % g.nx : i0 + 1;
  const tx = fx - i0, ty = fy - j0;
  const k = axis ? 2 : 1;
  let sx = 0, sy = 0;
  const corners: [number, number, number][] = [[i0, j0, (1 - tx) * (1 - ty)], [i1, j0, tx * (1 - ty)], [i0, j0 + 1, (1 - tx) * ty], [i1, j0 + 1, tx * ty]];
  for (const [i, j, w] of corners) {
    const b = g.data[j * g.nx + i];
    if (!Number.isFinite(b)) return null;
    sx += w * Math.sin(k * b * D2R);
    sy += w * Math.cos(k * b * D2R);
  }
  const m = Math.hypot(sx, sy);
  if (m < minMag) return null;
  if (!axis) return [sx / m, sy / m];
  const t = Math.atan2(sx, sy) / 2; // bearing of one end
  return [Math.sin(t), Math.cos(t)];
}

/** Point at great-circle distance `dist` (degrees of arc) along a compass bearing (spherical
 *  destination; exact near the poles). The longitude is continuous with `lon` (not wrapped to
 *  ±180), so a segment from (lon, lat) to the result is the short way round. */
export function offset(lon: number, lat: number, bearing: number, dist: number): [number, number] {
  const b = bearing * D2R, d = dist * D2R, p1 = lat * D2R;
  const sp2 = Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b);
  const p2 = Math.asin(Math.max(-1, Math.min(1, sp2)));
  const dl = Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * sp2);
  return [lon + dl / D2R, p2 / D2R];
}

/** Great-circle distance between two lon/lat points (degrees of arc). */
export function gcDeg(a: [number, number], b: [number, number]): number {
  const p1 = a[1] * D2R, p2 = b[1] * D2R, dp = p2 - p1, dl = (b[0] - a[0]) * D2R;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / D2R;
}

const wrap180 = (d: number) => d - 360 * Math.round(d / 360);

/** Make a lon/lat polyline safe to draw on the globe and in Mercator: longitudes are unwrapped
 *  along the line (each step the short way round), the line is split where it crosses the
 *  antimeridian - the pieces meet at an interpolated vertex at +180 / -180, so the line stays
 *  visually continuous - and wherever a step is longer than `maxSegDeg` (great circle; a
 *  discontinuity, e.g. a vertex off the globe) or a vertex is not finite. Every piece has >= 2
 *  vertices with longitudes in [-180, 180]; no segment spans the antimeridian. */
export function geoPolylines(pts: ArrayLike<[number, number]>, maxSegDeg = 2): [number, number][][] {
  const out: [number, number][][] = [];
  let cur: [number, number][] = [];
  const flush = () => { if (cur.length >= 2) out.push(cur); cur = []; };
  for (let k = 0; k < pts.length; k++) {
    const [lo, la] = pts[k];
    if (!Number.isFinite(lo) || !Number.isFinite(la)) { flush(); continue; }
    if (!cur.length) { cur.push([wrap180(lo), la]); continue; }
    const [pl, pa] = cur[cur.length - 1];
    let u = pl + wrap180(lo - pl);
    if (gcDeg([pl, pa], [u, la]) > maxSegDeg) { flush(); cur.push([wrap180(lo), la]); continue; }
    if (u > 180 || u < -180) {
      const e = u > 180 ? 180 : -180;
      const t = (e - pl) / (u - pl), le = pa + t * (la - pa);
      if (pl !== e) cur.push([e, le]);
      flush();
      cur.push([-e, le]);
      u -= 2 * e;
    }
    cur.push([u, la]);
  }
  flush();
  return out;
}

export interface ArrowSeed { lon: number; lat: number; /** arrow length in degrees of latitude */ len: number }

/** Arrow (or headless axis segment) features centred on each seed. `mag` scales length/opacity. */
export function arrowFeatures(seeds: ArrowSeed[], dir: Grid, opts: { axis: boolean; mag?: Grid | null }): Feature<MultiLineString>[] {
  const vals: { s: ArrowSeed; b: number; m: number }[] = [];
  for (const s of seeds) {
    const b = sampleNearest(dir, s.lon, s.lat);
    if (!Number.isFinite(b)) continue;
    const m = opts.mag ? sampleNearest(opts.mag, s.lon, s.lat) : NaN;
    vals.push({ s, b, m });
  }
  let ref = NaN;
  if (opts.mag) {
    const ms = vals.map((v) => Math.abs(v.m)).filter(Number.isFinite).sort((a, b) => a - b);
    ref = ms.length ? ms[Math.floor(0.95 * (ms.length - 1))] : NaN;
  }
  return vals.map(({ s, b, m }) => {
    const f = Number.isFinite(ref) && ref > 0 && Number.isFinite(m) ? Math.min(1, Math.abs(m) / ref) : 1;
    const L = s.len * (opts.mag ? 0.35 + 0.65 * f : 1);
    const tail = offset(s.lon, s.lat, b + 180, L / 2), tip = offset(s.lon, s.lat, b, L / 2);
    const parts: [number, number][][] = [[tail, tip]];
    if (!opts.axis) parts.push([offset(tip[0], tip[1], b + 150, L * 0.3), tip, offset(tip[0], tip[1], b - 150, L * 0.3)]);
    const coords = parts.flatMap((pp) => geoPolylines(pp, Math.max(2, 2 * L)));
    return { type: "Feature", properties: { a: opts.mag ? 0.35 + 0.65 * f : 1, b: Math.round(b) }, geometry: { type: "MultiLineString", coordinates: coords } };
  });
}

// ---------------------------------------------------------------------------------------------
// Screen-space field
// ---------------------------------------------------------------------------------------------

export interface ScreenField {
  nx: number;
  ny: number;
  /** node spacing (px); node (i, j) is at (i * cell, j * cell) */
  cell: number;
  /** directions: screen unit vector (vx, vy) per node; axes: (cos 2φ, sin 2φ) of the screen angle */
  vx: Float32Array;
  vy: Float32Array;
  axis: boolean;
}

/** Build the screen field from the lon/lat of each node (NaN = off the globe / no projection).
 *  `geoUnit(lon, lat)` returns the geographic unit vector (east, north) or null. The screen
 *  direction is J (d lon, d lat) with the Jacobian J = d(x, y)/d(lon, lat) obtained by inverting
 *  finite differences of the node lon/lat (no extra projection calls). */
export function buildScreenField(lon: Float64Array, lat: Float64Array, nx: number, ny: number, cell: number, axis: boolean, geoUnit: (lon: number, lat: number) => [number, number] | null): ScreenField {
  const vx = new Float32Array(nx * ny).fill(NaN), vy = new Float32Array(nx * ny).fill(NaN);
  const wrap = (d: number) => (d > 180 ? d - 360 : d < -180 ? d + 360 : d);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (!Number.isFinite(lon[k]) || !Number.isFinite(lat[k])) continue;
    const ia = i + 1 < nx ? i + 1 : i - 1, ja = j + 1 < ny ? j + 1 : j - 1;
    const kx = j * nx + ia, ky = ja * nx + i;
    if (!Number.isFinite(lon[kx]) || !Number.isFinite(lon[ky])) continue;
    const sx = ia > i ? 1 : -1, sy = ja > j ? 1 : -1;
    // d(lon, lat) per +1 px in x and y
    const a = (wrap(lon[kx] - lon[k]) * sx) / cell, c = ((lat[kx] - lat[k]) * sx) / cell;
    const b = (wrap(lon[ky] - lon[k]) * sy) / cell, d = ((lat[ky] - lat[k]) * sy) / cell;
    const det = a * d - b * c;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-18) continue;
    const g = geoUnit(lon[k], lat[k]);
    if (!g) continue;
    const dlon = g[0] / cosLat(lat[k]), dlat = g[1];
    // invert [a b; c d] (px -> deg) to map (dlon, dlat) -> (dx, dy)
    let x = (d * dlon - b * dlat) / det, y = (-c * dlon + a * dlat) / det;
    const m = Math.hypot(x, y);
    if (!(m > 0)) continue;
    x /= m; y /= m;
    if (axis) { const p = Math.atan2(y, x); vx[k] = Math.cos(2 * p); vy[k] = Math.sin(2 * p); }
    else { vx[k] = x; vy[k] = y; }
  }
  return { nx, ny, cell, vx, vy, axis };
}

/** Unit screen direction at (x, y) px, or null (no data / weak field). Axes: the end that
 *  continues `prev` (dot >= 0). */
export function sampleScreen(f: ScreenField, x: number, y: number, prev: [number, number] | null, minMag = 0.3): [number, number] | null {
  const fx = x / f.cell, fy = y / f.cell;
  const i0 = Math.floor(fx), j0 = Math.floor(fy);
  if (i0 < 0 || j0 < 0 || i0 + 1 >= f.nx || j0 + 1 >= f.ny) return null;
  const tx = fx - i0, ty = fy - j0;
  let sx = 0, sy = 0;
  for (const [di, dj, w] of [[0, 0, (1 - tx) * (1 - ty)], [1, 0, tx * (1 - ty)], [0, 1, (1 - tx) * ty], [1, 1, tx * ty]] as const) {
    const k = (j0 + dj) * f.nx + i0 + di;
    const a = f.vx[k], b = f.vy[k];
    if (!Number.isFinite(a)) return null;
    sx += w * a; sy += w * b;
  }
  const m = Math.hypot(sx, sy);
  if (m < minMag) return null;
  if (!f.axis) return [sx / m, sy / m];
  const p = Math.atan2(sy, sx) / 2;
  let v: [number, number] = [Math.cos(p), Math.sin(p)];
  if (prev && v[0] * prev[0] + v[1] * prev[1] < 0) v = [-v[0], -v[1]];
  return v;
}

export interface EvenOptions {
  width: number;
  height: number;
  /** separation between lines (px) */
  dsep: number;
  /** stop distance as a fraction of dsep (default 0.5) */
  dtestFrac?: number;
  /** RK4 step (px), default 1.5 */
  step?: number;
  /** maximum length per direction (px) */
  maxLen?: number;
  maxLines?: number;
  budgetMs?: number;
  /** keep one output vertex every `outEvery` px (default 4) */
  outEvery?: number;
}

export interface Streamline {
  /** vertices (px), in the direction of the field */
  pts: [number, number][];
  /** length (px) */
  length: number;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Jobard–Lefer evenly spaced streamlines in screen space. */
export function evenStreamlines(f: ScreenField, o: EvenOptions): Streamline[] {
  const t0 = now();
  const dsep = o.dsep, dtest = dsep * (o.dtestFrac ?? 0.5), h = o.step ?? 1.5;
  const maxLen = o.maxLen ?? 2 * Math.max(o.width, o.height);
  const maxLines = o.maxLines ?? 1000, outEvery = o.outEvery ?? 4;
  const W = Math.min(o.width, (f.nx - 1) * f.cell), H = Math.min(o.height, (f.ny - 1) * f.cell);
  const selfSkip = Math.ceil((2 * dsep) / h); // ignore the line's own last points
  const cs = dsep, hx = Math.ceil(W / cs) + 1;
  const hash = new Map<number, { x: number; y: number; line: number; idx: number }[]>();
  const keyOf = (x: number, y: number) => Math.floor(y / cs) * hx + Math.floor(x / cs);
  const add = (x: number, y: number, line: number, idx: number) => {
    const k = keyOf(x, y);
    let a = hash.get(k);
    if (!a) hash.set(k, (a = []));
    a.push({ x, y, line, idx });
    return k;
  };
  const near = (x: number, y: number, r: number, line: number, idx: number): boolean => {
    const cx = Math.floor(x / cs), cy = Math.floor(y / cs), r2 = r * r;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const a = hash.get((cy + dy) * hx + cx + dx);
      if (!a) continue;
      for (const p of a) {
        if (p.line === line && Math.abs(p.idx - idx) < selfSkip) continue;
        const ex = p.x - x, ey = p.y - y;
        if (ex * ex + ey * ey < r2) return true;
      }
    }
    return false;
  };
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x <= W && y <= H;
  /** RK4 step from (x, y); `dir` = current travel direction (sets the sign: directions follow
   *  the field (sgn = +1) or against it (-1); axes take the end continuing `dir`). */
  const rk4 = (x: number, y: number, dir: [number, number], sgn: number): [number, number, [number, number]] | null => {
    const F = (px: number, py: number, ref: [number, number]): [number, number] | null => {
      if (f.axis) return sampleScreen(f, px, py, ref);
      const v = sampleScreen(f, px, py, null);
      return v ? [sgn * v[0], sgn * v[1]] : null;
    };
    const k1 = F(x, y, dir); if (!k1) return null;
    const k2 = F(x + (h / 2) * k1[0], y + (h / 2) * k1[1], k1); if (!k2) return null;
    const k3 = F(x + (h / 2) * k2[0], y + (h / 2) * k2[1], k2); if (!k3) return null;
    const k4 = F(x + h * k3[0], y + h * k3[1], k3); if (!k4) return null;
    const dx = (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), dy = (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    const m = Math.hypot(dx, dy);
    if (!(m > 0)) return null;
    return [x + dx, y + dy, [dx / m, dy / m]];
  };
  // trace one direction; sgn = +1 forward, -1 backward. Returns points (excluding the seed).
  const trace = (sx: number, sy: number, sgn: 1 | -1, line: number, v0: [number, number], keys: Set<number>): [number, number][] => {
    const pts: [number, number][] = [];
    let x = sx, y = sy, prev: [number, number] = v0, len = 0, idx = 0;
    while (len < maxLen) {
      const r = rk4(x, y, prev, sgn);
      if (!r) break;
      const [nx, ny, dir] = r;
      if (!inside(nx, ny)) break;
      // a turn of > ~45 deg within one 1-2 px step is a field discontinuity (e.g. alpha_T switching
      // sides of the crest): end the line instead of drawing a kink
      if (dir[0] * prev[0] + dir[1] * prev[1] < 0.7) break;
      idx += sgn;
      if (near(nx, ny, dtest, line, idx)) break;
      keys.add(add(nx, ny, line, idx));
      pts.push([nx, ny]);
      len += Math.hypot(nx - x, ny - y);
      x = nx; y = ny; prev = dir;
    }
    return pts;
  };
  const lines: Streamline[] = [];
  const queue: [number, number][] = [];
  // grid fallback seeds, centre-out so the view centre fills first
  const grid: [number, number][] = [];
  for (let y = dsep / 2; y < H; y += dsep) for (let x = dsep / 2; x < W; x += dsep) grid.push([x, y]);
  grid.sort((a, b) => Math.hypot(a[0] - W / 2, a[1] - H / 2) - Math.hypot(b[0] - W / 2, b[1] - H / 2));
  let gi = 0, lineId = 0;
  const tryseed = (x: number, y: number) => {
    if (!inside(x, y) || near(x, y, dsep * 0.99, -1, 0)) return;
    const v0 = sampleScreen(f, x, y, null);
    if (!v0) return;
    const id = lineId++;
    const keys = new Set<number>([add(x, y, id, 0)]);
    const fwd = trace(x, y, 1, id, v0, keys);
    const bwd = trace(x, y, -1, id, [-v0[0], -v0[1]], keys);
    const pts = [...bwd.reverse(), [x, y] as [number, number], ...fwd];
    let length = 0;
    for (let k = 1; k < pts.length; k++) length += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    if (length < 2 * dsep) {
      for (const k of keys) { const keep = (hash.get(k) ?? []).filter((p) => p.line !== id); if (keep.length) hash.set(k, keep); else hash.delete(k); }
      return;
    }
    // decimate output, keep ends
    const out: [number, number][] = [pts[0]];
    let acc = 0;
    for (let k = 1; k < pts.length; k++) {
      acc += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      if (acc >= outEvery || k === pts.length - 1) { out.push(pts[k]); acc = 0; }
    }
    lines.push({ pts: out, length });
    // J-L seeds at +-dsep along the normal, every dsep / 2 along the line
    let s = 0;
    for (let k = 1; k < out.length; k++) {
      const [ax, ay] = out[k - 1], [bx, by] = out[k];
      const sl = Math.hypot(bx - ax, by - ay);
      s += sl;
      if (s < dsep / 2 || sl === 0) continue;
      s = 0;
      const nxv = -(by - ay) / sl, nyv = (bx - ax) / sl;
      queue.push([bx + dsep * nxv, by + dsep * nyv], [bx - dsep * nxv, by - dsep * nyv]);
    }
  };
  while (lines.length < maxLines) {
    if (o.budgetMs && now() - t0 > o.budgetMs) break;
    const s = queue.length ? queue.shift()! : gi < grid.length ? grid[gi++] : null;
    if (!s) break;
    tryseed(s[0], s[1]);
  }
  return lines;
}

/** Arrowheads (screen px) every `spacing` px along each line, pointing along the line. */
export function arrowheadsAlong(lines: Streamline[], spacing: number, size: number): [number, number][][] {
  const heads: [number, number][][] = [];
  for (const l of lines) {
    let s = spacing / 2;
    for (let k = 1; k < l.pts.length; k++) {
      const [ax, ay] = l.pts[k - 1], [bx, by] = l.pts[k];
      const sl = Math.hypot(bx - ax, by - ay);
      s += sl;
      if (s < spacing || sl === 0) continue;
      s = 0;
      const ux = (bx - ax) / sl, uy = (by - ay) / sl;
      const c = Math.cos(150 * D2R), sn = Math.sin(150 * D2R);
      const l1: [number, number] = [bx + size * (ux * c - uy * sn), by + size * (ux * sn + uy * c)];
      const l2: [number, number] = [bx + size * (ux * c + uy * sn), by + size * (-ux * sn + uy * c)];
      heads.push([l1, [bx, by], l2]);
    }
  }
  return heads;
}

export function lineFeatures(lines: [number, number][][]): Feature<LineString>[] {
  return lines.map((c) => ({ type: "Feature", properties: { a: 1 }, geometry: { type: "LineString", coordinates: c } }));
}
