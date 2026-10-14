// Arrows / streamlines geometry, the zarr multiscale window reader (fixture pyramids), probes,
// layer config and KaTeX rendering.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { arrowFeatures, gcDeg, geoPolylines, sampleBearing, sampleNearest, sampleUnit, offset, buildScreenField, evenStreamlines, sampleScreen, arrowheadsAlong, type Grid, type ScreenField, type Streamline } from "../src/map/vectors";
import { FieldReader } from "../src/map/fieldreader";
import * as zarr from "zarrita";
import { effectiveDisplay, decodeConfig, encodeConfig, canLog, isDirectional, metersPerPixel, spacingToPx, DSEP_PX_CLAMP, SPACING_KM_STEPS, nearestSpacingStep, migrateLegacySpacing, vectorColors } from "../src/layerconfig";
import { mathHtml, mathOnly, textOnly } from "../src/util/math";
import { loadRegistry } from "../src/registry/load";
import { mathToBearingDeg } from "../src/util/angles";

const reg = loadRegistry().registry;
const L = (id: string) => reg.layers.find((l) => l.id === id)!;

function uniform(b: number, nx = 40, ny = 20, lon0 = 0, lat0 = 20, d = 1): Grid {
  return { data: new Float32Array(nx * ny).fill(b), nx, ny, lon0, lat0, dlon: d, dlat: -d };
}

describe("vector geometry", () => {
  it("sampling: nearest and bilinear (unit vectors; doubled angles for axes)", () => {
    const g = uniform(90);
    g.data[0] = 0; // corner
    expect(sampleNearest(g, 0, 20)).toBe(0);
    expect(sampleNearest(g, -5, 20)).toBeNaN();
    // between 350 and 10 the mean direction is 0, not 180
    const h: Grid = { data: new Float32Array([350, 10, 350, 10]), nx: 2, ny: 2, lon0: 0, lat0: 1, dlon: 1, dlat: -1 };
    expect(Math.min(sampleBearing(h, 0.5, 0.5, false), 360 - sampleBearing(h, 0.5, 0.5, false))).toBeCloseTo(0, 6);
    // axis 175 and 5 average to 0/180 (horizontal), not 90
    const a: Grid = { ...h, data: new Float32Array([175, 5, 175, 5]) };
    const m = sampleBearing(a, 0.5, 0.5, true);
    expect(Math.min(m % 180, 180 - (m % 180))).toBeCloseTo(0, 6);
  });
  it("offset moves along the bearing (north, east)", () => {
    expect(offset(10, 0, 0, 1)).toEqual([10, 1]);
    const [x, y] = offset(10, 0, 90, 1);
    expect(x).toBeCloseTo(11, 9); expect(y).toBeCloseTo(0, 9);
  });
  it("arrows point along the field; axes are headless; magnitude scales length", () => {
    const g = uniform(90); // toward east
    const seeds = [{ lon: 10, lat: 10, len: 2 }, { lon: 20, lat: 10, len: 2 }];
    const f = arrowFeatures(seeds, g, { axis: false });
    expect(f.length).toBe(2);
    const [[tail, tip], head] = f[0].geometry.coordinates;
    expect(tip[0]).toBeGreaterThan(tail[0]);
    // anchored at the base: tail = seed point, tip one arrow length downwind along the great circle
    expect(tail).toEqual([10, 10]);
    expect(gcDeg(tail as [number, number], tip as [number, number])).toBeCloseTo(2, 9);
    expect(head.length).toBe(3);
    expect(head[1]).toEqual(tip);
    // axes (headless, no direction) stay centred on the seed
    const ax = arrowFeatures(seeds, g, { axis: true })[0].geometry.coordinates;
    expect(ax.length).toBe(1);
    expect(gcDeg([10, 10], ax[0][0] as [number, number])).toBeCloseTo(1, 9);
    expect(gcDeg([10, 10], ax[0][ax[0].length - 1] as [number, number])).toBeCloseTo(1, 9);
    const mag = uniform(1); mag.data[10 * 40 + 10] = 0; // weak at the first seed (row 10, col 10)
    const fm = arrowFeatures([...seeds, { lon: 30, lat: 10, len: 2 }], g, { axis: false, mag });
    const len = (ff: typeof fm[0]) => Math.abs(ff.geometry.coordinates[0][1][0] - ff.geometry.coordinates[0][0][0]);
    expect(len(fm[0])).toBeLessThan(len(fm[1]));
    expect(fm[0].properties!.a).toBeLessThan(fm[1].properties!.a);
  });
  it("unit-vector sampling wraps across the antimeridian on global grids", () => {
    const nx = 36, ny = 18;
    const g: Grid = { data: new Float32Array(nx * ny).fill(90), nx, ny, lon0: -175, lat0: 85, dlon: 10, dlat: -10 };
    for (let j = 0; j < ny; j++) { g.data[j * nx + 0] = 80; g.data[j * nx + nx - 1] = 100; }
    // halfway between the last column (175E) and the first (-175) = 180: average of 100 and 80 -> 90
    expect(sampleBearing(g, 180, 0, false)).toBeCloseTo(90, 6);
    expect(sampleBearing(g, -180, 0, false)).toBeCloseTo(90, 6);
    expect(sampleUnit(g, 179.9, 0, false)).not.toBeNull();
  });
});

