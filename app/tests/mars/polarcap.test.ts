// Globe polar caps (src/bodies/mars/map/polarcap.ts, esri.ts esriPolarCap): cap geometry and texture coordinates,
// MapLibre's hillshade maths mirrored for the cap and its continuity with the tiles at 85.05°, texture level
// choice, layer installation / ordering / style mirroring on a fake map, and the Esri cap composition.
import { describe, expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => ({ default: { addProtocol: () => {} } }));

import { mercatorXY } from "../../src/map/globelines";
import {
  BASEMAP_CAP_ID, CAP_RHO_DEG, MERC_LAT, R_MARS_2000, MAPLIBRE_CIRCUMFERENCE, basemapCapKind, capFrame, capGrid, capLevel, capLonLat,
  capPixelM, capUV, exaggerationForZoom, fillMesh, gridTriangles, hexColor, installPolarCaps, maplibreDeriv, standardHillshade, trianglesArea,
  PolarCapLayer,
} from "../../src/bodies/mars/map/polarcap";
import { planPolarCap, esriPolarCap, resetEsri, type EsriEnv } from "../../src/bodies/mars/map/esri";

const D2R = Math.PI / 180;

describe("cap geometry", () => {
  it("texture coordinates: inverse, orientation, seam inside the texture (= terrain_polar.cap_uv)", () => {
    for (const north of [true, false]) for (const [lon, lat] of [[0, 87], [90, 86], [-135.5, 89.9], [179.9, 85.06]]) {
      const la = north ? lat : -lat;
      const [u, v] = capUV(lon, la, north);
      const [lo2, la2] = capLonLat(u, v, north);
      expect(lo2).toBeCloseTo(lon, 9); expect(la2).toBeCloseTo(lat, 9);
    }
    expect(capUV(0, 87, true)[1]).toBeGreaterThan(0.5);       // north: lon 0 down
    expect(capUV(0, -87, false)[1]).toBeLessThan(0.5);        // south: lon 0 up
    expect(capUV(90, 87, true)[0]).toBeGreaterThan(0.5);      // 90 E right
    const r = (90 - MERC_LAT) / CAP_RHO_DEG;
    expect(r).toBeLessThan(1);
    expect((1 - r) * 128).toBeGreaterThan(2);                  // >= 2 px margin at 256 px for the 3x3 stencil
  });
  it("grid mesh: outer ring on the Mercator edge (y = 0 / 1), finite vertices up to the pole, area = cap", () => {
    for (const north of [true, false]) {
      const m = capGrid(north);
      expect(m.vertices * 2).toBe(m.pos.length);
      expect(m.pos.every(Number.isFinite) && m.uv.every(Number.isFinite)).toBe(true);
      const nLon = 361;
      for (let j = 0; j < nLon; j++) expect(m.pos[2 * j + 1]).toBeCloseTo(north ? 0 : 1, 6);
      const t = gridTriangles(north);
      expect(trianglesArea(t)).toBeCloseTo(2 * Math.PI * (1 - Math.sin(MERC_LAT * D2R)), 9);
    }
  });
  it("fill mesh: pole vertices clamped finite, one index per vertex", () => {
    const m = fillMesh([0, 85.1, 10, 85.1, 5, 90]);
    expect(m.index.length).toBe(3);
    expect(m.pos.every(Number.isFinite)).toBe(true);
    expect(m.pos[5]).toBeLessThan(mercatorXY(0, 85.1)[1]);
  });
});

