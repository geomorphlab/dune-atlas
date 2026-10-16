// Dunes only with the dune map shown: the dune polygons keep their fill, drawn at no more than 50 % opacity
// (DUNES_ONLY_MAX_OPACITY), so the wind-derived colours (now only in the dune cells) show through it. Off: the
// user's opacity again. Uses the real adapters on a MapLibre stand-in (tests/fakemap.ts).
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FakeMap } from "./fakemap";
import { loadRegistry } from "../src/core/registry/load";
import { OverlayManager, restoreOverlays, isDuneMap } from "../src/core/map/overlays";
import { setBasemap } from "../src/core/map/basemaps";
import { DUNES_ONLY_MAX_OPACITY } from "../src/core/map/adapters";
import type { LayerState } from "../src/core/store";
import type { Map as MlMap } from "maplibre-gl";

vi.mock("../src/core/map/fieldreader", () => ({ FieldReader: { open: () => Promise.reject(new Error("no field data in this test")) } }));
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

describe("Dunes only keeps the dune map's fill at no more than 50 % opacity", () => {
  it("on: fill visible at min(opacity, 0.5) x its style opacity, no outline; slider below the cap follows; off: the user's opacity", async () => {
    const dunes = reg.layers.find((l) => l.id === "dunes")!;
    expect(isDuneMap(dunes)).toBe(true);
    expect(DUNES_ONLY_MAX_OPACITY).toBe(0.5);
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
    expect(ov.layerIdsOf("dunes")).toEqual(["ov-dunes-fill"]);            // no outline layer
    expect(map.getLayer("ov-dunes-fill")!.layout.visibility).toBe("visible");
    expect(map.getLayer("ov-dunes-fill")!.paint["fill-color"]).toBe("#c08040");
    expect(fillOp()).toBeCloseTo(base * 0.5, 9);                           // capped
    layers.dunes = { ...layers.dunes, opacity: 0.3 }; ov.sync(layers);
    expect(fillOp()).toBeCloseTo(base * 0.3, 9);                           // below the cap: the slider
    layers.dunes = { ...layers.dunes, opacity: 1 }; ov.sync(layers);
    expect(fillOp()).toBeCloseTo(base * 0.5, 9);
    // invert (areas without dunes): the complement fill, capped the same way
    layers.dunes = { ...layers.dunes, cfg: { fill: "#c08040", invert: true } }; ov.sync(layers); await settle(map, ov);
    expect(map.getLayer("ov-dunes-invert")!.layout.visibility).toBe("visible");
    expect(map.getLayer("ov-dunes-invert")!.paint["fill-opacity"]).toBeCloseTo(base * 0.5, 9);
    layers.dunes = { ...layers.dunes, cfg: { fill: "#c08040" } }; ov.sync(layers);
    ov.setDunesOnly(false); await settle(map, ov);
    expect(ov.layerIdsOf("dunes")).toEqual(["ov-dunes-fill"]);
    expect(fillOp()).toBeCloseTo(base * 1, 9);                             // the user's opacity again
  });
});