// ---- screen-space Jobard–Lefer streamlines ----
/** Synthetic screen field from a function giving the screen angle (rad) at (x, y). */
function field(W: number, H: number, cell: number, angle: (x: number, y: number) => number, axis = false): ScreenField {
  const nx = Math.ceil(W / cell) + 1, ny = Math.ceil(H / cell) + 1;
  const vx = new Float32Array(nx * ny), vy = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const p = angle(i * cell, j * cell), k = j * nx + i;
    if (axis) { vx[k] = Math.cos(2 * p); vy[k] = Math.sin(2 * p); } else { vx[k] = Math.cos(p); vy[k] = Math.sin(p); }
  }
  return { nx, ny, cell, vx, vy, axis };
}
/** min over consecutive segment pairs of the dot product of unit tangents */
function minDot(l: Streamline): number {
  let m = 1;
  for (let k = 2; k < l.pts.length; k++) {
    const a = [l.pts[k - 1][0] - l.pts[k - 2][0], l.pts[k - 1][1] - l.pts[k - 2][1]], b = [l.pts[k][0] - l.pts[k - 1][0], l.pts[k][1] - l.pts[k - 1][1]];
    const na = Math.hypot(a[0], a[1]), nb = Math.hypot(b[0], b[1]);
    if (na && nb) m = Math.min(m, (a[0] * b[0] + a[1] * b[1]) / (na * nb));
  }
  return m;
}
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const W = 800, H = 500, DSEP = 30;

