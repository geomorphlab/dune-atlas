// Dunes only with the dune map shown: the dune polygons are drawn as outlines and the fill is
// hidden, so the dune fill no longer covers the wind-derived colours (now only in the dune cells). Off: the
// fill as before, no outline. Uses the real adapters on a MapLibre stand-in (tests/fakemap.ts).
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FakeMap } from "./fakemap";
import { loadRegistry } from "../src/registry/load";
import { OverlayManager, restoreOverlays, isDuneMap } from "../src/map/overlays";
import { setBasemap } from "../src/map/basemaps";
import { OUTLINE_WIDTH } from "../src/map/adapters";
import type { LayerState } from "../src/store";
import type { Map as MlMap } from "maplibre-gl";

vi.mock("../src/map/fieldreader", () => ({ FieldReader: { open: () => Promise.reject(new Error("no field data in this test")) } }));
vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
vi.spyOn(console, "warn").mockImplementation(() => {});

const reg = loadRegistry().registry;
const STYLES = JSON.parse(fs.readFileSync(path.resolve(__dirname, "fixtures/basemap-styles.json"), "utf8"));
const URLS: Record<string, Record<string, unknown>> = {};
for (const b of reg.basemaps) if (b.kind === "style") URLS[b.style!] = b.style!.endsWith("/dark") ? STYLES.dark : STYLES.positron;

async function settle(map: FakeMap, ov: OverlayManager) {
  for (let k = 0; k < 100; k++) { await new Promise((r) => setTimeout(r, 2)); if (map.isStyleLoaded() && map.style.onLoad.length === 0) { await ov.settled(); return; } }
  throw new Error("did not settle");
}

describe("Dunes only draws the dune map as outlines", () => {
  it("toggle on: outline visible, fill hidden, opacity and colour follow; off: fill only; invert unaffected", async () => {
    const dunes = reg.layers.find((l) => l.id === "dunes")!;
    expect(isDuneMap(dunes)).toBe(true);
    const map = new FakeMap(URLS);
    const ov = new OverlayManager(map as unknown as MlMap, reg, "https://data.example", 14, { datasetPrefix: "dune-atlas/v1" });
    const layers: Record<string, LayerState> = Object.fromEntries(reg.layers.map((l) => [l.id, { visible: false, opacity: 1 }]));
    layers.dunes = { visible: true, opacity: 0.7, cfg: { fill: "#c08040" } };
    map.on("style.load", () => { restoreOverlays(map as unknown as MlMap, ov, layers, null); });
    setBasemap(map as unknown as MlMap, reg.basemaps[0], "globe");
    await settle(map, ov);
    expect(ov.layerIdsOf("dunes")).toEqual(["ov-dunes-fill"]);
    ov.setDunesOnly(true); await settle(map, ov);
    expect(ov.layerIdsOf("dunes")).toEqual(["ov-dunes-fill", "ov-dunes-outline"]);
    const out = map.getLayer("ov-dunes-outline")!;
    expect(out.type).toBe("line");
    expect(out.paint).toMatchObject({ "line-color": "#c08040", "line-width": OUTLINE_WIDTH, "line-opacity": 0.7 });
    expect(map.getLayer("ov-dunes-fill")!.layout.visibility).toBe("none");
    expect(out.layout.visibility).toBe("visible");
    layers.dunes = { ...layers.dunes, opacity: 0.4 }; ov.sync(layers);
    expect(out.paint["line-opacity"]).toBe(0.4);
    // invert (areas without dunes): the complement fill, no outline (it does not cover the dune cells)
    layers.dunes = { ...layers.dunes, cfg: { fill: "#c08040", invert: true } }; ov.sync(layers); await settle(map, ov);
    expect(map.getLayer("ov-dunes-invert")!.layout.visibility).toBe("visible");
    expect(map.getLayer("ov-dunes-outline")!.layout.visibility).toBe("none");
    layers.dunes = { ...layers.dunes, cfg: { fill: "#c08040" } }; ov.sync(layers);
    ov.setDunesOnly(false); await settle(map, ov);
    expect(ov.layerIdsOf("dunes")).toEqual(["ov-dunes-fill"]);
    expect(map.getLayer("ov-dunes-outline")).toBeUndefined();
    expect(map.getLayer("ov-dunes-fill")!.layout.visibility).toBe("visible");
  });
});
