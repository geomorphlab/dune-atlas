// Basemap switching keeps every active overlay: presence, drawing order, opacity and paint
// properties after each switch (all basemaps, back and forth, rapid switches before a style has
// loaded), with dunes, the non-dune 'invert' fill, aridity, DP, RDD streamlines and the
// selected-cell marker. Uses the real adapters on a MapLibre stand-in (tests/fakemap.ts).
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FakeMap } from "./fakemap";
import { loadRegistry } from "../src/core/registry/load";
import { OverlayManager, restoreOverlays, SELECTED_CELL_BOTTOM, SELECTED_CELL_LINE, firstSymbolLayer } from "../src/core/map/overlays";
import { setBasemap } from "../src/core/map/basemaps";
import type { LayerState } from "../src/core/store";
import type { Map as MlMap } from "maplibre-gl";

// no tile / chunk reads in this test: streamline data loading fails fast (layers are still added)
vi.mock("../src/core/map/fieldreader", () => ({ FieldReader: { open: () => Promise.reject(new Error("no field data in this test")) } }));

const reg = loadRegistry().registry;
const STYLES = JSON.parse(fs.readFileSync(path.resolve(__dirname, "fixtures/basemap-styles.json"), "utf8"));
const URLS: Record<string, Record<string, unknown>> = {};
for (const b of reg.basemaps) if (b.kind === "style") URLS[b.style!] = b.style!.endsWith("/dark") ? STYLES.dark : STYLES.positron;
const ARID = JSON.parse(fs.readFileSync(path.resolve(__dirname, "fixtures/aridity-zarr-root.json"), "utf8"));
const V1 = { attributes: { multiscales: { layout: [
  { asset: "0", "spatial:transform": [0.1, 0, -180.05, 0, -0.1, 90.05], "spatial:shape": [1801, 3600] },
  { asset: "1", "spatial:transform": [0.2, 0, -180.1, 0, -0.2, 90.1], "spatial:shape": [900, 1800] } ] } } };

let rnd = 1;
const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
beforeEach(() => {
  rnd = 7;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "debug").mockImplementation(() => {});
  // root attrs with random latency (async zarr adds finish in random order); everything else 404
  vi.stubGlobal("fetch", async (u: string) => {
    await new Promise((r) => setTimeout(r, Math.floor(rand() * 6)));
    const body = /fields\/aridity\.zarr\/zarr\.json$/.test(u) ? ARID : /fields\/[a-z_]+\.zarr\/zarr\.json$/.test(u) ? V1 : null;
    return body ? new Response(JSON.stringify(body), { status: 200 }) : new Response("", { status: 404 });
  });
});
afterAll(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const ACTIVE = ["dunes", "rdpa", "dpm", "aridity"]; // drawing order, top first
function state(invert: boolean): Record<string, LayerState> {
  const s: Record<string, LayerState> = {};
  for (const l of reg.layers) s[l.id] = { visible: false, opacity: 1 };
  s.dunes = { visible: true, opacity: 0.7, cfg: { fill: "#c08040", invert } };
  s.aridity = { visible: true, opacity: 0.6 };
  s.dpm = { visible: true, opacity: 0.5 };
  s.rdpa = { visible: true, opacity: 0.9, cfg: { mode: "streamlines", vecColor: "#112233" } };
  return s;
}
const ORDER = [...ACTIVE, ...reg.layers.map((l) => l.id).filter((id) => !ACTIVE.includes(id))];
const SELECTION: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[15.15, -24.45], [15.25, -24.45], [15.25, -24.55], [15.15, -24.55], [15.15, -24.45]]] } };

function setup(invert: boolean, delay: () => number = () => Math.floor(rand() * 8)) {
  const map = new FakeMap(URLS, delay);
  const ov = new OverlayManager(map as unknown as MlMap, reg, "https://data.example", 14, { order: ORDER, datasetPrefix: "dune-atlas/v1" });
  const layers = state(invert);
  map.on("style.load", () => { restoreOverlays(map as unknown as MlMap, ov, layers, SELECTION); });
  const switchTo = (id: string) => setBasemap(map as unknown as MlMap, reg.basemaps.find((b) => b.id === id)!, "globe");
  return { map, ov, layers, switchTo };
}
async function settle(map: FakeMap, ov: OverlayManager) {
  for (let k = 0; k < 200; k++) {
    await new Promise((r) => setTimeout(r, 3));
    if (map.isStyleLoaded() && map.style.onLoad.length === 0) { await ov.settled(); await new Promise((r) => setTimeout(r, 3)); if (map.isStyleLoaded()) { await ov.settled(); return; } }
  }
  throw new Error("did not settle");
}