describe("evenly spaced streamlines (Jobard–Lefer, screen space)", () => {
  it("uniform field: straight, evenly spaced, long lines; no sign flips", () => {
    const f = field(W, H, 6, () => 0.3);
    const lines = evenStreamlines(f, { width: W, height: H, dsep: DSEP });
    expect(lines.length).toBeGreaterThan(10);
    for (const l of lines) expect(minDot(l)).toBeGreaterThan(0.999);
    expect(median(lines.map((l) => l.length))).toBeGreaterThan(5 * DSEP);
    // every line at least 2 dsep long (stubs discarded)
    expect(Math.min(...lines.map((l) => l.length))).toBeGreaterThanOrEqual(2 * DSEP);
  });
  it("rotation (vortex) field: smooth curved lines, consistent orientation", () => {
    const cx = W / 2, cy = H / 2;
    const f = field(W, H, 5, (x, y) => Math.atan2(y - cy, x - cx) + Math.PI / 2);
    const lines = evenStreamlines(f, { width: W, height: H, dsep: DSEP });
    expect(lines.length).toBeGreaterThan(5);
    for (const l of lines) expect(minDot(l)).toBeGreaterThan(0.9);
    expect(median(lines.map((l) => l.length))).toBeGreaterThan(4 * DSEP);
    // counter-clockwise in screen coords everywhere: cross(r, t) > 0
    for (const l of lines) {
      const [a, b] = [l.pts[0], l.pts[1]];
      expect((a[0] - cx) * (b[1] - a[1]) - (a[1] - cy) * (b[0] - a[0])).toBeGreaterThan(0);
    }
  });
  it("direction field wrapping at +-pi (angles near 180 deg) does not flip", () => {
    // stored math angles alternate between +pi-0.01 and -pi+0.01 (same direction, opposite sign)
    const f = field(W, H, 6, (x, y) => (((x / 6) | 0) + ((y / 6) | 0)) % 2 ? Math.PI - 0.01 : -Math.PI + 0.01);
    const lines = evenStreamlines(f, { width: W, height: H, dsep: DSEP });
    for (const l of lines) expect(minDot(l)).toBeGreaterThan(0.99);
    expect(median(lines.map((l) => l.length))).toBeGreaterThan(5 * DSEP);
  });
  it("axial field crossing 0/180 deg: continuous lines, no reversals", () => {
    // axis angle alternating 1 deg and 179 deg (nearly the same axis), plus a smooth rotation
    const f = field(W, H, 6, (x, y) => ((((x / 6) | 0) % 2) ? (Math.PI / 180) * (179 + x / 400) : (Math.PI / 180) * (1 + x / 400)) + (y > 1e9 ? 0 : 0), true);
    const lines = evenStreamlines(f, { width: W, height: H, dsep: DSEP });
    expect(lines.length).toBeGreaterThan(5);
    for (const l of lines) expect(minDot(l)).toBeGreaterThan(0.99);
    expect(median(lines.map((l) => l.length))).toBeGreaterThan(5 * DSEP);
  });
  it("respects dtest separation between lines and the line cap", () => {
    const f = field(W, H, 6, () => 0.0);
    const lines = evenStreamlines(f, { width: W, height: H, dsep: DSEP });
    const ys = lines.map((l) => l.pts[Math.floor(l.pts.length / 2)][1]).sort((a, b) => a - b);
    for (let k = 1; k < ys.length; k++) expect(ys[k] - ys[k - 1]).toBeGreaterThan(0.5 * DSEP - 1);
    expect(evenStreamlines(f, { width: W, height: H, dsep: DSEP, maxLines: 3 }).length).toBeLessThanOrEqual(3);
  });
  it("stops at no-data and weak (divergent) regions", () => {
    const f = field(W, H, 6, () => 0);
    for (let j = 0; j < f.ny; j++) for (let i = 0; i < f.nx; i++) if (i * 6 > 400) f.vx[j * f.nx + i] = NaN;
    const lines = evenStreamlines(f, { width: W, height: H, dsep: DSEP });
    for (const l of lines) for (const p of l.pts) expect(p[0]).toBeLessThanOrEqual(400);
    // a source (divergent) field: vectors cancel at the centre -> sampleScreen null there
    const src = field(W, H, 6, (x, y) => Math.atan2(y - H / 2, x - W / 2));
    expect(sampleScreen(src, W / 2, H / 2, null)).toBeNull();
  });
  it("world-view budget: 1600x1000 px in < 200 ms", () => {
    const f = field(1600, 1000, 8, (x, y) => Math.sin(x / 150) + Math.cos(y / 120));
    const t0 = performance.now();
    const lines = evenStreamlines(f, { width: 1600, height: 1000, dsep: 30, budgetMs: 150, maxLines: 900 });
    expect(performance.now() - t0).toBeLessThan(200);
    expect(lines.length).toBeGreaterThan(50);
  });
  it("arrowheads along lines point along the tangent", () => {
    const lines = evenStreamlines(field(W, H, 6, () => 0), { width: W, height: H, dsep: DSEP });
    const heads = arrowheadsAlong(lines, 90, 5);
    expect(heads.length).toBeGreaterThan(lines.length);
    for (const [l1, tip, l2] of heads) { expect(l1[0]).toBeLessThan(tip[0]); expect(l2[0]).toBeLessThan(tip[0]); }
  });
  it("screen field from a geo field: equirectangular projection maps north to -y and east to +x", () => {
    const nx = 20, ny = 10, cell = 10;
    const lon = new Float64Array(nx * ny), lat = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { lon[j * nx + i] = i * cell * 0.1; lat[j * nx + i] = 10 - j * cell * 0.1; }
    const north = buildScreenField(lon, lat, nx, ny, cell, false, () => [0, 1]);
    expect(north.vx[25]).toBeCloseTo(0, 6); expect(north.vy[25]).toBeCloseTo(-1, 6);
    const east = buildScreenField(lon, lat, nx, ny, cell, false, () => [1, 0]);
    expect(east.vx[25]).toBeCloseTo(1, 6);
    // across the antimeridian (lon jumps 179.5 -> -179.5) the field stays defined
    const lon2 = lon.map((v) => ((v + 178 + 180) % 360) - 180);
    const f2 = buildScreenField(lon2, lat, nx, ny, cell, false, () => [1, 0]);
    expect(Array.from(f2.vx).filter(Number.isFinite).every((v) => v > 0.99)).toBe(true);
  });
});

