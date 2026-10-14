// Raster geometry at the poles and the antimeridian on the globe (render-free).
//
// The library's own region code (patched zarr-layer: getRegionBounds, createRegionGeometry,
// regionToRenderable, getVisibleRegions) builds each region mesh; the vertex shader's direct
// WGS84 -> sphere mapping and the fragment shader's latitude lookup are evaluated here in JS on
// those meshes. On the globe every point of the sphere must be covered by exactly one triangle of
// one region (no fold over the pole, no double cover at ±180), triangles must keep one
// orientation, the covered solid angle must equal the grid's area, and every vertex and texture
// coordinate must be finite and inside its range. Mercator geometry is unchanged.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { cellFeature, cellFromIndex } from "../src/cell/snap";

const LIB = fs.readFileSync(path.resolve(__dirname, "../node_modules/@carbonplan/zarr-layer/dist/index.js"), "utf8");
function method(start: string, end: string): string {
  const i = LIB.indexOf(start);
  expect(i, `library code '${start}' not found (zarr-layer changed?)`).toBeGreaterThan(0);
  const j = LIB.indexOf(end, i);
  expect(j).toBeGreaterThan(i);
  return LIB.slice(i, j).trim();
}
const fnSrc = (name: string) => method(`function ${name}(`, "\nfunction ");

type Bounds = { xMin: number; xMax: number; yMin: number; yMax: number };
type Region = {
  width: number; height: number; vertexArr: Float32Array; pixCoordArr: Float32Array; vertexCount: number;
  mercatorBounds: { x0: number; x1: number; y0: number; y1: number; latMin: number; latMax: number }; latIsAscending: boolean; [k: string]: unknown;
};
type Renderable = { wgs84Bounds?: { lon0: number; lon1: number; lat0: number; lat1: number }; positionSpace?: string; sampleMode?: string; mercatorBounds: Region["mercatorBounds"] };
type Lib = {
  _parseUntiledMultiscale(m: unknown): void; getRegionBounds(rx: number, ry: number, lm?: unknown): Bounds;
  getVisibleRegions(map: unknown): { regionX: number; regionY: number }[];
  createRegionGeometry(rx: number, ry: number, gl: unknown, region: Partial<Region>): void;
  regionToRenderable(region: Region, ecef: boolean): Renderable; [k: string]: unknown;
};

function makeLib(unpatched: "" | "pole" | "seam" = ""): { lib: Lib; computeWorldOffsets(map: unknown, globe: boolean): number[] } {
  const helpers = [
    "var MERCATOR_LAT_LIMIT = 85.05112878; var MIN_SUBDIVISIONS = 2; var MAX_SUBDIVISIONS = 128; var MERCATOR_SUBDIVISIONS = 1; var WEB_MERCATOR_EXTENT = 20037508342789244e-9;",
    method("function createSubdividedQuad(subdivisions) {", "\n// src/"),
    fnSrc("lonToMercatorNorm"), fnSrc("lonToMercatorNormUnclamped"), fnSrc("latToMercatorNorm"), fnSrc("latToWgs84Norm"),
    fnSrc("boundsToMercatorNorm"), fnSrc("geoToArrayIndex"), fnSrc("flipTexCoordV"), method("function computeWorldOffsets(map, isGlobe) {", "// src/render-helpers.ts"),
  ].join("\n");
  const members = [
    method("_parseUntiledMultiscale(metadata) {", "  static clearCache() {"),
    method("levelXYLimits(width, height) {", "  getVisibleRegions(map) {"),
    method("getVisibleRegions(map) {", "  /**\n   * Create a region key"),
    method("getRegionBounds(regionX, regionY, levelMeta) {", "  /**\n   * Create geometry"),
    method("createRegionGeometry(regionX, regionY, gl, region) {", "  /**\n   * Classify a dimension"),
    method("regionToRenderable(region, useDirectEcef = false) {", "  /**\n   * Render all loaded regions"),
  ].join(",\n");
  // unpatched: the library's original mesh bounds (cell edges, beyond ±90 for pole rows)
  // seam: the original per-region subdivision count (from the region's own latitude span)
  const m = unpatched === "pole" ? members.replace("latToWgs84Norm(Math.max(-90, mb.latMin))", "latToWgs84Norm(mb.latMin)").replace("latToWgs84Norm(Math.min(90, mb.latMax))", "latToWgs84Norm(mb.latMax)")
    : unpatched === "seam" ? members.replace(/if \(this\.crs === "EPSG:4326"\) \{\s*\/\/ dune-atlas patch: watertight seams[\s\S]*?\n      \}\n      const subdivisions/, "const subdivisions") : members;
  if (unpatched) expect(m).not.toBe(members);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(`${helpers}\nreturn { lib: { ${m} }, computeWorldOffsets };`)();
}
const GL = { createBuffer: () => ({}), bindBuffer() {}, bufferData() {}, ARRAY_BUFFER: 1, ELEMENT_ARRAY_BUFFER: 2, STATIC_DRAW: 3 };

