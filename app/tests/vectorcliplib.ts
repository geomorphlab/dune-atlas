// Shared by tests/vectorclip.test.ts and tests/mars/vectorclip.test.ts (PI round 6): 'Dunes only'
// streamlines integrated on the unmasked field and clipped to the dune cells; arrows anchored at their base.
import { expect } from "vitest";
import * as zarr from "zarrita";
import { applyMask, arrowFeatures, buildScreenField, clipStreamlines, evenStreamlines, gcDeg, sampleNearest, sampleUnitSphere, arrowheadsAlong, type Grid } from "../src/map/vectors";
import { maskGrid, type DuneMask } from "../src/map/dunemask";
import { mathToBearingDeg } from "../src/util/angles";

/** equirectangular "screen" over [w, e] x [s, n] at ppd px per degree: node lon/lat and the inverse */
function screen(w: number, s: number, e: number, n: number, ppd: number, cell = 2) {
  const W = (e - w) * ppd, H = (n - s) * ppd, gx = Math.floor(W / cell) + 1, gy = Math.floor(H / cell) + 1;
  const lon = new Float64Array(gx * gy), lat = new Float64Array(gx * gy);
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) { lon[j * gx + i] = w + (i * cell) / ppd; lat[j * gx + i] = n - (j * cell) / ppd; }
  return { W, H, gx, gy, cell, lon, lat, un: (x: number, y: number): [number, number] => [w + x / ppd, n - y / ppd] };
}
const copy = (g: Grid): Grid => ({ ...g, data: Float32Array.from(g.data) });

/** the adapter's streamline path with the toggle on (clip) and the old masked integration, on one view */
export function checkStreamlineClipping(dir: Grid, m: DuneMask, view: [number, number, number, number], ppd: number, dsep = 12) {
  const sc = screen(...view, ppd);
  const dunes = maskGrid(m, Math.max(1, Math.round(Math.abs(dir.dlon / m.grid.dlon))));
  const inside = (x: number, y: number) => { const [lo, la] = sc.un(x, y); return sampleNearest(dunes, lo, la) > 0; };
  const lines = (g: Grid) => evenStreamlines(buildScreenField(sc.lon, sc.lat, sc.gx, sc.gy, sc.cell, false, (lo, la) => sampleUnitSphere(g, lo, la, false)), { width: sc.W, height: sc.H, dsep, maxLines: 2500 });
  const all = lines(dir);                                     // toggle off: the unmasked integration
  const clipped = clipStreamlines(all, inside, Math.max(6, dsep / 3));
  const masked = lines(applyMask(copy(dir), dunes));          // round 5: integration on the masked field
  // every vertex of every kept piece lies in a dune cell; pieces have the minimum length
  for (const l of clipped) { expect(l.length).toBeGreaterThanOrEqual(Math.max(6, dsep / 3)); for (const p of l.pts) expect(inside(p[0], p[1])).toBe(true); }
  // arrowheads only on kept pieces: their tips are vertices of the pieces (inside the dune cells)
  for (const hd of arrowheadsAlong(clipped, Math.max(60, 3 * dsep), 4.5, true)) expect(inside(hd[1][0], hd[1][1])).toBe(true);
  expect(clipped.length).toBeGreaterThanOrEqual(masked.length);
  // drawn length inside the dune cells: the clipped lines cover at least as much as the masked integration
  const len = (ls: { length: number }[]) => ls.reduce((a, l) => a + l.length, 0);
  expect(len(clipped)).toBeGreaterThanOrEqual(0.95 * len(masked));
  // toggle off: the integration is unchanged (clipping with 'everywhere' returns the same lines)
  expect(clipStreamlines(all, () => true, 0).map((l) => l.pts)).toEqual(all.filter((l) => l.pts.length >= 2).map((l) => l.pts));
  return { all: all.length, clipped: clipped.length, masked: masked.length };
}

/** arrows: tail = seed point, tip one length downwind, at mid latitudes and near the poles (globe region);
 *  with 'Dunes only' (masked field) tails only in dune cells */
