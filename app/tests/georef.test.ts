// Raster georeferencing (half-pixel longitude offset fix) and the direction-validity mask.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as zarr from "zarrita";
import { storeGeoFromAttrs, rendererPixelCentre } from "../src/map/zarrgeo";
import { MaskedFieldStore, maskValue } from "../src/map/maskedstore";
import { applyMask, arrowFeatures, buildScreenField, evenStreamlines, sampleUnit, type Grid } from "../src/map/vectors";
import { ERA5_LAND_GRID, cellBounds, cellFromIndex, snapToCell } from "../src/cell/snap";
import { DIRECTION_MASK_VAR, maskVarOf } from "../src/layerconfig";
import { MODE_DEFINED_BY } from "../src/cell/analysis";
import { loadRegistry } from "../src/registry/load";
import { zarrLayerSource } from "../src/map/adapters";

const V1_ATTRS = {
  multiscales: {
    layout: [
      { asset: "0", "spatial:transform": [0.1, 0, -180.05, 0, -0.1, 90.05], "spatial:shape": [1801, 3600] },
      { asset: "1", "spatial:transform": [0.2, 0, -180.05, 0, -0.2, 90.05], "spatial:shape": [900, 1800] },
    ],
  },
  "spatial:bbox": [-180.05, -90.05, 179.95, 90.05],
};

