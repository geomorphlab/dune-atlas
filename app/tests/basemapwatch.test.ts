// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { BasemapWatch, FAIL_AFTER, repaintOnTileErrors } from "../src/core/map/basemapwatch";
import type { BasemapDef } from "../src/core/registry/types";

function fakeMap() {
  const fns: Record<string, ((e: unknown) => void)[]> = {};
  let sources: Record<string, unknown> = {};
  return {
    on(ev: string, fn: (e: unknown) => void) { (fns[ev] ??= []).push(fn); },
    getStyle: () => ({ sources }),
    emit(ev: string, e: unknown = {}) { for (const f of fns[ev] ?? []) f(e); },
    setSources(s: Record<string, unknown>) { sources = s; },
  };
}
const topo: BasemapDef = { id: "opentopomap", title: "Topographic (OpenTopoMap) ", kind: "raster", tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"], attribution: "" };
const dark: BasemapDef = { id: "openfreemap-dark", title: "Dark (OpenFreeMap)", kind: "style", style: "https://tiles.openfreemap.org/styles/dark", attribution: "" };

describe("notice for a basemap that cannot be loaded", () => {
  it("raster: shown after FAIL_AFTER tile errors of the basemap, not for other sources; a loaded tile hides it", () => {
    const m = fakeMap(), w = new BasemapWatch(m);
    w.start(topo);
    for (let i = 0; i < 10; i++) m.emit("error", { sourceId: "dpm" });
    expect(w.shown).toBe(false);
    for (let i = 0; i < FAIL_AFTER - 1; i++) m.emit("error", { sourceId: "basemap" });
    expect(w.shown).toBe(false);
    m.emit("error", { sourceId: "basemap" });
    expect(w.shown).toBe(true);
    expect(w.el.textContent).toContain("“Topographic (OpenTopoMap)” could not be loaded");
    m.emit("sourcedata", { sourceId: "basemap", tile: {} });
    expect(w.shown).toBe(false);
  });
  it("style: a failed style file shows it at once; after loading, the style's own sources count", () => {
    const m = fakeMap(), w = new BasemapWatch(m);
    w.start(dark);
    m.emit("error", { error: { url: "https://data.geomorphlab.org/x" } });
    expect(w.shown).toBe(false);
    m.emit("error", { error: { url: "https://tiles.openfreemap.org/styles/dark", message: "Failed to fetch" } });
    expect(w.shown).toBe(true);
    w.start(dark);
    expect(w.shown).toBe(false);
    m.setSources({ openmaptiles: {} });
    m.emit("style.load");
    for (let i = 0; i < FAIL_AFTER; i++) m.emit("error", { sourceId: "openmaptiles" });
    expect(w.shown).toBe(true);
  });
  it("× closes it until the next basemap; switching basemap hides it", () => {
    const m = fakeMap(), w = new BasemapWatch(m);
    w.start(topo);
    for (let i = 0; i < FAIL_AFTER; i++) m.emit("error", { sourceId: "basemap" });
    (w.el.querySelector("button") as HTMLButtonElement).click();
    m.emit("error", { sourceId: "basemap" });
    expect(w.shown).toBe(false);
    w.start(topo);
    for (let i = 0; i < FAIL_AFTER; i++) m.emit("error", { sourceId: "basemap" });
    expect(w.shown).toBe(true);
    w.start(dark);
    expect(w.shown).toBe(false);
  });
  it("asks for a new frame on every source or tile error (maplibre-gl-js #8716)", () => {
    const m = { ...fakeMap(), repaints: 0, triggerRepaint() { this.repaints++; } };
    repaintOnTileErrors(m);
    m.emit("error", { sourceId: "basemap", tile: {} });
    m.emit("error", { error: new Error("style") });
    m.emit("error", { sourceId: "dpm" });
    expect(m.repaints).toBe(2);
  });
});
