// Streamlines and arrows over the poles in globe view: field sampling on the sphere (3D tangent
// vectors, pole rows used, no NaN at |lat| = 90), the screen field via the 3D Jacobian, even
// streamlines through a pole-centred orthographic view (continuous across the pole, no gap at
// 85-90°, no segment longer than the guard), the read window (not clamped to ±85.05° when a pole
// is visible), and the globe line mesh (finite at the poles, across the antimeridian).
import { describe, expect, it } from "vitest";
import { buildScreenField, ecef, enFrame, evenStreamlines, gcDeg, readWindow, sampleUnit, sampleUnitSphere, splitByScreenGap, type Grid } from "../src/map/vectors";
import { lineMesh, MESH_STRIDE, mercatorXY } from "../src/map/globelines";

const D2R = Math.PI / 180;
/** global grid with pole rows (lat0 = 90, dlat = -res), bearing (deg, toward) per node */
function field(res: number, bearing: (lon: number, lat: number) => number): Grid {
  const nx = Math.round(360 / res), ny = Math.round(180 / res) + 1;
  const data = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) data[j * nx + i] = bearing(-180 + i * res, 90 - j * res);
  return { data, nx, ny, lon0: -180, lat0: 90, dlon: res, dlat: -res };
}
/** flow towards a fixed direction D on the sphere: tangent T = D - (D.P) P */
const D: [number, number, number] = [1, 0, 0];
function crossPolarEN(lon: number, lat: number): [number, number] {
  const P = ecef(lon, lat), [E, N] = enFrame(lon, lat);
  const dp = D[0] * P[0] + D[1] * P[1] + D[2] * P[2];
  const T = [D[0] - dp * P[0], D[1] - dp * P[1], D[2] - dp * P[2]];
  const e = T[0] * E[0] + T[1] * E[1] + T[2] * E[2], n = T[0] * N[0] + T[1] * N[1] + T[2] * N[2], m = Math.hypot(e, n);
  return [e / m, n / m];
}
const crossPolar = (lon: number, lat: number) => { const [e, n] = crossPolarEN(lon, lat); return (Math.atan2(e, n) / D2R + 360) % 360; };
const vortex = () => 90; // due east everywhere: circles around the poles

/** orthographic view centred on the south pole: R px radius, centre (c, c); +x towards lon 0 */
const R = 280, C = 300, W = 600;
const project = (lon: number, lat: number): [number, number] | null => {
  const P = ecef(lon, lat);
  if (P[2] > 0) return null; // far (northern) hemisphere
  return [C + R * P[0], C + R * P[1]];
};
const unproject = (x: number, y: number): [number, number] => {
  const px = (x - C) / R, py = (y - C) / R, r2 = px * px + py * py;
  if (r2 > 1) return [NaN, NaN];
  const pz = -Math.sqrt(1 - r2);
  return [Math.atan2(py, px) / D2R, Math.asin(pz) / D2R];
};
function streamlines(g: Grid, opts: { dsep?: number } = {}) {
  const cell = 6, nx = W / cell + 1, ny = W / cell + 1;
  const lon = new Float64Array(nx * ny), lat = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const [lo, la] = unproject(i * cell, j * cell);
    // keep the cap within 30° of the pole (the view of interest), off-disk nodes NaN
    lon[j * nx + i] = la <= -60 ? lo : NaN; lat[j * nx + i] = la <= -60 ? la : NaN;
  }
  const f = buildScreenField(lon, lat, nx, ny, cell, false, (lo, la) => sampleUnitSphere(g, lo, la, false));
  const dsep = opts.dsep ?? 24;
  const lines = evenStreamlines(f, { width: W, height: W, dsep, maxLines: 400, budgetMs: 5000 });
  return { f, dsep, lines, geo: lines.map((l) => l.pts.map(([x, y]) => unproject(x, y))) };
}