describe("hillshade maths (MapLibre 5 hillshade_prepare + standard_hillshade)", () => {
  /** MapLibre's prepare pass for a planar ramp on a Mercator tile of zoom z at latitude lat (512 px tile) */
  const prepare = (gE: number, gS: number, lat: number, z: number) => {
    const tileSize = 512, px = (2 * Math.PI * R_MARS_2000 * Math.cos(lat * D2R)) / (tileSize * 2 ** z);
    const sob = [8 * gE * px, 8 * gS * px];
    const d = sob.map((s) => (s * tileSize) / 2 ** (exaggerationForZoom(z) + (28.2562 - z)));
    return d.map((v) => Math.max(-4, Math.min(4, v)) / Math.cos(lat * D2R)) as [number, number];
  };
  it("maplibreDeriv equals the prepare pass (Earth circumference constant, zoom exaggeration, clamp)", () => {
    expect(2 ** 28.2562 / 8).toBeCloseTo(MAPLIBRE_CIRCUMFERENCE, -3);
    for (const [g, lat, z] of [[0.01, 10, 3], [0.05, 60, 6], [0.3, 85.04, 2], [2, 84, 8]] as const) {
      const a = maplibreDeriv(g, -g / 2, lat, z), b = prepare(g, -g / 2, lat, z);
      expect(a[0]).toBeCloseTo(b[0], 2); expect(a[1]).toBeCloseTo(b[1], 2);
    }
  });
  it("flat ground shows the background; slopes facing the light are lighter than slopes facing away", () => {
    const o = { exaggeration: 0.65, azimuthRad: 335 * D2R, shadow: hexColor("#000000"), highlight: hexColor("#8d949c"), accent: hexColor("#2a2f35"), background: hexColor("#1b1f24") };
    const flat = standardHillshade([0, 0], o);
    expect(flat.map((v) => +v.toFixed(6))).toEqual(hexColor("#1b1f24").map((v) => +v.toFixed(6)));
    // light from 335 deg (NNW): a slope rising towards the south-east (falling towards the light) faces it
    const lit = standardHillshade([0.4, 0.4], o), dark = standardHillshade([-0.4, -0.4], o);
    expect(lit[0]).toBeGreaterThan(dark[0]);
  });
  it("cap frame: east / south unit vectors in texture space", () => {
    for (const north of [true, false]) for (const lon of [0, 37, -120]) {
      const { east, south } = capFrame(lon, north);
      expect(Math.hypot(...east)).toBeCloseTo(1, 12); expect(east[0] * south[0] + east[1] * south[1]).toBeCloseTo(0, 12);
      // moving south from lat 87 increases |lat| distance from the north pole / decreases it at the south pole
      const [u0, v0] = capUV(lon, north ? 87 : -87, north), [u1, v1] = capUV(lon, north ? 86.9 : -87.1, north);
      const d = [u1 - u0, v1 - v0], L = Math.hypot(d[0], d[1]);
      expect(d[0] / L).toBeCloseTo(south[0], 6); expect(d[1] / L).toBeCloseTo(south[1], 6);
      const [u2, v2] = capUV(lon + 0.005, north ? 87 : -87, north), [u3, v3] = capUV(lon - 0.005, north ? 87 : -87, north), e = [u2 - u3, v2 - v3], Le = Math.hypot(e[0], e[1]);
      expect(e[0] / Le).toBeCloseTo(east[0], 6); expect(e[1] / Le).toBeCloseTo(east[1], 6);
    }
  });
  it("seam: cap shading at 85.06° equals the tile shading at 85.04° for a smooth synthetic relief", () => {
    // relief z(lon, lat) with gradients of a few % ; tile side from Mercator finite differences, cap side from the
    // AEQD texture stencil at the level chosen for the zoom, both through maplibreDeriv + standardHillshade
    const zf = (lon: number, lat: number) => 800 * Math.sin(3 * lon * D2R) * Math.cos(40 * lat * D2R) + 30 * lat;
    const o = { exaggeration: 0.65, azimuthRad: 335 * D2R, shadow: hexColor("#000000"), highlight: hexColor("#8d949c"), accent: hexColor("#2a2f35"), background: hexColor("#1b1f24") };
    for (const z of [2, 4, 6]) for (const lon of [-150, -20, 75]) {
      // tile side: ground gradient by central differences on the sphere at 85.04
      const lat = 85.04, h = 1e-3, mPerDeg = (Math.PI / 180) * R_MARS_2000;
      const gE = (zf(lon + h, lat) - zf(lon - h, lat)) / (2 * h * mPerDeg * Math.cos(lat * D2R));
      const gS = -(zf(lon, lat + h) - zf(lon, lat - h)) / (2 * h * mPerDeg);
      const tile = standardHillshade(maplibreDeriv(gE, gS, lat, z), o);
      // cap side: 3x3 Sobel on the AEQD texture of the chosen level at 85.06
      const N = capLevel(z), px = capPixelM(N), t = 1 / N, lat2 = 85.06;
      const [u, v] = capUV(lon, lat2, true);
      const e = (du: number, dv: number) => { const [lo, la] = capLonLat(u + du * t, v + dv * t, true); return zf(lo, la); };
      const gu = ((e(1, -1) + 2 * e(1, 0) + e(1, 1)) - (e(-1, -1) + 2 * e(-1, 0) + e(-1, 1))) / (8 * px);
      const gv = ((e(-1, 1) + 2 * e(0, 1) + e(1, 1)) - (e(-1, -1) + 2 * e(0, -1) + e(1, -1))) / (8 * px);
      const { east, south } = capFrame(lon, true);
      const cap = standardHillshade(maplibreDeriv(gu * east[0] + gv * east[1], gu * south[0] + gv * south[1], lat2, z), o);
      for (let i = 0; i < 3; i++) expect(Math.abs(cap[i] - tile[i]), `z${z} lon ${lon} ch ${i}`).toBeLessThan(0.02);
    }
  });
  it("texture level follows the zoom (cap pixel <= tile pixel at 85.05°, finest 4096)", () => {
    const lv = [0, 1, 2, 3, 4, 5, 8].map((z) => capLevel(z));
    expect(lv).toEqual([...lv].sort((a, b) => a - b));
    expect(capLevel(0)).toBe(256);
    expect(capLevel(8)).toBe(4096);
    expect(capPixelM(4096)).toBeCloseTo(146.4, 0);
  });
});