describe("explicit cell-edge bounds for zarr-layer", () => {
  const g = storeGeoFromAttrs(V1_ATTRS)!;
  it("bbox from the finest level's spatial:transform (v1: [-180.05, -90.05, 179.95, 90.05])", () => {
    g.bounds.forEach((v, k) => expect(v).toBeCloseTo([-180.05, -90.05, 179.95, 90.05][k], 9));
    expect(g.latIsAscending).toBe(false);
    expect(g.shape).toEqual([1801, 3600]);
    // spatial:bbox fallback; ERA5 0.25 deg store
    expect(storeGeoFromAttrs({ "spatial:bbox": [-180.125, -90.125, 179.875, 90.125] })!.bounds).toEqual([-180.125, -90.125, 179.875, 90.125]);
    const e5 = storeGeoFromAttrs({ multiscales: { layout: [{ asset: "0", "spatial:transform": [0.25, 0, -180.125, 0, -0.25, 90.125], "spatial:shape": [721, 1440] }] } })!;
    expect(rendererPixelCentre(e5, 0, 0)[0]).toBeCloseTo(-180, 9);
    expect(rendererPixelCentre(e5, 360, 720)[1]).toBeCloseTo(0, 9);
    expect(storeGeoFromAttrs({})).toBeNull();
  });
  it("renderer maps cell centres exactly: j=0 -> -180.0, j=1800 -> 0.0, row 0 -> 90.0, row 1800 -> -90.0 (1e-9 deg)", () => {
    const c = (i: number, j: number) => rendererPixelCentre(g, i, j);
    expect(Math.abs(c(0, 0)[0] - -180)).toBeLessThan(1e-9);
    expect(Math.abs(c(0, 1800)[0] - 0)).toBeLessThan(1e-9);
    expect(Math.abs(c(0, 3599)[0] - 179.9)).toBeLessThan(1e-9);
    expect(Math.abs(c(0, 0)[1] - 90)).toBeLessThan(1e-9);
    expect(Math.abs(c(1800, 0)[1] - -90)).toBeLessThan(1e-9);
    expect(Math.abs(c(1145, 1952)[1] - -24.5)).toBeLessThan(1e-9);
    expect(Math.abs(c(1145, 1952)[0] - 15.2)).toBeLessThan(1e-9);
  });
  it("same edges as click snapping and the dune polygons (cell j covers lon0 - dlon/2 + j dlon ...)", () => {
    for (const [i, j] of [[0, 0], [1145, 1952], [900, 1800], [1800, 3599]]) {
      const ref = cellFromIndex(i, j, ERA5_LAND_GRID);
      const [lon, lat] = rendererPixelCentre(g, i, j);
      expect(Math.abs(lon - ref.lon)).toBeLessThan(1e-6);
      expect(Math.abs(lat - ref.lat)).toBeLessThan(1e-6);
      const west = cellBounds(ref)[0][0];
      expect(Math.abs((((west + 180.05) % 360) + 360) % 360 - 0.1 * j)).toBeLessThan(1e-6);
      // a point just inside the west edge of cell j snaps to cell j
      expect(snapToCell(-180.05 + 0.1 * j + 1e-4, lat)!.ix).toBe(j);
    }
  });
  it("zarr-layer 0.4.3 code paths: explicit bounds are used verbatim on the untiled path", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../node_modules/@carbonplan/zarr-layer/dist/index.js"), "utf8");
    // explicit bounds -> xyLimits, before (and instead of) the coordinate inference + ±180 snap
    expect(src).toMatch(/if \(this\.explicitBounds\) \{\s*const \[west, south, east, north\] = this\.explicitBounds;\s*this\.xyLimits = \{ xMin: west, xMax: east, yMin: south, yMax: north \};/);
    expect(src).toMatch(/const needsBounds = !this\.xyLimits;/);
    expect(src).toMatch(/if \(needsBounds\) \{\s*this\.xyLimits = \{ xMin, xMax, yMin, yMax \};/);
    // untiled region bounds are linear in pixel index between xyLimits
    expect(src).toContain("const geoXMin = xMin + pxXStart / width * (xMax - xMin);");
    // normalizeGlobalExtent (forces ±180/±90) is reachable only from the tiled helpers
    // (definition, getTilesAtZoomEquirect, get4326TileGeoBounds, TiledMode); none in UntiledMode
    const tiledStart = src.indexOf("var TiledMode = class"), untiledStart = src.indexOf("var UntiledMode = class"), layerStart = src.indexOf("var ZarrLayer = class");
    const sites = [...src.matchAll(/normalizeGlobalExtent\(/g)].map((m) => m.index!);
    expect(sites.length).toBe(4);
    for (const i of sites) expect(i < untiledStart || i > layerStart).toBe(true);
    expect(sites.filter((i) => i > tiledStart && i < untiledStart).length).toBe(1);
    const untiled = src.slice(untiledStart, layerStart);
    expect(untiled).not.toMatch(/normalizeGlobalExtent|getTilesAtZoomEquirect|get4326TileGeoBounds|getTilesForBoundingBox|queryRegionTiled/);
  });
});

// ---- patched zarr-layer (patches/@carbonplan+zarr-layer+0.4.3.patch): per-level bounds ----
const LIB = fs.readFileSync(path.resolve(__dirname, "../node_modules/@carbonplan/zarr-layer/dist/index.js"), "utf8");
function method(src: string, start: string, end: string): string {
  const i = src.indexOf(start);
  expect(i, `library method '${start}' not found (zarr-layer changed?)`).toBeGreaterThan(0);
  const j = src.indexOf(end, i);
  expect(j).toBeGreaterThan(i);
  return src.slice(i, j).trim();
}
/** The library's own methods (parse layout, per-level limits, region bounds) on a minimal `this`. */
function libUntiled() {
  const parse = method(LIB, "_parseUntiledMultiscale(metadata) {", "  static clearCache() {");
  const lvl = method(LIB, "levelXYLimits(width, height) {", "  getVisibleRegions(map) {");
  const reg = method(LIB, "getRegionBounds(regionX, regionY, levelMeta) {", "  /**\n   * Create geometry");
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(`return ({ ${parse}, ${lvl}, ${reg} });`)() as {
    _parseUntiledMultiscale(m: unknown): unknown; levelXYLimits(w: number, h: number): unknown;
    getRegionBounds(rx: number, ry: number, lm?: { width: number; height: number; regionSize: number[] }): { xMin: number; xMax: number; yMin: number; yMax: number };
    [k: string]: unknown;
  };
}
/** v1-like pyramid: 1801 x 3600 at 0.1 deg, then halvings (floor), all anchored at the NW edge */
function v1Layout(nLevels = 6) {
  const out = [];
  let ny = 1801, nx = 3600, d = 0.1;
  for (let k = 0; k < nLevels; k++) {
    out.push({ asset: String(k), "spatial:transform": [d, 0, -180.05, 0, -d, 90.05], "spatial:shape": [ny, nx], ...(k ? { transform: { scale: [1, 2, 2], translation: [0, 0.5, 0.5] } } : {}) });
    ny = Math.floor(ny / 2); nx = Math.floor(nx / 2); d *= 2;
  }
  return out;
}

describe("patched zarr-layer: each pyramid level uses its own bounds", () => {
  it("patch is applied (npm ci runs patch-package in postinstall)", () => {
    expect(LIB).toContain("dune-atlas patch: per-level cell-edge bounds");
    expect(LIB).toContain("const { xMin, xMax, yMin, yMax } = this.levelXYLimits(width, height);");
    expect(LIB).toContain("const { xMin, xMax, yMin, yMax } = this.levelXYLimits(this.width, this.height);");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));
    expect(pkg.scripts.postinstall).toBe("patch-package");
    expect(fs.existsSync(path.resolve(__dirname, "../patches/@carbonplan+zarr-layer+0.4.3.patch"))).toBe(true);
    expect(pkg.dependencies["@carbonplan/zarr-layer"]).toBe("0.4.3"); // patch is version-pinned
  });
  const ARIDITY = JSON.parse(fs.readFileSync(path.resolve(__dirname, "fixtures/aridity-zarr-root.json"), "utf8")).attributes;
  it("aridity (native 30\", 2-D, extent 90 N - 60 S, non-power-of-two factors): explicit bounds are the source box", () => {
    const g = storeGeoFromAttrs(ARIDITY)!;
    expect(g.bounds).toEqual([-180, -60, 180, 90]);
    expect(g.shape).toEqual([18000, 43200]);
    expect(g.latIsAscending).toBe(false);
    const [lon, lat] = rendererPixelCentre(g, 0, 0);
    expect(Math.abs(lon - (-180 + 1 / 240))).toBeLessThan(1e-9);
    expect(Math.abs(lat - (90 - 1 / 240))).toBeLessThan(1e-9);
    expect(Math.abs(rendererPixelCentre(g, 17999, 43199)[1] - (-60 + 1 / 240))).toBeLessThan(1e-9);
  });
  const ERA5_DPM = path.resolve(__dirname, "../../staging/fixture/datasets/era5/fields/dpm.zarr/zarr.json");
  it.skipIf(!fs.existsSync(ERA5_DPM))("ERA5 (0.25°, 721 x 1440): explicit bounds are the cell edges -180.125..179.875, -90.125..90.125; centres exact", () => {
    for (const v of ["dpm", "rdpa", "qsdiv", "uft"]) {
      const g = storeGeoFromAttrs(JSON.parse(fs.readFileSync(ERA5_DPM.replace("dpm.zarr", `${v}.zarr`), "utf8")).attributes)!;
      expect(g.bounds).toEqual([-180.125, -90.125, 179.875, 90.125]);
      expect(g.shape).toEqual([721, 1440]);
      const [lon, lat] = rendererPixelCentre(g, 0, 0);
      expect(Math.abs(lon + 180)).toBeLessThan(1e-9);
      expect(Math.abs(lat - 90)).toBeLessThan(1e-9);
      const [lon1, lat1] = rendererPixelCentre(g, 720, 1439);
      expect(Math.abs(lon1 - 179.75)).toBeLessThan(1e-9);
      expect(Math.abs(lat1 + 90)).toBeLessThan(1e-9);
      // the Namib fixture cell (458, 781) is at (-24.5, 15.25)
      const [lo, la] = rendererPixelCentre(g, 458, 781);
      expect(Math.abs(lo - 15.25)).toBeLessThan(1e-9);
      expect(Math.abs(la + 24.5)).toBeLessThan(1e-9);
    }
  });
  for (const [label, layout, twoD] of [["v1 (1801 x 3600, floor halvings)", v1Layout(), false], ["fixture", null, false], ["ERA5 0.25° fixture (721 x 1440)", "era5", false], ["aridity (2-D, 9 levels, -60..90)", ARIDITY.multiscales.layout, true]] as const) {
    it(`${label}: cell centres of every level map to the transform-derived coordinates (1e-9 deg)`, () => {
      let lay = (typeof layout === "string" ? null : layout) as Record<string, unknown>[] | null;
      if (!lay) {
        const f = layout === "era5" ? ERA5_DPM : path.resolve(__dirname, "../../staging/fixture/fields/at.zarr/zarr.json");
        if (!fs.existsSync(f)) return;
        lay = JSON.parse(fs.readFileSync(f, "utf8")).attributes.multiscales.layout;
      }
      const m = libUntiled();
      Object.assign(m, { variable: "at", crs: "EPSG:4326", metadata: null });
      m._parseUntiledMultiscale({ layout: lay });
      const levels = m.untiledLevels as { xyLimits?: unknown; shape?: number[] }[];
      expect(levels.length).toBe(lay!.length);
      lay!.forEach((e, k) => { levels[k].shape = twoD ? [...(e["spatial:shape"] as number[])] : [64, ...(e["spatial:shape"] as number[])]; });
      const g0 = storeGeoFromAttrs({ multiscales: { layout: lay } })!;
      Object.assign(m, { levels, dimIndices: twoD ? { lon: { index: 1 }, lat: { index: 0 } } : { lon: { index: 2 }, lat: { index: 1 } }, latIsAscending: false,
        xyLimits: { xMin: g0.bounds[0], yMin: g0.bounds[1], xMax: g0.bounds[2], yMax: g0.bounds[3] } });
      lay!.forEach((e) => {
        const [dx, , x0, , dy, y0] = e["spatial:transform"] as number[];
        const [ny, nx] = e["spatial:shape"] as number[];
        // one region = the whole level, and a tiling with partial edge regions
        for (const rs of [[ny, nx], [97, 128]]) {
          const nrx = Math.ceil(nx / rs[1]), nry = Math.ceil(ny / rs[0]);
          for (const [rx, ry] of [[0, 0], [nrx - 1, nry - 1], [Math.floor(nrx / 2), Math.floor(nry / 2)]]) {
            const b = m.getRegionBounds(rx, ry, { width: nx, height: ny, regionSize: rs });
            const px0 = rx * rs[1], px1 = Math.min(px0 + rs[1], nx), py0 = ry * rs[0], py1 = Math.min(py0 + rs[0], ny);
            // centre of the first / last pixel of the region, renderer (linear) vs transform
            for (const [i, j] of [[py0, px0], [py1 - 1, px1 - 1]]) {
              const lon = b.xMin + ((j - px0 + 0.5) / (px1 - px0)) * (b.xMax - b.xMin);
              const lat = b.yMax - ((i - py0 + 0.5) / (py1 - py0)) * (b.yMax - b.yMin);
              expect(Math.abs(lon - (x0 + (j + 0.5) * dx))).toBeLessThan(1e-9);
              expect(Math.abs(lat - (y0 + (i + 0.5) * dy))).toBeLessThan(1e-9);
            }
          }
        }
      });
      // a shape that matches no level falls back to the dataset box
      expect(m.levelXYLimits(7, 5)).toBe(m.xyLimits);
    });
  }
});

