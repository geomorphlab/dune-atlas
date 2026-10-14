// @vitest-environment happy-dom
// Regional box export: box normalisation and the cells of a box (antimeridian, poles, full width), size estimate
// and browser limits, fetching (concurrency, progress, cancel), the CF-1.8 NetCDF content (read back) and the
// README; the box drawing on the globe and the flat map (densified edges, unwrapped drag across 180°, no pan
// while drawing, Esc); and the popover (typed bounds, estimate, limits).
import { describe, expect, it, vi } from "vitest";
import { boxCells, bytesPerCell, estimateRegion, fetchRegion, normaliseBox, REGION_LIMITS, regionNetcdf, regionReadme, sizeText, type Box, type RegionMeta, type RegionSelection } from "../src/core/export/region";
import { BoxDrawer, boxFeature, boxRing, dragBox } from "../src/core/map/boxdraw";
import { boundsFromInputs, inputsFromBox, newRegionState, regionForm, type RegionContext, type RegionOptions } from "../src/core/ui/regionExport";
import { ERA5_LAND_GRID, type Grid } from "../src/core/cell/snap";
import type { CellData } from "../src/core/cell/cellstore";
import { makeCell, FIELD_VARS } from "./helpers";
import { readNc } from "./ncreader";
import { C } from "../src/core/util/constants";
import { Tools } from "../src/core/ui/tools";

const ERA5: Grid = { lat0: 90, dlat: -0.25, lon0: -180, dlon: 0.25, ny: 721, nx: 1440 };

describe("box and its cells", () => {
  it("normalises: ordered latitudes clamped to ±90, east unwrapped past 180 for a box across the antimeridian", () => {
    expect(normaliseBox({ west: 10, east: 20, south: 5, north: -5 })).toEqual({ west: 10, east: 20, south: -5, north: 5, width: 10 });
    expect(normaliseBox({ west: 170, east: -170, south: 0, north: 1 })).toMatchObject({ west: 170, east: 190, width: 20 });
    expect(normaliseBox({ west: 350, east: 10, south: 0, north: 1 })).toMatchObject({ west: -10, east: 10, width: 20 });   // Mars 0-360 E
    expect(normaliseBox({ west: -180, east: 180, south: -95, north: 95 })).toMatchObject({ south: -90, north: 90, width: 360 });
  });
  it("cells whose centres lie in the box (0.1°; south and west edges included, north and east excluded)", () => {
    const c = boxCells({ west: 15, east: 15.35, south: -24.6, north: -24.4 }, ERA5_LAND_GRID);
    expect(c.lats.map((x) => +x.toFixed(2))).toEqual([-24.5, -24.6]);
    expect(c.lons.map((x) => +x.toFixed(2))).toEqual([15, 15.1, 15.2, 15.3]);
    expect(c.iys).toEqual([1145, 1146]);
    expect(c.ixs).toEqual([1950, 1951, 1952, 1953]);
  });
  it("across the antimeridian: columns wrap, longitudes stay increasing (unwrapped)", () => {
    const c = boxCells({ west: 179.5, east: -179.5, south: 0, north: 0.5 }, ERA5);
    expect(c.ixs).toEqual([1438, 1439, 0, 1]);
    expect(c.lons).toEqual([179.5, 179.75, 180, 180.25]);
  });
  it("to a pole, and the full width of the globe once", () => {
    const c = boxCells({ west: -180, east: 180, south: 89.6, north: 90 }, ERA5);
    expect(c.iys).toEqual([0, 1]);
    expect(c.ixs.length).toBe(1440);
    expect(new Set(c.ixs).size).toBe(1440);
    expect(boxCells({ west: 0, east: 0.01, south: 0.01, north: 0.02 }, ERA5).iys).toEqual([]);   // no centre inside
  });
  it("a non-global grid: columns by their longitude", () => {
    const g: Grid = { lat0: -10, dlat: -0.1, lon0: 10, dlon: 0.1, ny: 250, nx: 300 };
    expect(boxCells({ west: 10.05, east: 10.35, south: -10.25, north: -10.05 }, g)).toMatchObject({ iys: [1, 2], ixs: [1, 2, 3] });
  });
});

