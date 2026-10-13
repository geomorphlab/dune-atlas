// @vitest-environment happy-dom
// Cursor coordinate readout beside the scale bar: format, mouse / touch behaviour, placement and
// style next to the scale bar, never in image exports.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CoordsControl, formatLatLon } from "../src/ui/coords";
import { loadRegistry } from "../src/registry/load";
import { mapStripItems } from "../src/export/mapExport";

type H = (e: { lngLat: { lat: number; lng: number } }) => void;
function fakeMap() {
  const hs = new Map<string, Set<H>>();
  return {
    on: (t: string, f: H) => { (hs.get(t) ?? hs.set(t, new Set()).get(t)!).add(f); },
    off: (t: string, f: H) => { hs.get(t)?.delete(f); },
    fire: (t: string, lat = 0, lng = 0) => { for (const f of hs.get(t) ?? []) f({ lngLat: { lat, lng } }); },
    count: () => [...hs.values()].reduce((a, s) => a + s.size, 0),
  };
}

describe("coordinate format", () => {
  it("2 decimals, hemisphere letters, wrapped longitude", () => {
    expect(formatLatLon(-24.5312, 15.2149)).toBe("24.53° S, 15.21° E");
    expect(formatLatLon(32.98, -115.734)).toBe("32.98° N, 115.73° W");
    expect(formatLatLon(0, 0)).toBe("0.00° N, 0.00° E");
    expect(formatLatLon(-0.001, -0.004)).toBe("0.00° N, 0.00° E"); // no "0.00° S"
    expect(formatLatLon(10, 190)).toBe("10.00° N, 170.00° W");
    expect(formatLatLon(10, -181)).toBe("10.00° N, 179.00° E");
    expect(formatLatLon(10, 180)).toBe("10.00° N, 180.00° E");
    expect(formatLatLon(-90, 539.999)).toBe("90.00° S, 180.00° E");
  });
});

describe("readout control", () => {
  it("mouse: hidden until the cursor moves over the map, follows it, keeps the last value (dimmed) when it leaves", () => {
    const m = fakeMap(), c = new CoordsControl({ touch: false });
    const el = c.onAdd(m as never);
    expect(el.classList.contains("maplibregl-ctrl")).toBe(true);
    expect(el.hidden).toBe(true);
    m.fire("mousemove", -24.531, 15.214);
    expect(el.hidden).toBe(false);
    expect(el.textContent).toBe("24.53° S, 15.21° E");
    m.fire("mousemove", 20.1, 30.2);
    expect(el.textContent).toBe("20.10° N, 30.20° E");
    m.fire("mouseout");
    expect(el.textContent).toBe("20.10° N, 30.20° E");
    expect(el.classList.contains("stale")).toBe(true);
    m.fire("mousemove", 1, 2);
    expect(el.classList.contains("stale")).toBe(false);
    m.fire("click", 5, 5); // clicks do not change the mouse readout
    expect(el.textContent).toBe("1.00° N, 2.00° E");
    c.onRemove();
    expect(m.count()).toBe(0);
  });
  it("touch screens: nothing shown until a tap, then the last tapped point (no tracking clutter)", () => {
    const m = fakeMap(), c = new CoordsControl({ touch: true });
    const el = c.onAdd(m as never);
    m.fire("mousemove", 3, 4);
    expect(el.hidden).toBe(true);
    m.fire("click", -24.5, 15.2);
    expect(el.hidden).toBe(false);
    expect(el.textContent).toBe("24.50° S, 15.20° E");
    expect(el.title).toMatch(/tapped/);
  });
  it("placed bottom left beside the scale bar, styled like it (dark box, legible on any basemap), not clickable", () => {
    const main = fs.readFileSync(path.resolve(__dirname, "../src/main.ts"), "utf8");
    const iScale = main.indexOf('new maplibregl.ScaleControl'), iCoords = main.indexOf('new CoordsControl()');
    expect(iScale).toBeGreaterThan(0);
    expect(iCoords).toBeGreaterThan(iScale); // added right after the scale bar, same corner
    expect(main.slice(iCoords, main.indexOf("\n", iCoords))).toContain('"bottom-left"');
    const css = fs.readFileSync(path.resolve(__dirname, "../src/style.css"), "utf8");
    const rule = css.slice(css.indexOf(".maplibregl-ctrl.atlas-coords {"), css.indexOf("}", css.indexOf(".maplibregl-ctrl.atlas-coords {")));
    expect(rule).toMatch(/clear: none/); // floats beside the scale bar, not below it
    expect(rule).toMatch(/background: rgba\(20, 26, 33, \.75\)/); // = .maplibregl-ctrl-scale
    expect(rule).toMatch(/font-size: 10px/);
    expect(rule).toMatch(/pointer-events: none/);
    // narrow screens: the bottom controls move above the cell sheet together (no overlap)
    expect(css).toMatch(/body\.cell-open \.maplibregl-ctrl-bottom-left/);
  });
  it("not part of image exports: exports draw the map canvas and the strip only; the strip has no cursor position", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../src/export/mapExport.ts"), "utf8");
    expect(src).toMatch(/map\.getCanvas\(\)/);
    expect(src).not.toMatch(/atlas-coords|querySelector\("\.maplibregl-ctrl/);
    const reg = loadRegistry().registry;
    const items = mapStripItems({ reg, width: 1300, includeBasemap: false, shareLink: "x", date: new Date(0), view: { lon: 15.21, lat: -24.53, zoom: 6, bearing: 0, pitch: 0, proj: "globe" },
      state: { layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: false, opacity: 1 }])) as never, order: [], utIndex: 14, dataset: "era5", basemap: "openfreemap-dark" } as never });
    // the only position in the strip is the view centre (the cursor readout is not passed to it)
    const pos = [...JSON.stringify(items).matchAll(/(\w+) [\d.]+° [NS], [\d.]+° [EW]/g)].map((m) => m[1]);
    expect(pos).toEqual(["centre"]);
  });
});