describe("overlapping rasters are isolated (aridity-like + qsat-like layers)", () => {
  const ARID = JSON.parse(fs.readFileSync(path.resolve(__dirname, "fixtures/aridity-zarr-root.json"), "utf8")).attributes.multiscales.layout;
  const QS = v1Layout();
  const FX: Record<string, unknown>[] = [
    { asset: "0", "spatial:transform": [0.1, 0, 9.95, 0, -0.1, -9.95], "spatial:shape": [250, 300] },
    { asset: "1", "spatial:transform": [0.2, 0, 9.95, 0, -0.2, -9.95], "spatial:shape": [125, 150] },
  ];
  function make(lay: Record<string, unknown>[], twoD: boolean) {
    const m = libUntiled();
    Object.assign(m, { variable: "v", crs: "EPSG:4326", metadata: null });
    m._parseUntiledMultiscale({ layout: lay });
    const levels = m.untiledLevels as { shape?: number[] }[];
    lay.forEach((e, k) => { levels[k].shape = twoD ? [...(e["spatial:shape"] as number[])] : [64, ...(e["spatial:shape"] as number[])]; });
    const g0 = storeGeoFromAttrs({ multiscales: { layout: lay } })!;
    Object.assign(m, { levels, dimIndices: twoD ? { lon: { index: 1 }, lat: { index: 0 } } : { lon: { index: 2 }, lat: { index: 1 } }, latIsAscending: false,
      xyLimits: { xMin: g0.bounds[0], yMin: g0.bounds[1], xMax: g0.bounds[2], yMax: g0.bounds[3] } });
    return m;
  }
  const snapshot = (m: ReturnType<typeof make>, lay: Record<string, unknown>[]) => lay.map((e) => {
    const [ny, nx] = e["spatial:shape"] as number[];
    return [[ny, nx], [97, 128], [512, 512]].map((rs) => m.getRegionBounds(Math.floor(Math.ceil(nx / rs[1]) / 2), Math.floor(Math.ceil(ny / rs[0]) / 2), { width: nx, height: ny, regionSize: rs }));
  });
  it("per-level bounds of each layer do not depend on other layers or creation / query order (2 and 3 layers)", () => {
    const alone = { a: snapshot(make(ARID, true), ARID), q: snapshot(make(QS, false), QS), f: snapshot(make(FX, false), FX) };
    for (const order of [["a", "q", "f"], ["q", "a", "f"], ["f", "q", "a"], ["a", "f"], ["q", "a"]]) {
      const inst: Record<string, ReturnType<typeof make>> = {};
      const lays: Record<string, Record<string, unknown>[]> = { a: ARID, q: QS, f: FX };
      for (const k of order) inst[k] = make(lays[k], k === "a");
      // interleaved queries in reverse order (toggling)
      for (const k of [...order].reverse()) expect(snapshot(inst[k], lays[k])).toEqual(alone[k as "a" | "q" | "f"]);
      for (const k of order) expect(snapshot(inst[k], lays[k])).toEqual(alone[k as "a" | "q" | "f"]);
    }
    // a level shape of one layer never resolves to another layer's limits
    const a = make(ARID, true), q = make(QS, false);
    expect(q.levelXYLimits(1440, 600)).toBe(q.xyLimits);         // aridity level 5 shape, unknown to q
    expect((a.levelXYLimits(1440, 600) as { yMin: number }).yMin).toBe(-60);
  });
  it("library state that could be shared is per instance (no module-level region/geometry caches)", () => {
    // module-level mutable state in zarr-layer: only the store/metadata caches keyed by source URL
    const moduleMaps = [...LIB.matchAll(/^var (\w+) = \/\* @__PURE__ \*\/ new (?:Map|WeakMap|Set)\(/gm)].map((m) => m[1]);
    expect(moduleMaps).toEqual(["SPATIAL_DIM_NAMES"]); // constant set of dimension names
    const statics = [...LIB.matchAll(/^(_\w+)\.(_\w+) = \/\* @__PURE__ \*\/ new Map\(\);/gm)].map((m) => `${m[1]}.${m[2]}`);
    expect(statics.sort()).toEqual(["_ZarrStore._cache", "_ZarrStore._storeCache"]);
    expect(LIB).toMatch(/this\.shaderCache = \/\* @__PURE__ \*\/ new Map\(\);/); // programs cached per renderer (per layer)
  });
  it("zarr layers are drawn with renderingMode '2d' (read-only depth: no z-fighting between overlapping rasters)", async () => {
    const reg = loadRegistry().registry;
    const g = storeGeoFromAttrs(V1_ATTRS)!;
    for (const id of ["aridity", "dpm", "qsdiv", "rdpa"]) {
      const l = reg.layers.find((x) => x.id === id)!;
      expect(zarrLayerSource(l, "https://x/a.zarr", g, "https://x/m.zarr").renderingMode).toBe("2d");
    }
    const { ZarrLayer } = await import("@carbonplan/zarr-layer");
    const z = new ZarrLayer({ id: "t", source: "https://x/a.zarr", variable: "v", colormap: ["#000000", "#ffffff"], clim: [0, 1], renderingMode: "2d" });
    expect((z as unknown as { renderingMode: string }).renderingMode).toBe("2d");
    // MapLibre: 2d custom layers get a read-only depth mode, 3d ones read-write
    const ml = fs.readFileSync(path.resolve(__dirname, "../node_modules/maplibre-gl/dist/maplibre-gl-dev.js"), "utf8");
    expect(ml).toMatch(/renderingMode === '3d' \?\s*painter\.getDepthModeFor3D\(\) :\s*painter\.getDepthModeForSublayer\(0, DepthMode\.ReadOnly\)/);
  });
});

const fixture = path.resolve(__dirname, "../../staging/fixture");
const have = fs.existsSync(path.join(fixture, "fields", "at.zarr", "zarr.json")) && fs.existsSync(path.join(fixture, "fields", "qacb.zarr", "zarr.json"));
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

describe.skipIf(!have)("fixture stores", () => {
  it("fixture bbox from metadata is the cell-edge box", async () => {
    const attrs = JSON.parse(fs.readFileSync(path.join(fixture, "fields", "at.zarr", "zarr.json"), "utf8")).attributes;
    const g = storeGeoFromAttrs(attrs)!;
    g.bounds.forEach((v, k) => expect(v).toBeCloseTo([9.95, -34.95, 39.95, -9.95][k], 9));
    expect(rendererPixelCentre(g, 0, 0)[0]).toBeCloseTo(10.0, 9);
  });
  it("masked virtual store: at where qacb > 0, NaN elsewhere; unsharded chunks of one threshold", async () => {
    const atS = new RangeFileStore(path.join(fixture, "fields", "at.zarr"));
    const qS = new RangeFileStore(path.join(fixture, "fields", "qacb.zarr"));
    const ms = new MaskedFieldStore(atS as never, "at", qS as never, "qacb");
    for (const level of ["0", "1"]) {
      const arr = await zarr.open.v3(zarr.root(ms).resolve(`${level}/at`), { kind: "array" });
      expect(arr.chunks[0]).toBe(1);
      const raw = await zarr.open.v3(zarr.root(atS as never).resolve(`${level}/at`), { kind: "array" });
      const q = await zarr.open.v3(zarr.root(qS as never).resolve(`${level}/qacb`), { kind: "array" });
      expect(arr.shape).toEqual(raw.shape);
      for (const ut of [14, 63]) {
        const [m, a, b] = await Promise.all([zarr.get(arr, [ut, null, null]), zarr.get(raw, [ut, null, null]), zarr.get(q, [ut, null, null])]);
        const md = m.data as Float32Array, ad = a.data as Float32Array, bd = b.data as Float32Array;
        let kept = 0, masked = 0;
        for (let i = 0; i < md.length; i++) {
          const want = maskValue(ad[i], bd[i]);
          if (Number.isNaN(want)) { expect(md[i]).toBeNaN(); if (Number.isFinite(ad[i])) masked++; } else { expect(md[i]).toBe(want); kept++; }
        }
        expect(kept).toBeGreaterThan(100);
        expect(masked).toBeGreaterThanOrEqual(0);
      }
    }
    // other keys pass through unchanged
    expect(await ms.get("/zarr.json")).toEqual(await atS.get("/zarr.json"));
  });
});

describe("direction-validity mask (synthetic)", () => {
  // 40 x 20 cells of 1 deg, bearing 90 (east) everywhere; mask > 0 only in the west half
  const nx = 40, ny = 20;
  const dir = (): Grid => ({ data: new Float32Array(nx * ny).fill(90), nx, ny, lon0: 0.5, lat0: 19.5, dlon: 1, dlat: -1 });
  const mask: Grid = { data: new Float32Array(nx * ny).map((_, k) => (k % nx < 20 ? 1 : k % 3 === 0 ? 0 : k % 3 === 1 ? NaN : -2)), nx, ny, lon0: 0.5, lat0: 19.5, dlon: 1, dlat: -1 };
  it("maskValue / applyMask: NaN where mask <= 0 or NaN", () => {
    expect(maskValue(1.2, 0)).toBeNaN();
    expect(maskValue(1.2, NaN)).toBeNaN();
    expect(maskValue(1.2, -1)).toBeNaN();
    expect(maskValue(1.2, 1e-9)).toBe(1.2);
    const d = applyMask(dir(), mask);
    for (let k = 0; k < nx * ny; k++) expect(Number.isNaN(d.data[k])).toBe(k % nx >= 20);
    // different geometry: nearest sampling of the mask
    const coarse: Grid = { data: new Float32Array(20 * 10).map((_, k) => (k % 20 < 10 ? 5 : 0)), nx: 20, ny: 10, lon0: 1, lat0: 19, dlon: 2, dlat: -2 };
    const d2 = applyMask(dir(), coarse);
    for (let k = 0; k < nx * ny; k++) expect(Number.isNaN(d2.data[k])).toBe(k % nx >= 20);
    expect(Array.from(applyMask(dir(), null).data).every(Number.isNaN)).toBe(true);
  });
  it("masked cells produce no arrows and no streamline points", () => {
    const d = applyMask(dir(), mask);
    const seeds = [];
    for (let la = 0.5; la < 20; la += 1) for (let lo = 0.5; lo < 40; lo += 1) seeds.push({ lon: lo, lat: la, len: 0.8 });
    const arrows = arrowFeatures(seeds, d, { axis: false });
    expect(arrows.length).toBeGreaterThan(0);
    // tails (= seeds) only in unmasked cells; an arrow may reach past the mask edge by up to its length (round 6)
    for (const f of arrows) {
      expect(f.geometry.coordinates[0][0][0]).toBeLessThan(20);
      for (const line of f.geometry.coordinates) for (const p of line) expect(p[0]).toBeLessThan(20 + 0.8 + 1e-9);
    }
    // screen 10 px / deg, north up
    const W = 400, H = 200, cell = 2, gx = W / cell + 1, gy = H / cell + 1;
    const lon = new Float64Array(gx * gy), lat = new Float64Array(gx * gy);
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) { lon[j * gx + i] = (i * cell) / 10; lat[j * gx + i] = 20 - (j * cell) / 10; }
    const sf = buildScreenField(lon, lat, gx, gy, cell, false, (lo, la) => sampleUnit(d, lo, la, false));
    const lines = evenStreamlines(sf, { width: W, height: H, dsep: 12 });
    expect(lines.length).toBeGreaterThan(3);
    // no point beyond the mask edge at 20 deg = 200 px (+ bilinear support of one cell, 10 px)
    for (const l of lines) for (const p of l.pts) expect(p[0]).toBeLessThanOrEqual(210);
  });
  it("one rule for map and panel: rdpa<->rdpm, at/ab<->qacb, ae/ao<->qace; maskVar overrides", () => {
    expect(DIRECTION_MASK_VAR).toEqual({ rdpa: "rdpm", at: "qacb", ab: "qacb", ae: "qace", ao: "qace" });
    for (const k of Object.keys(DIRECTION_MASK_VAR)) expect(MODE_DEFINED_BY[k as keyof typeof MODE_DEFINED_BY]).toEqual([DIRECTION_MASK_VAR[k]]);
    const reg = loadRegistry().registry;
    for (const l of reg.layers.filter((x) => x.variable && x.variable in DIRECTION_MASK_VAR)) expect(maskVarOf(l)).toBe(DIRECTION_MASK_VAR[l.variable!]);
    const at = reg.layers.find((l) => l.variable === "at")!;
    expect(maskVarOf({ ...at, display: { ...at.display, maskVar: "qalb" } })).toBe("qalb");
    expect(maskVarOf(reg.layers.find((l) => l.variable === "qacb")!)).toBeUndefined();
  });
  it("colour-map layers get explicit bounds; directional ones a masked store", () => {
    const reg = loadRegistry().registry;
    const g = storeGeoFromAttrs(V1_ATTRS)!;
    const at = reg.layers.find((l) => l.variable === "at")!, q = reg.layers.find((l) => l.variable === "qacb")!;
    const o = zarrLayerSource(at, "https://x/at.zarr", g, "https://x/qacb.zarr");
    expect(o.bounds).toEqual(g.bounds);
    expect(o.latIsAscending).toBe(false);
    expect(o.store).toBeInstanceOf(MaskedFieldStore);
    const o2 = zarrLayerSource(q, "https://x/qacb.zarr", g, undefined);
    expect(o2.store).toBeUndefined();
    expect(o2.bounds).toEqual(g.bounds);
  });
});