const SEL: RegionSelection = { fields: ["dpm", "rdpa"], wind: false, aux: [], dune: true, allThresholds: true, current: 14 };
const SHAPE = { nThr: 64, wind: { kind: "hist" as const, nUm: 128, nUa: 128 } };
describe("size estimate and limits", () => {
  it("bytes per cell follow the tick list and the range", () => {
    expect(bytesPerCell(SEL, SHAPE)).toBe(4 * (2 * 64 + 2 + 1));
    expect(bytesPerCell({ ...SEL, allThresholds: false }, SHAPE)).toBe(4 * (2 + 2 + 1));
    expect(bytesPerCell({ ...SEL, wind: true }, SHAPE)).toBe(4 * (2 * 64 + 128 * 128 + 2 + 1));
    expect(bytesPerCell({ ...SEL, wind: true }, { nThr: 64, wind: { kind: "series", nHours: 16032 } })).toBe(4 * (2 * 64 + 5 * 16032 + 2 + 1));
    expect(bytesPerCell({ ...SEL, aux: ["qsdiv", "ai_mean"] }, SHAPE)).toBe(4 * (2 * 64 + 64 + 1 + 2 + 1));
  });
  it("limits: cells and bytes; the reason is given", () => {
    const small = estimateRegion({ west: 15, east: 16, south: -25, north: -24 }, ERA5_LAND_GRID, SEL, SHAPE);
    expect(small).toMatchObject({ cells: 100, rows: 10, cols: 10, ok: true });
    expect(estimateRegion({ west: 0, east: 10, south: 0, north: 10 }, ERA5_LAND_GRID, SEL, SHAPE)).toMatchObject({ ok: false, reason: "cells" });
    const heavy = estimateRegion({ west: 15, east: 19.9, south: -25, north: -20.1 }, ERA5_LAND_GRID, { ...SEL, wind: true }, SHAPE);
    expect(heavy.cells).toBeLessThanOrEqual(REGION_LIMITS.cells);
    expect(heavy).toMatchObject({ ok: false, reason: "bytes" });
    expect(estimateRegion({ west: 0, east: 0.01, south: 0.01, north: 0.02 }, ERA5, SEL, SHAPE).reason).toBe("empty");
    expect(sizeText(5 * 2 ** 20)).toBe("5.0 MB");
    expect(sizeText(2000)).toBe("2 kB");
  });
});

/** a cell with distinct values: field f at threshold k = 1000 * iy + ix + k / 100 */
function cellAt(iy: number, ix: number, g: Grid, o: { hasData?: boolean; dune?: boolean } = {}): CellData {
  const n = 64, fields = new Float32Array(FIELD_VARS.length * n);
  FIELD_VARS.forEach((_, i) => { for (let k = 0; k < n; k++) fields[i * n + k] = 1000 * iy + ix + k / 100 + i * 1e5; });
  const hist = new Uint32Array(128 * 128); hist[3] = iy; hist[128 * 128 - 1] = ix;
  return makeCell({ iy, ix, lat: g.lat0 + g.dlat * iy, lon: g.lon0 + g.dlon * ix, hist, fields, grid: g, hasData: o.hasData ?? true, dune: o.dune ?? (ix % 2 === 0),
    aux: { series: { qsdiv: Float32Array.from({ length: n }, (_, k) => -k) }, scalars: { ai_mean: iy / 10 }, attrs: {} } });
}
const META = (box: Box): RegionMeta => ({ datasetId: "era5", datasetTitle: "ERA5 0.25°, 1950–2024", dataVersion: "v2", permalink: "https://map.geomorphlab.org/?x=1", box, body: "earth",
  axis: { name: "ut", units: "m s-1", longName: "threshold friction velocity", values: C.UT_VALUES }, generated: new Date("2026-10-15T00:00:00Z") });

