// Globe alignment of the field raster with vector outlines (at 22° N, 56.7° E the raster cell fell
// short of the dune outline on the right and bottom in globe view). Cause: zarr-layer drew each region as one quad
// split into ~1° steps; on the globe every step is a flat chord below the sphere and the texture varies linearly
// along it, so a cell edge inside a step is drawn where the chord is, not where the sphere (and MapLibre's finely
// subdivided vector line) is. This test measures that offset with a vertical-perspective camera model (MapLibre:
// camera distance 1.5 x viewport height, 512 px tiles) for the library's old mesh and for the patched mesh
// (vertex lines on the cell edges: globeMeshCount, patches/@carbonplan+zarr-layer+0.4.3.patch).
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const R = 6371008.8, D2R = Math.PI / 180;
const lib = fs.readFileSync(path.resolve(__dirname, "../node_modules/@carbonplan/zarr-layer/dist/index.js"), "utf8");
const src = /function globeMeshCount\([\s\S]*?\n}\n/.exec(lib)?.[0];
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const globeMeshCount = new Function("MIN_SUBDIVISIONS", "GLOBE_MAX_STEP_DEG", "GLOBE_MAX_SUBDIVISIONS", `${src}; return globeMeshCount;`)(2, 0.25, 512) as (cells: number, deg: number) => number;

type V = [number, number, number];
const sph = (lon: number, lat: number): V => [R * Math.cos(lat * D2R) * Math.cos(lon * D2R), R * Math.cos(lat * D2R) * Math.sin(lon * D2R), R * Math.sin(lat * D2R)];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** pinhole camera above (lon0, lat0) looking straight down; returns screen px (x east, y south) */
function camera(lon0: number, lat0: number, zoom: number, hPx = 900) {
  const mPerPx = (2 * Math.PI * R * Math.cos(lat0 * D2R)) / (512 * 2 ** zoom), f = 1.5 * hPx, H = f * mPerPx;
  const c = sph(lon0, lat0), up: V = [c[0] / R, c[1] / R, c[2] / R];
  const east: V = [-Math.sin(lon0 * D2R), Math.cos(lon0 * D2R), 0];
  const north: V = [-Math.sin(lat0 * D2R) * Math.cos(lon0 * D2R), -Math.sin(lat0 * D2R) * Math.sin(lon0 * D2R), Math.cos(lat0 * D2R)];
  const eye: V = [c[0] + up[0] * H, c[1] + up[1] * H, c[2] + up[2] * H];
  return (p: V) => { const d = sub(p, eye), depth = -dot(d, up); return [(f * dot(d, east)) / depth, (-f * dot(d, north)) / depth]; };
}
/** screen position of a cell edge (lon or lat line) where the mesh has vertex lines every `step` degrees from `origin` */
function edgeOnMesh(proj: (p: V) => number[], lonE: number, lat: number, step: number, origin: number) {
  const a = origin + Math.floor((lonE - origin) / step + 1e-9) * step, t = (lonE - a) / step;
  return proj(lerp(sph(a, lat), sph(a + step, lat), t));
}
function edgeOnMeshLat(proj: (p: V) => number[], lon: number, latE: number, step: number, origin: number) {
  const a = origin - Math.floor((origin - latE) / step + 1e-9) * step, t = (a - latE) / step;
  return proj(lerp(sph(lon, a), sph(lon, a - step), t));
}

describe("field raster vs vector outline on the globe", () => {
  // ERA5-Land level 0: 1801 x 3600 cells of 0.1°, regions (sharding inner chunks) 361 x 360 cells from (-180.05, 90.05)
  const cell = 0.1, x0 = -180.05, y0 = 90.05, rows = 361, cols = 360;
  const oldStep = (span: number) => span / Math.max(2, Math.min(128, Math.ceil(Math.max(rows * cell, cols * cell))));
  const newStepX = (cols * cell) / globeMeshCount(cols, cell), newStepY = (rows * cell) / globeMeshCount(rows, cell);
  it("patched mesh has a vertex line on every 0.1° cell edge (and steps <= 0.25° for coarser cells)", () => {
    expect(globeMeshCount(360, 0.1)).toBe(360);
    expect(globeMeshCount(361, 0.1)).toBe(361);
    expect(globeMeshCount(225, 0.8)).toBe(450);        // level 3: two steps per 0.8° cell (cap 512)
    expect(globeMeshCount(90, 2)).toBe(450);           // Mars 2° rows: 5 per cell
    expect(newStepX).toBeCloseTo(cell, 12);
  });
  for (const [lat, lon] of [[22.0, 56.7], [0.0, 10.05], [45.0, 30.0], [70.0, 100.0]]) {
    it(`cell at ${lat}° N, ${lon}° E: offset of the right and bottom raster edges from the outline (zoom 10.5-11.9)`, () => {
      // the cell (0.2° wide), the view centre 700 px left of and 400 px above its right/bottom corner
      const right = lon + 0.15, bottom = lat - 0.05;
      let worstOld = 0, worstNew = 0;
      for (const z of [10.5, 11, 11.5, 11.9]) {
        const mPerPx = (2 * Math.PI * R * Math.cos(lat * D2R)) / (512 * 2 ** z);
        const lonC = right - (700 * mPerPx) / (R * Math.cos(lat * D2R)) / D2R, latC = bottom + (400 * mPerPx) / R / D2R;
        const proj = camera(lonC, latC, z);
        const exactX = proj(sph(right, lat))[0], exactY = proj(sph(lon, bottom))[1];
        const oldX = edgeOnMesh(proj, right, lat, oldStep(cols * cell), x0)[0] - exactX;
        const oldY = edgeOnMeshLat(proj, lon, bottom, oldStep(rows * cell), y0)[1] - exactY;
        const newX = edgeOnMesh(proj, right, lat, newStepX, x0)[0] - exactX;
        const newY = edgeOnMeshLat(proj, lon, bottom, newStepY, y0)[1] - exactY;
        worstOld = Math.max(worstOld, Math.abs(oldX), Math.abs(oldY));
        worstNew = Math.max(worstNew, Math.abs(newX), Math.abs(newY));
      }
      expect(worstNew).toBeLessThan(0.1);   // px: edges on vertex lines lie on the sphere
      // the old mesh (measured 2026-10-14): 22° N 5.4 px, 45° N 3.3 px, 70° N 9.1 px (CSS px; x2 on a retina screen)
      if (lat === 22) expect(worstOld).toBeGreaterThan(4);
    });
  }
});