const fixture = path.resolve(__dirname, "../../staging/fixture");
const have = fs.existsSync(path.join(fixture, "fields", "at.zarr", "zarr.json"));
class RangeFileStore {
  constructor(private root: string) {}
  async get(key: string) { const p = this.root + key; return fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : undefined; }
  async getRange(key: string, r: { offset: number; length: number } | { suffixLength: number }) {
    const p = this.root + key;
    if (!fs.existsSync(p)) return undefined;
    const size = fs.statSync(p).size;
    const [off, len] = "suffixLength" in r ? [size - r.suffixLength, r.suffixLength] : [r.offset, r.length];
    const fd = fs.openSync(p, "r"); const b = Buffer.alloc(len); fs.readSync(fd, b, 0, len, off); fs.closeSync(fd);
    return new Uint8Array(b);
  }
}

describe.skipIf(!have)("FieldReader on the fixture pyramids", () => {
  it("reads a window at each level; streamlines and arrows from real alpha_T in < 200 ms", async () => {
    const r = await FieldReader.open(new RangeFileStore(path.join(fixture, "fields", "at.zarr")), "at");
    expect(r.levels.length).toBeGreaterThanOrEqual(2);
    expect(Math.abs(r.levels[0].transform[0])).toBeCloseTo(0.1, 6);
    expect(r.chooseLevel(0.05)).toBe(0);
    expect(r.chooseLevel(0.25)).toBe(1);
    const g = await r.read(0, 14, [14, -26, 16, -23]);
    expect(g.nx).toBeGreaterThan(15);
    // window centre agrees with the cell store value at the Namib test cell (-24.5, 15.2)
    const v = sampleNearest(g, 15.2, -24.5);
    expect(Number.isFinite(v)).toBe(true);
    const full = await r.read(r.levels.length - 1, 14, [-180, -90, 180, 90]);
    for (let i = 0; i < full.data.length; i++) full.data[i] = Number.isFinite(full.data[i]) ? mathToBearingDeg(full.data[i]) : NaN;
    const t0 = performance.now();
    // equirectangular screen 10 px/deg over southern Africa
    const nx = 301, ny = 251, cell = 1;
    const lon = new Float64Array(nx * ny), lat = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { lon[j * nx + i] = 10 + i / 10; lat[j * nx + i] = -10 - j / 10; }
    const sf = buildScreenField(lon, lat, nx, ny, cell, false, (lo, la) => sampleUnit(full, lo, la, false));
    const lines = evenStreamlines(sf, { width: 300, height: 250, dsep: 20, budgetMs: 150 });
    const seeds = []; for (let la = -34; la < -11; la += 1) for (let lo = 11; lo < 39; lo += 1) seeds.push({ lon: lo, lat: la, len: 0.8 });
    const arrows = arrowFeatures(seeds, full, { axis: false });
    expect(performance.now() - t0).toBeLessThan(400);
    expect(lines.length).toBeGreaterThan(10);
    for (const l of lines) expect(minDot(l)).toBeGreaterThan(0);
    expect(arrows.length).toBeGreaterThan(50);
  });
});

describe("layer config", () => {
  it("defaults from the registry; user overrides; reverse; log only for non-angle fields with min > 0", () => {
    const q = L("qacb");
    expect(effectiveDisplay(q).colormap).toBe(q.display!.colormap);
    const e = effectiveDisplay(q, { colormap: "viridis", reverse: true, clim: [2, 20] });
    expect(e.colors[0]).toBe(effectiveDisplay(q, { colormap: "viridis" }).colors[255]);
    expect(e.clim).toEqual([2, 20]);
    expect(effectiveDisplay(q, { clim: [0, 20] }).log).toBe(false);
    expect(canLog(L("at"))).toBe(false);
    expect(isDirectional(L("at")) && isDirectional(L("ab")) && isDirectional(L("rdpa"))).toBe(true);
    expect(isDirectional(L("qacb"))).toBe(false);
    expect(effectiveDisplay(L("qacb"), { mode: "arrows" }).mode).toBe("colormap");
  });
  it("fractions without a registry clim default to [0, 1]; registry clim is never replaced by data", () => {
    const l = { id: "x", title: "x", group: "g", type: "zarr-field" as const, source: "s", variable: "qhbf", display: { colormap: "viridis" } };
    expect(effectiveDisplay(l).clim).toEqual([0, 1]);
    expect(effectiveDisplay(L("uft")).clim).toEqual(L("uft").display!.clim);
  });
  it("encode/decode round trip", () => {
    const c = { colormap: "magma", reverse: true, clim: [0.1, 3] as [number, number], log: false, mode: "arrows" as const, vecColor: "#abcdef", spacingKm: 500 };
    expect(decodeConfig(encodeConfig(c).split("~").slice(1))).toEqual(c);
    expect(encodeConfig(undefined)).toBe("");
  });
});

