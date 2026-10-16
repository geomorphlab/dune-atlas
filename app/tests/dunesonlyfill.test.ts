// @vitest-environment happy-dom
// Dunes only and the dune map: switching Dunes only on sets the dune map's opacity slider to 50 % (DUNES_ONLY_OPACITY)
// in the app state; the map always draws the dune fill at the slider's opacity (the top of the slider = fully opaque,
// no cap), with or without Dunes only. Uses the real adapters on a MapLibre stand-in (tests/fakemap.ts).
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FakeMap } from "./fakemap";
import { loadRegistry } from "../src/core/registry/load";
import { OverlayManager, restoreOverlays, isDuneMap } from "../src/core/map/overlays";
import { setBasemap } from "../src/core/map/basemaps";
import { DUNES_ONLY_OPACITY, dunesOnlyToggle } from "../src/core/ui/layerPanel";
import { Store, type AppState, type LayerState } from "../src/core/store";
import type { Map as MlMap } from "maplibre-gl";

vi.mock("../src/core/map/fieldreader", () => ({ FieldReader: { open: () => Promise.reject(new Error("no field data in this test")) } }));
vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
vi.spyOn(console, "warn").mockImplementation(() => {});

const reg = loadRegistry().registry;
const STYLES = JSON.parse(fs.readFileSync(path.resolve(__dirname, "fixtures/basemap-styles.json"), "utf8"));
const URLS: Record<string, Record<string, unknown>> = {};
for (const b of reg.basemaps) if (b.kind === "style") URLS[b.style!] = b.style!.endsWith("/dark") ? STYLES.dark : STYLES.positron;

function initState(): AppState {
  return { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14,
    layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: !!l.visible, opacity: l.opacity ?? 1 }])),
    order: reg.layers.map((l) => l.id), dataset: "era5-land", cell: null, embed: false } as AppState;
}

async function settle(map: FakeMap, ov: OverlayManager) {
  for (let k = 0; k < 100; k++) { await new Promise((r) => setTimeout(r, 2)); if (map.isStyleLoaded() && map.style.onLoad.length === 0) { await ov.settled(); return; } }
  throw new Error("did not settle");
}

describe("Dunes only and the dune map's opacity", () => {
  it("map: the fill follows the slider with Dunes only on or off (opacity 1 = the style's full opacity)", async () => {
    const dunes = reg.layers.find((l) => l.id === "dunes")!;
    expect(isDuneMap(dunes)).toBe(true);
    const base = (dunes.style?.fill?.["fill-opacity"] as number | undefined) ?? 0.55;
    const map = new FakeMap(URLS);
    const ov = new OverlayManager(map as unknown as MlMap, reg, "https://data.example", 14, { datasetPrefix: "dune-atlas/v1" });
    const layers: Record<string, LayerState> = Object.fromEntries(reg.layers.map((l) => [l.id, { visible: false, opacity: 1 }]));
    layers.dunes = { visible: true, opacity: 0.8, cfg: { fill: "#c08040" } };
    map.on("style.load", () => { restoreOverlays(map as unknown as MlMap, ov, layers, null); });
    setBasemap(map as unknown as MlMap, reg.basemaps[0], "globe");
    await settle(map, ov);
    const fillOp = () => map.getLayer("ov-dunes-fill")!.paint["fill-opacity"] as number;
    expect(ov.layerIdsOf("dunes")).toEqual(["ov-dunes-fill"]);
    expect(fillOp()).toBeCloseTo(base * 0.8, 9);
    ov.setDunesOnly(true); await settle(map, ov);
    expect(ov.layerIdsOf("dunes")).toEqual(["ov-dunes-fill"]);            // fill, no outline layer
    expect(map.getLayer("ov-dunes-fill")!.layout.visibility).toBe("visible");
    expect(map.getLayer("ov-dunes-fill")!.paint["fill-color"]).toBe("#c08040");
    expect(fillOp()).toBeCloseTo(base * 0.8, 9);                           // no cap
    layers.dunes = { ...layers.dunes, opacity: 1 }; ov.sync(layers);
    expect(fillOp()).toBeCloseTo(base * 1, 9);                             // top of the slider: fully opaque
    layers.dunes = { ...layers.dunes, opacity: 0.3 }; ov.sync(layers);
    expect(fillOp()).toBeCloseTo(base * 0.3, 9);
    ov.setDunesOnly(false); await settle(map, ov);
    expect(fillOp()).toBeCloseTo(base * 0.3, 9);
  });
  it("switch: turning Dunes only on sets the dune map's slider to 50 %; turning it off leaves the slider; other layers untouched", () => {
    expect(DUNES_ONLY_OPACITY).toBe(0.5);
    const store = new Store(initState());
    store.setLayer("dunes", { visible: true, opacity: 0.9 });
    store.setLayer("dpm", { visible: true, opacity: 0.7 });
    const el = dunesOnlyToggle(store, reg);
    const cb = el.querySelector("#dunes-only") as HTMLInputElement;
    cb.checked = true; cb.dispatchEvent(new Event("change"));
    expect(store.state.dunesOnly).toBe(true);
    expect(store.state.layers.dunes.opacity).toBe(0.5);
    expect(store.state.layers.dunes.visible).toBe(true);
    expect(store.state.layers.dpm.opacity).toBe(0.7);
    store.setLayer("dunes", { opacity: 1 });                               // the user moves the slider to the top
    expect(store.state.layers.dunes.opacity).toBe(1);
    cb.checked = false; cb.dispatchEvent(new Event("change"));
    expect(store.state.dunesOnly).toBe(false);
    expect(store.state.layers.dunes.opacity).toBe(1);
  });
});