/** pyramid anchored at the NW cell edge, halving (floor) per level, as the pipeline writes it */
function layout(ny: number, nx: number, d: number, west: number, north: number, n = 4) {
  const out = [];
  for (let k = 0; k < n; k++) { out.push({ asset: String(k), "spatial:transform": [d, 0, west, 0, -d, north], "spatial:shape": [ny, nx] }); ny = Math.floor(ny / 2); nx = Math.floor(nx / 2); d *= 2; }
  return out;
}
const GRIDS = [
  // ERA5 0.25°: rows centred at ±90 (pole-row edges at ±90.125); shards 361 x 1440 (one region per shard)
  { name: "ERA5 0.25°", lay: layout(721, 1440, 0.25, -180.125, 90.125), rs: [361, 1440] },
  // ERA5-Land 0.1°: rows centred at ±90 (edges ±90.05); shards 1444 x 1440
  { name: "ERA5-Land 0.1°", lay: layout(1801, 3600, 0.1, -180.05, 90.05), rs: [1444, 1440] },
  // a smaller region size: many regions meet at the pole and along ±180
  { name: "ERA5 0.25°, 64 px regions", lay: layout(721, 1440, 0.25, -180.125, 90.125, 2), rs: [64, 64] },
];

/** the library's regions of one level, as the GPU sees them (vertex shader + fragment lookup in JS) */
function levelMesh(lay: ReturnType<typeof layout>, k: number, rs: number[], ecef: boolean, unpatched: "" | "pole" | "seam" = "") {
  const { lib } = makeLib(unpatched);
  lib._parseUntiledMultiscale({ layout: lay });
  const levels = lib.untiledLevels as { shape?: number[] }[];
  lay.forEach((e, i) => { levels[i].shape = [64, ...(e["spatial:shape"] as number[])]; });
  const [ny, nx] = lay[k]["spatial:shape"] as number[];
  const t0 = lay[0]["spatial:transform"] as number[], s0 = lay[0]["spatial:shape"] as number[];
  Object.assign(lib, {
    variable: "v", crs: "EPSG:4326", metadata: null, levels, latIsAscending: false, isGlobeProjection: ecef, proj4def: null,
    dimIndices: { lon: { index: 2 }, lat: { index: 1 } }, width: nx, height: ny, regionSize: rs,
    xyLimits: { xMin: t0[2], xMax: t0[2] + s0[1] * t0[0], yMin: t0[5] - s0[0] * t0[0], yMax: t0[5] },
  });
  const tris: { a: number[]; b: number[]; c: number[]; sign: number; uv: number[][]; lat: number[] }[] = [];
  const regions: Renderable[] = [];
  const bad: string[] = [];
  for (let ry = 0; ry < Math.ceil(ny / rs[0]); ry++) for (let rx = 0; rx < Math.ceil(nx / rs[1]); rx++) {
    const region: Partial<Region> = { width: Math.min(rs[1], nx - rx * rs[1]), height: Math.min(rs[0], ny - ry * rs[0]) };
    lib.createRegionGeometry(rx, ry, GL, region);
    const r = lib.regionToRenderable(region as Region, ecef);
    regions.push(r);
    if (!ecef) continue;
    const wb = r.wgs84Bounds!, mb = r.mercatorBounds;
    // renderRegion: scale/shift from wgs84Bounds; VERTEX_WGS84_TO_ECEF: normLon/normLat -> sphere
    const sx = (wb.lon1 - wb.lon0) / 2, shx = (wb.lon0 + wb.lon1) / 2, sy = (wb.lat1 - wb.lat0) / 2, shy = (wb.lat0 + wb.lat1) / 2;
    const V = region.vertexArr!, P = region.pixCoordArr!;
    const pts: { p: number[]; lat: number; uv: number[] }[] = [];
    for (let i = 0; i < V.length; i += 2) {
      const normLon = V[i] * sx + shx, normLat = V[i + 1] * sy + shy;
      const lonRad = (normLon - 0.5) * 2 * Math.PI, latDeg = normLat * 180 - 90, latRad = (latDeg * Math.PI) / 180;
      const p = [Math.sin(lonRad) * Math.cos(latRad), Math.sin(latRad), Math.cos(lonRad) * Math.cos(latRad)];
      // FRAGMENT_SHADER_REPROJECT, u_reproject == 2 (wgs84-lookup), descending rows
      const texV = (mb.latMax - latDeg) / (mb.latMax - mb.latMin);
      if (![...p, latDeg, P[i], texV].every(Number.isFinite)) bad.push(`non-finite vertex ${rx},${ry},${i}`);
      pts.push({ p, lat: latDeg, uv: [P[i], texV] });
    }
    // TRIANGLE_STRIP: triangle k = (k, k+1, k+2), odd k reversed
    for (let t = 0; t + 2 < pts.length; t++) {
      const [i0, i1, i2] = t % 2 === 0 ? [t, t + 1, t + 2] : [t + 1, t, t + 2];
      const a = pts[i0].p, b = pts[i1].p, c = pts[i2].p;
      const cr = cross(sub(b, a), sub(c, a));
      if (norm(cr) < 1e-15) continue; // degenerate (strip joins, pole vertices)
      tris.push({ a, b, c, sign: Math.sign(dot(cr, add(add(a, b), c))), uv: [pts[i0].uv, pts[i1].uv, pts[i2].uv], lat: [pts[i0].lat, pts[i1].lat, pts[i2].lat] });
    }
  }
  return { tris, regions, bad, lib, ny, nx };
}
const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: number[], b: number[]) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: number[]) => Math.hypot(a[0], a[1], a[2]);
const unit = (lon: number, lat: number) => { const L = (lon * Math.PI) / 180, P = (lat * Math.PI) / 180; return [Math.sin(L) * Math.cos(P), Math.sin(P), Math.cos(L) * Math.cos(P)]; };
/** solid angle of the geodesic triangle (Van Oosterom & Strackee) */
function sphArea(a: number[], b: number[], c: number[]) {
  const [A, B, C] = [a, b, c].map((v) => { const n = norm(v); return [v[0] / n, v[1] / n, v[2] / n]; });
  return Math.abs(2 * Math.atan2(dot(A, cross(B, C)), 1 + dot(A, B) + dot(B, C) + dot(C, A)));
}
/** number of triangles whose (geodesic) interior contains p */
function coverCount(tris: ReturnType<typeof levelMesh>["tris"], p: number[]) {
  let n = 0;
  for (const t of tris) {
    if (dot(p, t.a) < 0.99) continue; // far away (> 8°)
    const s = Math.sign(dot(cross(t.a, t.b), t.c));
    if (Math.sign(dot(cross(t.a, t.b), p)) === s && Math.sign(dot(cross(t.b, t.c), p)) === s && Math.sign(dot(cross(t.c, t.a), p)) === s) n++;
  }
  return n;
}
/** deterministic pseudo-random sequence */
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32); }