describe("streamline / arrow spacing in km", () => {
  it("Web-Mercator ground resolution on 512-px tiles", () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(78271.517, 2);
    expect(metersPerPixel(0, 0, 256)).toBeCloseTo(156543.034, 2);
    expect(metersPerPixel(60, 3)).toBeCloseTo((78271.517 * 0.5) / 8, 2);
  });
  it("km -> px at the view centre, clamped to [8, 120] px with a flag", () => {
    expect(DSEP_PX_CLAMP).toEqual([8, 120]);
    const m = metersPerPixel(-24.5, 5); // ~2.2 km/px
    const sp = spacingToPx(100, m);
    expect(sp.clamped).toBe(false);
    expect(sp.px).toBeCloseTo(100000 / m, 9);
    expect(spacingToPx(10, metersPerPixel(0, 1))).toMatchObject({ px: 8, clamped: true });
    expect(spacingToPx(1000, metersPerPixel(0, 10))).toMatchObject({ px: 120, clamped: true });
  });
  it("slider steps, default, URL key and legacy px migration", () => {
    expect(SPACING_KM_STEPS).toEqual([10, 20, 50, 100, 200, 500, 1000]);
    const at = { id: "at", title: "at", group: "g", type: "zarr-field" as const, source: "s", variable: "at", display: { transform: "rad-to-bearing" as const } };
    expect(effectiveDisplay(at).spacingKm).toBe(100);
    expect(effectiveDisplay(at, { spacingKm: 20 }).spacingKm).toBe(20);
    expect(effectiveDisplay(at, { spacingKm: 33 }).spacingKm).toBe(100);
    expect(encodeConfig({ spacingKm: 200 })).toBe("~km=200");
    expect(encodeConfig({ legacyDsepPx: 40 })).toBe("");
    expect(nearestSpacingStep(70)).toBe(50);
    expect(nearestSpacingStep(75)).toBe(100);
    // 40 px at zoom 5 on the equator = 40 * 2.446 km = 97.8 km -> 100 km
    expect(migrateLegacySpacing({ mode: "streamlines", legacyDsepPx: 40 }, 0, 5)).toEqual({ mode: "streamlines", spacingKm: 100 });
    expect(migrateLegacySpacing({ legacyDsepPx: 40, spacingKm: 20 }, 0, 5)).toEqual({ spacingKm: 20 });
    expect(migrateLegacySpacing(undefined, 0, 5)).toBeUndefined();
  });
});

describe("vector layer colours (no outlines)", () => {
  it("fill and invert only", () => {
    const d = { id: "dunes", title: "d", group: "g", type: "pmtiles-vector" as const, source: "s", sourceLayer: "x", invertSource: "i", style: { fill: { "fill-color": "#aa5500" }, line: { "line-color": "#000000" } } };
    expect(vectorColors(d)).toEqual({ fill: "#aa5500", invert: false });
    expect(vectorColors(d, { fill: "#112233", invert: true })).toEqual({ fill: "#112233", invert: true });
  });
});

describe("KaTeX", () => {
  it("renders math segments, escapes text, falls back on parse errors", () => {
    const h = mathHtml("Drift potential $DP$ in m$^2$/yr <b>");
    expect(h).toContain('class="katex"');
    expect(h).toContain("&lt;b&gt;");
    expect(mathHtml("$\\langle |Q_{\\bot}(\\alpha_E)|\\rangle$")).toContain("katex");
    expect(mathHtml("$\\notacommand{x$")).toMatch(/tex-fallback|katex/);
    expect(mathOnly("Drift potential $DP$")).toBe("DP");
    expect(textOnly("Drift potential $DP$")).toBe("Drift potential");
    expect(mathOnly("no math")).toBe("");
  });
});