// ---------------------------------------------------------------------------------------------------------
// installation on a fake map
// ---------------------------------------------------------------------------------------------------------
function fakeMap(layers: string[], basemap: string, paint: Record<string, Record<string, unknown>> = {}, layout: Record<string, Record<string, unknown>> = {}) {
  const order = [...layers];
  const impl = new Map<string, unknown>();
  const handlers: Record<string, (() => void)[]> = {};
  const map = {
    zoom: 2,
    getLayersOrder: () => [...order],
    getLayer: (id: string) => (order.includes(id) ? { id, implementation: impl.get(id) } : undefined),
    addLayer: (l: { id: string }, before?: string) => { impl.set(l.id, l); const k = before ? order.indexOf(before) : -1; if (k >= 0) order.splice(k, 0, l.id); else order.push(l.id); },
    removeLayer: (id: string) => { const k = order.indexOf(id); if (k >= 0) order.splice(k, 1); impl.delete(id); },
    moveLayer: (id: string, before?: string) => { order.splice(order.indexOf(id), 1); const k = before ? order.indexOf(before) : -1; if (k >= 0) order.splice(k, 0, id); else order.push(id); },
    getPaintProperty: (id: string, p: string) => paint[id]?.[p],
    getLayoutProperty: (id: string, p: string) => layout[id]?.[p],
    getStyle: () => ({ metadata: { "atlas:basemap": map.basemap }, layers: order.map((id) => ({ id })) }),
    basemap,
    isStyleLoaded: () => true,
    on: (e: string, f: () => void) => { (handlers[e] ??= []).push(f); },
    off: () => {},
    fire: (e: string) => (handlers[e] ?? []).forEach((f) => f()),
    getZoom: () => map.zoom,
    getBearing: () => 0,
    triggerRepaint: () => {},
    getProjection: () => ({ type: "globe" }),
  };
  return { map, order, impl, paint, layout };
}
const BASEMAPS = [
  { id: "hrsc-mola-hillshade", title: "", kind: "hillshade", tiles: ["pmtiles://x/hrsc-mola-terrarium.pmtiles/{z}/{x}/{y}"], encoding: "terrarium" },
  { id: "opm-mars", title: "", kind: "raster", tiles: ["https://opm/{z}/{x}/{y}.png"] },
  { id: "esri-ctx1", title: "", kind: "raster", tiles: ["esri-mars://CTX1/{z}/{x}/{y}"] },
  { id: "dark", title: "", kind: "raster" },
] as never[];