function check(map: FakeMap, ov: OverlayManager, layers: Record<string, LayerState>, basemapId: string, invert: boolean) {
  const order = map.layerOrder();
  const at = (id: string) => order.indexOf(id);
  expect((map.getStyle().metadata as Record<string, string>)["atlas:basemap"]).toBe(basemapId);
  // presence: exactly the expected overlay layers, once each
  const expected: Record<string, string[]> = {
    aridity: ["ov-aridity"], dpm: ["ov-dpm"], rdpa: ["ov-rdpa-vec", "ov-rdpa-vec-globe"], // GeoJSON lines (flat map) + custom layer (globe)
    dunes: invert ? ["ov-dunes-invert", "ov-dunes-fill"] : ["ov-dunes-fill"],
  };
  for (const id of ACTIVE) {
    expect(ov.layerIdsOf(id), id).toEqual(expected[id]);
    for (const x of expected[id]) expect(order.filter((y) => y === x).length, x).toBe(1);
  }
  expect(order.filter((x) => x.startsWith("ov-")).sort()).toEqual(Object.values(expected).flat().sort());
  // drawing order: bottom aridity < dpm < rdpa < dunes < selected cell < first basemap label
  const stack = ["ov-aridity", "ov-dpm", "ov-rdpa-vec", "ov-rdpa-vec-globe", ...expected.dunes, SELECTED_CELL_BOTTOM, SELECTED_CELL_LINE];
  for (let k = 1; k < stack.length; k++) expect(at(stack[k - 1]), `${stack[k - 1]} below ${stack[k]}`).toBeLessThan(at(stack[k]));
  // basemap: every basemap layer below the first label is under all overlays; labels above
  const sym = firstSymbolLayer(map as unknown as MlMap);
  const firstOv = at("ov-aridity");
  for (const l of map.getStyle().layers) {
    if (l.id.startsWith("ov-") || l.id.startsWith("selected-cell")) continue;
    if (sym === undefined || at(l.id) < at(sym)) expect(at(l.id), `${l.id} below overlays`).toBeLessThan(firstOv);
  }
  if (sym) expect(at(SELECTED_CELL_LINE)).toBeLessThan(at(sym));
  // opacity, colours, invert
  const fill = map.getLayer("ov-dunes-fill")!;
  const dop = layers.dunes.opacity, dcol = layers.dunes.cfg!.fill;
  expect(fill.paint["fill-opacity"]).toBeCloseTo(0.55 * dop, 12);
  expect(fill.paint["fill-color"]).toBe(dcol);
  expect(fill.layout.visibility).toBe(invert ? "none" : "visible");
  if (invert) {
    const inv = map.getLayer("ov-dunes-invert")!;
    expect(inv.paint["fill-opacity"]).toBeCloseTo(0.55 * dop, 12);
    expect(inv.paint["fill-color"]).toBe(dcol);
    expect(inv.layout.visibility).toBe("visible");
  }
  expect((map.getLayer("ov-aridity")!.implementation as { opacity: number }).opacity).toBe(layers.aridity.opacity);
  expect((map.getLayer("ov-dpm")!.implementation as { opacity: number }).opacity).toBe(layers.dpm.opacity);
  const vec = map.getLayer("ov-rdpa-vec")!;
  expect(vec.paint["line-color"]).toBe("#112233");
  expect(vec.paint["line-opacity"]).toEqual(["*", 0.9, ["get", "a"]]);
  // sources of the overlays and the selection exist; the selection holds the cell polygon
  for (const s of ["ovsrc-dunes", "ovsrc-rdpa-vec", "selected-cell", ...(invert ? ["ovsrc-dunes-invert"] : [])]) expect(map.getSource(s), s).toBeTruthy();
  expect(map.getSource("selected-cell")!.data).toEqual(SELECTION);
  // no leaked listeners from disposed handles (one streamline handle), no MapLibre errors
  expect(map.listenerCount("moveend")).toBe(1);
  expect(map.errors).toEqual([]);
}

describe("basemap switching keeps the overlays", () => {
  const ids = reg.basemaps.map((b) => b.id);
  for (const invert of [false, true]) {
    it(`cycles through every basemap and back (${invert ? "invert / non-dune land" : "dune fill"})`, async () => {
      const { map, ov, layers, switchTo } = setup(invert);
      const seq = [ids[0], ...ids.slice(1), ...ids.slice(0, -1).reverse(), ids[2], ids[0], ids[4], ids[1]];
      for (const id of seq) {
        switchTo(id);
        await settle(map, ov);
        check(map, ov, layers, id, invert);
      }
      expect(map.styleLoads).toBe(seq.length);
    });
  }
  it("rapid switching before styles finish loading ends on the last basemap with every overlay once", async () => {
    const { map, ov, layers, switchTo } = setup(true, () => 1 + Math.floor(rand() * 10));
    for (let round = 0; round < 6; round++) {
      const burst = Array.from({ length: 2 + (round % 3) }, () => ids[Math.floor(rand() * ids.length)]);
      for (const id of burst) {
        switchTo(id);
        // sometimes let the first style (or part of the overlay adds) through before the next switch
        if (rand() < 0.5) await new Promise((r) => setTimeout(r, Math.floor(rand() * 12)));
      }
      await settle(map, ov);
      check(map, ov, layers, burst[burst.length - 1], true);
    }
  });
  it("changes made while a style is loading are applied to the new style", async () => {
    const { map, ov, layers, switchTo } = setup(false);
    switchTo(ids[0]); await settle(map, ov);
    switchTo(ids[1]);
    layers.dunes = { ...layers.dunes, opacity: 0.4, cfg: { fill: "#00ff00", invert: false } };
    ov.sync(layers); // style still loading: handles are stale, nothing may throw
    await settle(map, ov);
    expect(map.getLayer("ov-dunes-fill")!.paint["fill-opacity"]).toBeCloseTo(0.55 * 0.4, 12);
    expect(map.getLayer("ov-dunes-fill")!.paint["fill-color"]).toBe("#00ff00");
    check(map, ov, layers, ids[1], false);
    // reordering afterwards still works (dunes to the bottom)
    ov.setOrder([...ORDER.filter((x) => x !== "dunes"), "dunes"]);
    const o = map.layerOrder();
    expect(o.indexOf("ov-dunes-fill")).toBeLessThan(o.indexOf("ov-aridity"));
  });
});