describe("field sampling on the sphere (pole rows, no basis singularity)", () => {
  for (const res of [0.25, 1]) {
    it(`cross-polar flow, ${res}° grid: exact directions at and next to the poles, no NaN at |lat| = 90`, () => {
      const g = field(res, crossPolar);
      for (const lat of [-90, -89.99, -89.9, -89.7, -88, 88, 89.9, 90]) for (const lon of [-180, -123.4, -45, 0, 0.1, 77, 179.9]) {
        const v = sampleUnitSphere(g, lon, lat, false)!;
        expect(v, `${lon},${lat}`).not.toBeNull();
        expect(v.every(Number.isFinite)).toBe(true);
        const [e, n] = crossPolarEN(lon, lat);
        expect(Math.acos(Math.min(1, v[0] * e + v[1] * n)) / D2R, `${lon},${lat}`).toBeLessThan(res * 1.5);
      }
    });
  }
  it("away from the poles both blends agree (same as before)", () => {
    const g = field(0.25, crossPolar);
    for (const [lon, lat] of [[15.2, -24.5], [-100.1, 40.3], [179.9, -10]]) {
      const a = sampleUnitSphere(g, lon, lat, false)!, b = sampleUnit(g, lon, lat, false)!;
      expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(1e-4);
    }
  });
  it("axes (doubled angles) at the pole: no NaN, either end", () => {
    const g = field(1, (lo, la) => crossPolar(lo, la) % 180);
    const v = sampleUnitSphere(g, 10, -90, true)!;
    const [e, n] = crossPolarEN(10, -90);
    expect(Math.abs(v[0] * e + v[1] * n)).toBeGreaterThan(0.999);
  });
});

describe("streamlines through a pole-centred globe view", () => {
  it("screen field via the 3D Jacobian points along the projected flow, also at the pole", () => {
    const { f } = streamlines(field(0.25, crossPolar));
    // at the pole (screen centre) the cross-polar flow projects to +x (towards lon 0)
    const k = (C / 6) * f.nx + C / 6;
    expect(f.vx[k]).toBeCloseTo(1, 3);
    expect(Math.abs(f.vy[k])).toBeLessThan(1e-3);
    // and near the pole: compare with a finite difference of the projection along the flow
    let worst = 0, n = 0;
    for (let j = 30; j <= 70; j += 5) for (let i = 30; i <= 70; i += 5) {
      const kk = j * f.nx + i;
      if (!Number.isFinite(f.vx[kk])) continue;
      const [lo, la] = unproject(i * 6, j * 6);
      const [e, nn] = crossPolarEN(lo, la);
      const p0 = project(lo, la)!, B = Math.atan2(e, nn);
      const lat2 = Math.asin(Math.sin(la * D2R) * Math.cos(1e-4) + Math.cos(la * D2R) * Math.sin(1e-4) * Math.cos(B)) / D2R;
      const lon2 = lo + Math.atan2(Math.sin(B) * Math.sin(1e-4) * Math.cos(la * D2R), Math.cos(1e-4) - Math.sin(la * D2R) * Math.sin(lat2 * D2R)) / D2R;
      const p1 = project(lon2, lat2)!, d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const cos = (f.vx[kk] * (p1[0] - p0[0]) + f.vy[kk] * (p1[1] - p0[1])) / d;
      worst = Math.max(worst, Math.acos(Math.min(1, cos)) / D2R); n++;
    }
    expect(n).toBeGreaterThan(50);
    expect(worst).toBeLessThan(1);
  });
  it("cross-polar flow: lines run straight over the pole (no gap within 85-90°), no NaN, no long segment", () => {
    const { lines, geo, dsep } = streamlines(field(0.25, crossPolar));
    expect(lines.length).toBeGreaterThan(8); // a 280 px wide cap (lat <= -60) at 24 px spacing
    for (const l of geo) for (const p of l) expect(p.every(Number.isFinite)).toBe(true);
    // the line through the pole: comes within 0.3° of it and continues on both sides beyond 85°
    const nearest = geo.reduce((b, l) => (Math.max(...l.map((p) => -p[1])) > Math.max(...b.map((p) => -p[1])) ? l : b));
    expect(Math.max(...nearest.map((p) => -p[1]))).toBeGreaterThan(89); // within half a line spacing (~2.4°) of the pole
    expect(Math.min(...nearest.map((p) => -p[1]))).toBeLessThan(85);
    // and it continues on the far side of the pole (does not stop at a circle around it)
    const li = lines[geo.indexOf(nearest)].pts;
    expect(li.some(([x, y]) => x < C - 30 && Math.hypot(x - C, y - C) < 60) && li.some(([x, y]) => x > C + 30 && Math.hypot(x - C, y - C) < 60)).toBe(true);
    for (let k = 1; k < nearest.length; k++) expect(gcDeg(nearest[k - 1], nearest[k])).toBeLessThan(2); // continuous (output vertices every few px; 1° = 4.9 px here)
    // lines cross the polar cap at the normal spacing (24 px = 4.9° here): the 80° cap holds at least 2
    expect(geo.filter((l) => l.some((p) => p[1] < -85)).length).toBeGreaterThanOrEqual(1);
    expect(geo.filter((l) => l.some((p) => p[1] < -80)).length).toBeGreaterThanOrEqual(2);
    for (const l of lines) for (let k = 1; k < l.pts.length; k++) expect(Math.hypot(l.pts[k][0] - l.pts[k - 1][0], l.pts[k][1] - l.pts[k - 1][1])).toBeLessThan(4 * dsep);
    expect(lines.every((l) => splitByScreenGap(l.pts, 4 * dsep).length === 1)).toBe(true); // the guard never cuts a real line
  });
  it("polar vortex: closed circles around the pole within 85-90°", () => {
    const { geo } = streamlines(field(0.25, vortex), { dsep: 8 });
    const rings = geo.filter((l) => l.every((p) => p[1] < -85) && new Set(l.map((p) => Math.floor((p[0] + 180) / 45))).size === 8);
    expect(rings.length).toBeGreaterThan(1); // whole circles (all 8 octants of longitude)
    for (const l of rings) { const r = l.map((p) => -p[1]); expect(Math.max(...r) - Math.min(...r)).toBeLessThan(1.2); } // constant latitude
  });
  it("the guard splits a real discontinuity (e.g. a jump across the limb)", () => {
    expect(splitByScreenGap([[0, 0], [1, 0], [2, 0], [500, 0], [501, 0]], 96).map((p) => p.length)).toEqual([3, 2]);
    expect(splitByScreenGap([[0, 0], [1, 0], [NaN, 0], [2, 0], [3, 0]], 96).length).toBe(2);
  });
});