describe("fetching", () => {
  it("every cell once with a few in flight, progress, no-data cells as null, the wind skipped when not ticked", async () => {
    const box = { west: 179.5, east: -179.5, south: 0, north: 0.5 };
    const cells = boxCells(box, ERA5);
    let inFlight = 0, peak = 0;
    const calls: [number, number, boolean | undefined][] = [];
    const store = { query: async (iy: number, ix: number, o?: { wind?: boolean }) => { calls.push([iy, ix, o?.wind]); inFlight++; peak = Math.max(peak, inFlight); await new Promise((r) => setTimeout(r, 1)); inFlight--; return cellAt(iy, ix, ERA5, { hasData: ix !== 0 }); } };
    const prog: number[] = [];
    const out = await fetchRegion(store, cells, { concurrency: 3, onProgress: (d) => prog.push(d), wind: false });
    expect(out.length).toBe(8);
    expect(calls.length).toBe(8);
    expect(calls.every((c) => c[2] === false)).toBe(true);
    expect(peak).toBeLessThanOrEqual(3);
    expect(prog.at(-1)).toBe(8);
    expect(out.filter((c) => c === null).length).toBe(2);   // ix 0 has no data
  });
  it("cancelled by the signal", async () => {
    const ctl = new AbortController();
    const store = { query: async (iy: number, ix: number) => { ctl.abort(); return cellAt(iy, ix, ERA5); } };
    await expect(fetchRegion(store, boxCells({ west: 0, east: 1, south: 0, north: 1 }, ERA5), { signal: ctl.signal, concurrency: 1 })).rejects.toThrow("cancelled");
  });
});

describe("NetCDF content (CF-1.8)", () => {
  const box = { west: 179.5, east: -179.5, south: 0, north: 0.5 };
  const grid = boxCells(box, ERA5);
  const cells = grid.iys.flatMap((iy) => grid.ixs.map((ix) => (ix === 0 ? null : cellAt(iy, ix, ERA5))));
  it("all thresholds: coordinates, bounds, fields (threshold, lat, lon), aux, dune flag, has_data, attributes", () => {
    const sel: RegionSelection = { fields: ["dpm", "rdpa"], wind: true, aux: ["qsdiv", "ai_mean"], dune: true, allThresholds: true, current: 14 };
    const r = readNc(regionNetcdf(cells, grid, ERA5, sel, META(box)));
    expect(r.dims.map((d) => [d.name, d.size])).toEqual([["lat", 2], ["lon", 4], ["nv", 2], ["ut", 64], ["um_bin", 128], ["ua_bin", 128]]);
    expect(r.vars.lat.data).toEqual([0.25, 0]);
    expect(r.vars.lon.data).toEqual([179.5, 179.75, 180, 180.25]);
    expect((r.vars.lon_bnds.data as number[]).slice(0, 2)).toEqual([179.375, 179.625]);
    expect(r.vars.cell_x.data).toEqual([1438, 1439, 0, 1]);
    expect(r.vars.dpm.dims).toEqual(["ut", "lat", "lon"]);
    const n = 8, iDp = FIELD_VARS.indexOf("dpm");
    const dp = r.vars.dpm.data as number[];
    // (ut 14, lat row 1 = iy 360, lon col 3 = ix 1)
    expect(dp[14 * n + 1 * 4 + 3]).toBeCloseTo(1000 * 360 + 1 + 0.14 + iDp * 1e5, 0);
    expect(Number.isNaN(dp[14 * n + 2])).toBe(true);   // ix 0: no data
    expect(r.vars.has_data.data).toEqual([1, 1, 0, 1, 1, 1, 0, 1]);
    expect((r.vars.dune_present.data as number[])[0]).toBe(1);   // ix 1438 even
    expect(r.vars.qsdiv.dims).toEqual(["ut", "lat", "lon"]);
    expect(r.vars.ai_mean.dims).toEqual(["lat", "lon"]);
    expect(r.vars.wind_hist.dims).toEqual(["lat", "lon", "um_bin", "ua_bin"]);
    expect((r.vars.wind_hist.data as number[])[3]).toBe(359);
    expect(String(r.vars.dpm.attrs.units)).toBe("m2 s-1");
    expect(String(r.vars.lon.attrs.standard_name)).toBe("longitude");
    expect(r.gatts.Conventions).toBe("CF-1.8");
    expect(String(r.gatts.title)).toBe("Dune Atlas region export: ERA5 0.25° cells in 0.00° N to 0.50° N, 179.50° E to 179.50° W");
    expect(String(r.gatts.references)).toContain("Hersbach");
    expect(String(r.gatts.fields_license)).toContain("Copernicus");
    expect(String(r.gatts.history)).toContain("https://map.geomorphlab.org/?x=1");
    expect(Number(([] as unknown[]).concat(r.gatts.geospatial_lon_max)[0])).toBe(180.5);
  });
  it("current threshold only: no threshold dimension, a scalar ut coordinate", () => {
    const sel: RegionSelection = { fields: ["dpm"], wind: false, aux: ["qsdiv"], dune: false, allThresholds: false, current: 14 };
    const r = readNc(regionNetcdf(cells, grid, ERA5, sel, META(box)));
    expect(r.dims.map((d) => d.name)).toEqual(["lat", "lon", "nv"]);
    expect(r.vars.dpm.dims).toEqual(["lat", "lon"]);
    expect(r.vars.ut.dims).toEqual([]);
    expect((r.vars.ut.data as number[])[0]).toBeCloseTo(0.15, 6);
    expect(String(r.vars.dpm.attrs.coordinates)).toBe("lat lon ut");
    expect((r.vars.qsdiv.data as number[])[1]).toBe(-14);
    expect(r.vars.wind_hist).toBeUndefined();
    expect(r.vars.dune_present).toBeUndefined();
  });
  it("README: box, size, contents, licences and citation", () => {
    const t = regionReadme(SEL, META(box), { rows: 2, cols: 5, withData: 8 }, "x.nc", "https://github.com/geomorphlab/dune-atlas/blob/main/DATA_LICENSE.md");
    expect(t).toContain("2 rows x 5 columns, 8 cells with data");
    expect(t).toContain("Contents: dpm, rdpa, dune_present; all 64 values of threshold friction velocity");
    expect(t).toContain("DATA_LICENSE.md");
    expect(t).toContain("Copernicus");
    expect(t).toContain("Gunn, A. (2026)");
  });
});