export function checkArrowAnchoring(dir: Grid, m: DuneMask | null) {
  const seeds = [];
  for (let la = -89; la <= 89; la += 4) for (let lo = -178; lo <= 178; lo += 6) seeds.push({ lon: lo, lat: la, len: 1.5 });
  const dunes = m ? maskGrid(m, Math.max(1, Math.round(Math.abs(dir.dlon / m.grid.dlon)))) : null;
  const g = dunes ? applyMask(copy(dir), dunes) : dir;
  const bearing = copy(g);
  for (let i = 0; i < bearing.data.length; i++) bearing.data[i] = Number.isFinite(bearing.data[i]) ? mathToBearingDeg(bearing.data[i]) : NaN;
  const f = arrowFeatures(seeds, bearing, { axis: false });
  expect(f.length).toBeGreaterThan(0);
  for (const ft of f) {
    const c = ft.geometry.coordinates as [number, number][][];
    const tail = c[0][0];
    const seed = seeds.find((s) => s.lon === tail[0] && s.lat === tail[1]);
    expect(seed, `tail ${tail}`).toBeDefined();               // the tail IS the sample point (both projections draw these lon/lat)
    if (dunes) expect(sampleNearest(dunes, tail[0], tail[1])).toBeGreaterThan(0);
    // the arrowhead's middle vertex is the tip: one arrow length downwind of the tail (great circle)
    const head = c.find((p) => p.length === 3);
    if (head) expect(gcDeg(tail, head[1])).toBeCloseTo(1.5, 6);
  }
  return f.length;
}

/** a global synthetic direction field (radians, ccw from east) on the mask grid, with a few empty cells */
export function syntheticDir(m: DuneMask): Grid {
  const g = m.grid, data = new Float32Array(g.ny * g.nx);
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) data[j * g.nx + i] = (i * 7 + j * 3) % 97 === 0 ? NaN : 0.3 * Math.sin(i / 9) + 0.2 * Math.cos(j / 7);
  return { data, nx: g.nx, ny: g.ny, lon0: g.lon0, lat0: g.lat0, dlon: g.dlon, dlat: g.dlat };
}
/** a synthetic dune mask on a global grid: patches of 1-4 cells and a few larger fields */
export function syntheticMask(ny: number, nx: number, lat0: number, lon0: number, d: number): DuneMask {
  const data = new Uint8Array(ny * nx);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const big = ((i / 12) | 0) % 5 === 2 && ((j / 8) | 0) % 4 === 1, small = (i * 13 + j * 29) % 41 === 0;
    if (big || small) data[j * nx + i] = 1;
  }
  return { ny, nx, data, grid: { lat0, lon0, dlat: -d, dlon: d, ny, nx }, count: data.reduce((a, b) => a + b, 0) };
}

/** level 0 of a field store at threshold index k as a Grid (radians), on the mask's grid */
export async function readLevel0(store: zarr.AsyncReadable, v: string, k: number, m: DuneMask): Promise<Grid> {
  const a = await zarr.open.v3(zarr.root(store).resolve(`0/${v}`), { kind: "array" });
  const r = (await zarr.get(a, [k, null, null])) as { data: Float32Array };
  // georeferencing from the store (regional fixture subsets differ from the cell grid): spatial:transform
  // [dx, 0, x0, 0, dy, y0] with x0 / y0 the outer cell EDGES; else the mask's grid
  const t = ((await zarr.open.v3(zarr.root(store), { kind: "group" })).attrs as { "spatial:transform"?: number[] })["spatial:transform"];
  const g = m.grid, [ny, nx] = a.shape.slice(-2);
  return t ? { data: Float32Array.from(r.data), nx, ny, lon0: t[2] + t[0] / 2, lat0: t[5] + t[4] / 2, dlon: t[0], dlat: t[4] }
    : { data: Float32Array.from(r.data), nx: g.nx, ny: g.ny, lon0: g.lon0, lat0: g.lat0, dlon: g.dlon, dlat: g.dlat };
}