describe("read window (globe): not clamped to ±85.05°", () => {
  it("a visible pole: all longitudes, to ±90", () => {
    expect(readWindow([-70, -80, -84.9, -60], [100, 160], { poleVisible: { north: false, south: true } })).toEqual([-180, -90, 180, -59]);
    expect(readWindow([-70, -88.5], [100, 160])).toEqual([-180, -90, 180, -69]); // within 2° of the pole
    expect(readWindow([62, 89.95], [-10, 30])).toEqual([-180, 61, 180, 90]);
  });
  it("no pole in view: the visible latitudes (+1°), the map's longitudes; across the antimeridian continuous", () => {
    expect(readWindow([-30, -10, NaN], [10, 40])).toEqual([10, -31, 40, -9]);
    expect(readWindow([-30, -10], [170, -170])).toEqual([170, -31, 190, -9]);
    expect(readWindow([NaN], [0, 10])).toEqual([0, -90, 10, 90]);
  });
});

describe("globe line mesh", () => {
  it("finite Mercator positions at the poles (unclamped, exact inverse to the sphere), quads per segment, alpha", () => {
    const [x, y] = mercatorXY(0, -90), [, y2] = mercatorXY(0, -85.0511);
    expect(Number.isFinite(y) && y > 1.5).toBe(true); // beyond the Mercator square: the pole, not 85.05°
    expect(y2).toBeCloseTo(1, 4);
    expect(x).toBe(0.5);
    const m = lineMesh([[[10, -89], [100, -89.99], [-170, -90], [-80, -89]], [[0, 0], [NaN, 1], [1, 1]]], [1, 0.5]);
    expect(m.index.length).toBe(3 * 6); // 3 segments (the NaN breaks the second line)
    expect(m.vertices).toBe(12);
    expect(m.data.every(Number.isFinite)).toBe(true);
    expect(m.data[MESH_STRIDE - 1]).toBe(1);
  });
  it("across the antimeridian: one segment between x ~ 1 and x ~ 0 (the sphere projection makes it short; no split needed)", () => {
    const m = lineMesh([[[179.9, -70], [-179.9, -70.1]]]);
    expect(m.index.length).toBe(6);
    expect(m.data[0]).toBeGreaterThan(0.999);
    expect(m.data[2]).toBeLessThan(0.001);
  });
});