/** map stand-in: events with lngLat, dragPan, projection, style sources and layers */
class MiniMap {
  listeners = new Map<string, ((e: unknown) => void)[]>();
  sources = new Map<string, { data: unknown; setData(d: unknown): void }>();
  layers: string[] = [];
  proj = "globe";
  dragPan = { on: true, disable() { this.on = false; }, enable() { this.on = true; } };
  boxZoom = { disable() {}, enable() {} };
  canvas = document.createElement("canvas");
  container = document.createElement("div");
  on(t: string, f: (e: unknown) => void) { this.listeners.set(t, [...(this.listeners.get(t) ?? []), f]); return this; }
  fire(t: string, lng?: number, lat?: number) { for (const f of this.listeners.get(t) ?? []) f({ lngLat: { lng, lat }, preventDefault() {} }); }
  getCanvas() { return this.canvas; }
  getContainer() { return this.container; }
  getProjection() { return { type: this.proj }; }
  isStyleLoaded() { return true; }
  getStyle() { return {}; }
  getSource(id: string) { return this.sources.get(id); }
  addSource(id: string, s: { data: unknown }) { const src = { data: s.data, setData(d: unknown) { src.data = d; } }; this.sources.set(id, src); }
  addLayer(l: { id: string }) { this.layers.push(l.id); }
}
const ring = (m: MiniMap) => ((m.sources.get("region-box")!.data as GeoJSON.FeatureCollection).features[0]?.geometry as GeoJSON.Polygon | undefined)?.coordinates[0];