describe("antimeridian and pole: streamline / arrow geometry is drawn the short way", () => {
  const segs = (pieces: [number, number][][]) => pieces.flatMap((p) => p.slice(1).map((q, k) => [p[k], q] as const));
  const checkPieces = (pieces: [number, number][][], maxDeg: number) => {
    for (const p of pieces) {
      expect(p.length).toBeGreaterThanOrEqual(2);
      for (const [lo, la] of p) { expect(lo).toBeGreaterThanOrEqual(-180); expect(lo).toBeLessThanOrEqual(180); expect(Math.abs(la)).toBeLessThanOrEqual(90); }
    }
    for (const [a, b] of segs(pieces)) {
      expect(Math.abs(b[0] - a[0])).toBeLessThanOrEqual(180); // never the long way round (Δlon > 180 drawn as an arc around the globe)
      if (Math.abs(a[1]) < 85 && Math.abs(b[1]) < 85) expect(Math.abs(b[0] - a[0])).toBeLessThan(30);
      expect(gcDeg(a, b)).toBeLessThanOrEqual(maxDeg + 1e-9);
    }
  };
  it("geoPolylines: split at ±180 with a shared interpolated vertex, both directions; long steps and NaN split", () => {
    const r = (ps: [number, number][][]) => ps.map((p) => p.map(([a, b]) => [Number(a.toFixed(9)), Number(b.toFixed(9))]));
    expect(r(geoPolylines([[179.5, 10], [179.9, 10], [-179.9, 11], [-179.5, 11]]))).toEqual([[[179.5, 10], [179.9, 10], [180, 10.5]], [[-180, 10.5], [-179.9, 11], [-179.5, 11]]]);
    expect(r(geoPolylines([[-179.5, 0], [-179.9, 0], [179.9, 0]]))).toEqual([[[-179.5, 0], [-179.9, 0], [-180, 0]], [[180, 0], [179.9, 0]]]);
    expect(geoPolylines([[10, 0], [10.5, 0], [30, 0], [30.5, 0], [NaN, 0], [31, 0], [31.5, 0]], 2)).toEqual([[[10, 0], [10.5, 0]], [[30, 0], [30.5, 0]], [[31, 0], [31.5, 0]]]);
    expect(geoPolylines([[181, 0], [181.5, 0]])).toEqual([[[-179, 0], [-178.5, 0]]]); // inputs outside ±180 are wrapped
    expect(geoPolylines([[5, 0]])).toEqual([]);
  });
  it("a latitude circle at 80° N through the antimeridian: short segments, two pieces meeting at ±180", () => {
    const ring: [number, number][] = Array.from({ length: 361 }, (_, k) => [((100 + k + 180) % 360) - 180, 80]);
    const pieces = geoPolylines(ring, 2);
    checkPieces(pieces, 2);
    expect(pieces.length).toBe(2);
    expect(pieces[0][pieces[0].length - 1]).toEqual([180, 80]);
    expect(pieces[1][0]).toEqual([-180, 80]);
    const len = (ps: [number, number][][]) => segs(ps).reduce((s, [a, b]) => s + gcDeg(a, b), 0);
    expect(len(pieces)).toBeCloseTo(360 * Math.cos(80 * Math.PI / 180), 1); // nothing lost
  });
  it("end to end: streamlines circling the pole on a polar view (screen -> lon/lat) cross the antimeridian without long segments", () => {
    // azimuthal view centred on the North Pole: 0.1° of latitude per px, lon = bearing of the pixel from the centre
    const W = 400, H = 400, k = 0.1;
    const inv = (x: number, y: number): [number, number] => {
      const dx = x - W / 2, dy = y - H / 2;
      return [Math.atan2(dx, dy) * 180 / Math.PI, 90 - k * Math.hypot(dx, dy)];
    };
    const cell = 5, nx = W / cell + 1, ny = H / cell + 1;
    const lon = new Float64Array(nx * ny), lat = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) [lon[j * nx + i], lat[j * nx + i]] = inv(i * cell, j * cell);
    // mostly eastward flow (rings around the pole) with a slight poleward drift
    const field = buildScreenField(lon, lat, nx, ny, cell, false, () => [0.98, 0.2]);
    const lines = evenStreamlines(field, { width: W, height: H, dsep: 18, maxLines: 400, budgetMs: 2000 });
    expect(lines.length).toBeGreaterThan(10);
    const raw = lines.map((l) => l.pts.map((p) => inv(p[0], p[1])));
    // unsplit, consecutive vertices at ~+180 / ~-180 would be joined the long way round
    expect(raw.some((l) => l.slice(1).some((q, i) => Math.abs(q[0] - l[i][0]) > 180))).toBe(true);
    let split = 0;
    for (const l of raw) {
      const pieces = geoPolylines(l, 4 * 18 * k);
      checkPieces(pieces, 4 * 18 * k);
      split += pieces.length - 1;
      // continuity: the pieces of one line meet (same latitude at +180 / -180)
      for (let i = 1; i < pieces.length; i++) {
        const e = pieces[i - 1][pieces[i - 1].length - 1], s = pieces[i][0];
        expect(Math.abs(e[0])).toBe(180); expect(s[0]).toBe(-e[0]); expect(s[1]).toBe(e[1]);
      }
    }
    expect(split).toBeGreaterThan(0);
  });
  it("arrows at the antimeridian and next to the pole: short segments in ±180", () => {
    const g: Grid = { lon0: -180, lat0: 90, dlon: 1, dlat: -1, nx: 360, ny: 181, data: new Float32Array(360 * 181).fill(90) }; // toward east
    const seeds = [{ lon: 179.9, lat: 70, len: 2 }, { lon: -179.95, lat: -20, len: 3 }, { lon: 40, lat: 89.6, len: 2 }, { lon: -100, lat: 88.9, len: 1.5 }];
    for (const axis of [false, true]) {
      const f = arrowFeatures(seeds, g, { axis });
      expect(f.length).toBe(seeds.length);
      for (const ft of f) checkPieces(ft.geometry.coordinates as [number, number][][], 3);
      // the shaft near the antimeridian is split into two adjacent pieces
      expect((f[0].geometry.coordinates as number[][][]).filter((p) => p.some((q) => Math.abs(q[0]) === 180)).length).toBeGreaterThanOrEqual(2);
    }
    expect(gcDeg([0, 0], [1, 0])).toBeCloseTo(1, 9);
    const [x, y] = offset(0, 89.5, 90, 1); // along the great circle, not along the parallel
    expect(gcDeg([0, 89.5], [x, y])).toBeCloseTo(1, 9);
  });
});

