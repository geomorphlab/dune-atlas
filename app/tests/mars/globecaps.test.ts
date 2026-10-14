// App hook of the globe polar caps (src/mars/map/globecaps.ts -> map/polarcap.ts): fill specs from the
// registry (dunes fill + invert, polar-caps.json beside the tiles), caps installed in globe projection and
// absent in Mercator, and the basemap cap following every basemap of the Mars registry.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => ({ default: { addProtocol: () => {} } }));

import { loadRegistry } from "../../src/registry/load";
import { globePolarCaps, marsCapFills, marsPolarCapOptions } from "../../src/mars/map/globecaps";
import { BASEMAP_CAP_ID, basemapCapKind, type PolarCapLayer } from "../../src/mars/map/polarcap";

const { registry: reg } = loadRegistry();
const BASE = "https://data.test";
const CAPS = { layers: { dunes: { N: [100, 85.1, 101, 85.1, 100.5, 85.2], S: [] }, invert: { N: [0, 86, 1, 86, 0.5, 87], S: [] } } };

function fakeMap(basemap: string, projection: "globe" | "mercator") {
  const order = ["basemap-background", "basemap-layer", "ov-dunes-invert", "ov-dunes-fill", "ov-dunes-line"];
  const impl = new Map<string, unknown>();
  const handlers: Record<string, (() => void)[]> = {};
  const paint: Record<string, Record<string, unknown>> = { "basemap-background": { "background-color": "#1b1f24" }, "ov-dunes-fill": { "fill-color": "#a0a0a0", "fill-opacity": 0.55 } };
  const map = {
    basemap, projection,
    getLayersOrder: () => [...order],
    getLayer: (id: string) => (order.includes(id) ? { id, implementation: impl.get(id) } : undefined),
    addLayer: (l: { id: string }, before?: string) => { impl.set(l.id, l); const k = before ? order.indexOf(before) : -1; if (k >= 0) order.splice(k, 0, l.id); else order.push(l.id); },
    removeLayer: (id: string) => { const k = order.indexOf(id); if (k >= 0) order.splice(k, 1); impl.delete(id); },
    moveLayer: (id: string, before?: string) => { order.splice(order.indexOf(id), 1); const k = before ? order.indexOf(before) : -1; if (k >= 0) order.splice(k, 0, id); else order.push(id); },
    getPaintProperty: (id: string, p: string) => paint[id]?.[p],
    getLayoutProperty: () => undefined,
    getStyle: () => ({ metadata: { "atlas:basemap": map.basemap }, layers: order.map((id) => ({ id })) }),
    isStyleLoaded: () => true,
    on: (e: string, f: () => void) => { (handlers[e] ??= []).push(f); },
    off: (e: string, f: () => void) => { handlers[e] = (handlers[e] ?? []).filter((g) => g !== f); },
    fire: (e: string) => [...(handlers[e] ?? [])].forEach((f) => f()),
    getZoom: () => 2,
    getBearing: () => 0,
    triggerRepaint: () => {},
    getProjection: () => ({ type: map.projection }),
  };
  return { map, order, impl };
}
const capIds = (order: string[]) => order.filter((id) => id.endsWith("polarcap"));
const opts = () => ({
  ...marsPolarCapOptions(BASE, reg.basemaps, reg.layers),
  fetchImage: async () => ({ width: 256, height: 256, close() {} }) as unknown as ImageBitmap,
  fetchJson: async () => CAPS,
});

beforeEach(() => { vi.stubGlobal("fetch", async () => { throw new Error("offline test"); }); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("globe polar caps hook (main.ts)", () => {
  it("fill specs: dunes fill and invert from the dunes layer's polar-caps.json; invert view from dunes.yaml", () => {
    const dunes = reg.layers.find((l) => l.id === "dunes")!;
    expect(dunes.invertSource).toBe("dune-atlas/mars/v1/dunes/invert-r2.pmtiles");
    expect(dunes.invertSourceLayer).toBe("invert");
    expect(marsCapFills(reg.layers, `${BASE}/`)).toEqual([
      { layerId: "ov-dunes-fill", url: `${BASE}/dune-atlas/mars/v1/dunes/polar-caps.json`, part: "dunes" },
      { layerId: "ov-dunes-invert", url: `${BASE}/dune-atlas/mars/v1/dunes/polar-caps.json`, part: "invert" },
    ]);
  });

  it("installed in globe projection, absent in Mercator, back on the globe", async () => {
    const f = fakeMap("hrsc-mola-hillshade", "globe");
    const caps = globePolarCaps(f.map as never, opts());
    await new Promise((r) => setTimeout(r, 0));
    expect(caps.installed).toBe(true);
    expect(f.order).toEqual(["basemap-background", "basemap-layer", BASEMAP_CAP_ID, "ov-dunes-invert", "ov-dunes-invert-polarcap", "ov-dunes-fill", "ov-dunes-fill-polarcap", "ov-dunes-line"]);
    f.map.projection = "mercator"; f.map.fire("styledata");
    expect(caps.installed).toBe(false);
    expect(capIds(f.order)).toEqual([]);
    f.map.fire("idle"); f.map.fire("style.load");
    expect(capIds(f.order)).toEqual([]);                                // stays absent in the flat map
    f.map.projection = "globe"; caps.sync();
    expect(capIds(f.order).sort()).toEqual([BASEMAP_CAP_ID, "ov-dunes-fill-polarcap", "ov-dunes-invert-polarcap"].sort());
    caps.dispose();
    expect(capIds(f.order)).toEqual([]);
  });

  it("a map opened in Mercator has no caps until switched to the globe", () => {
    const f = fakeMap("hrsc-mola-hillshade", "mercator");
    const caps = globePolarCaps(f.map as never, opts());
    expect(caps.installed).toBe(false);
    expect(capIds(f.order)).toEqual([]);
    f.map.projection = "globe"; f.map.fire("projectiontransition");
    expect(caps.installed).toBe(true);
    caps.dispose();
  });

  it("switching basemap keeps the basemap cap matching (every Mars basemap)", () => {
    expect(reg.basemaps.length).toBeGreaterThanOrEqual(6);
    const f = fakeMap(reg.basemaps[0].id, "globe");
    const caps = globePolarCaps(f.map as never, opts());
    const seen = new Set<string>();
    for (const b of [...reg.basemaps, ...[...reg.basemaps].reverse()]) {
      f.map.basemap = b.id; f.map.fire("style.load");
      const want = basemapCapKind(b);
      const L = f.impl.get(BASEMAP_CAP_ID) as PolarCapLayer | undefined;
      if (!want) { expect(L).toBeUndefined(); continue; }
      expect(L?.mode, b.id).toBe(want.mode);
      expect(f.order.indexOf(BASEMAP_CAP_ID), b.id).toBe(2);           // directly above the basemap layers
      expect(f.order.filter((id) => id === BASEMAP_CAP_ID)).toHaveLength(1);
      seen.add(want.mode);
    }
    expect([...seen].sort()).toEqual(["fill", "hillshade", "image"]);  // MOLA-HRSC, OpenPlanetaryMap, Esri
    caps.dispose();
  });
});