describe("box drawing (globe and flat views)", () => {
  it("edges follow parallels and meridians, densified to at most 1° per segment", () => {
    const r = boxRing({ west: 10, east: 40, south: 20, north: 60 });
    expect(r[0]).toEqual([10, 20]);
    expect(r.at(-1)).toEqual([10, 20]);
    for (let i = 1; i < r.length; i++) {
      const [a, b] = [r[i - 1], r[i]];
      expect(a[0] === b[0] || a[1] === b[1]).toBe(true);   // along a meridian or a parallel
      expect(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))).toBeLessThanOrEqual(1 + 1e-9);
    }
    expect(r.filter((p) => p[1] === 60).length).toBe(31);    // north edge: 30 segments
  });
  it("flat view: latitudes clamped to the Web Mercator range; a box across 180° keeps increasing longitudes", () => {
    expect(Math.max(...boxRing({ west: 0, east: 10, south: 80, north: 90 }, 1, true).map((p) => p[1]))).toBeCloseTo(85.0511, 3);
    expect(Math.max(...boxRing({ west: 0, east: 10, south: 80, north: 90 }).map((p) => p[1]))).toBe(90);   // globe: to the pole
    const x = boxRing({ west: 170, east: -170, south: 0, north: 5 }).map((p) => p[0]);
    expect(Math.min(...x)).toBe(170); expect(Math.max(...x)).toBe(190);
    expect(boxFeature(null).features).toEqual([]);
    expect(dragBox({ lng: 5, lat: 10 }, { lng: -5, lat: -10 })).toEqual({ west: -5, east: 5, south: -10, north: 10 });
  });
  for (const proj of ["globe", "mercator"]) {
    it(`${proj}: drawing disables panning (no globe rotation), a drag draws the box, across 180° unwrapped; the end click is swallowed`, async () => {
      const m = new MiniMap(); m.proj = proj;
      const d = new BoxDrawer(m as never);
      const p = d.draw();
      expect(m.dragPan.on).toBe(false);
      expect(d.active).toBe(true);
      m.fire("mousedown", 175, 10);
      m.fire("mousemove", 179, 12);
      m.fire("mousemove", -178, 15);     // crossed the antimeridian eastward
      expect(d.box).toEqual({ west: 175, east: 182, south: 10, north: 15 });
      expect(Math.max(...ring(m)!.map((q) => q[0]))).toBe(182);
      m.fire("mouseup");
      expect(await p).toEqual({ west: 175, east: 182, south: 10, north: 15 });
      expect(m.dragPan.on).toBe(true);
      expect(d.active).toBe(true);        // the click that follows mouseup
      await new Promise((r) => setTimeout(r, 0));
      expect(d.active).toBe(false);
      m.proj = proj === "globe" ? "mercator" : "globe";
      d.refresh();
      expect(ring(m)).toBeDefined();
    });
  }
  it("Esc cancels drawing (panning back on, the key does not reach the cell panel)", async () => {
    const m = new MiniMap();
    const d = new BoxDrawer(m as never);
    const p = d.draw();
    m.fire("mousedown", 0, 0); m.fire("mousemove", 5, 5);
    const e = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true });
    document.dispatchEvent(e);
    expect(await p).toBeNull();
    expect(e.defaultPrevented).toBe(true);
    expect(m.dragPan.on).toBe(true);
    expect(d.active).toBe(false);
  });
  it("the box is drawn again after a basemap change (style.load)", () => {
    const m = new MiniMap();
    const d = new BoxDrawer(m as never);
    d.show({ west: 0, east: 1, south: 0, north: 1 });
    m.sources.clear(); m.layers = [];
    m.fire("style.load");
    expect(m.layers).toEqual(["region-box-fill", "region-box-line"]);
    expect(ring(m)!.length).toBeGreaterThan(4);
  });
});