describe("patched zarr-layer: antimeridian (regions on both sides of ±180, edge column not clamped)", () => {
  const fn = (start: string, end: string) => method(LIB, start, end);
  const helpers = [
    "var MERCATOR_LAT_LIMIT = 85.05112878;",
    fn("function lonToMercatorNorm(lon) {", "function latToMercatorNorm(lat) {"),
    fn("function latToMercatorNorm(lat) {", "function mercatorNormToLat(mercY) {"),
    fn("function boundsToMercatorNorm(xyLimits, crs) {", "function geoToArrayIndex("),
    fn("function geoToArrayIndex(", "function flipTexCoordV("),
    fn("function computeWorldOffsets(map, isGlobe) {", "// src/render-helpers.ts"),
  ].join("\n");
  const parse = method(LIB, "_parseUntiledMultiscale(metadata) {", "  static clearCache() {");
  const lvl = method(LIB, "levelXYLimits(width, height) {", "  getVisibleRegions(map) {");
  const vis = method(LIB, "getVisibleRegions(map) {", "  /**\n   * Create a region key");
  const reg = method(LIB, "getRegionBounds(regionX, regionY, levelMeta) {", "  /**\n   * Create geometry");
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const make = () => new Function(`${helpers}\nreturn { lib: { ${parse}, ${lvl}, ${vis}, ${reg} }, boundsToMercatorNorm, computeWorldOffsets };`)() as {
    lib: Record<string, unknown> & { _parseUntiledMultiscale(m: unknown): void; getVisibleRegions(map: unknown): { regionX: number; regionY: number }[]; getRegionBounds(rx: number, ry: number, lm?: unknown): { xMin: number; xMax: number; yMin: number; yMax: number } };
    boundsToMercatorNorm(b: { xMin: number; xMax: number; yMin: number; yMax: number }, crs: string): { x0: number; x1: number };
    computeWorldOffsets(map: unknown, isGlobe: boolean): number[];
  };
  it("patch markers present", () => {
    expect(LIB).toContain("dune-atlas patch: antimeridian - raster bounds are not clamped");
    expect(LIB).toContain("dune-atlas patch: antimeridian - the viewport may extend beyond ±180");
    expect(LIB).toContain("x0: lonToMercatorNormUnclamped(geoBounds.xMin),");
  });
  const era5Layout = () => {
    const out = []; let ny = 721, nx = 1440, d = 0.25;
    for (let k = 0; k < 4; k++) { out.push({ asset: String(k), "spatial:transform": [d, 0, -180.125, 0, -d, 90.125], "spatial:shape": [ny, nx] }); ny = Math.floor(ny / 2); nx = Math.floor(nx / 2); d *= 2; }
    return out;
  };
  for (const [name, layout, half] of [["ERA5-Land 0.1°", v1Layout(4), 0.05], ["ERA5 0.25°", era5Layout(), 0.125]] as const) {
    describe(name, () => {
      const setup = (k: number, rs: number) => {
        const h = make(), m = h.lib;
        m._parseUntiledMultiscale({ layout });
        const levels = m.untiledLevels as { shape?: number[] }[];
        layout.forEach((e, i) => { levels[i].shape = [64, ...(e["spatial:shape"] as number[])]; });
        const g0 = storeGeoFromAttrs({ multiscales: { layout } })!;
        const [ny, nx] = layout[k]["spatial:shape"] as number[];
        Object.assign(m, { variable: "v", crs: "EPSG:4326", metadata: null, levels, latIsAscending: false, dimIndices: { lon: { index: 2 }, lat: { index: 1 } },
          xyLimits: { xMin: g0.bounds[0], yMin: g0.bounds[1], xMax: g0.bounds[2], yMax: g0.bounds[3] }, width: nx, height: ny, regionSize: [rs, rs] });
        return { h, m, nx, ny, rs };
      };
      it("edge column keeps its width: region 0 starts at x < 0 (lon -180 - half cell)", () => {
        const { h, m, rs } = setup(0, 128);
        const b = m.getRegionBounds(0, 3, undefined);
        expect(b.xMin).toBeCloseTo(-180 - half, 9);
        const mb = h.boundsToMercatorNorm(b, "EPSG:4326");
        expect(mb.x0).toBeCloseTo(-half / 360, 12);
        expect((mb.x1 - mb.x0) * 360).toBeCloseTo(rs * 2 * half, 9); // rs columns of the cell size
      });
      const views: [number, number][] = [];
      for (const c of [179.99, -179.99, 180.01, -180.01, 179.9, -179.95]) for (const hw of [0.02, 0.1, 0.5, 3, 20]) views.push([c - hw, c + hw]);
      for (const k of [0, 2]) for (const proj of ["mercator", "globe"] as const) {
        it(`level ${k}, ${proj}: every cell column of a viewport across ±180 is drawn on both sides`, () => {
          const { h, m, nx, rs } = setup(k, 64);
          const lm = { width: nx, height: (layout[k]["spatial:shape"] as number[])[0], regionSize: [64, 64] };
          for (const [w, e] of views) {
            // MapLibre gives unwrapped bounds in Mercator; on the globe they may come wrapped (west > east)
            const wrap = (x: number) => x - 360 * Math.round(x / 360);
            const [bw, be] = proj === "globe" ? [wrap(w), wrap(e)] : [w, e];
            const map = { getBounds: () => ({ toArray: () => [[bw, 60], [be, 70]], getWest: () => bw, getEast: () => be }), getRenderWorldCopies: () => true };
            const regs = m.getVisibleRegions(map);
            const worlds = h.computeWorldOffsets(map, proj === "globe");
            expect(regs.length).toBeLessThan(Math.ceil(nx / rs) * 10); // not the whole world
            const ranges = regs.map((r) => { const b = m.getRegionBounds(r.regionX, r.regionY, lm); const mb = h.boundsToMercatorNorm(b, "EPSG:4326"); return { x0: mb.x0, x1: mb.x1, s: b.yMin, n: b.yMax }; });
            const step = Math.min(0.01, (e - w) / 50);
            for (let lon = w; lon <= e + 1e-9; lon += step) {
              const x = (lon + 180) / 360;
              const offs = proj === "globe" ? [-1, 0, 1] : worlds; // the sphere is periodic; Mercator draws the listed world copies
              const hit = ranges.some((r) => r.s <= 65 && r.n >= 65 && offs.some((o) => x >= r.x0 + o - 1e-12 && x <= r.x1 + o + 1e-12));
              expect(hit, `${name} level ${k} ${proj} view [${w}, ${e}] lon ${lon.toFixed(3)}`).toBe(true);
            }
          }
        });
      }
    });
  }
  it("selected-cell highlight of a cell centred at -180 is drawn on both sides (no outline on the seam)", async () => {
    const { cellFeature } = await import("../src/cell/snap");
    for (const [g, half] of [[ERA5_LAND_GRID, 0.05], [{ lat0: 90, dlat: -0.25, lon0: -180, dlon: 0.25, ny: 721, nx: 1440 }, 0.125]] as const) {
      const c = cellFromIndex(426, 0, g);
      expect(c.lon).toBe(-180);
      const fc = cellFeature(c, g);
      const fill = fc.features.find((f) => f.properties?.part === "fill")!.geometry as GeoJSON.MultiPolygon;
      const xs = fill.coordinates.map((p) => p[0].map((q) => q[0]));
      expect(xs.map((x) => [Math.min(...x), Math.max(...x)])).toEqual([[-180, -180 + half], [180 - half, 180]]);
      const outline = fc.features.find((f) => f.properties?.part === "outline")!.geometry as GeoJSON.MultiLineString;
      for (const line of outline.coordinates) for (let i = 1; i < line.length; i++) {
        const [a, b] = [line[i - 1], line[i]];
        expect(a[0] === b[0] && Math.abs(a[0]) === 180).toBe(false); // no edge along the seam
      }
      expect(JSON.stringify(fc)).not.toMatch(/-18[01]\.\d*[1-9]|18[01]\.\d*[1-9]/); // all longitudes within ±180
      // an interior cell stays one polygon
      expect(cellFeature(cellFromIndex(426, 5, g), g).features).toHaveLength(1);
    }
  });
});