describe("installPolarCaps", () => {
  it("basemap cap kinds", () => {
    expect(basemapCapKind(BASEMAPS[0])).toEqual({ mode: "hillshade", dem: "dune-atlas/mars/v1/basemaps/hrsc-mola-polar" });
    expect(basemapCapKind(BASEMAPS[1])).toEqual({ mode: "fill" });
    expect(basemapCapKind(BASEMAPS[2])).toEqual({ mode: "image", service: "CTX1" });
    expect(basemapCapKind(BASEMAPS[3])).toBeNull();
  });
  it("basemap cap sits directly above the basemap layers, fill caps directly above their fill layers, style mirrored", async () => {
    const f = fakeMap(["basemap-background", "basemap-hillshade", "ov-elevation", "ov-dunes-invert", "ov-dunes-fill", "ov-dunes-line"], "hrsc-mola-hillshade",
      { "basemap-background": { "background-color": "#1b1f24" }, "basemap-hillshade": { "hillshade-exaggeration": 0.65 }, "ov-dunes-fill": { "fill-color": "#a0a0a0", "fill-opacity": 0.55 }, "ov-dunes-invert": { "fill-color": "#a0a0a0", "fill-opacity": 0.3 } },
      { "ov-dunes-invert": { visibility: "none" } });
    const images: string[] = [];
    const caps = { layers: { dunes: { N: [100, 85.1, 101, 85.1, 100.5, 85.2], S: [] }, invert: { N: [0, 86, 1, 86, 0.5, 87], S: [0, -86, 1, -86, 0.5, -87] } } };
    const dispose = installPolarCaps(f.map as never, {
      dataBase: "https://data.test", basemaps: BASEMAPS,
      fills: [{ layerId: "ov-dunes-fill", url: "https://data.test/caps.json", part: "dunes" }, { layerId: "ov-dunes-invert", url: "https://data.test/caps.json", part: "invert" }],
      fetchImage: async (u) => { images.push(u); return { width: 256, height: 256, close() {} } as unknown as ImageBitmap; },
      fetchJson: async () => caps,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(f.order).toEqual(["basemap-background", "basemap-hillshade", BASEMAP_CAP_ID, "ov-elevation", "ov-dunes-invert", "ov-dunes-invert-polarcap", "ov-dunes-fill", "ov-dunes-fill-polarcap", "ov-dunes-line"]);
    expect(capLevel(2)).toBe(1024);   // zoom 2: tile pixel at 85.05 deg = 900 m -> 1024 px cap (586 m)
    expect(images.sort()).toEqual(["https://data.test/dune-atlas/mars/v1/basemaps/hrsc-mola-polar/n-1024.webp", "https://data.test/dune-atlas/mars/v1/basemaps/hrsc-mola-polar/s-1024.webp"]);
    const dunesCap = f.impl.get("ov-dunes-fill-polarcap") as PolarCapLayer, invCap = f.impl.get("ov-dunes-invert-polarcap") as PolarCapLayer;
    expect(dunesCap.mode).toBe("fill");
    expect(dunesCap.opacity).toBe(0.55);
    expect(invCap.opacity).toBe(0);                                    // the invert layer is hidden
    expect((f.impl.get(BASEMAP_CAP_ID) as PolarCapLayer).hillshade.exaggeration).toBe(0.65);
    // the app toggles invert on: the fill layer is hidden, the invert shown -> caps follow
    f.layout["ov-dunes-invert"] = { visibility: "visible" }; f.layout["ov-dunes-fill"] = { visibility: "none" };
    f.map.fire("styledata");
    expect(invCap.opacity).toBe(0.3); expect(dunesCap.opacity).toBe(0);
    // the overlay is removed -> its caps go; a layer added later on top keeps the caps below it
    f.map.removeLayer("ov-dunes-fill"); f.map.removeLayer("ov-dunes-invert"); f.map.fire("styledata");
    expect(f.order).not.toContain("ov-dunes-fill-polarcap"); expect(f.order).not.toContain("ov-dunes-invert-polarcap");
    f.order.splice(3, 0, "ov-new"); f.map.fire("styledata");          // inserted between cap and data
    expect(f.order.indexOf(BASEMAP_CAP_ID)).toBe(2);
    // basemap switch -> OpenPlanetaryMap: neutral cap (background colour fill)
    f.map.basemap = "opm-mars"; f.map.fire("style.load");
    expect((f.impl.get(BASEMAP_CAP_ID) as PolarCapLayer).mode).toBe("fill");
    f.map.basemap = "dark"; f.map.fire("style.load");
    expect(f.order).not.toContain(BASEMAP_CAP_ID);
    dispose();
  });
});

describe("Esri polar cap", () => {
  it("plans the geographic tiles of the cap texture (corners reach rho * sqrt 2)", () => {
    const n = planPolarCap(true, 512, 12, CAP_RHO_DEG), s = planPolarCap(false, 1024, 12, CAP_RHO_DEG);
    expect(n).toMatchObject({ level: 4, r0: 0, r1: 0, c0: 0, c1: 31 });
    expect(s).toMatchObject({ level: 5, r1: 31, c1: 63 });
    expect(s.r0).toBe(Math.floor((180 - CAP_RHO_DEG * Math.SQRT2) / s.span));
    expect(planPolarCap(true, 4096, 7, CAP_RHO_DEG).level).toBe(7);
  });
  it("composes a premultiplied AEQD texture from the source tiles (pixel -> source tile and pixel)", async () => {
    resetEsri();
    // every source tile is a solid colour encoding its column; alpha 255 except column 0 (transparent)
    const env: EsriEnv = {
      base: "https://esri.test/OnMars",
      fetch: (async (u: string) => {
        if (u.includes("?f=json")) return Response.json({ tileInfo: { rows: 512, cols: 512, origin: { x: -180, y: 90 }, spatialReference: { wkid: 104971 }, lods: Array.from({ length: 18 }, (_, l) => ({ level: l, resolution: 0.3515625 / 2 ** l })) } });
        return new Response(`IMG:${u.split("/").pop()}`, { status: 200 });
      }) as typeof fetch,
      decode: async (b: Blob) => ({ col: Number((await b.text()).split(":")[1]), width: 512, height: 512, close() {} }) as unknown as ImageBitmap,
      canvas: (w: number, h: number) => {
        let last: { col: number } | null = null; let data: ImageData | null = null;
        return {
          getContext: () => ({
            imageSmoothingEnabled: false,
            clearRect: () => {},
            drawImage: (im: { col: number }) => { last = im; },
            getImageData: (_x: number, _y: number, ww: number, hh: number) => { const d = new Uint8ClampedArray(ww * hh * 4); for (let i = 0; i < d.length; i += 4) { d[i] = last!.col; d[i + 1] = 100; d[i + 2] = 50; d[i + 3] = last!.col === 0 ? 0 : 255; } return { data: d }; },
            createImageData: (ww: number, hh: number) => ({ width: ww, height: hh, data: new Uint8ClampedArray(ww * hh * 4) }) as unknown as ImageData,
            putImageData: (d: ImageData) => { data = d; },
          }),
          transferToImageBitmap: () => ({ width: w, height: h, data }) as unknown as ImageBitmap,
        };
      },
      warn: () => {},
    };
    const img = (await esriPolarCap("CTX1", true, 64, new AbortController().signal, CAP_RHO_DEG, env)) as unknown as { width: number; data: ImageData };
    expect(img.width).toBe(64);
    const px = (lon: number, lat: number) => { const [u, v] = capUV(lon, lat, true); const i = Math.floor(v * 64), j = Math.floor(u * 64); return Array.from(img.data.data.slice((i * 64 + j) * 4, (i * 64 + j) * 4 + 4)); };
    // level 1 for N = 64 (4 + log2(64/512) = 1): 4 columns of 90 deg
    expect(px(10, 87)).toEqual([2, 100, 50, 255]);          // lon 10 -> column 2
    expect(px(-100, 87)).toEqual([0, 0, 0, 0]);             // column 0 transparent -> premultiplied zero
    expect(px(135, 88)).toEqual([3, 100, 50, 255]);
  });
});