describe("globe raster geometry: pole and antimeridian (patched zarr-layer)", () => {
  it("patch marker present; the globe path draws one world (no ±360 copies)", () => {
    expect(LIB).toContain("dune-atlas patch: poles - the mesh ends at ±90");
    expect(LIB).toContain("const worldOffsets = useDirectEcef ? [0] : context.worldOffsets;");
    const { computeWorldOffsets } = makeLib();
    const map = { getBounds: () => ({ getWest: () => -190, getEast: () => 190 }), getRenderWorldCopies: () => true };
    expect(computeWorldOffsets(map, true)).toEqual([0]);
    expect(computeWorldOffsets(map, false).length).toBeGreaterThan(1); // Mercator still wraps
    // the shader formulas this test evaluates in JS
    expect(LIB).toContain("float latDeg = normLat * 180.0 - 90.0;");
    expect(LIB).toContain("vec3 ecef = vec3(sin(lonRad) * cosLat, sin(latRad), cos(lonRad) * cosLat);");
    expect(LIB).toContain("texV = (u_latBounds.y - lat) / latRange;");
  });

  for (const { name, lay, rs } of GRIDS) {
    describe(name, () => {
      for (const k of [0, 1, lay.length - 1]) {
        const label = `level ${k}`;
        it(`${label}: vertices finite and within ±90°, texture coordinates within [0, 1], one orientation`, () => {
          const { tris, bad, regions } = levelMesh(lay, k, rs, true);
          expect(bad).toEqual([]);
          expect(tris.length).toBeGreaterThan(100);
          for (const r of regions) expect(r.sampleMode).toBe("wgs84-lookup");
          let latMax = 0, uvMin = Infinity, uvMax = -Infinity;
          for (const t of tris) for (let q = 0; q < 3; q++) {
            latMax = Math.max(latMax, Math.abs(t.lat[q]));
            uvMin = Math.min(uvMin, ...t.uv[q]); uvMax = Math.max(uvMax, ...t.uv[q]);
          }
          expect(latMax).toBeLessThanOrEqual(90 + 1e-9);
          expect(uvMin).toBeGreaterThanOrEqual(-1e-6);
          expect(uvMax).toBeLessThanOrEqual(1 + 1e-6);
          const signs = new Set(tris.map((t) => t.sign));
          expect([...signs]).toHaveLength(1); // a folded triangle would flip
        });
        it(`${label}: covered solid angle = the grid's area (no double cover, no fold)`, () => {
          const { tris } = levelMesh(lay, k, rs, true);
          const tr = lay[k]["spatial:transform"] as number[], sh = lay[k]["spatial:shape"] as number[];
          const n = Math.min(90, tr[5]), s = Math.max(-90, tr[5] - sh[0] * tr[0]);
          const lonSpan = sh[1] * tr[0];
          expect(lonSpan).toBeCloseTo(360, 9);
          const exact = 2 * Math.PI * (Math.sin((n * Math.PI) / 180) - Math.sin((s * Math.PI) / 180));
          const total = tris.reduce((acc, t) => acc + sphArea(t.a, t.b, t.c), 0);
          // geodesic vs parallel edges at region boundaries differ by << 1e-4 sr; one duplicated
          // 0.25° column would add 0.0087 sr, the pole fold ~1e-4..1e-3 sr
          expect(Math.abs(total - exact)).toBeLessThan(2e-5);
        });
        it(`${label}: every point near the poles and along ±180 is covered exactly once`, () => {
          const { tris } = levelMesh(lay, k, rs, true);
          const tr = lay[k]["spatial:transform"] as number[], sh = lay[k]["spatial:shape"] as number[];
          const south = Math.max(-90, tr[5] - sh[0] * tr[0]), north = Math.min(90, tr[5]);
          const rnd = rng(17 + k);
          const pts: [number, number][] = [];
          for (let i = 0; i < 150; i++) pts.push([-180 + 360 * rnd(), -90 + 2.5 * rnd() ** 2]); // dense at the pole
          for (let i = 0; i < 60; i++) pts.push([-180 + 360 * rnd(), 90 - 2.5 * rnd() ** 2]);
          pts.push([0, -90], [0, 90], [37, -89.999], [-143, -89.95]);
          for (let i = 0; i < 120; i++) pts.push([180 + (rnd() - 0.5) * 3 * tr[0] - (rnd() < 0.5 ? 360 : 0), -85 + 170 * rnd()]); // ±180 seam
          let checked = 0;
          for (const [lon, lat] of pts) {
            if (lat < south || lat > north) continue; // coarse levels: half-cell gap at one pole (by design of the pyramid)
            const c = coverCount(tris, unit(lon, lat));
            const onEdge = c === 2 || c === 0; // exactly on a shared edge or vertex (the poles themselves)
            if (Math.abs(lat) > 89.9999 || onEdge) { expect(c, `${name} ${label} (${lon}, ${lat})`).toBeLessThanOrEqual(Math.abs(lat) > 89.9999 ? 1e9 : 2); }
            if (Math.abs(lat) <= 89.9999 && !onEdge) { expect(c, `${name} ${label} (${lon.toFixed(4)}, ${lat.toFixed(4)})`).toBe(1); checked++; }
          }
          expect(checked).toBeGreaterThan(250);
        });
      }
      it("the original mesh (cell-edge latitudes beyond ±90) fails these checks: fold over the pole", () => {
        const { tris } = levelMesh(lay, 0, rs, true, "pole");
        expect(tris.reduce((m, t) => Math.min(m, ...t.lat), 0)).toBeLessThan(-90); // vertices beyond the pole
        expect(new Set(tris.map((t) => t.sign)).size).toBe(2); // flipped triangles
        // points near the pole covered more than once
        const many = [[10, -89.6], [100, -89.8], [-120, -89.3], [45, -89.95]].map(([lo, la]) => coverCount(tris, unit(lo, la)));
        expect(Math.max(...many)).toBeGreaterThan(1);
      });
      it("the original per-region subdivision count leaves seams along region boundaries (area off)", () => {
        const err = (u: "" | "seam") => {
          const tr = lay[0]["spatial:transform"] as number[], sh = lay[0]["spatial:shape"] as number[];
          const n = Math.min(90, tr[5]), s = Math.max(-90, tr[5] - sh[0] * tr[0]);
          const exact = 2 * Math.PI * (Math.sin((n * Math.PI) / 180) - Math.sin((s * Math.PI) / 180));
          return Math.abs(levelMesh(lay, 0, rs, true, u).tris.reduce((acc, t) => acc + sphArea(t.a, t.b, t.c), 0) - exact);
        };
        expect(err("")).toBeLessThanOrEqual(err("seam") + 1e-12);
        // ERA5-Land: 1444-row shards -> regions of 144.4° and 35.7° (128 vs 36 subdivisions)
        if (name.startsWith("ERA5-Land")) expect(err("seam")).toBeGreaterThan(1e-4);
      });
    });
  }

  it("Mercator geometry unchanged: no WGS84 bounds, Mercator y clamped at ±85.05°, lat lookup bounds = cell edges", () => {
    const { regions } = levelMesh(GRIDS[0].lay, 0, GRIDS[0].rs, false);
    const ymax = (1 - Math.log(Math.tan((85.05112878 * Math.PI) / 180) + 1 / Math.cos((85.05112878 * Math.PI) / 180)) / Math.PI) / 2;
    for (const r of regions) {
      expect(r.wgs84Bounds).toBeUndefined();
      expect(r.positionSpace).toBeUndefined();
      expect(Math.min(r.mercatorBounds.y0, r.mercatorBounds.y1)).toBeGreaterThanOrEqual(ymax - 1e-12);
    }
    expect(Math.min(...regions.map((r) => r.mercatorBounds.latMin))).toBeCloseTo(-90.125, 9);
    expect(Math.max(...regions.map((r) => r.mercatorBounds.latMax))).toBeCloseTo(90.125, 9);
    // globe: the same regions keep the cell-edge lookup bounds but the mesh stops at ±90
    const g = levelMesh(GRIDS[0].lay, 0, GRIDS[0].rs, true).regions;
    expect(Math.min(...g.map((r) => r.mercatorBounds.latMin))).toBeCloseTo(-90.125, 9);
    expect(Math.min(...g.map((r) => r.wgs84Bounds!.lat0))).toBeCloseTo(0, 12);
    expect(Math.max(...g.map((r) => r.wgs84Bounds!.lat1))).toBeCloseTo(1, 12);
  });

  it("globe pole view: each region listed once (regions on both sides of ±180 are not repeated)", () => {
    const { lib } = levelMesh(GRIDS[2].lay, 0, GRIDS[2].rs, true);
    for (const b of [[[-180, -90], [180, -60]], [[170, -90], [-170, -70]], [[-200, -90], [200, -50]]]) {
      const regs = lib.getVisibleRegions({ getBounds: () => ({ toArray: () => b }) });
      const keys = regs.map((r) => `${r.regionX},${r.regionY}`);
      expect(new Set(keys).size).toBe(keys.length);
      expect(regs.length).toBeGreaterThan(0);
    }
  });

  it("selected-cell highlight of a pole-row cell ends at ±90 (one polygon, no fold)", () => {
    for (const g of [{ lat0: 90, dlat: -0.25, lon0: -180, dlon: 0.25, ny: 721, nx: 1440 }, { lat0: 90, dlat: -0.1, lon0: -180, dlon: 0.1, ny: 1801, nx: 3600 }]) {
      for (const i of [0, g.ny - 1]) {
        const fc = cellFeature(cellFromIndex(i, 100, g), g);
        expect(fc.features).toHaveLength(1);
        const lats = (fc.features[0].geometry as GeoJSON.Polygon).coordinates[0].map((p) => p[1]);
        expect(Math.max(...lats.map(Math.abs))).toBe(90);
      }
    }
  });
});