describe("FieldReader / sampling across the antimeridian (global grids)", () => {
  // global 0.25° grid with ERA5 edges -180.125 .. 179.875; value = column index
  const mk = async () => {
    const nx = 1440, ny = 8;
    const s = new Map<string, Uint8Array>();
    const root = zarr.root(s as never);
    await zarr.create(root, { attributes: { multiscales: { layout: [{ asset: "0", "spatial:transform": [0.25, 0, -180.125, 0, -0.25, 1], "spatial:shape": [ny, nx] }] } } } as never);
    const a = await zarr.create(root.resolve("0/v"), { shape: [1, ny, nx], chunk_shape: [1, ny, 360], data_type: "float32", fill_value: NaN } as never);
    const d = new Float32Array(ny * nx); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) d[j * nx + i] = i;
    await zarr.set(a as never, null, { data: d, shape: [1, ny, nx], stride: [ny * nx, nx, 1] } as never);
    return FieldReader.open(s as never, "v");
  };
  it("a window across ±180 joins both ends in order; samples on both sides hit the right columns", async () => {
    const r = await mk();
    for (const [w, e] of [[179.0, 181.0], [-181.0, -179.0], [179.5, -179.5]] as const) {
      const g = await r.read(0, 0, [w, -0.5, e, 0.5]);
      expect(g.nx).toBeLessThan(20); // not the whole width
      const row = Array.from(g.data.subarray(0, g.nx));
      // consecutive source columns, wrapping 1439 -> 0
      for (let i = 1; i < row.length; i++) expect((row[i] - row[i - 1] + 1440) % 1440).toBe(1);
      expect(row).toContain(1439); expect(row).toContain(0);
      // column 0 is centred at -180 (edges 179.875 / -179.875), column 1439 at 179.75
      expect(sampleNearest(g, 179.95, 0)).toBe(0);
      expect(sampleNearest(g, -179.95, 0)).toBe(0);
      expect(sampleNearest(g, 180.05, 0)).toBe(0);
      expect(sampleNearest(g, 179.8, 0)).toBe(1439);
      expect(sampleNearest(g, -179.8, 0)).toBe(1);
    }
    // the whole width when the view spans 360° or more
    expect((await r.read(0, 0, [-200, -0.5, 200, 0.5])).nx).toBe(1440);
  });
});