const CTX: RegionContext = {
  grid: ERA5_LAND_GRID, shape: SHAPE, fields: FIELD_VARS.slice(0, 3).map((id) => ({ id, label: id })), aux: [{ id: "qsdiv", label: "Flux divergence" }],
  wind: { label: "Wind histogram" }, axis: { name: "threshold friction velocity", count: 64, current: 14, currentText: "0.15 m/s" }, datasetName: "ERA5-Land 0.1°",
};
function form(o: Partial<RegionOptions> = {}) {
  const show = vi.fn();
  const opts: RegionOptions = { lonRange: 180, context: async () => CTX, draw: async () => null, show, run: async () => ({ name: "x.zip", cells: 1, withData: 1 }), ...o };
  const el = regionForm(opts, newRegionState(), CTX, () => {});
  document.body.replaceChildren(el);
  const set = (v: Record<string, string>) => { for (const [k, x] of Object.entries(v)) { const i = el.querySelector(`[id$="-${k}"]`) as HTMLInputElement; i.value = x; i.dispatchEvent(new Event("input")); } };
  return { el, set, show, est: () => el.querySelector(".region-estimate")!.textContent, run: el.querySelector(".run-region") as HTMLButtonElement };
}
describe("Download a region (popover)", () => {
  it("typed bounds: parsed, shown on the map, estimated; download enabled within the limits", () => {
    const f = form();
    expect(f.est()).toBe("Type the bounds or draw a box on the map.");
    expect(f.run.disabled).toBe(true);
    f.set({ north: "-24", south: "-25", west: "15", east: "16" });
    expect(f.show).toHaveBeenLastCalledWith({ north: -24, south: -25, west: 15, east: 16 });
    expect(f.est()).toMatch(/^100 cells \(10 rows × 10 columns of ERA5-Land 0\.1°\), about \d+ kB\.$/);
    expect(f.run.disabled).toBe(false);
    f.set({ west: "0", east: "10", south: "0", north: "10" });
    expect(f.est()).toContain("too many for the browser (at most 2,500 cells)");
    expect(f.run.disabled).toBe(true);
    f.set({ north: "abc" });
    expect(f.est()).toBe("Bounds: type all four bounds in degrees.");
  });
  it("range radios and parameters change the estimate; nothing ticked disables the download", () => {
    const f = form();
    f.set({ north: "-24", south: "-25", west: "15", east: "16" });
    const a = f.est();
    (f.el.querySelectorAll(".region-range input")[1] as HTMLInputElement).click();
    expect(f.est()).not.toBe(a);
    expect(f.el.querySelector(".region-ranges")!.textContent).toContain("Current threshold friction velocity only (0.15 m/s)");
    for (const i of f.el.querySelectorAll(".region-param input")) { (i as HTMLInputElement).checked = false; i.dispatchEvent(new Event("change")); }
    expect(f.est()).toContain("Tick at least one parameter.");
    expect(f.run.disabled).toBe(true);
  });
  it("bounds conversion both ways (Earth -180..180, Mars 0..360 E, across the date line / 0° E)", () => {
    expect(boundsFromInputs({ north: "1", south: "0", west: "170", east: "-170" }, 180)).toEqual({ north: 1, south: 0, west: 170, east: -170 });
    expect(boundsFromInputs({ north: "1", south: "0", west: "-10", east: "10" }, 360)).toBe("longitudes must be between 0 and 360° E");
    expect(boundsFromInputs({ north: "0", south: "1", west: "1", east: "2" }, 180)).toBe("north must be larger than south");
    expect(inputsFromBox({ west: 175, east: 182, south: 10, north: 15 }, 180)).toEqual({ north: "15", south: "10", west: "175", east: "-178" });
    expect(inputsFromBox({ west: -10, east: 10, south: 0, north: 1 }, 360)).toEqual({ north: "1", south: "0", west: "350", east: "10" });
  });
  it("the tools column has the region button (after the camera) when the app provides the export", () => {
    const t = new Tools({ startTour: vi.fn(), shareLink: () => "", exportMap: vi.fn(async () => {}), openAbout: vi.fn(), region: { lonRange: 180, context: async () => CTX, draw: async () => null, show: vi.fn(), run: vi.fn() } } as never);
    expect([...t.el.querySelectorAll("button")].map((b) => b.className.replace("tool-btn ", ""))).toEqual(["help-btn", "concepts-btn", "share-btn", "export-btn", "region-btn", "planet-btn"]);
    expect(t.el.querySelector(".region-btn")!.getAttribute("aria-label")).toBe("Download a region");
  });
});
